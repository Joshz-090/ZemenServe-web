import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DepartmentModel } from '@/lib/models/Department';
import { verifySessionAndRole } from '@/lib/auth';

const INITIAL_DEPARTMENTS = [
  { idNumber: 1, code: 'FO', name: 'Front Office / Reception', managerName: 'Abebe Kebede', description: 'Guest check-in/out, concierge, room reservations and billing.', minStaffPerShift: { morning: 3, evening: 3, night: 2, general: 1 }, isActive: true },
  { idNumber: 2, code: 'RES', name: 'Reservations', managerName: 'Abebe Kebede', description: 'Central room reservations, corporate bookings and OTA channel management.', minStaffPerShift: { morning: 2, evening: 1, night: 0, general: 2 }, isActive: true },
  { idNumber: 3, code: 'HK', name: 'Housekeeping', managerName: 'Tigist Haile', description: 'Room cleaning, turndown service, linen management and public areas.', minStaffPerShift: { morning: 6, evening: 4, night: 1, general: 2 }, isActive: true },
  { idNumber: 4, code: 'FB', name: 'Food & Beverage', managerName: 'Dawit Yilma', description: 'Restaurant dining, bar service, room service and banqueting service.', minStaffPerShift: { morning: 4, evening: 6, night: 2, general: 1 }, isActive: true },
  { idNumber: 5, code: 'KIT', name: 'Kitchen & Culinary', managerName: 'Chef Daniel Mekonnen', description: 'Main kitchen food preparation, banquet buffets and pastry.', minStaffPerShift: { morning: 5, evening: 6, night: 1, general: 2 }, isActive: true },
  { idNumber: 6, code: 'EVT', name: 'Events & Banquet Operations', managerName: 'Sara Girma', description: 'Conference halls, wedding coordination, sound/AV and catering.', minStaffPerShift: { morning: 2, evening: 3, night: 1, general: 2 }, isActive: true },
  { idNumber: 7, code: 'SET', name: 'Hall Setup & Decoration', managerName: 'Yonas Technician', description: 'Venue seating arrangements, staging, stage lighting and decorations.', minStaffPerShift: { morning: 2, evening: 2, night: 1, general: 2 }, isActive: true },
  { idNumber: 8, code: 'SEC', name: 'Security & Safety', managerName: 'Commander Kassahun', description: 'Property security, perimeter patrols, parking and CCTV surveillance.', minStaffPerShift: { morning: 3, evening: 3, night: 3, general: 1 }, isActive: true },
  { idNumber: 9, code: 'ENG', name: 'Maintenance & Engineering', managerName: 'Yonas Technician', description: 'HVAC, electrical systems, plumbing, generators and repairs.', minStaffPerShift: { morning: 2, evening: 1, night: 1, general: 2 }, isActive: true },
  { idNumber: 10, code: 'FIN', name: 'Finance & Accounting', managerName: 'Almaz Tadesse', description: 'Revenue audit, night audits, general ledger and payroll.', minStaffPerShift: { morning: 2, evening: 1, night: 0, general: 3 }, isActive: true },
  { idNumber: 11, code: 'PROC', name: 'Procurement & Stores', managerName: 'Ephrem Bekele', description: 'Food supplies, inventory stocking, vendor deliveries and purchasing.', minStaffPerShift: { morning: 2, evening: 1, night: 0, general: 2 }, isActive: true },
  { idNumber: 12, code: 'HR', name: 'Human Resources', managerName: 'Hanna Berhanu', description: 'Staff recruitment, shift rostering, attendance, leave and training.', minStaffPerShift: { morning: 1, evening: 0, night: 0, general: 2 }, isActive: true },
  { idNumber: 13, code: 'SALES', name: 'Sales & Marketing', managerName: 'Helen Mengistu', description: 'Corporate contracts, OTA marketing, wedding packages and promotions.', minStaffPerShift: { morning: 1, evening: 1, night: 0, general: 2 }, isActive: true },
  { idNumber: 14, code: 'LND', name: 'Laundry & Valet', managerName: 'Tigist Haile', description: 'Guest laundry, hotel bed linens, staff uniforms and pressings.', minStaffPerShift: { morning: 3, evening: 2, night: 0, general: 1 }, isActive: true },
  { idNumber: 15, code: 'IT', name: 'Information Technology', managerName: 'Biruk IT Specialist', description: 'Network infrastructure, POS terminals, keycard systems and servers.', minStaffPerShift: { morning: 1, evening: 1, night: 0, general: 1 }, isActive: true },
];

export async function GET() {
  try {
    await connectToDatabase();
    const count = await DepartmentModel.countDocuments();
    if (count === 0) {
      await DepartmentModel.insertMany(INITIAL_DEPARTMENTS);
    }
    const docs = await DepartmentModel.find().sort({ name: 1 }).lean();
    const departments = docs.map((d: any) => ({
      id: d.idNumber,
      code: d.code,
      name: d.name,
      managerName: d.managerName || '',
      description: d.description || '',
      minStaffPerShift: d.minStaffPerShift || { morning: 2, evening: 2, night: 1, general: 1 },
      isActive: d.isActive !== false,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    }));
    return NextResponse.json({ success: true, departments });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      departments: INITIAL_DEPARTMENTS.map((d) => ({ id: d.idNumber, ...d })),
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
    const { code, name, managerName, description, minStaffPerShift } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'Department code and name are required.' }, { status: 400 });
    }

    const maxDoc = await DepartmentModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;

    const newDept = new DepartmentModel({
      idNumber: nextId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      managerName: managerName ? managerName.trim() : '',
      description: description ? description.trim() : '',
      minStaffPerShift: minStaffPerShift || { morning: 2, evening: 2, night: 1, general: 1 },
      isActive: true,
    });

    await newDept.save();
    return NextResponse.json({
      success: true,
      message: `Department "${newDept.name}" created successfully.`,
      department: {
        id: newDept.idNumber,
        code: newDept.code,
        name: newDept.name,
        managerName: newDept.managerName,
        description: newDept.description,
        minStaffPerShift: newDept.minStaffPerShift,
        isActive: newDept.isActive,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, name, managerName, description, minStaffPerShift, isActive } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Department ID is required.' }, { status: 400 });

    const dept = await DepartmentModel.findOne({ idNumber: Number(id) });
    if (!dept) return NextResponse.json({ success: false, error: 'Department not found.' }, { status: 404 });

    if (name) dept.name = name.trim();
    if (managerName !== undefined) dept.managerName = managerName.trim();
    if (description !== undefined) dept.description = description.trim();
    if (minStaffPerShift) dept.minStaffPerShift = minStaffPerShift;
    if (isActive !== undefined) dept.isActive = Boolean(isActive);

    await dept.save();
    return NextResponse.json({
      success: true,
      message: `Department "${dept.name}" updated successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
