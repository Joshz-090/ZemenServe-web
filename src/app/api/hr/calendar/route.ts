import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ShiftModel } from '@/lib/models/Shift';
import { DutyAssignmentModel } from '@/lib/models/DutyAssignment';
import { EventBookingModel } from '@/lib/models/EventBooking';
import { LeaveRequestModel } from '@/lib/models/LeaveRequest';
import { HrReminderModel } from '@/lib/models/HrReminder';
import { getEthiopianLocalDate } from '@/lib/dateUtils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const today = getEthiopianLocalDate();

    // Default to full current month window
    const startDate = searchParams.get('startDate') || `${today.slice(0, 7)}-01`;
    const endDate = searchParams.get('endDate') || `${today.slice(0, 7)}-31`;
    const department = searchParams.get('department');
    const filterType = searchParams.get('type') || 'all';

    const entries: any[] = [];

    // 1. Shifts
    if (filterType === 'all' || filterType === 'shifts') {
      const shiftQuery: any = { date: { $gte: startDate, $lte: endDate }, status: { $ne: 'Cancelled' } };
      if (department && department !== 'all') shiftQuery.department = department;

      const shifts = await ShiftModel.find(shiftQuery).lean();
      shifts.forEach((s: any) => {
        entries.push({
          id: `shift-${s.idNumber}`,
          sourceId: s.idNumber,
          type: 'shift',
          title: `${s.shiftName} (${s.department})`,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          department: s.department,
          status: s.status,
          location: s.location || 'Main Hotel Complex',
          staffCount: s.assignedStaff?.length || 0,
          assignedStaff: s.assignedStaff || [],
          supervisor: s.supervisorName,
          relatedEventTitle: s.relatedEventTitle,
          notes: s.notes,
        });
      });
    }

    // 2. Real Hotel Events & Hall Bookings (Source of truth: EventBookingModel)
    if (filterType === 'all' || filterType === 'events') {
      const eventQuery: any = { eventDate: { $gte: startDate, $lte: endDate }, status: { $ne: 'Cancelled' } };
      const events = await EventBookingModel.find(eventQuery).lean();

      events.forEach((ev: any) => {
        entries.push({
          id: `event-${ev.idNumber}`,
          sourceId: ev.idNumber,
          type: 'event',
          title: `[Event] ${ev.eventTitle} (${ev.hallName})`,
          date: ev.eventDate,
          startTime: ev.startTime,
          endTime: ev.endTime,
          department: 'Events & Banquet Operations',
          venue: ev.hallName,
          organizer: ev.organizerName,
          organizerContact: ev.organizerContact,
          expectedAttendees: ev.expectedAttendees,
          setupFormat: ev.setupFormat,
          cateringPackage: ev.cateringPackage,
          status: ev.status,
          bookingRef: ev.bookingRef,
        });
      });
    }

    // 3. Operational & Event Duties
    if (filterType === 'all' || filterType === 'duties') {
      const dutyQuery: any = { date: { $gte: startDate, $lte: endDate }, status: { $ne: 'Cancelled' } };
      if (department && department !== 'all') dutyQuery.department = department;

      const duties = await DutyAssignmentModel.find(dutyQuery).lean();
      duties.forEach((d: any) => {
        entries.push({
          id: `duty-${d.idNumber}`,
          sourceId: d.idNumber,
          type: 'duty',
          title: `[Duty] ${d.title} - ${d.employeeName}`,
          date: d.date,
          startTime: d.time || '08:00',
          endTime: '',
          department: d.department,
          assignee: d.employeeName,
          priority: d.priority,
          status: d.status,
          location: d.location,
          instructions: d.instructions,
          relatedEventTitle: d.relatedEventTitle,
        });
      });
    }

    // 4. Approved Staff Leaves
    if (filterType === 'all' || filterType === 'leaves') {
      const leaveQuery: any = {
        status: 'Approved',
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      };
      if (department && department !== 'all') leaveQuery.department = department;

      const leaves = await LeaveRequestModel.find(leaveQuery).lean();
      leaves.forEach((l: any) => {
        entries.push({
          id: `leave-${l.idNumber}`,
          sourceId: l.idNumber,
          type: 'leave',
          title: `[Leave] ${l.employeeName} (${l.leaveType})`,
          date: l.startDate,
          endDate: l.endDate,
          startTime: 'All Day',
          endTime: '',
          department: l.department,
          assignee: l.employeeName,
          status: l.status,
          totalDays: l.totalDays,
          reason: l.reason,
        });
      });
    }

    // 5. Admin & Management Reminders
    if (filterType === 'all' || filterType === 'reminders') {
      const reminderQuery: any = { date: { $gte: startDate, $lte: endDate } };
      if (department && department !== 'all') reminderQuery.targetDepartment = department;

      const reminders = await HrReminderModel.find(reminderQuery).lean();
      reminders.forEach((r: any) => {
        entries.push({
          id: `reminder-${r.idNumber}`,
          sourceId: r.idNumber,
          type: 'reminder',
          title: `[Reminder] ${r.title}`,
          date: r.date,
          startTime: r.time || '09:00',
          endTime: '',
          department: r.targetDepartment || 'Management & Administration',
          priority: r.priority,
          isCompleted: r.isCompleted,
          category: r.category,
          description: r.description,
        });
      });
    }

    // Sort entries by date ascending, then startTime
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return NextResponse.json({
      success: true,
      entries,
      startDate,
      endDate,
      totalCount: entries.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
