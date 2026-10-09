import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ReservationModel } from '@/lib/models/Reservation';
import { RoomModel } from '@/lib/models/Room';
import { verifySessionAndRole } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { isDateRangeOverlapping, getEthiopianLocalDate } from '@/lib/dateUtils';

const INITIAL_RESERVATIONS = [
  { idNumber: 101, bookingRef: 'RES-8491', guestId: 1, guestName: 'Dawit Yohannes', guestPhone: '+251 911 223 344', roomId: 1, roomNumber: '101', roomType: 'Standard Single', checkInDate: '2026-10-08', checkOutDate: '2026-10-11', nights: 3, numberOfGuests: 1, status: 'Checked-In', bookingSource: 'Direct Walk-in', nightlyRate: 2500, totalAmount: 7500, depositPaid: 2500, paymentStatus: 'Partial' },
  { idNumber: 102, bookingRef: 'RES-8492', guestId: 2, guestName: 'Sarah Jenkins', guestPhone: '+1 415 555 0192', roomId: 3, roomNumber: '103', roomType: 'Deluxe Double', checkInDate: '2026-10-09', checkOutDate: '2026-10-13', nights: 4, numberOfGuests: 2, status: 'Checked-In', bookingSource: 'Booking.com', nightlyRate: 4000, totalAmount: 16000, depositPaid: 16000, paymentStatus: 'Paid' },
  { idNumber: 103, bookingRef: 'RES-8493', guestId: 3, guestName: 'Ato Solomon Bekele', guestPhone: '+251 912 345 678', roomId: 5, roomNumber: '201', roomType: 'Executive Suite', checkInDate: '2026-10-07', checkOutDate: '2026-10-12', nights: 5, numberOfGuests: 2, status: 'Checked-In', bookingSource: 'Corporate Partner', nightlyRate: 8500, totalAmount: 42500, depositPaid: 20000, paymentStatus: 'Partial' },
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
      roomId,
      roomNumber,
      roomType,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      bookingSource,
      nightlyRate,
      depositPaid,
      specialRequests,
    } = body;

    if (!guestName || !roomId || !checkInDate || !checkOutDate || !nightlyRate) {
      return NextResponse.json(
        { success: false, error: 'Guest name, room, check-in, check-out dates, and nightly rate are required.' },
        { status: 400 }
      );
    }

    // Calculate nights
    const startMs = new Date(checkInDate).getTime();
    const endMs = new Date(checkOutDate).getTime();
    if (endMs <= startMs) {
      return NextResponse.json(
        { success: false, error: 'Check-out date must be after check-in date.' },
        { status: 400 }
      );
    }

    const nights = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
    const totalAmount = nights * Number(nightlyRate);

    // ==========================================
    // RESERVATION OVERLAP INTEGRITY GUARD (Fix 5)
    // ==========================================
    const activeExistingBookings = await ReservationModel.find({
      roomId: Number(roomId),
      status: { $in: ['Reserved', 'Checked-In'] },
    }).lean();

    for (const booking of activeExistingBookings) {
      if (isDateRangeOverlapping(checkInDate, checkOutDate, booking.checkInDate, booking.checkOutDate)) {
        return NextResponse.json(
          {
            success: false,
            error: `Overlapping reservation conflict! Room ${roomNumber || roomId} is already booked from ${booking.checkInDate} to ${booking.checkOutDate} (${booking.bookingRef}).`,
          },
          { status: 409 }
        );
      }
    }

    // Atomic Sequence generation
    const lastDoc = await ReservationModel.findOne().sort({ idNumber: -1 }).lean();
    const fallbackMax = lastDoc ? lastDoc.idNumber + 1 : 101;
    const nextId = await getNextSequenceValue('reservationId', fallbackMax);
    const bookingRef = `RES-${nextId + 8390}`;

    const newRes = await ReservationModel.create({
      idNumber: nextId,
      bookingRef,
      guestId: Number(guestId) || 1,
      guestName,
      guestPhone: guestPhone || '',
      roomId: Number(roomId),
      roomNumber: roomNumber || String(roomId),
      roomType: roomType || 'Standard',
      checkInDate,
      checkOutDate,
      nights,
      numberOfGuests: Number(numberOfGuests) || 1,
      status: 'Reserved',
      bookingSource: bookingSource || 'Direct Walk-in',
      nightlyRate: Number(nightlyRate),
      totalAmount,
      depositPaid: Number(depositPaid) || 0,
      paymentStatus: Number(depositPaid) >= totalAmount ? 'Paid' : Number(depositPaid) > 0 ? 'Partial' : 'Pending',
      specialRequests: specialRequests || '',
    });

    // If check-in date is today, update Room status
    const todayStr = getEthiopianLocalDate();
    if (checkInDate === todayStr) {
      await RoomModel.updateOne(
        { idNumber: Number(roomId) },
        { $set: { status: 'Occupied', currentGuestName: guestName, currentReservationId: newRes.idNumber } }
      );
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: newRes.idNumber,
        bookingRef: newRes.bookingRef,
        guestId: newRes.guestId,
        guestName: newRes.guestName,
        guestPhone: newRes.guestPhone,
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
        { $set: { status: 'Occupied', currentGuestName: reservation.guestName, currentReservationId: reservation.idNumber } }
      );
    } else if (status === 'Checked-Out') {
      await RoomModel.updateOne(
        { idNumber: reservation.roomId },
        { $set: { status: 'Dirty', currentGuestName: '', currentReservationId: undefined } }
      );
    } else if (status === 'Cancelled') {
      await RoomModel.updateOne(
        { idNumber: reservation.roomId, currentReservationId: reservation.idNumber },
        { $set: { status: 'Clean', currentGuestName: '', currentReservationId: undefined } }
      );
    }

    return NextResponse.json({ success: true, message: `Reservation ${reservation.bookingRef} updated successfully` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
