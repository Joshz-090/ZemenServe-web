import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { EmployeeModel } from '@/lib/models/Employee';
import { DepartmentModel } from '@/lib/models/Department';
import { ShiftModel } from '@/lib/models/Shift';
import { AttendanceRecordModel } from '@/lib/models/AttendanceRecord';
import { LeaveRequestModel } from '@/lib/models/LeaveRequest';
import { DutyAssignmentModel } from '@/lib/models/DutyAssignment';
import { EventBookingModel } from '@/lib/models/EventBooking';
import { getEthiopianLocalDate } from '@/lib/dateUtils';

export async function GET() {
  try {
    await connectToDatabase();
    const today = getEthiopianLocalDate();

    // 1. Employee Counts
    const totalEmployees = await EmployeeModel.countDocuments();
    const activeEmployees = await EmployeeModel.countDocuments({ status: 'Active' });
    const terminatedEmployees = await EmployeeModel.countDocuments({ status: 'Terminated' });

    // 2. Department Breakdown
    const departmentAgg = await EmployeeModel.aggregate([
      { $match: { status: 'Active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const departmentBreakdown = departmentAgg.map((d: any) => ({
      department: d._id,
      count: d.count,
    }));

    // 3. Staff on Leave Today
    const leavesToday = await LeaveRequestModel.countDocuments({
      status: 'Approved',
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    // 4. Staff Scheduled Today
    const shiftsToday = await ShiftModel.find({ date: today, status: { $ne: 'Cancelled' } }).lean();
    let scheduledStaffCount = 0;
    shiftsToday.forEach((s: any) => {
      scheduledStaffCount += s.assignedStaff?.length || 0;
    });

    // 5. Currently Clocked In Today
    const clockedInToday = await AttendanceRecordModel.countDocuments({
      date: today,
      clockInTime: { $exists: true, $ne: '' },
      $or: [{ clockOutTime: { $exists: false } }, { clockOutTime: '' }],
    });

    // 6. Pending Leave Requests
    const pendingLeaveCount = await LeaveRequestModel.countDocuments({ status: 'Pending' });

    // 7. Overdue Duties
    const pendingDutiesCount = await DutyAssignmentModel.countDocuments({
      status: { $in: ['Assigned', 'In Progress'] },
    });

    // 8. Upcoming Hotel Events (Next 14 Days)
    const upcomingEvents = await EventBookingModel.find({
      eventDate: { $gte: today },
      status: { $in: ['Confirmed', 'Tentative'] },
    })
      .sort({ eventDate: 1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      today,
      metrics: {
        totalEmployees,
        activeEmployees,
        terminatedEmployees,
        departmentBreakdown,
        leavesToday,
        scheduledStaffCount,
        shiftsTodayCount: shiftsToday.length,
        clockedInToday,
        pendingLeaveCount,
        pendingDutiesCount,
        upcomingEventsCount: upcomingEvents.length,
        upcomingEvents: upcomingEvents.map((ev: any) => ({
          id: ev.idNumber,
          title: ev.eventTitle,
          hall: ev.hallName,
          date: ev.eventDate,
          attendees: ev.expectedAttendees,
          format: ev.setupFormat,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
