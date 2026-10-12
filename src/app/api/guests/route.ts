import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { GuestModel } from '@/lib/models/Guest';
import { verifySessionAndRole } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/models/Counter';

const INITIAL_GUESTS = [
  { idNumber: 1, fullName: 'Dawit Yohannes', email: 'dawit.y@example.com', phone: '+251 911 223 344', idPassportNumber: 'ETH-849204', idType: 'National ID', nationality: 'Ethiopian', vipStatus: true, totalStays: 5, totalSpent: 42500, notes: 'Prefers high floor rooms' },
  { idNumber: 2, fullName: 'Sarah Jenkins', email: 'sarah.j@travel.com', phone: '+1 415 555 0192', idPassportNumber: 'USA-992014', idType: 'Passport', nationality: 'United States', vipStatus: false, totalStays: 2, totalSpent: 18400, notes: 'Allergic to nuts' },
  { idNumber: 3, fullName: 'Ato Solomon Bekele', email: 'solomon@bekelegroup.et', phone: '+251 912 345 678', idPassportNumber: 'ETH-102938', idType: 'National ID', nationality: 'Ethiopian', vipStatus: true, totalStays: 12, totalSpent: 128000, notes: 'Corporate VIP Account' },
];

// GET all guests
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist', 'Cashier', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const count = await GuestModel.countDocuments();
    if (count === 0) {
      await GuestModel.insertMany(INITIAL_GUESTS, { ordered: false }).catch(() => {});
    }

    const docs = await GuestModel.find().sort({ idNumber: 1 }).lean();
    const guests = docs.map((g: any) => ({
      id: g.idNumber,
      fullName: g.fullName,
      email: g.email,
      phone: g.phone,
      idPassportNumber: g.idPassportNumber,
      idType: g.idType,
      idImageUrl: g.idImageUrl,
      nationality: g.nationality,
      vipStatus: g.vipStatus,
      totalStays: g.totalStays,
      totalSpent: g.totalSpent,
      notes: g.notes,
    }));

    return NextResponse.json({ success: true, guests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST create new guest
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { fullName, email, phone, idPassportNumber, idType, idImageUrl, nationality, vipStatus, notes } = body;

    if (!fullName || !phone || !idPassportNumber) {
      return NextResponse.json({ success: false, error: 'Full name, phone, and ID/Passport number are required' }, { status: 400 });
    }

    const maxDoc = await GuestModel.findOne().sort({ idNumber: -1 }).lean();
    const fallbackMax = maxDoc ? maxDoc.idNumber + 1 : 1;
    const nextId = await getNextSequenceValue('guestId', fallbackMax);

    const newGuest = await GuestModel.create({
      idNumber: nextId,
      fullName,
      email: email || '',
      phone,
      idPassportNumber,
      idType: idType || 'National ID (Fayda / FIN)',
      idImageUrl: idImageUrl || undefined,
      nationality: nationality || 'Ethiopian',
      vipStatus: Boolean(vipStatus),
      totalStays: 0,
      totalSpent: 0,
      notes: notes || '',
    });

    return NextResponse.json({
      success: true,
      guest: {
        id: newGuest.idNumber,
        fullName: newGuest.fullName,
        email: newGuest.email,
        phone: newGuest.phone,
        idPassportNumber: newGuest.idPassportNumber,
        idType: newGuest.idType,
        idImageUrl: newGuest.idImageUrl,
        nationality: newGuest.nationality,
        vipStatus: newGuest.vipStatus,
        totalStays: newGuest.totalStays,
        totalSpent: newGuest.totalSpent,
        notes: newGuest.notes,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT update guest details
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, fullName, email, phone, idPassportNumber, idType, idImageUrl, nationality, vipStatus, notes } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Guest ID is required' }, { status: 400 });

    const guest = await GuestModel.findOne({ idNumber: Number(id) });
    if (!guest) return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });

    if (fullName) guest.fullName = fullName;
    if (email !== undefined) guest.email = email;
    if (phone) guest.phone = phone;
    if (idPassportNumber) guest.idPassportNumber = idPassportNumber;
    if (idType) guest.idType = idType;
    if (idImageUrl !== undefined) guest.idImageUrl = idImageUrl;
    if (nationality) guest.nationality = nationality;
    if (vipStatus !== undefined) guest.vipStatus = Boolean(vipStatus);
    if (notes !== undefined) guest.notes = notes;

    await guest.save();

    return NextResponse.json({ success: true, message: 'Guest details updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE delete guest
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'Guest ID is required' }, { status: 400 });

    await GuestModel.findOneAndDelete({ idNumber: Number(id) });
    return NextResponse.json({ success: true, message: 'Guest deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
