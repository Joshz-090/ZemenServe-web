'use client';

import React, { useState } from 'react';
import { Employee, Shift, DutyAssignment, AttendanceRecord, LeaveRequest, Qualification } from '@/lib/types';
import {
  X,
  User,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Shield,
  Award,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Heart,
  DollarSign,
  Building,
  CheckSquare,
  Lock,
} from 'lucide-react';

interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  onClose: () => void;
  canViewSalary: boolean;
  shifts?: Shift[];
  duties?: DutyAssignment[];
  attendance?: AttendanceRecord[];
  leaves?: LeaveRequest[];
  qualifications?: Qualification[];
}

export function EmployeeProfileDrawer({
  employee,
  onClose,
  canViewSalary,
  shifts = [],
  duties = [],
  attendance = [],
  leaves = [],
  qualifications = [],
}: EmployeeProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'employment' | 'shifts' | 'duties' | 'attendance' | 'leaves' | 'qualifications' | 'documents' | 'notes'
  >('overview');

  if (!employee) return null;

  const empShifts = shifts.filter((s) => s.assignedStaff.some((st) => st.employeeId === employee.id));
  const empDuties = duties.filter((d) => d.employeeId === employee.id);
  const empAttendance = attendance.filter((a) => a.employeeId === employee.id);
  const empLeaves = leaves.filter((l) => l.employeeId === employee.id);
  const empQuals = qualifications.filter((q) => q.employeeId === employee.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              {employee.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-100 truncate">{employee.fullName}</h2>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {employee.staffCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {employee.jobTitle} • <span className="text-slate-300">{employee.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                employee.status === 'Active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : employee.status === 'On Leave'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {employee.status}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 9 Profile Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-xs">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'employment', label: 'Employment', icon: Briefcase },
            { id: 'shifts', label: `Shifts (${empShifts.length})`, icon: Calendar },
            { id: 'duties', label: `Duties (${empDuties.length})`, icon: CheckSquare },
            { id: 'attendance', label: `Attendance (${empAttendance.length})`, icon: Clock },
            { id: 'leaves', label: `Leaves (${empLeaves.length})`, icon: AlertCircle },
            { id: 'qualifications', label: `Skills (${empQuals.length})`, icon: Award },
            { id: 'documents', label: 'ID & Docs', icon: Shield },
            { id: 'notes', label: 'HR Notes', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? 'border-amber-500 text-amber-400 font-black'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Phone Number</span>
                  <p className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    {employee.phone}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Email Address</span>
                  <p className="font-mono text-slate-200 truncate flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    {employee.email || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Name</span>
                    <span className="font-bold text-slate-200">{employee.emergencyContact?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Relationship</span>
                    <span className="text-slate-300">{employee.emergencyContact?.relationship || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Phone</span>
                    <span className="font-mono text-amber-400">{employee.emergencyContact?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Location & Residence</h4>
                <p className="text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{employee.address || 'Address on file'} • {employee.nationality}</span>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: EMPLOYMENT */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Employment Type</span>
                  <p className="font-bold text-slate-200">{employee.employeeType}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Start Date</span>
                  <p className="font-mono font-bold text-slate-200">{employee.startDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Supervisor</span>
                  <p className="font-bold text-slate-200">{employee.supervisorName || 'General Manager'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Standard Weekly Hours</span>
                  <p className="font-bold text-slate-200">{employee.normalWeeklyHours} hrs / week</p>
                </div>
              </div>

              {/* Salary Section (Protected by RBAC) */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Compensation & Payroll</h4>
                  {!canViewSalary && (
                    <span className="text-[10px] text-amber-400/90 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Confidential (Manager Only)
                    </span>
                  )}
                </div>
                {canViewSalary ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                    <span className="text-slate-400">Monthly Base Salary</span>
                    <span className="text-base font-black text-amber-400">
                      {employee.salary ? `${employee.salary.toLocaleString()} ETB` : 'Unspecified'}
                    </span>
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">
                    Compensation details are restricted to authorized Executive & HR Managers.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SHIFTS */}
          {activeTab === 'shifts' && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Roster Shifts</h4>
              {empShifts.length === 0 ? (
                <p className="text-slate-500 italic py-6 text-center">No upcoming shifts scheduled for this staff member.</p>
              ) : (
                <div className="space-y-2">
                  {empShifts.map((s, idx) => (
                    <div key={`${s.id}-${idx}`} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-100">{s.shiftName}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {s.date} • {s.startTime} - {s.endTime} {s.isOvernight && '(Overnight)'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {s.department}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DUTIES */}
          {activeTab === 'duties' && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Operational Duties</h4>
              {empDuties.length === 0 ? (
                <p className="text-slate-500 italic py-6 text-center">No operational duties currently assigned.</p>
              ) : (
                <div className="space-y-2">
                  {empDuties.map((d, idx) => (
                    <div key={`${d.id}-${idx}`} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{d.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {d.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{d.instructions}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance Log</h4>
              {empAttendance.length === 0 ? (
                <p className="text-slate-500 italic py-6 text-center">No attendance punches recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {empAttendance.map((a, idx) => (
                    <div key={`${a.id}-${idx}`} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-200">{a.date}</span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          In: {a.clockInTime || '--:--'} • Out: {a.clockOutTime || '--:--'} ({a.actualHours} hrs)
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: LEAVES */}
          {activeTab === 'leaves' && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Leave History</h4>
              {empLeaves.length === 0 ? (
                <p className="text-slate-500 italic py-6 text-center">No leave requests recorded.</p>
              ) : (
                <div className="space-y-2">
                  {empLeaves.map((l, idx) => (
                    <div key={`${l.id}-${idx}`} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{l.leaveType} ({l.totalDays} days)</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">
                          {l.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {l.startDate} to {l.endDate} • {l.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: QUALIFICATIONS */}
          {activeTab === 'qualifications' && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Certified Skills & Training</h4>
              {empQuals.length === 0 ? (
                <p className="text-slate-500 italic py-6 text-center">No certifications recorded for this employee.</p>
              ) : (
                <div className="space-y-2">
                  {empQuals.map((q, idx) => (
                    <div key={q._id || `${q.id || 'qual'}-${idx}`} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{q.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          {q.verificationStatus}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Issued by: {q.issuingBody} • {q.issueDate} {q.expiryDate ? `(Expires: ${q.expiryDate})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ID & DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Identification Document</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Document Type</span>
                    <span className="font-bold text-slate-200">{employee.idType || 'National ID'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Document Number</span>
                    <span className="font-mono font-bold text-amber-400">{employee.idNumberDoc || 'On file'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: HR NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Internal HR Remarks</h4>
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-300 leading-relaxed">
                {employee.notes || 'No remarks recorded for this staff member.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
