import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ShiftModel } from '@/lib/models/Shift';
import { LeaveRequestModel } from '@/lib/models/LeaveRequest';
import { AuditLogModel } from '@/lib/models/AuditLog';
import { verifySessionAndRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');

    const query: any = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = startDate;
    }
    if (department && department !== 'all') {
      query.department = department;
    }
    if (employeeId) {
      query['assignedStaff.employeeId'] = Number(employeeId);
    }

    const docs = await ShiftModel.find(query).sort({ date: 1, startTime: 1 }).lean();

    const shifts = docs.map((doc: any) => ({
      id: doc.idNumber,
      shiftCode: doc.shiftCode,
      shiftName: doc.shiftName,
      department: doc.department,
      date: doc.date,
      startTime: doc.startTime,
      endTime: doc.endTime,
      isOvernight: doc.isOvernight || false,
      assignedStaff: doc.assignedStaff || [],
      supervisorName: doc.supervisorName || '',
      location: doc.location || 'Main Hotel Complex',
      relatedEventId: doc.relatedEventId,
      relatedEventTitle: doc.relatedEventTitle,
      status: doc.status || 'Draft',
      notes: doc.notes || '',
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, shifts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const {
      shiftName,
      department,
      date,
      startTime,
      endTime,
      isOvernight,
      assignedStaff,
      supervisorName,
      location,
      relatedEventId,
      relatedEventTitle,
      notes,
      forceOverride, // boolean: user acknowledged conflict warning
    } = body;

    if (!shiftName || !department || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Shift name, department, date, start time, and end time are required.' },
        { status: 400 }
      );
    }

    const staffList: Array<{ employeeId: number; staffCode: string; name: string; role: string }> =
      Array.isArray(assignedStaff) ? assignedStaff : [];

    // Conflict Detection Engine (unless explicitly forced by manager)
    if (!forceOverride && staffList.length > 0) {
      const conflicts: string[] = [];
      const staffIds = staffList.map((s) => s.employeeId);

      // Check 1: Approved Leave Conflicts on this date
      const activeLeaves = await LeaveRequestModel.find({
        employeeId: { $in: staffIds },
        status: 'Approved',
        startDate: { $lte: date },
        endDate: { $gte: date },
      }).lean();

      activeLeaves.forEach((leave: any) => {
        conflicts.push(`Employee "${leave.employeeName}" has approved ${leave.leaveType} covering date ${date}.`);
      });

      // Check 2: Overlapping shifts for the same staff member
      const existingShifts = await ShiftModel.find({
        date,
        status: { $ne: 'Cancelled' },
        'assignedStaff.employeeId': { $in: staffIds },
      }).lean();

      existingShifts.forEach((s: any) => {
        s.assignedStaff.forEach((st: any) => {
          if (staffIds.includes(st.employeeId)) {
            conflicts.push(
              `Employee "${st.name}" is already scheduled on ${s.shiftName} (${s.startTime} - ${s.endTime}) in ${s.department}.`
            );
          }
        });
      });

      if (conflicts.length > 0) {
        return NextResponse.json({
          success: false,
          hasConflict: true,
          conflicts,
          message: `Scheduling conflict detected for ${conflicts.length} staff member(s). You can review or override this warning.`,
        });
      }
    }

    const maxDoc = await ShiftModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;
    const shiftCode = `SHF-2026-${String(nextId).padStart(3, '0')}`;

    const newShift = new ShiftModel({
      idNumber: nextId,
      shiftCode,
      shiftName,
      department,
      date,
      startTime,
      endTime,
      isOvernight: Boolean(isOvernight),
      assignedStaff: staffList,
      supervisorName: supervisorName ? supervisorName.trim() : '',
      location: location ? location.trim() : 'Main Hotel Complex',
      relatedEventId: relatedEventId ? Number(relatedEventId) : undefined,
      relatedEventTitle: relatedEventTitle ? relatedEventTitle.trim() : undefined,
      status: 'Published',
      notes: notes ? notes.trim() : '',
    });

    await newShift.save();

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: 'Schedule Shift',
        details: `Created shift ${newShift.shiftCode} (${newShift.shiftName}) for ${newShift.department} on ${newShift.date} with ${staffList.length} staff`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Shift ${newShift.shiftCode} scheduled successfully!`,
      shift: {
        id: newShift.idNumber,
        shiftCode: newShift.shiftCode,
        shiftName: newShift.shiftName,
        department: newShift.department,
        date: newShift.date,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        isOvernight: newShift.isOvernight,
        assignedStaff: newShift.assignedStaff,
        status: newShift.status,
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
    const { id, status, assignedStaff, notes, date, startTime, endTime } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Shift ID is required.' }, { status: 400 });

    const shift = await ShiftModel.findOne({ idNumber: Number(id) });
    if (!shift) return NextResponse.json({ success: false, error: 'Shift not found.' }, { status: 404 });

    if (status) shift.status = status;
    if (Array.isArray(assignedStaff)) shift.assignedStaff = assignedStaff;
    if (notes !== undefined) shift.notes = notes.trim();
    if (date) shift.date = date;
    if (startTime) shift.startTime = startTime;
    if (endTime) shift.endTime = endTime;

    await shift.save();

    return NextResponse.json({
      success: true,
      message: `Shift ${shift.shiftCode} updated successfully.`,
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

    if (!id) return NextResponse.json({ success: false, error: 'Shift ID is required.' }, { status: 400 });

    await ShiftModel.deleteOne({ idNumber: id });
    return NextResponse.json({ success: true, message: 'Shift removed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
