import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ReservationModel } from '@/lib/models/Reservation';
import { RoomModel } from '@/lib/models/Room';
import { GuestModel } from '@/lib/models/Guest';
import { DailyReportModel } from '@/lib/models/DailyReport';
import { verifySessionAndRole } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { isDateRangeOverlapping, getEthiopianLocalDate } from '@/lib/dateUtils';
import { AccountingIntegrationService } from '@/lib/accounting/integration.service';

const INITIAL_RESERVATIONS = [
  { idNumber: 101, bookingRef: 'RES-8491', guestId: 1, guestName: 'Dawit Yohannes', guestPhone: '+251 911 223 344', idPassportNumber: 'ETH-849204', idType: 'National ID (Fayda / FIN)', roomId: 1, roomNumber: '101', roomType: 'Standard Single', checkInDate: '2026-10-08', checkOutDate: '2026-10-11', nights: 3, numberOfGuests: 1, status: 'Checked-In', bookingSource: 'Direct Walk-in', nightlyRate: 2500, totalAmount: 7500, depositPaid: 2500, paymentStatus: 'Partial' },
  { idNumber: 102, bookingRef: 'RES-8492', guestId: 2, guestName: 'Sarah Jenkins', guestPhone: '+1 415 555 0192', idPassportNumber: 'USA-992014', idType: 'Passport', roomId: 3, roomNumber: '103', roomType: 'Deluxe Double', checkInDate: '2026-10-09', checkOutDate: '2026-10-13', nights: 4, numberOfGuests: 2, status: 'Checked-In', bookingSource: 'Booking.com', nightlyRate: 4000, totalAmount: 16000, depositPaid: 16000, paymentStatus: 'Paid' },
  { idNumber: 103, bookingRef: 'RES-8493', guestId: 3, guestName: 'Ato Solomon Bekele', guestPhone: '+251 912 345 678', idPassportNumber: 'ETH-102938', idType: 'National ID (Fayda / FIN)', roomId: 5, roomNumber: '201', roomType: 'Executive Suite', checkInDate: '2026-10-07', checkOutDate: '2026-10-12', nights: 5, numberOfGuests: 2, status: 'Checked-In', bookingSource: 'Corporate Partner', nightlyRate: 8500, totalAmount: 42500, depositPaid: 20000, paymentStatus: 'Partial' },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist', 'Cashier', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const count = await ReservationModel.countDocuments();
    if (count === 0) {
      await ReservationModel.insertMany(INITIAL_RESERVATIONS, { ordered: false }).catch(() => {});
    }

    const docs = await ReservationModel.find().sort({ idNumber: -1 }).lean();
    const reservations = docs.map((r: any) => ({
      id: r.idNumber,
      bookingRef: r.bookingRef,
      guestId: r.guestId,
      guestName: r.guestName,
      guestPhone: r.guestPhone,
      guestEmail: r.guestEmail,
      idNumber: r.idPassportNumber,
      idType: r.idType,
      idImageUrl: r.idImageUrl,
      dateOfBirth: r.dateOfBirth,
      nationality: r.nationality,
      roomId: r.roomId,
      roomNumber: r.roomNumber,
      roomType: r.roomType,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
      nights: r.nights,
      numberOfGuests: r.numberOfGuests,
      status: r.status,
      bookingSource: r.bookingSource,
      nightlyRate: r.nightlyRate,
      totalAmount: r.totalAmount,
      depositPaid: r.depositPaid,
      paymentStatus: r.paymentStatus,
      specialRequests: r.specialRequests,
      contractId: r.contractId,
      contractName: r.contractName,
      mealPlan: r.mealPlan || 'Room Only',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, reservations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new reservation with OVERLAP INTEGRITY GUARD (Fix 5)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const {
      guestId,
      guestName,
      guestPhone,
      guestEmail,
      idNumber,
      idPassportNumber,
      idType,
      idImageUrl,
      dateOfBirth,
      nationality,
      roomId,
      roomNumber,
      roomType,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      status,
      bookingSource,
      nightlyRate,
      depositPaid,
      specialRequests,
      contractId,
      contractName,
      mealPlan,
    } = body;

    const guestIdNum = String(idPassportNumber || idNumber || '').trim();

    // 1. Strict validation of all necessary guest information
    if (!guestName || !String(guestName).trim()) {
      return NextResponse.json({ success: false, error: 'Guest Full Name is required.' }, { status: 400 });
    }
    if (!guestPhone || !String(guestPhone).trim()) {
      return NextResponse.json({ success: false, error: 'Guest Phone Number is required.' }, { status: 400 });
    }
    if (!guestEmail || !String(guestEmail).trim()) {
      return NextResponse.json({ success: false, error: 'Guest Email Address is required.' }, { status: 400 });
    }
    if (!guestIdNum) {
      return NextResponse.json({ success: false, error: 'Guest ID Number or Passport is required.' }, { status: 400 });
    }
    if (!dateOfBirth || !String(dateOfBirth).trim()) {
      return NextResponse.json({ success: false, error: 'Guest Date of Birth / Age is required.' }, { status: 400 });
    }
    if (!nationality || !String(nationality).trim()) {
      return NextResponse.json({ success: false, error: 'Guest Nationality is required.' }, { status: 400 });
    }
    if (!roomId || !checkInDate || !checkOutDate || !nightlyRate) {
      return NextResponse.json(
        { success: false, error: 'Room selection, check-in date, check-out date, and rate are required.' },
        { status: 400 }
      );
    }

    // 2. Date validity checks
    const startMs = new Date(checkInDate).getTime();
    const endMs = new Date(checkOutDate).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return NextResponse.json(
        { success: false, error: 'Check-out date must be strictly after check-in date.' },
        { status: 400 }
      );
    }

    const nights = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
    const totalAmount = nights * Number(nightlyRate);
    const guestCount = Number(numberOfGuests) || 1;

    // 3. Room existence, capacity, and service status verification
    const roomDoc = await RoomModel.findOne({ idNumber: Number(roomId) });
    if (!roomDoc) {
      return NextResponse.json({ success: false, error: 'Selected room does not exist in the database.' }, { status: 404 });
    }
    if (roomDoc.status === 'Out of Service') {
      return NextResponse.json(
        { success: false, error: `Room #${roomDoc.roomNumber} is currently Out of Service and cannot be reserved.` },
        { status: 400 }
      );
    }
    if (guestCount > roomDoc.capacity) {
      return NextResponse.json(
        {
          success: false,
          error: `Guest count (${guestCount}) exceeds Room #${roomDoc.roomNumber} maximum capacity of ${roomDoc.capacity} guests.`,
        },
        { status: 400 }
      );
    }

    const todayStr = getEthiopianLocalDate();
    if (checkInDate <= todayStr && roomDoc.status === 'Occupied') {
      return NextResponse.json(
        {
          success: false,
          error: `Room #${roomDoc.roomNumber} is currently occupied by another guest today (${roomDoc.currentGuestName || 'Guest'}).`,
        },
        { status: 409 }
      );
    }

    // 4. RESERVATION OVERLAP INTEGRITY GUARD: Strict check against all active bookings
    const activeExistingBookings = await ReservationModel.find({
      roomId: Number(roomId),
      status: { $in: ['Reserved', 'Checked-In'] },
    }).lean();

    for (const booking of activeExistingBookings) {
      if (isDateRangeOverlapping(checkInDate, checkOutDate, booking.checkInDate, booking.checkOutDate)) {
        return NextResponse.json(
          {
            success: false,
            error: `Booking Conflict! Room #${roomDoc.roomNumber} is already booked from ${booking.checkInDate} to ${booking.checkOutDate} (${booking.bookingRef} - ${booking.guestName}). Please choose different stay dates or another room.`,
          },
          { status: 409 }
        );
      }
    }

    // 5. Guest synchronization in GuestModel
    let guestDoc = await GuestModel.findOne({
      $or: [{ idPassportNumber: guestIdNum }, { fullName: String(guestName).trim() }],
    });
    if (!guestDoc) {
      const maxGuest = await GuestModel.findOne().sort({ idNumber: -1 }).lean();
      const nextGuestId = maxGuest ? maxGuest.idNumber + 1 : 1;
      guestDoc = await GuestModel.create({
        idNumber: nextGuestId,
        fullName: String(guestName).trim(),
        email: String(guestEmail).trim(),
        phone: String(guestPhone).trim(),
        idPassportNumber: guestIdNum,
        idType: idType || 'National ID (Fayda / FIN)',
        dateOfBirth: String(dateOfBirth).trim(),
        nationality: String(nationality).trim(),
        idImageUrl: idImageUrl || undefined,
        vipStatus: false,
        totalStays: 1,
        totalSpent: totalAmount,
      });
    } else {
      if (guestEmail) guestDoc.email = String(guestEmail).trim();
      if (guestPhone) guestDoc.phone = String(guestPhone).trim();
      if (dateOfBirth) guestDoc.dateOfBirth = String(dateOfBirth).trim();
      if (nationality) guestDoc.nationality = String(nationality).trim();
      guestDoc.totalStays = (guestDoc.totalStays || 0) + 1;
      await guestDoc.save();
    }

    // 6. Atomic Sequence generation & Reservation record creation
    const lastDoc = await ReservationModel.findOne().sort({ idNumber: -1 }).lean();
    const fallbackMax = lastDoc ? lastDoc.idNumber + 1 : 101;
    const nextId = await getNextSequenceValue('reservationId', fallbackMax);
    const bookingRef = `RES-${nextId + 8390}`;

    const newRes = await ReservationModel.create({
      idNumber: nextId,
      bookingRef,
      guestId: guestDoc?.idNumber || Number(guestId) || 1,
      guestName: String(guestName).trim(),
      guestPhone: String(guestPhone).trim(),
      guestEmail: String(guestEmail).trim(),
      idPassportNumber: guestIdNum,
      idType: idType || 'National ID (Fayda / FIN)',
      idImageUrl: idImageUrl || undefined,
      dateOfBirth: String(dateOfBirth).trim(),
      nationality: String(nationality).trim(),
      roomId: Number(roomId),
      roomNumber: roomDoc.roomNumber,
      roomType: roomDoc.type,
      checkInDate,
      checkOutDate,
      nights,
      numberOfGuests: guestCount,
      status: status || 'Reserved',
      bookingSource: bookingSource || 'Direct Walk-in',
      nightlyRate: Number(nightlyRate),
      totalAmount,
      depositPaid: Number(depositPaid) || 0,
      paymentStatus: Number(depositPaid) >= totalAmount ? 'Paid' : Number(depositPaid) > 0 ? 'Partial' : 'Pending',
      specialRequests: specialRequests || '',
      contractId: contractId ? Number(contractId) : undefined,
      contractName: contractName || undefined,
      mealPlan: mealPlan || 'Room Only',
    });

    // If check-in is immediate or today, sync room and daily report
    if (newRes.status === 'Checked-In' || checkInDate === todayStr) {
      await RoomModel.updateOne(
        { idNumber: Number(roomId) },
        {
          $set: {
            status: 'Occupied',
            currentGuestName: guestName,
            currentGuestPhone: guestPhone || '',
            currentGuestIdNumber: guestIdNum,
            currentGuestIdType: idType || 'National ID (Fayda / FIN)',
            currentIdImageUrl: idImageUrl || '',
            currentCheckIn: checkInDate,
            currentCheckOut: checkOutDate,
            currentReservationId: newRes.idNumber,
          },
        }
      );

      // Financial Integration: Register Room Revenue in Daily Report
      const roomCharge = newRes.totalAmount || 0;
      let dailyReport = await DailyReportModel.findOne({ date: todayStr });
      const saleEntry = {
        reservationId: newRes.idNumber,
        bookingRef: newRes.bookingRef,
        roomNumber: newRes.roomNumber,
        roomType: newRes.roomType,
        guestName: newRes.guestName,
        guestPhone: newRes.guestPhone,
        idNumber: guestIdNum,
        idType: newRes.idType,
        checkInDate: newRes.checkInDate,
        checkOutDate: newRes.checkOutDate,
        nights: newRes.nights,
        rate: newRes.nightlyRate,
        total: newRes.totalAmount,
        depositPaid: newRes.depositPaid,
        balanceDue: Math.max(0, newRes.totalAmount - newRes.depositPaid),
        mealPlan: newRes.mealPlan,
        paymentStatus: newRes.paymentStatus,
        status: newRes.status,
      };

      if (!dailyReport) {
        try {
          dailyReport = await DailyReportModel.create({
            date: todayStr,
            totalRevenue: roomCharge,
            totalCogs: 0,
            netProfit: roomCharge,
            totalOrders: 0,
            roomRevenue: roomCharge,
            foodRevenue: 0,
            otherRevenue: 0,
            totalLodgingBookings: 1,
            roomSales: [saleEntry],
            itemsSold: [],
          });
        } catch {
          dailyReport = await DailyReportModel.findOne({ date: todayStr });
        }
      } else {
        dailyReport.totalRevenue += roomCharge;
        dailyReport.netProfit += roomCharge;
        dailyReport.roomRevenue = (dailyReport.roomRevenue || 0) + roomCharge;
        dailyReport.totalLodgingBookings = (dailyReport.totalLodgingBookings || 0) + 1;
        if (!dailyReport.roomSales) dailyReport.roomSales = [];
        dailyReport.roomSales.push(saleEntry);
        await dailyReport.save();
      }
    }

    // Automated Accounting Integration: Post Guest Deposit & Room Stay Journals
    try {
      const actorName = auth.userDoc?.name || auth.session?.username || 'Receptionist';
      if (newRes.depositPaid > 0) {
        await AccountingIntegrationService.postGuestDepositJournal({
          reservationId: newRes.idNumber,
          bookingRef: newRes.bookingRef,
          guestName: newRes.guestName,
          depositAmount: newRes.depositPaid,
          paymentMethod: 'Cash',
          postedBy: actorName,
        });
      }

      if (newRes.status === 'Checked-In' || checkInDate === todayStr) {
        await AccountingIntegrationService.postRoomNightAuditJournal({
          reservationId: newRes.idNumber,
          bookingRef: newRes.bookingRef,
          roomNumber: newRes.roomNumber,
          guestName: newRes.guestName,
          nightlyRate: newRes.nightlyRate,
          postedBy: actorName,
        });
      }
    } catch (acctErr: any) {
      console.warn('Reservation Accounting Journal notice:', acctErr.message);
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: newRes.idNumber,
        bookingRef: newRes.bookingRef,
        guestId: newRes.guestId,
        guestName: newRes.guestName,
        guestPhone: newRes.guestPhone,
        idNumber: newRes.idPassportNumber,
        idType: newRes.idType,
        idImageUrl: newRes.idImageUrl,
        roomId: newRes.roomId,
        roomNumber: newRes.roomNumber,
        roomType: newRes.roomType,
        checkInDate: newRes.checkInDate,
        checkOutDate: newRes.checkOutDate,
        nights: newRes.nights,
        numberOfGuests: newRes.numberOfGuests,
        status: newRes.status,
        bookingSource: newRes.bookingSource,
        nightlyRate: newRes.nightlyRate,
        totalAmount: newRes.totalAmount,
        depositPaid: newRes.depositPaid,
        paymentStatus: newRes.paymentStatus,
        specialRequests: newRes.specialRequests,
        createdAt: newRes.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update reservation status (Checked-In, Checked-Out, Cancelled) or dates
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, status, paymentStatus, depositPaid, checkInDate, checkOutDate, roomId } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Reservation ID is required' }, { status: 400 });

    const reservation = await ReservationModel.findOne({ idNumber: Number(id) });
    if (!reservation) return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });

    // Date/Room Overlap validation if dates or room are changing
    const newRoomId = roomId ? Number(roomId) : reservation.roomId;
    const newCheckIn = checkInDate || reservation.checkInDate;
    const newCheckOut = checkOutDate || reservation.checkOutDate;

    if (checkInDate || checkOutDate || roomId) {
      const activeExistingBookings = await ReservationModel.find({
        idNumber: { $ne: reservation.idNumber },
        roomId: newRoomId,
        status: { $in: ['Reserved', 'Checked-In'] },
      }).lean();

      for (const booking of activeExistingBookings) {
        if (isDateRangeOverlapping(newCheckIn, newCheckOut, booking.checkInDate, booking.checkOutDate)) {
          return NextResponse.json(
            {
              success: false,
              error: `Date conflict! Room is already booked from ${booking.checkInDate} to ${booking.checkOutDate} (${booking.bookingRef}).`,
            },
            { status: 409 }
          );
        }
      }
    }

    if (status) reservation.status = status;
    if (paymentStatus) reservation.paymentStatus = paymentStatus;
    if (depositPaid !== undefined) reservation.depositPaid = Number(depositPaid);
    if (checkInDate) reservation.checkInDate = checkInDate;
    if (checkOutDate) reservation.checkOutDate = checkOutDate;
    if (roomId) reservation.roomId = Number(roomId);

    await reservation.save();

    // Sync corresponding Room status
    if (status === 'Checked-In') {
      await RoomModel.updateOne(
        { idNumber: reservation.roomId },
        {
          $set: {
            status: 'Occupied',
            currentGuestName: reservation.guestName,
            currentGuestPhone: reservation.guestPhone,
            currentGuestIdNumber: reservation.idPassportNumber,
            currentGuestIdType: reservation.idType,
            currentIdImageUrl: reservation.idImageUrl,
            currentCheckIn: reservation.checkInDate,
            currentCheckOut: reservation.checkOutDate,
            currentReservationId: reservation.idNumber,
          },
        }
      );
    } else if (status === 'Checked-Out') {
      // Per spec: room becomes Available (Clean) right after checkout — no housekeeping status in reception
      await RoomModel.updateOne(
        { idNumber: reservation.roomId },
        {
          $set: {
            status: 'Clean',
            currentGuestName: '',
            currentGuestPhone: '',
            currentGuestIdNumber: '',
            currentGuestIdType: '',
            currentIdImageUrl: '',
            currentCheckIn: '',
            currentCheckOut: '',
            currentReservationId: undefined,
          },
        }
      );

      // Automated Accounting Integration: Post Checkout Settlement Journal
      try {
        const actorName = auth.userDoc?.name || auth.session?.username || 'Receptionist';
        const depositUsed = reservation.depositPaid || 0;
        const balancePaid = Math.max(0, reservation.totalAmount - depositUsed);
        await AccountingIntegrationService.postGuestCheckoutSettlementJournal({
          reservationId: reservation.idNumber,
          bookingRef: reservation.bookingRef,
          roomNumber: reservation.roomNumber,
          guestName: reservation.guestName,
          totalBilled: reservation.totalAmount,
          depositUsed,
          balancePaid,
          paymentMethod: 'Cash',
          postedBy: actorName,
        });
      } catch (acctErr: any) {
        console.warn('Checkout Settlement Journal notice:', acctErr.message);
      }
    } else if (status === 'Cancelled') {
      await RoomModel.updateOne(
        { idNumber: reservation.roomId, currentReservationId: reservation.idNumber },
        {
          $set: {
            status: 'Clean',
            currentGuestName: '',
            currentGuestPhone: '',
            currentGuestIdNumber: '',
            currentGuestIdType: '',
            currentIdImageUrl: '',
            currentCheckIn: '',
            currentCheckOut: '',
            currentReservationId: undefined,
          },
        }
      );
    }

    return NextResponse.json({ success: true, message: `Reservation ${reservation.bookingRef} updated successfully` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
