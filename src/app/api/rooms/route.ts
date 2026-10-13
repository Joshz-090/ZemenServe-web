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
      currentGuestPhone: r.currentGuestPhone,
      currentGuestIdNumber: r.currentGuestIdNumber,
      currentGuestIdType: r.currentGuestIdType,
      currentIdImageUrl: r.currentIdImageUrl,
      currentCheckIn: r.currentCheckIn,
      currentCheckOut: r.currentCheckOut,
      currentReservationId: r.currentReservationId,
    }));

    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create single room or batch generate rooms of a specific type (Admin & Manager)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { isBatch, quantity, startNumber, roomNumber, type, floor, pricePerNight, capacity, amenities } = body;

    if (!type || !pricePerNight || !floor) {
      return NextResponse.json(
        { success: false, error: 'Room type, price per night, and floor number are required.' },
        { status: 400 }
      );
    }

    // Determine current max idNumber
    const maxDoc = await RoomModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    let nextId = (maxDoc?.idNumber || 0) + 1;

    const createdRooms = [];

    if (isBatch && quantity && Number(quantity) > 0) {
      const count = Number(quantity);
      const start = Number(startNumber) || (Number(floor) * 100 + 1);

      for (let i = 0; i < count; i++) {
        const generatedNum = String(start + i);
        // Check if room number already exists
        const exists = await RoomModel.findOne({ roomNumber: generatedNum });
        if (exists) {
          continue; // skip duplicate room numbers
        }

        const newRoom = new RoomModel({
          idNumber: nextId++,
          roomNumber: generatedNum,
          type: type.trim(),
          floor: Number(floor),
          pricePerNight: Number(pricePerNight),
          capacity: Number(capacity) || 2,
          status: 'Clean',
          amenities: Array.isArray(amenities) ? amenities : ['Free Wi-Fi', 'TV'],
        });

        await newRoom.save();
        createdRooms.push({
          id: newRoom.idNumber,
          roomNumber: newRoom.roomNumber,
          type: newRoom.type,
          floor: newRoom.floor,
          pricePerNight: newRoom.pricePerNight,
          capacity: newRoom.capacity,
          status: newRoom.status,
          amenities: newRoom.amenities,
        });
      }

      if (createdRooms.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No rooms could be created. The room numbers might already exist.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully created ${createdRooms.length} rooms for ${type}!`,
        rooms: createdRooms,
      });
    } else {
      // Single room creation
      const targetRoomNum = String(roomNumber || '').trim();
      if (!targetRoomNum) {
        return NextResponse.json({ success: false, error: 'Room number is required.' }, { status: 400 });
      }

      const exists = await RoomModel.findOne({ roomNumber: targetRoomNum });
      if (exists) {
        return NextResponse.json(
          { success: false, error: `Room #${targetRoomNum} already exists in the system.` },
          { status: 409 }
        );
      }

      const newRoom = new RoomModel({
        idNumber: nextId,
        roomNumber: targetRoomNum,
        type: type.trim(),
        floor: Number(floor),
        pricePerNight: Number(pricePerNight),
        capacity: Number(capacity) || 2,
        status: 'Clean',
        amenities: Array.isArray(amenities) ? amenities : ['Free Wi-Fi', 'TV'],
      });

      await newRoom.save();

      return NextResponse.json({
        success: true,
        message: `Room #${targetRoomNum} (${type}) created successfully!`,
        room: {
          id: newRoom.idNumber,
          roomNumber: newRoom.roomNumber,
          type: newRoom.type,
          floor: newRoom.floor,
          pricePerNight: newRoom.pricePerNight,
          capacity: newRoom.capacity,
          status: newRoom.status,
          amenities: newRoom.amenities,
        },
      });
    }
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
    const {
      roomId,
      id,
      status,
      currentGuestName,
      currentGuestPhone,
      currentGuestIdNumber,
      currentGuestIdType,
      currentIdImageUrl,
      currentCheckIn,
      currentCheckOut,
      currentReservationId,
      pricePerNight,
      type,
      floor,
      capacity,
      amenities,
    } = body;

    const targetId = Number(roomId || id);
    if (!targetId) return NextResponse.json({ success: false, error: 'Room ID is required' }, { status: 400 });

    const room = await RoomModel.findOne({ idNumber: targetId });
    if (!room) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });

    if (status) room.status = status;
    if (currentGuestName !== undefined) room.currentGuestName = currentGuestName;
    if (currentGuestPhone !== undefined) room.currentGuestPhone = currentGuestPhone;
    if (currentGuestIdNumber !== undefined) room.currentGuestIdNumber = currentGuestIdNumber;
    if (currentGuestIdType !== undefined) room.currentGuestIdType = currentGuestIdType;
    if (currentIdImageUrl !== undefined) room.currentIdImageUrl = currentIdImageUrl;
    if (currentCheckIn !== undefined) room.currentCheckIn = currentCheckIn;
    if (currentCheckOut !== undefined) room.currentCheckOut = currentCheckOut;
    if (currentReservationId !== undefined) room.currentReservationId = currentReservationId;
    if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);
    if (type !== undefined) room.type = String(type).trim();
    if (floor !== undefined) room.floor = Number(floor);
    if (capacity !== undefined) room.capacity = Number(capacity);
    if (Array.isArray(amenities)) room.amenities = amenities;

    await room.save();

    return NextResponse.json({
      success: true,
      message: `Room #${room.roomNumber} updated successfully`,
      room: {
        id: room.idNumber,
        roomNumber: room.roomNumber,
        type: room.type,
        floor: room.floor,
        pricePerNight: room.pricePerNight,
        capacity: room.capacity,
        status: room.status,
        amenities: room.amenities,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a room (Admin only, cannot delete if Occupied)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const roomId = Number(searchParams.get('id'));

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID is required' }, { status: 400 });
    }

    const room = await RoomModel.findOne({ idNumber: roomId });
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'Occupied') {
      return NextResponse.json(
        { success: false, error: `Cannot delete Room #${room.roomNumber} while it is Occupied by a guest.` },
        { status: 400 }
      );
    }

    await RoomModel.deleteOne({ idNumber: roomId });

    return NextResponse.json({
      success: true,
      message: `Room #${room.roomNumber} deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
