import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { EventHallModel } from '@/lib/models/EventHall';
import { EventBookingModel } from '@/lib/models/EventBooking';
import { AuditLogModel } from '@/lib/models/AuditLog';
import { verifySessionAndRole } from '@/lib/auth';

const INITIAL_HALLS = [
  {
    idNumber: 1,
    name: 'Lalibela Grand Ballroom',
    hallType: 'Grand Ballroom',
    capacity: 350,
    hourlyRate: 5000,
    dailyRate: 35000,
    location: 'Ground Floor, Main Wing',
    amenities: ['4K Projector & Screen', 'Stage & Podium', 'LED Video Wall', 'VIP Lounge', 'Surround Sound System', 'High-Speed VIP Wi-Fi'],
    description: 'Premier grand ballroom with crystal chandeliers, customizable lighting, and integrated banquet staging for galas and large conventions.',
    status: 'Available',
  },
  {
    idNumber: 2,
    name: 'Axum Executive Conference Hall',
    hallType: 'Conference Hall',
    capacity: 80,
    hourlyRate: 2500,
    dailyRate: 18000,
    location: '1st Floor, Business Center',
    amenities: ['Smart Digital Whiteboard', 'Video Conferencing (Zoom/Teams)', 'Stage & Podium', 'Dedicated Coffee Station', 'Wireless Microphones'],
    description: 'High-tech conference hall designed for corporate summits, professional workshops, and executive seminars.',
    status: 'Available',
  },
  {
    idNumber: 3,
    name: 'Simien Boardroom',
    hallType: 'Executive Boardroom',
    capacity: 20,
    hourlyRate: 1200,
    dailyRate: 8000,
    location: '2nd Floor, Executive Suite Wing',
    amenities: ['Ergonomic Leather Chairs', '65" 4K OLED Display', 'HDMI/Wireless Screen Share Hub', 'Mini Fridge & Refreshments', 'Soundproof Acoustic Walls'],
    description: 'Intimate soundproof boardroom ideal for high-level board meetings, confidential negotiations, and VIP summits.',
    status: 'Available',
  },
  {
    idNumber: 4,
    name: 'Entoto Garden Pavilion',
    hallType: 'Outdoor / Garden Pavilion',
    capacity: 500,
    hourlyRate: 6000,
    dailyRate: 45000,
    location: 'Lakeside Botanical Grounds',
    amenities: ['Open-air Gazebo', 'Outdoor Ambient Lighting', 'Dedicated Buffet Station', 'Mobile PA Sound System', 'Private Restrooms', 'Generator Backup'],
    description: 'Scenic open-air garden pavilion surrounded by botanical landscaping, perfect for weddings, cocktail receptions, and evening festivals.',
    status: 'Available',
  },
  {
    idNumber: 5,
    name: 'Blue Nile Banquet Hall',
    hallType: 'Banquet Venue',
    capacity: 150,
    hourlyRate: 3000,
    dailyRate: 22000,
    location: 'Ground Floor, Restaurant Terrace',
    amenities: ['Banquet Dining Setup', 'Dedicated Buffet Station', 'Surround Sound System', 'Dance Floor', 'Air Conditioning & Climate Control'],
    description: 'Versatile celebration and dining hall with built-in buffet staging, ideal for family celebrations, anniversaries, and corporate dinners.',
    status: 'Available',
  },
];

export async function GET() {
  try {
    await connectToDatabase();

    const count = await EventHallModel.countDocuments();
    if (count === 0) {
      await EventHallModel.insertMany(INITIAL_HALLS);
    }

    const docs = await EventHallModel.find().sort({ idNumber: 1 }).lean();

    const halls = docs.map((doc: any) => ({
      id: doc.idNumber,
      name: doc.name,
      hallType: doc.hallType || 'Conference Hall',
      capacity: doc.capacity,
      hourlyRate: doc.hourlyRate || 0,
      dailyRate: doc.dailyRate,
      location: doc.location || 'Main Complex',
      amenities: doc.amenities || [],
      description: doc.description || '',
      status: doc.status || 'Available',
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, halls });
  } catch (error: any) {
    // If DB fails, fallback gracefully to initial halls
    return NextResponse.json({
      success: true,
      halls: INITIAL_HALLS.map((h) => ({ id: h.idNumber, ...h })),
      fallback: true,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      hallType,
      capacity,
      hourlyRate,
      dailyRate,
      location,
      amenities,
      description,
      status,
    } = body;

    if (!name || !capacity || !dailyRate) {
      return NextResponse.json(
        { success: false, error: 'Venue name, capacity (pax), and daily rate are required.' },
        { status: 400 }
      );
    }

    const maxDoc = await EventHallModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;

    const newHall = new EventHallModel({
      idNumber: nextId,
      name: name.trim(),
      hallType: hallType || 'Conference Hall',
      capacity: Number(capacity),
      hourlyRate: Number(hourlyRate) || 0,
      dailyRate: Number(dailyRate),
      location: location ? location.trim() : 'Main Complex',
      amenities: Array.isArray(amenities) ? amenities : ['Stage & Podium', 'High-Speed Wi-Fi'],
      description: description ? description.trim() : '',
      status: status || 'Available',
    });

    await newHall.save();

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: 'Create Event Hall',
        details: `Created venue "${newHall.name}" (${newHall.hallType}, Cap: ${newHall.capacity} pax, ${newHall.dailyRate} ETB/day)`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Venue "${newHall.name}" created successfully!`,
      hall: {
        id: newHall.idNumber,
        name: newHall.name,
        hallType: newHall.hallType,
        capacity: newHall.capacity,
        hourlyRate: newHall.hourlyRate,
        dailyRate: newHall.dailyRate,
        location: newHall.location,
        amenities: newHall.amenities,
        description: newHall.description,
        status: newHall.status,
        createdAt: newHall.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, name, hallType, capacity, hourlyRate, dailyRate, location, amenities, description, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Venue ID is required.' }, { status: 400 });
    }

    const hall = await EventHallModel.findOne({ idNumber: Number(id) });
    if (!hall) {
      return NextResponse.json({ success: false, error: 'Venue not found.' }, { status: 404 });
    }

    if (name) hall.name = name.trim();
    if (hallType) hall.hallType = hallType;
    if (capacity !== undefined) hall.capacity = Number(capacity);
    if (hourlyRate !== undefined) hall.hourlyRate = Number(hourlyRate);
    if (dailyRate !== undefined) hall.dailyRate = Number(dailyRate);
    if (location !== undefined) hall.location = location.trim();
    if (Array.isArray(amenities)) hall.amenities = amenities;
    if (description !== undefined) hall.description = description.trim();
    if (status) hall.status = status;

    await hall.save();

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: 'Update Event Hall',
        details: `Updated venue #${hall.idNumber} "${hall.name}" (${hall.status})`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Venue "${hall.name}" updated successfully!`,
      hall: {
        id: hall.idNumber,
        name: hall.name,
        hallType: hall.hallType,
        capacity: hall.capacity,
        hourlyRate: hall.hourlyRate,
        dailyRate: hall.dailyRate,
        location: hall.location,
        amenities: hall.amenities,
        description: hall.description,
        status: hall.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, error: 'Venue ID is required.' }, { status: 400 });
    }

    // Safety check: verify if active confirmed event bookings exist for this hall
    const activeBookings = await EventBookingModel.countDocuments({
      hallId: id,
      status: { $in: ['Confirmed', 'Tentative'] },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete this venue: There are ${activeBookings} active scheduled booking(s) associated with it. Cancel or reassign those bookings first.`,
        },
        { status: 400 }
      );
    }

    const hall = await EventHallModel.findOne({ idNumber: id });
    const hallName = hall ? hall.name : `#${id}`;

    await EventHallModel.deleteOne({ idNumber: id });

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: 'Delete Event Hall',
        details: `Deleted venue "${hallName}" (ID #${id})`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Venue "${hallName}" deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
