import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { EventBookingModel } from '@/lib/models/EventBooking';
import { verifySessionAndRole } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { AccountingIntegrationService } from '@/lib/accounting/integration.service';

export const dynamic = 'force-dynamic';

const INITIAL_BOOKINGS = [
  {
    idNumber: 1,
    bookingRef: 'EVT-2026-001',
    eventTitle: 'UN-Habitat Regional Sustainability Summit',
    organizerName: 'United Nations Economic Commission for Africa',
    organizerContact: '+251 911 300 400',
    hallId: 1,
    hallName: 'Lalibela Grand Ballroom',
    eventDate: '2026-10-18',
    startTime: '08:30',
    endTime: '17:00',
    expectedAttendees: 280,
    setupFormat: 'Classroom',
    cateringPackage: 'VIP Executive Full-Day Buffet',
    totalAmount: 185000,
    depositPaid: 92500,
    status: 'Confirmed',
  },
  {
    idNumber: 2,
    bookingRef: 'EVT-2026-002',
    eventTitle: 'Ethiopian Artificial Intelligence Institute Gala',
    organizerName: 'EAII Corporate Communications',
    organizerContact: '+251 922 455 677',
    hallId: 1,
    hallName: 'Lalibela Grand Ballroom',
    eventDate: '2026-10-24',
    startTime: '18:00',
    endTime: '23:00',
    expectedAttendees: 320,
    setupFormat: 'Banquet',
    cateringPackage: 'Royal Buffet & Beverage Station',
    totalAmount: 240000,
    depositPaid: 120000,
    status: 'Confirmed',
  },
];

// GET: Fetch all event bookings
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist', 'Cashier', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const count = await EventBookingModel.countDocuments();
    if (count === 0) {
      await EventBookingModel.insertMany(INITIAL_BOOKINGS).catch(() => {});
    }

    const docs = await EventBookingModel.find().sort({ idNumber: -1 }).lean();
    const bookings = docs.map((b: any) => ({
      id: b.idNumber,
      bookingRef: b.bookingRef,
      eventTitle: b.eventTitle,
      organizerName: b.organizerName,
      organizerContact: b.organizerContact,
      hallId: b.hallId,
      hallName: b.hallName,
      eventDate: b.eventDate,
      startTime: b.startTime,
      endTime: b.endTime,
      expectedAttendees: b.expectedAttendees,
      setupFormat: b.setupFormat,
      cateringPackage: b.cateringPackage,
      totalAmount: b.totalAmount,
      depositPaid: b.depositPaid,
      status: b.status,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, count: bookings.length, bookings });
  } catch (error: any) {
    console.error('Event Bookings GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch event bookings' },
      { status: 500 }
    );
  }
}

// POST: Create event booking and automatically record advance deposit liability journal
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const {
      eventTitle,
      organizerName,
      organizerContact,
      hallId,
      hallName,
      eventDate,
      startTime,
      endTime,
      expectedAttendees,
      setupFormat,
      cateringPackage,
      totalAmount,
      depositPaid,
      paymentMethod,
    } = body;

    if (!eventTitle || !organizerName || !eventDate || !hallId || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Title, Organizer, Date, Venue, and Total Amount are required.' },
        { status: 400 }
      );
    }

    const nextId = await getNextSequenceValue('eventBookingId', 10);
    const bookingRef = `EVT-2026-${String(nextId).padStart(3, '0')}`;

    const newBooking = await EventBookingModel.create({
      idNumber: nextId,
      bookingRef,
      eventTitle: eventTitle.trim(),
      organizerName: organizerName.trim(),
      organizerContact: organizerContact ? organizerContact.trim() : '',
      hallId: Number(hallId),
      hallName: hallName || 'Event Hall',
      eventDate: eventDate.trim(),
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      expectedAttendees: Number(expectedAttendees) || 50,
      setupFormat: setupFormat || 'Banquet',
      cateringPackage: cateringPackage || 'Standard Buffet',
      totalAmount: Number(totalAmount),
      depositPaid: Number(depositPaid) || 0,
      status: 'Confirmed',
    });

    // Automated Accounting Integration: Post Advance Deposit Liability Journal
    const actorName = auth.userDoc?.name || auth.session?.username || 'Receptionist';
    if (newBooking.depositPaid > 0) {
      try {
        await AccountingIntegrationService.postEventBookingDepositJournal({
          bookingId: newBooking.idNumber,
          bookingRef: newBooking.bookingRef,
          eventTitle: newBooking.eventTitle,
          organizerName: newBooking.organizerName,
          depositAmount: newBooking.depositPaid,
          paymentMethod: paymentMethod || 'Cash',
          postedBy: actorName,
        });
      } catch (acctErr: any) {
        console.warn('Event deposit journal notice:', acctErr.message);
      }
    }

    return NextResponse.json({ success: true, booking: newBooking }, { status: 201 });
  } catch (error: any) {
    console.error('Event Booking POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create event booking' },
      { status: 400 }
    );
  }
}

// PUT: Update event booking or complete settlement
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, status, depositPaid, paymentMethod } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    const booking = await EventBookingModel.findOne({ idNumber: Number(id) });
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const previousStatus = booking.status;
    if (status) booking.status = status;
    if (depositPaid !== undefined) booking.depositPaid = Number(depositPaid);

    await booking.save();

    const actorName = auth.userDoc?.name || auth.session?.username || 'Manager';

    // Automated Accounting Integration: Event Completion Settlement Hook
    if (status === 'Completed' && previousStatus !== 'Completed') {
      try {
        const depositUsed = booking.depositPaid || 0;
        const balancePaid = Math.max(0, booking.totalAmount - depositUsed);

        await AccountingIntegrationService.postEventSettlementJournal({
          bookingId: booking.idNumber,
          bookingRef: booking.bookingRef,
          eventTitle: booking.eventTitle,
          organizerName: booking.organizerName,
          totalAmount: booking.totalAmount,
          depositUsed,
          balancePaid,
          paymentMethod: paymentMethod || 'Bank Transfer',
          postedBy: actorName,
        });
      } catch (acctErr: any) {
        console.warn('Event settlement journal notice:', acctErr.message);
      }
    }

    return NextResponse.json({ success: true, message: `Event ${booking.bookingRef} updated successfully`, booking });
  } catch (error: any) {
    console.error('Event Booking PUT Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update event booking' },
      { status: 500 }
    );
  }
}
