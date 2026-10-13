import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { LeaveRequestModel } from '@/lib/models/LeaveRequest';
import { ShiftModel } from '@/lib/models/Shift';
import { EmployeeModel } from '@/lib/models/Employee';
import { AuditLogModel } from '@/lib/models/AuditLog';
import { verifySessionAndRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');

    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (department && department !== 'all') query.department = department;
    if (employeeId) query.employeeId = Number(employeeId);

    const docs = await LeaveRequestModel.find(query).sort({ createdAt: -1 }).lean();

    const requests = docs.map((doc: any) => ({
      id: doc.idNumber,
      requestCode: doc.requestCode,
      employeeId: doc.employeeId,
      staffCode: doc.staffCode,
      employeeName: doc.employeeName,
      department: doc.department,
      leaveType: doc.leaveType,
      startDate: doc.startDate,
      endDate: doc.endDate,
      totalDays: doc.totalDays,
      reason: doc.reason,
      status: doc.status || 'Pending',
      reviewedBy: doc.reviewedBy || '',
      reviewDate: doc.reviewDate || '',
      reviewComment: doc.reviewComment || '',
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, requests });
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

    const { employeeId, leaveType, startDate, endDate, reason } = body;

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { success: false, error: 'Employee, leave type, start date, end date, and reason are required.' },
        { status: 400 }
      );
    }

    const emp = await EmployeeModel.findOne({ idNumber: Number(employeeId) });
    if (!emp) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return NextResponse.json({ success: false, error: 'End date cannot precede start date.' }, { status: 400 });
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    const maxDoc = await LeaveRequestModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;
    const requestCode = `LEV-2026-${String(nextId).padStart(3, '0')}`;

    const newLeave = new LeaveRequestModel({
      idNumber: nextId,
      requestCode,
      employeeId: emp.idNumber,
      staffCode: emp.staffCode,
      employeeName: emp.fullName,
      department: emp.department,
      leaveType,
      startDate,
      endDate,
      totalDays: diffDays,
      reason: reason.trim(),
      status: 'Pending',
    });

    await newLeave.save();

    return NextResponse.json({
      success: true,
      message: `Leave request ${requestCode} for ${emp.fullName} submitted (${diffDays} days).`,
      request: newLeave,
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
    const { id, status, reviewComment } = body; // status: 'Approved' | 'Rejected' | 'Cancelled'

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Request ID and decision status are required.' }, { status: 400 });
    }

    const leave = await LeaveRequestModel.findOne({ idNumber: Number(id) });
    if (!leave) return NextResponse.json({ success: false, error: 'Leave request not found.' }, { status: 404 });

    leave.status = status;
    leave.reviewedBy = auth.session?.name || 'Manager';
    leave.reviewDate = new Date().toISOString().split('T')[0];
    if (reviewComment !== undefined) leave.reviewComment = reviewComment.trim();

    await leave.save();

    // Check for impacted scheduled shifts
    let impactedShiftsWarning = '';
    if (status === 'Approved') {
      const conflictingShifts = await ShiftModel.find({
        'assignedStaff.employeeId': leave.employeeId,
        date: { $gte: leave.startDate, $lte: leave.endDate },
        status: { $ne: 'Cancelled' },
      }).lean();

      if (conflictingShifts.length > 0) {
        impactedShiftsWarning = `Note: ${leave.employeeName} is assigned to ${conflictingShifts.length} scheduled shift(s) during this leave period. Please reassign those shifts in the roster.`;
      }
    }

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: `Leave ${status}`,
        details: `${status} leave ${leave.requestCode} for ${leave.employeeName} (${leave.startDate} to ${leave.endDate}, ${leave.totalDays} days)`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Leave request ${leave.requestCode} ${status.toLowerCase()} by ${leave.reviewedBy}.${
        impactedShiftsWarning ? ' ' + impactedShiftsWarning : ''
      }`,
      warning: impactedShiftsWarning || undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
