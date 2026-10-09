'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { StaffMember } from '@/lib/types';
import {
  Users,
  Briefcase,
  Clock,
  Phone,
  Plus,
  Search,
  CheckCircle,
  Shield,
  Sparkles,
} from 'lucide-react';

export function StaffHrView() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<any>('Front Office');
  const [role, setRole] = useState('');
  const [shift, setShift] = useState<any>('Morning (06:00-14:00)');
  const [phone, setPhone] = useState('');

  const loadData = () => {
    setStaff(store.getStaffMembers());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;

    store.addStaffMember({
      name,
      department,
      role,
      shift,
      phone: phone || '+251 900 000 000',
      status: 'Active',
    });

    setShowModal(false);
    setName('');
    setRole('');
    setPhone('');
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || s.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Staff & HR Management Roster</h1>
              <p className="text-xs text-slate-400">Employee directory, department shifts, roles & duty assignments.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee Profile</span>
        </button>
      </div>

      {/* Department Breakdown Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['Front Office', 'Housekeeping', 'Food & Beverage', 'Kitchen'].map((dept) => {
          const count = staff.filter((s) => s.department === dept).length;
          return (
            <div key={dept} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{dept}</p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{count} <span className="text-[10px] text-slate-400 font-normal">Staff</span></h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Roster Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-4">Employee Name</th>
              <th className="p-4">Department</th>
              <th className="p-4">Role Position</th>
              <th className="p-4">Shift Schedule</th>
              <th className="p-4">Contact Phone</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStaff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/40 transition">
                <td className="p-4 font-bold text-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-xs">
                    {s.name.charAt(0)}
                  </div>
                  <span>{s.name}</span>
                </td>
                <td className="p-4 font-bold text-slate-200">{s.department}</td>
                <td className="p-4 text-slate-300">{s.role}</td>
                <td className="p-4 text-amber-400/90 font-medium">{s.shift}</td>
                <td className="p-4 font-mono text-slate-300">{s.phone}</td>
                <td className="p-4 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD STAFF MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Add Employee Record
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e: any) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="Front Office">Front Office</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Finance">Finance</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Job Title / Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Receptionist"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Shift Schedule</label>
                <select
                  value={shift}
                  onChange={(e: any) => setShift(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="Morning (06:00-14:00)">Morning (06:00-14:00)</option>
                  <option value="Evening (14:00-22:00)">Evening (14:00-22:00)</option>
                  <option value="Night (22:00-06:00)">Night (22:00-06:00)</option>
                  <option value="General (08:00-17:00)">General (08:00-17:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+251 900 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
    </div>
  );
}
