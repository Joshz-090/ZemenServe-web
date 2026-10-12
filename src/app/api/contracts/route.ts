import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ContractModel } from '@/lib/models/Contract';
import { verifySessionAndRole } from '@/lib/auth';

const INITIAL_CONTRACTS = [
  {
    idNumber: 1,
    contractNumber: 'CTR-2026-001',
    clientName: 'Ethiopian Airlines (Crew Operations)',
    clientType: 'Airline',
    contactPerson: 'Capt. Yonas Tefera',
    phone: '+251 911 500 600',
    email: 'crew.housing@ethiopianairlines.com',
    roomType: 'Deluxe Double',
    agreedRate: 3200,
    mealPlan: 'Full Board (FB)',
    includedAmenities: ['Buffet Breakfast', 'Lunch & Dinner Included', 'Airport Shuttle Service', 'High-Speed Wi-Fi', 'Free Laundry'],
    discountPercentage: 20,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    notes: 'Standing airline crew agreement: 3 meals/day included at hotel restaurant.',
    status: 'Active',
    createdBy: 'Manager',
  },
  {
    idNumber: 2,
    contractNumber: 'CTR-2026-002',
    clientName: 'UN Development Programme (UNDP Ethiopia)',
    clientType: 'Government / NGO',
    contactPerson: 'Dr. Helen Mengistu',
    phone: '+251 912 334 455',
    email: 'admin.procurement@undp.org',
    roomType: 'Executive Suite',
    agreedRate: 6500,
    mealPlan: 'Bed & Breakfast (BB)',
    includedAmenities: ['Complimentary Buffet Breakfast', 'Executive Lounge Access', 'Spa Access', 'Airport Shuttle', 'High-Speed Wi-Fi'],
    discountPercentage: 23,
    startDate: '2026-02-15',
    endDate: '2026-12-31',
    notes: 'Exempted from local service charge. Bed & breakfast with complimentary spa.',
    status: 'Active',
    createdBy: 'Admin',
  },
  {
    idNumber: 3,
    contractNumber: 'CTR-2026-003',
    clientName: 'Commercial Bank of Ethiopia (Executive Training)',
    clientType: 'Corporate',
    contactPerson: 'Ato Biruk Teshome',
    phone: '+251 911 889 900',
    email: 'training@cbe.com.et',
    roomType: 'Standard Single',
    agreedRate: 2000,
    mealPlan: 'Half Board (HB)',
    includedAmenities: ['Breakfast & Dinner Included', 'Free Wi-Fi', 'Gym Access'],
    discountPercentage: 20,
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    notes: 'Corporate trainee lodging package with dinner and breakfast.',
    status: 'Active',
    createdBy: 'Manager',
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Receptionist', 'Accountant', 'Cashier']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const count = await ContractModel.countDocuments();
    if (count === 0) {
      await ContractModel.insertMany(INITIAL_CONTRACTS, { ordered: false }).catch(() => {});
    }

    const docs = await ContractModel.find().sort({ idNumber: -1 }).lean();
    const contracts = docs.map((c: any) => ({
      id: c.idNumber,
      contractNumber: c.contractNumber,
      clientName: c.clientName,
      clientType: c.clientType,
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email,
      roomType: c.roomType,
      agreedRate: c.agreedRate,
      mealPlan: c.mealPlan,
      includedAmenities: c.includedAmenities || [],
      discountPercentage: c.discountPercentage || 0,
      startDate: c.startDate,
      endDate: c.endDate,
      notes: c.notes,
      status: c.status,
      createdBy: c.createdBy,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, contracts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const {
      clientName,
      clientType,
      contactPerson,
      phone,
      email,
      roomType,
      agreedRate,
      mealPlan,
      includedAmenities,
      discountPercentage,
      startDate,
      endDate,
      notes,
    } = body;

    if (!clientName || !contactPerson || !phone || !agreedRate || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Client name, contact person, phone, agreed rate, and dates are required.' },
        { status: 400 }
      );
    }

    const maxDoc = await ContractModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;
    const contractNumber = `CTR-2026-${String(nextId).padStart(3, '0')}`;

    const newContract = new ContractModel({
      idNumber: nextId,
      contractNumber,
      clientName: clientName.trim(),
      clientType: clientType || 'Corporate',
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      roomType: roomType || 'All Room Types',
      agreedRate: Number(agreedRate),
      mealPlan: mealPlan || 'Room Only',
      includedAmenities: Array.isArray(includedAmenities) ? includedAmenities : ['Buffet Breakfast', 'Free Wi-Fi'],
      discountPercentage: Number(discountPercentage) || 0,
      startDate,
      endDate,
      notes: notes || '',
      status: 'Active',
      createdBy: auth.session?.name || 'Manager',
    });

    await newContract.save();

    return NextResponse.json({
      success: true,
      message: `Contract ${contractNumber} for "${clientName}" created successfully!`,
      contract: {
        id: newContract.idNumber,
        contractNumber: newContract.contractNumber,
        clientName: newContract.clientName,
        clientType: newContract.clientType,
        contactPerson: newContract.contactPerson,
        phone: newContract.phone,
        email: newContract.email,
        roomType: newContract.roomType,
        agreedRate: newContract.agreedRate,
        mealPlan: newContract.mealPlan,
        includedAmenities: newContract.includedAmenities,
        discountPercentage: newContract.discountPercentage,
        startDate: newContract.startDate,
        endDate: newContract.endDate,
        notes: newContract.notes,
        status: newContract.status,
        createdBy: newContract.createdBy,
        createdAt: newContract.createdAt.toISOString(),
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
    const { id, status, agreedRate, mealPlan, includedAmenities, notes } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Contract ID is required.' }, { status: 400 });

    const contract = await ContractModel.findOne({ idNumber: Number(id) });
    if (!contract) return NextResponse.json({ success: false, error: 'Contract not found.' }, { status: 404 });

    if (status) contract.status = status;
    if (agreedRate !== undefined) contract.agreedRate = Number(agreedRate);
    if (mealPlan !== undefined) contract.mealPlan = mealPlan;
    if (Array.isArray(includedAmenities)) contract.includedAmenities = includedAmenities;
    if (notes !== undefined) contract.notes = notes;

    await contract.save();

    return NextResponse.json({
      success: true,
      message: `Contract ${contract.contractNumber} updated successfully!`,
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

    if (!id) return NextResponse.json({ success: false, error: 'Contract ID is required.' }, { status: 400 });

    await ContractModel.deleteOne({ idNumber: id });

    return NextResponse.json({
      success: true,
      message: 'Contract removed successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
