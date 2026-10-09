import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { RoomModel } from '@/lib/models/Room';
import { verifySessionAndRole } from '@/lib/auth';

const INITIAL_ROOMS = [
  { idNumber: 1, roomNumber: '101', type: 'Standard Single', floor: 1, pricePerNight: 2500, capacity: 1, status: 'Occupied', amenities: ['Free Wi-Fi', 'TV', 'Ensuite Bathroom'], currentGuestName: 'Dawit Yohannes', currentReservationId: 101 },
  { idNumber: 2, roomNumber: '102', type: 'Standard Single', floor: 1, pricePerNight: 2500, capacity: 1, status: 'Clean', amenities: ['Free Wi-Fi', 'TV', 'Ensuite Bathroom'] },
  { idNumber: 3, roomNumber: '103', type: 'Deluxe Double', floor: 1, pricePerNight: 4000, capacity: 2, status: 'Occupied', amenities: ['Free Wi-Fi', '4K Smart TV', 'Balcony', 'MiniBar'], currentGuestName: 'Sarah Jenkins', currentReservationId: 102 },
  { idNumber: 4, roomNumber: '104', type: 'Deluxe Double', floor: 1, pricePerNight: 4000, capacity: 2, status: 'Dirty', amenities: ['Free Wi-Fi', '4K Smart TV', 'Balcony', 'MiniBar'] },
  { idNumber: 5, roomNumber: '201', type: 'Executive Suite', floor: 2, pricePerNight: 8500, capacity: 3, status: 'Occupied', amenities: ['Free Wi-Fi', 'Jacuzzi', 'Living Lounge', 'Espresso Machine', 'City View'], currentGuestName: 'Ato Solomon Bekele', currentReservationId: 103 },
  { idNumber: 6, roomNumber: '202', type: 'Executive Suite', floor: 2, pricePerNight: 8500, capacity: 3, status: 'Inspected', amenities: ['Free Wi-Fi', 'Jacuzzi', 'Living Lounge', 'Espresso Machine', 'City View'] },
  { idNumber: 7, roomNumber: '301', type: 'Presidential Suite', floor: 3, pricePerNight: 18000, capacity: 4, status: 'Clean', amenities: ['24/7 Butler', 'Panoramic View', 'Private Bar', 'Jacuzzi', 'Meeting Area'] },
  { idNumber: 8, roomNumber: '302', type: 'Family Suite', floor: 3, pricePerNight: 7000, capacity: 4, status: 'Out of Service', amenities: ['2 Bedrooms', 'Kitchenette', 'Free Wi-Fi', 'Playstation 5'] },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist', 'Housekeeper', 'Cashier', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const count = await RoomModel.countDocuments();
    if (count === 0) {
      await RoomModel.insertMany(INITIAL_ROOMS, { ordered: false }).catch(() => {});
    }

    const docs = await RoomModel.find().sort({ idNumber: 1 }).lean();
    const rooms = docs.map((r: any) => ({
      id: r.idNumber,
      roomNumber: r.roomNumber,
      type: r.type,
      floor: r.floor,
      pricePerNight: r.pricePerNight,
      capacity: r.capacity,
      status: r.status,
      amenities: r.amenities || [],
      currentGuestName: r.currentGuestName,
      currentReservationId: r.currentReservationId,
    }));

    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist', 'Housekeeper']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { roomId, status, currentGuestName, currentReservationId, pricePerNight } = body;

    if (!roomId) return NextResponse.json({ success: false, error: 'Room ID is required' }, { status: 400 });

    const room = await RoomModel.findOne({ idNumber: Number(roomId) });
    if (!room) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });

    if (status) room.status = status;
    if (currentGuestName !== undefined) room.currentGuestName = currentGuestName;
    if (currentReservationId !== undefined) room.currentReservationId = currentReservationId;
    if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);

    await room.save();

    return NextResponse.json({ success: true, message: 'Room updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
