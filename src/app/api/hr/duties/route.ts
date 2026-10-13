import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DutyAssignmentModel } from '@/lib/models/DutyAssignment';
import { verifySessionAndRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const query: any = {};
    if (date) query.date = date;
    if (department && department !== 'all') query.department = department;
    if (employeeId) query.employeeId = Number(employeeId);
    if (status && status !== 'all') query.status = status;

    const docs = await DutyAssignmentModel.find(query).sort({ date: -1, priority: -1 }).lean();

    const duties = docs.map((doc: any) => ({
      id: doc.idNumber,
      dutyCode: doc.dutyCode,
      title: doc.title,
      instructions: doc.instructions || '',
      department: doc.department,
      employeeId: doc.employeeId,
      employeeName: doc.employeeName,
      date: doc.date,
      time: doc.time || '',
      location: doc.location || 'Main Hotel Complex',
      shiftId: doc.shiftId,
      relatedEventId: doc.relatedEventId,
      relatedEventTitle: doc.relatedEventTitle || '',
      supervisor: doc.supervisor || 'Manager',
      priority: doc.priority || 'Normal',
      status: doc.status || 'Assigned',
      completionNotes: doc.completionNotes || '',
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, duties });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const {
      title,
      instructions,
      department,
      employeeId,
      employeeName,
      date,
      time,
      location,
      shiftId,
      relatedEventId,
      relatedEventTitle,
      priority,
    } = body;

    if (!title || !department || !employeeName || !date) {
      return NextResponse.json(
        { success: false, error: 'Duty title, department, assignee name, and date are required.' },
        { status: 400 }
      );
    }

    const maxDoc = await DutyAssignmentModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;
    const dutyCode = `DTY-2026-${String(nextId).padStart(3, '0')}`;

    const newDuty = new DutyAssignmentModel({
      idNumber: nextId,
      dutyCode,
      title: title.trim(),
      instructions: instructions ? instructions.trim() : '',
      department,
      employeeId: employeeId ? Number(employeeId) : undefined,
      employeeName: employeeName.trim(),
      date,
      time: time || '',
      location: location || 'Main Hotel Complex',
      shiftId: shiftId ? Number(shiftId) : undefined,
      relatedEventId: relatedEventId ? Number(relatedEventId) : undefined,
      relatedEventTitle: relatedEventTitle ? relatedEventTitle.trim() : undefined,
      supervisor: auth.session?.name || 'Manager',
      priority: priority || 'Normal',
      status: 'Assigned',
    });

    await newDuty.save();

    return NextResponse.json({
      success: true,
      message: `Duty assignment ${dutyCode} created for ${employeeName}!`,
      duty: newDuty,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, status, completionNotes } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Duty ID and status are required.' }, { status: 400 });
    }

    const duty = await DutyAssignmentModel.findOne({ idNumber: Number(id) });
    if (!duty) return NextResponse.json({ success: false, error: 'Duty assignment not found.' }, { status: 404 });

    duty.status = status;
    if (completionNotes !== undefined) duty.completionNotes = completionNotes.trim();

    await duty.save();

    return NextResponse.json({
      success: true,
      message: `Duty ${duty.dutyCode} status updated to ${status}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!id) return NextResponse.json({ success: false, error: 'Duty ID is required.' }, { status: 400 });

    await DutyAssignmentModel.deleteOne({ idNumber: id });
    return NextResponse.json({ success: true, message: 'Duty assignment removed.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
