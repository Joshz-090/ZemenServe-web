import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AttendanceRecordModel } from '@/lib/models/AttendanceRecord';
import { EmployeeModel } from '@/lib/models/Employee';
import { getEthiopianLocalDate } from '@/lib/dateUtils';
import { verifySessionAndRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getEthiopianLocalDate();
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');

    const query: any = { date };
    if (department && department !== 'all') query.department = department;
    if (employeeId) query.employeeId = Number(employeeId);

    const docs = await AttendanceRecordModel.find(query).sort({ employeeName: 1 }).lean();

    const records = docs.map((doc: any) => ({
      id: doc.idNumber,
      employeeId: doc.employeeId,
      staffCode: doc.staffCode,
      employeeName: doc.employeeName,
      department: doc.department,
      date: doc.date,
      shiftId: doc.shiftId,
      clockInTime: doc.clockInTime || '',
      clockOutTime: doc.clockOutTime || '',
      breakMinutes: doc.breakMinutes || 0,
      scheduledHours: doc.scheduledHours || 8,
      actualHours: doc.actualHours || 0,
      overtimeHours: doc.overtimeHours || 0,
      status: doc.status || 'Present',
      isManuallyCorrected: Boolean(doc.isManuallyCorrected),
      correctionReason: doc.correctionReason || '',
      correctedBy: doc.correctedBy || '',
      approvedBy: doc.approvedBy || '',
    }));

    return NextResponse.json({ success: true, records, date });
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
    const { employeeId, action, time, breakMinutes } = body; // action: 'clock-in' | 'clock-out'

    if (!employeeId || !action) {
      return NextResponse.json({ success: false, error: 'Employee ID and action are required.' }, { status: 400 });
    }

    const emp = await EmployeeModel.findOne({ idNumber: Number(employeeId) });
    if (!emp) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const todayDate = getEthiopianLocalDate();
    const nowTime =
      time ||
      new Date().toLocaleTimeString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

    let record = await AttendanceRecordModel.findOne({ employeeId: emp.idNumber, date: todayDate });

    if (action === 'clock-in') {
      if (!record) {
        const maxDoc = await AttendanceRecordModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
        const nextId = (maxDoc?.idNumber || 0) + 1;

        record = new AttendanceRecordModel({
          idNumber: nextId,
          employeeId: emp.idNumber,
          staffCode: emp.staffCode,
          employeeName: emp.fullName,
          department: emp.department,
          date: todayDate,
          clockInTime: nowTime,
          scheduledHours: 8,
          status: 'Present',
        });
      } else {
        record.clockInTime = nowTime;
        record.status = 'Present';
      }
      await record.save();

      return NextResponse.json({
        success: true,
        message: `${emp.fullName} clocked in at ${nowTime}`,
        record,
      });
    } else if (action === 'clock-out') {
      if (!record) {
        return NextResponse.json({ success: false, error: 'No clock-in record found for today.' }, { status: 400 });
      }

      record.clockOutTime = nowTime;
      if (breakMinutes !== undefined) record.breakMinutes = Number(breakMinutes);

      // Compute actual hours
      if (record.clockInTime && record.clockOutTime) {
        const [inH, inM] = record.clockInTime.split(':').map(Number);
        const [outH, outM] = record.clockOutTime.split(':').map(Number);
        let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // overnight clock-out
        diffMinutes -= record.breakMinutes || 0;
        const totalWorkedHours = Number((Math.max(0, diffMinutes) / 60).toFixed(1));
        record.actualHours = totalWorkedHours;
        record.overtimeHours = Number(Math.max(0, totalWorkedHours - record.scheduledHours).toFixed(1));
        if (record.overtimeHours > 0) {
          record.status = 'Overtime';
        }
      }
      await record.save();

      return NextResponse.json({
        success: true,
        message: `${emp.fullName} clocked out at ${nowTime} (${record.actualHours} hrs worked)`,
        record,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid attendance action.' }, { status: 400 });
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
    const { id, clockInTime, clockOutTime, status, correctionReason } = body;

    if (!id || !correctionReason) {
      return NextResponse.json(
        { success: false, error: 'Attendance ID and required correction reason are mandatory for adjustments.' },
        { status: 400 }
      );
    }

    const record = await AttendanceRecordModel.findOne({ idNumber: Number(id) });
    if (!record) return NextResponse.json({ success: false, error: 'Attendance record not found.' }, { status: 404 });

    if (clockInTime) record.clockInTime = clockInTime;
    if (clockOutTime) record.clockOutTime = clockOutTime;
    if (status) record.status = status;

    if (record.clockInTime && record.clockOutTime) {
      const [inH, inM] = record.clockInTime.split(':').map(Number);
      const [outH, outM] = record.clockOutTime.split(':').map(Number);
      let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      diffMinutes -= record.breakMinutes || 0;
      const totalWorkedHours = Number((Math.max(0, diffMinutes) / 60).toFixed(1));
      record.actualHours = totalWorkedHours;
      record.overtimeHours = Number(Math.max(0, totalWorkedHours - record.scheduledHours).toFixed(1));
    }

    record.isManuallyCorrected = true;
    record.correctionReason = correctionReason.trim();
    record.correctedBy = auth.session?.name || 'Manager';
    record.approvedBy = auth.session?.name || 'Manager';

    await record.save();

    return NextResponse.json({
      success: true,
      message: `Attendance corrected by ${record.correctedBy}: "${record.correctionReason}"`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
