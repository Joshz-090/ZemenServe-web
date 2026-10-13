'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Employee,
  Department,
  Shift,
  DutyAssignment,
  AttendanceRecord,
  LeaveRequest,
  Qualification,
  HrReminder,
} from '@/lib/types';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';
import {
  Users,
  Briefcase,
  Calendar,
  Clock,
  Phone,
  Plus,
  Search,
  CheckCircle,
  Shield,
  Sparkles,
  AlertCircle,
  FileText,
  Building,
  CheckSquare,
  Award,
  Layers,
  Download,
  Filter,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  MapPin,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Lock,
} from 'lucide-react';

interface StaffHrViewProps {
  currentUser?: any;
}

export function StaffHrView({ currentUser: initialUser }: StaffHrViewProps) {
  const [currentUser, setCurrentUser] = useState<any>(initialUser || null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'employees' | 'departments' | 'roster' | 'calendar' | 'duties' | 'attendance' | 'leave' | 'training' | 'reports'
  >('overview');

  // State slices
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [duties, setDuties] = useState<DutyAssignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [reminders, setReminders] = useState<HrReminder[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Employee for 9-tab Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Filters
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('all');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showAddDutyModal, setShowAddDutyModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedAttendanceForCorrection, setSelectedAttendanceForCorrection] = useState<AttendanceRecord | null>(null);

  // Conflict Warning State for Shifts
  const [conflictWarning, setConflictWarning] = useState<{ conflicts: string[]; payload: any } | null>(null);

  // Form States: New Employee
  const [empFullName, setEmpFullName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDept, setEmpDept] = useState('Front Office / Reception');
  const [empJobTitle, setEmpJobTitle] = useState('');
  const [empType, setEmpType] = useState<any>('Full-time');
  const [empStartDate, setEmpStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [empSalary, setEmpSalary] = useState<number>(18000);
  const [empEmergencyName, setEmpEmergencyName] = useState('');
  const [empEmergencyPhone, setEmpEmergencyPhone] = useState('');

  // Form States: New Shift
  const [shiftName, setShiftName] = useState('Morning (06:00-14:00)');
  const [shiftDept, setShiftDept] = useState('Front Office / Reception');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftStartTime, setShiftStartTime] = useState('06:00');
  const [shiftEndTime, setShiftEndTime] = useState('14:00');
  const [shiftStaffIds, setShiftStaffIds] = useState<number[]>([]);
  const [shiftIsOvernight, setShiftIsOvernight] = useState(false);

  // Form States: New Duty
  const [dutyTitle, setDutyTitle] = useState('');
  const [dutyInstructions, setDutyInstructions] = useState('');
  const [dutyDept, setDutyDept] = useState('Housekeeping');
  const [dutyEmployeeId, setDutyEmployeeId] = useState<number>(0);
  const [dutyDate, setDutyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dutyPriority, setDutyPriority] = useState<any>('Normal');

  // Form States: Leave
  const [leaveEmployeeId, setLeaveEmployeeId] = useState<number>(0);
  const [leaveType, setLeaveType] = useState<any>('Annual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  // Form States: Attendance Correction
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionInTime, setCorrectionInTime] = useState('08:00');
  const [correctionOutTime, setCorrectionOutTime] = useState('17:00');

  // Form States: Reminder
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderPriority, setReminderPriority] = useState<any>('Normal');

  // User & RBAC
  const userRole = currentUser?.role || '';
  const canManageHr = userRole === 'Admin' || userRole === 'Manager';

  // Load Session User if not supplied
  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('zemenserve_session_user');
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch {}
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user) setCurrentUser(data.user);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Load All HR Data from MongoDB
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [empRes, deptRes, shiftRes, calRes, dutyRes, attRes, leaveRes, qualRes, remRes, metRes] =
        await Promise.allSettled([
          fetch('/api/hr/employees').then((r) => r.json()),
          fetch('/api/hr/departments').then((r) => r.json()),
          fetch('/api/hr/shifts').then((r) => r.json()),
          fetch('/api/hr/calendar').then((r) => r.json()),
          fetch('/api/hr/duties').then((r) => r.json()),
          fetch('/api/hr/attendance').then((r) => r.json()),
          fetch('/api/hr/leave').then((r) => r.json()),
          fetch('/api/hr/qualifications').then((r) => r.json()),
          fetch('/api/hr/reminders').then((r) => r.json()),
          fetch('/api/hr/metrics').then((r) => r.json()),
        ]);

      if (empRes.status === 'fulfilled' && empRes.value.success) setEmployees(empRes.value.employees);
      if (deptRes.status === 'fulfilled' && deptRes.value.success) setDepartments(deptRes.value.departments);
      if (shiftRes.status === 'fulfilled' && shiftRes.value.success) setShifts(shiftRes.value.shifts);
      if (calRes.status === 'fulfilled' && calRes.value.success) setCalendarEntries(calRes.value.entries);
      if (dutyRes.status === 'fulfilled' && dutyRes.value.success) setDuties(dutyRes.value.duties);
      if (attRes.status === 'fulfilled' && attRes.value.success) setAttendance(attRes.value.records);
      if (leaveRes.status === 'fulfilled' && leaveRes.value.success) setLeaves(leaveRes.value.requests);
      if (qualRes.status === 'fulfilled' && qualRes.value.success) setQualifications(qualRes.value.qualifications);
      if (remRes.status === 'fulfilled' && remRes.value.success) setReminders(remRes.value.reminders);
      if (metRes.status === 'fulfilled' && metRes.value.success) setMetrics(metRes.value.metrics);
    } catch (err: any) {
      showToast('error', 'Error syncing HR data with server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers: Employees
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageHr) {
      showToast('error', 'Only Managers or Admins can register new staff.');
      return;
    }

    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: empFullName,
          phone: empPhone,
          department: empDept,
          jobTitle: empJobTitle,
          employeeType: empType,
          startDate: empStartDate,
          salary: empSalary,
          emergencyContact: {
            name: empEmergencyName,
            phone: empEmergencyPhone,
            relationship: 'Contact',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Employee created successfully!');
        setShowAddEmployeeModal(false);
        setEmpFullName('');
        setEmpPhone('');
        setEmpJobTitle('');
        fetchAllData();
      } else {
        showToast('error', data.error || 'Failed to create employee.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error saving employee.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers: Shifts & Conflicts
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveShift = async (forceOverride = false) => {
    if (!canManageHr) {
      showToast('error', 'Only Managers can schedule shifts.');
      return;
    }

    const assignedStaff = employees
      .filter((e) => shiftStaffIds.includes(e.id))
      .map((e) => ({
        employeeId: e.id,
        staffCode: e.staffCode,
        name: e.fullName,
        role: e.jobTitle,
      }));

    try {
      const res = await fetch('/api/hr/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftName,
          department: shiftDept,
          date: shiftDate,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          isOvernight: shiftIsOvernight,
          assignedStaff,
          forceOverride,
        }),
      });
      const data = await res.json();

      if (data.hasConflict && !forceOverride) {
        // Show Conflict Warning Dialog
        setConflictWarning({ conflicts: data.conflicts, payload: null });
        return;
      }

      if (data.success) {
        showToast('success', data.message || 'Shift published successfully!');
        setShowAddShiftModal(false);
        setConflictWarning(null);
        setShiftStaffIds([]);
        fetchAllData();
      } else {
        showToast('error', data.error || 'Failed to schedule shift.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error creating shift.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers: Duties
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === Number(dutyEmployeeId)) || employees[0];
    if (!emp) return;

    try {
      const res = await fetch('/api/hr/duties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dutyTitle,
          instructions: dutyInstructions,
          department: dutyDept,
          employeeId: emp.id,
          employeeName: emp.fullName,
          date: dutyDate,
          priority: dutyPriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Duty assigned successfully!');
        setShowAddDutyModal(false);
        setDutyTitle('');
        setDutyInstructions('');
        fetchAllData();
      } else {
        showToast('error', data.error || 'Failed to assign duty.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error assigning duty.');
    }
  };

  const handleToggleDutyStatus = async (dutyId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Assigned' : 'Completed';
    try {
      const res = await fetch('/api/hr/duties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dutyId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Duty marked as ${nextStatus}.`);
        fetchAllData();
      }
    } catch {}
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers: Attendance Clock In/Out
  // ─────────────────────────────────────────────────────────────────────────
  const handleClockAction = async (employeeId: number, action: 'clock-in' | 'clock-out') => {
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchAllData();
      } else {
        showToast('error', data.error || 'Attendance punch failed.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Attendance error.');
    }
  };

  const handleSaveAttendanceCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceForCorrection || !canManageHr) return;

    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAttendanceForCorrection.id,
          clockInTime: correctionInTime,
          clockOutTime: correctionOutTime,
          status: 'Present',
          correctionReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        setShowCorrectionModal(false);
        setSelectedAttendanceForCorrection(null);
        setCorrectionReason('');
        fetchAllData();
      } else {
        showToast('error', data.error || 'Failed to correct timesheet.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers: Leaves
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === Number(leaveEmployeeId)) || employees[0];
    if (!emp) return;

    try {
      const res = await fetch('/api/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id,
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        setShowLeaveModal(false);
        setLeaveReason('');
        fetchAllData();
      } else {
        showToast('error', data.error || 'Failed to submit leave.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleReviewLeave = async (leaveId: number, status: 'Approved' | 'Rejected') => {
    if (!canManageHr) {
      showToast('error', 'Only Managers can approve leave requests.');
      return;
    }
    try {
      const res = await fetch('/api/hr/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchAllData();
      } else {
        showToast('error', data.error);
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Export Report to CSV
  // ─────────────────────────────────────────────────────────────────────────
  const handleExportEmployeesCSV = () => {
    const headers = ['Staff Code', 'Full Name', 'Department', 'Job Title', 'Type', 'Status', 'Phone', 'Start Date'];
    const rows = employees.map((e) => [
      e.staffCode,
      `"${e.fullName}"`,
      `"${e.department}"`,
      `"${e.jobTitle}"`,
      e.employeeType,
      e.status,
      e.phone,
      e.startDate,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ZemenServe_Staff_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch =
        e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.staffCode.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.jobTitle.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.phone.includes(employeeSearch);
      const matchesDept = employeeDeptFilter === 'all' || e.department === employeeDeptFilter;
      const matchesStatus = employeeStatusFilter === 'all' || e.status === employeeStatusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, employeeSearch, employeeDeptFilter, employeeStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl transition-all duration-300 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Staff & Workforce HR Management</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3" /> Hotel Enterprise Roster
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Employee profiles, shift rosters, operational hotel calendar, attendance timesheets & leave management.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {canManageHr && (
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Register Employee</span>
            </button>
          )}

          {canManageHr && (
            <button
              onClick={() => setShowAddShiftModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Schedule Shift</span>
            </button>
          )}

          <button
            onClick={() => fetchAllData()}
            title="Refresh HR Data"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Operational Metrics Console */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Active Staff</span>
          <p className="text-xl font-black text-slate-100 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            {metrics?.activeEmployees || employees.filter((e) => e.status === 'Active').length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Scheduled Today</span>
          <p className="text-xl font-black text-amber-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {metrics?.scheduledStaffCount || 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Clocked In Now</span>
          <p className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {metrics?.clockedInToday || 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">On Leave Today</span>
          <p className="text-xl font-black text-blue-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {metrics?.leavesToday || 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Pending Leaves</span>
          <p className="text-xl font-black text-rose-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {metrics?.pendingLeaveCount || leaves.filter((l) => l.status === 'Pending').length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Upcoming Events</span>
          <p className="text-xl font-black text-purple-400 flex items-center gap-1.5">
            <Building className="w-4 h-4" />
            {metrics?.upcomingEventsCount || 0}
          </p>
        </div>
      </div>

      {/* 10 Operational Module Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-1 overflow-x-auto no-scrollbar text-xs">
        {[
          { id: 'overview', label: 'HR Dashboard', icon: TrendingUp },
          { id: 'employees', label: `Staff Directory (${employees.length})`, icon: Users },
          { id: 'departments', label: `Departments (${departments.length})`, icon: Building },
          { id: 'roster', label: `Roster & Shifts (${shifts.length})`, icon: Calendar },
          { id: 'calendar', label: `Hotel Operations Calendar`, icon: Layers },
          { id: 'duties', label: `Duty Assignments (${duties.length})`, icon: CheckSquare },
          { id: 'attendance', label: `Attendance Punch & Timesheets`, icon: Clock },
          { id: 'leave', label: `Leave Pipeline (${leaves.filter((l) => l.status === 'Pending').length})`, icon: AlertCircle },
          { id: 'training', label: `Skills & Training (${qualifications.length})`, icon: Award },
          { id: 'reports', label: `Workforce Reports`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-3.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW & DASHBOARD */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Department Headcount Breakdown */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  Department Staffing Allocation
                </h3>
                <span className="text-xs text-slate-400">{departments.length} Active Departments</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {departments.slice(0, 9).map((d) => {
                  const count = employees.filter((e) => e.department === d.name && e.status === 'Active').length;
                  return (
                    <div key={d.id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 truncate block">{d.name}</span>
                      <p className="text-lg font-black text-amber-400">{count} <span className="text-xs font-normal text-slate-400">staff</span></p>
                      <span className="text-[9px] text-slate-500 block">Lead: {d.managerName || 'Manager'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Hotel Events Requiring Staffing */}
            <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Upcoming Event Staffing
                </h3>
              </div>

              {metrics?.upcomingEvents && metrics.upcomingEvents.length > 0 ? (
                <div className="space-y-2.5">
                  {metrics.upcomingEvents.map((ev: any) => (
                    <div key={ev.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-xs truncate">{ev.title}</span>
                        <span className="font-mono text-[10px] text-amber-400 font-bold">{ev.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {ev.hall} • {ev.attendees} Pax ({ev.format})
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-6 text-center">No major banquets or summits scheduled in the next 14 days.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: EMPLOYEES DIRECTORY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, code (EMP-1001), job title, or phone..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={employeeDeptFilter}
                onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={employeeStatusFilter}
                onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>

          {/* Employee Directory Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-3xl bg-slate-900/60 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="p-4">Staff ID</th>
                  <th className="p-4">Employee Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Job Title</th>
                  <th className="p-4">Contract</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                      No employees found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedEmployee(e)}
                      className="hover:bg-slate-800/40 cursor-pointer transition group"
                    >
                      <td className="p-4 font-mono font-bold text-amber-400">{e.staffCode}</td>
                      <td className="p-4 font-bold text-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-400 font-black flex items-center justify-center shrink-0 border border-amber-500/30">
                          {e.fullName.charAt(0)}
                        </div>
                        <span className="group-hover:text-amber-400 transition">{e.fullName}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-200">{e.department}</td>
                      <td className="p-4 text-slate-300">{e.jobTitle}</td>
                      <td className="p-4 text-slate-400">{e.employeeType}</td>
                      <td className="p-4 font-mono text-slate-300">{e.phone}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            e.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : e.status === 'On Leave'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedEmployee(e);
                          }}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                          Profile &rarr;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DEPARTMENTS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => {
              const staffCount = employees.filter((e) => e.department === d.name && e.status === 'Active').length;
              return (
                <div key={d.id} className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {d.code}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{staffCount} Assigned Staff</span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-100">{d.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{d.description || 'Hotel operational division.'}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Department Lead:</span>
                    <span className="font-bold text-slate-200">{d.managerName || 'Unassigned'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: ROSTER & SHIFTS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Scheduled Shifts & Rosters</h3>
            {canManageHr && (
              <button
                onClick={() => setShowAddShiftModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Schedule Shift
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((s) => (
              <div key={s.id} className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase">
                    {s.department}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-bold">{s.date}</span>
                </div>

                <div>
                  <h4 className="text-sm font-black text-slate-100">{s.shiftName}</h4>
                  <p className="text-xs font-mono text-amber-400 font-bold mt-0.5">
                    {s.startTime} - {s.endTime} {s.isOvernight && '(Overnight Shift)'}
                  </p>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Assigned Crew ({s.assignedStaff.length})</span>
                  <div className="flex flex-wrap gap-1">
                    {s.assignedStaff.map((st) => (
                      <span key={st.employeeId} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[11px] font-bold">
                        {st.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: HOTEL OPERATIONS CALENDAR */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Hotel Operations Shared Calendar
              </h3>
              <p className="text-xs text-slate-400">
                Synchronized workforce shifts, banquet events, operational duties, and management reminders.
              </p>
            </div>
            <span className="font-mono text-xs text-amber-400 font-bold">{calendarEntries.length} Total Entries</span>
          </div>

          <div className="space-y-3">
            {calendarEntries.map((c) => {
              const typeBadge =
                c.type === 'event'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : c.type === 'shift'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : c.type === 'duty'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : c.type === 'leave'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

              return (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${typeBadge}`}>
                      {c.type}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-100">{c.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {c.date} • {c.startTime} {c.endTime ? `- ${c.endTime}` : ''} • {c.department}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{c.status || 'Active'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: DUTY ASSIGNMENTS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'duties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Everyday Operational Duties</h3>
            {canManageHr && (
              <button
                onClick={() => setShowAddDutyModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Assign Duty
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {duties.map((d) => (
              <div key={d.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleDutyStatus(d.id, d.status)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                      d.status === 'Completed'
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                        : 'border-slate-700 bg-slate-950 hover:border-amber-400 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <div>
                    <h4 className={`text-xs font-bold ${d.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {d.title}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Assigned to: <strong className="text-amber-400">{d.employeeName}</strong> • {d.department} • {d.date}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {d.priority} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 7: ATTENDANCE & TIMESHEETS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Digital Clock-In Station */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Digital Attendance Punch Console
            </h3>
            <p className="text-xs text-slate-400">
              Staff members clock in and out on arrival and shift completion. Late arrivals and overtime are automatically tracked.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {employees.slice(0, 6).map((e) => {
                const todayRecord = attendance.find((a) => a.employeeId === e.id);
                const isClockedIn = todayRecord?.clockInTime && !todayRecord.clockOutTime;

                return (
                  <div key={e.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-200 text-xs">{e.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {todayRecord?.clockInTime ? `In: ${todayRecord.clockInTime}` : 'Not clocked in'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isClockedIn ? (
                        <button
                          onClick={() => handleClockAction(e.id, 'clock-in')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]"
                        >
                          Clock In
                        </button>
                      ) : (
                        <button
                          onClick={() => handleClockAction(e.id, 'clock-out')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px]"
                        >
                          Clock Out
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Attendance Log Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-3xl bg-slate-900/60 shadow-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Clock In</th>
                  <th className="p-4">Clock Out</th>
                  <th className="p-4 text-center">Hours Worked</th>
                  <th className="p-4 text-center">Status</th>
                  {canManageHr && <th className="p-4 text-right">Manager Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                      No attendance punches recorded today.
                    </td>
                  </tr>
                ) : (
                  attendance.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-bold text-slate-100">{a.employeeName}</td>
                      <td className="p-4 text-slate-300">{a.department}</td>
                      <td className="p-4 font-mono text-emerald-400">{a.clockInTime || '--:--'}</td>
                      <td className="p-4 font-mono text-amber-400">{a.clockOutTime || '--:--'}</td>
                      <td className="p-4 text-center font-mono font-bold">{a.actualHours} hrs</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                          {a.status}
                        </span>
                      </td>
                      {canManageHr && (
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedAttendanceForCorrection(a);
                              setCorrectionInTime(a.clockInTime || '08:00');
                              setCorrectionOutTime(a.clockOutTime || '17:00');
                              setShowCorrectionModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                          >
                            Correct
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 8: LEAVE PIPELINE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Leave Requests & Approvals</h3>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Request Leave
            </button>
          </div>

          <div className="space-y-3">
            {leaves.map((l) => (
              <div key={l.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-100 text-xs">{l.employeeName}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {l.leaveType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    {l.startDate} to {l.endDate} ({l.totalDays} Days) • Reason: {l.reason}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                    {l.status}
                  </span>
                  {l.status === 'Pending' && canManageHr && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReviewLeave(l.id, 'Approved')}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewLeave(l.id, 'Rejected')}
                        className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 9: TRAINING & QUALIFICATIONS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'training' && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Hotel Staff Qualifications & Certifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qualifications.map((q, idx) => (
              <div key={q._id || `${q.id || 'qual'}-${idx}`} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-xs">{q.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {q.verificationStatus}
                  </span>
                </div>
                <p className="text-xs text-amber-400 font-bold">{q.employeeName}</p>
                <p className="text-[11px] text-slate-400">
                  Issuing Authority: {q.issuingBody} • Issued: {q.issueDate} {q.expiryDate ? `• Expires: ${q.expiryDate}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 10: REPORTS & EXPORTS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Workforce Analytics & Exports</h3>
            <button
              onClick={handleExportEmployeesCSV}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Export Staff Directory CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Total Headcount</span>
              <p className="text-2xl font-black text-slate-100">{employees.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Active Roster Shifts</span>
              <p className="text-2xl font-black text-amber-400">{shifts.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Operational Duties</span>
              <p className="text-2xl font-black text-emerald-400">{duties.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 9-TAB EMPLOYEE PROFILE DRAWER */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <EmployeeProfileDrawer
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        canViewSalary={canManageHr}
        shifts={shifts}
        duties={duties}
        attendance={attendance}
        leaves={leaves}
        qualifications={qualifications}
      />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: REGISTER EMPLOYEE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAddEmployeeModal && canManageHr && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" /> Register Employee Record
              </h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-slate-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Almaz Tadesse"
                  value={empFullName}
                  onChange={(e) => setEmpFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+251 911 000 000"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department *</label>
                  <select
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Receptionist"
                    value={empJobTitle}
                    onChange={(e) => setEmpJobTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contract Type</label>
                  <select
                    value={empType}
                    onChange={(e: any) => setEmpType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Casual">Casual</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={empStartDate}
                    onChange={(e) => setEmpStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Monthly Salary (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: SCHEDULE SHIFT & CONFLICT ENGINE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAddShiftModal && canManageHr && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" /> Plan Shift Schedule
              </h3>
              <button onClick={() => setShowAddShiftModal(false)} className="text-slate-400 hover:text-slate-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Warning Dialog */}
            {conflictWarning && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Scheduling Conflict Detected!</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  {conflictWarning.conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConflictWarning(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
                  >
                    Adjust Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveShift(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                  >
                    Override & Force Save
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Shift Name</label>
                  <select
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="Morning (06:00-14:00)">Morning (06:00 - 14:00)</option>
                    <option value="Evening (14:00-22:00)">Evening (14:00 - 22:00)</option>
                    <option value="Night (22:00-06:00)">Night (22:00 - 06:00)</option>
                    <option value="General (08:00-17:00)">General (08:00 - 17:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
                  <select
                    value={shiftDept}
                    onChange={(e) => setShiftDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
              </div>

              {/* Multi-Select Assigned Staff */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Assign Staff to this Shift ({shiftStaffIds.length} Selected)
                </label>
                <div className="max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  {employees
                    .filter((e) => e.status === 'Active')
                    .map((emp) => {
                      const isSelected = shiftStaffIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            if (isSelected) {
                              setShiftStaffIds(shiftStaffIds.filter((id) => id !== emp.id));
                            } else {
                              setShiftStaffIds([...shiftStaffIds, emp.id]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition ${
                            isSelected ? 'bg-amber-500/20 text-amber-300 font-bold' : 'hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <span>{emp.fullName} ({emp.jobTitle})</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveShift(false)}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  Schedule Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: ASSIGN OPERATIONAL DUTY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAddDutyModal && canManageHr && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" /> Assign Operational Duty
              </h3>
              <button onClick={() => setShowAddDutyModal(false)} className="text-slate-400 hover:text-slate-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDuty} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Duty Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect Ballroom Audio & Staging"
                  value={dutyTitle}
                  onChange={(e) => setDutyTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assignee *</label>
                <select
                  value={dutyEmployeeId}
                  onChange={(e) => setDutyEmployeeId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.jobTitle} - {e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={dutyDate}
                    onChange={(e) => setDutyDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Priority</label>
                  <select
                    value={dutyPriority}
                    onChange={(e: any) => setDutyPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Specific tasks, equipment locations, or checklists..."
                  value={dutyInstructions}
                  onChange={(e) => setDutyInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDutyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  Assign Duty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: REQUEST LEAVE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" /> Submit Leave Request
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeaveRequest} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Employee *</label>
                <select
                  value={leaveEmployeeId}
                  onChange={(e) => setLeaveEmployeeId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.jobTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e: any) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Purpose of leave request..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: TIMESHEET CORRECTION (MANAGER AUDIT WORKFLOW) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showCorrectionModal && selectedAttendanceForCorrection && canManageHr && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Correct Timesheet Punch
              </h3>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-slate-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendanceCorrection} className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-slate-200">{selectedAttendanceForCorrection.employeeName}</p>
                <p className="text-[11px] text-slate-400 font-mono">Date: {selectedAttendanceForCorrection.date}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Adjusted In Time</label>
                  <input
                    type="time"
                    value={correctionInTime}
                    onChange={(e) => setCorrectionInTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Adjusted Out Time</label>
                  <input
                    type="time"
                    value={correctionOutTime}
                    onChange={(e) => setCorrectionOutTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Required Reason for Adjustment *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Employee forgot to punch out due to banquet breakdown duty."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
