'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { HousekeepingTask, Room } from '@/lib/types';
import {
  Sparkles,
  Bed,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Plus,
  User,
  Filter,
  RefreshCw,
  Search,
  CheckSquare,
} from 'lucide-react';

export function HousekeepingView() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New Task Modal
  const [showModal, setShowModal] = useState(false);
  const [roomNumber, setRoomNumber] = useState('104');
  const [taskType, setTaskType] = useState<any>('Full Clean');
  const [priority, setPriority] = useState<any>('Normal');
  const [assignedStaff, setAssignedStaff] = useState('Tigist Haile');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setTasks(store.getHousekeepingTasks());
    setRooms(store.getRooms());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    store.addHousekeepingTask({
      roomNumber,
      taskType,
      priority,
      assignedStaff,
      status: 'Pending',
      notes,
    });
    setShowModal(false);
    setNotes('');
  };

  const filteredTasks = tasks.filter(
    (t) => filterStatus === 'all' || t.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Housekeeping & Maintenance Board</h1>
              <p className="text-xs text-slate-400">Room cleanliness status, maid task dispatching & maintenance logs.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Cleaning / Maintenance Task</span>
        </button>
      </div>

      {/* Quick Room Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              room.status === 'Dirty'
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-400'
                : room.status === 'Clean'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                : room.status === 'Inspected'
                ? 'bg-blue-950/20 border-blue-500/40 text-blue-400'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-100 text-base">#{room.roomNumber}</span>
                <span className="text-[10px] font-bold text-slate-400">{room.type}</span>
              </div>
              <p className="text-[11px] font-bold mt-1 uppercase tracking-wider">{room.status}</p>
            </div>

            {room.status === 'Dirty' && (
              <button
                onClick={() => store.updateRoomStatus(room.id, 'Clean')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] hover:bg-emerald-400"
              >
                Clean Now
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Task List Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-4">Room No.</th>
              <th className="p-4">Task Type</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Assigned Staff</th>
              <th className="p-4">Notes</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredTasks.map((t) => (
              <tr key={t.id} className="hover:bg-slate-800/40 transition">
                <td className="p-4 font-black text-slate-100 text-sm">#{t.roomNumber}</td>
                <td className="p-4 font-bold text-slate-200">{t.taskType}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.priority === 'Urgent'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.priority}
                  </span>
                </td>
                <td className="p-4 font-medium text-slate-300">{t.assignedStaff}</td>
                <td className="p-4 text-slate-400 text-[11px] max-w-xs truncate">{t.notes || 'N/A'}</td>
                <td className="p-4 text-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      t.status === 'Completed' || t.status === 'Inspected'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : t.status === 'In Progress'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {t.status === 'Pending' && (
                    <button
                      onClick={() => store.updateHousekeepingTaskStatus(t.id, 'In Progress')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
                    >
                      Start
                    </button>
                  )}
                  {t.status === 'In Progress' && (
                    <button
                      onClick={() => store.updateHousekeepingTaskStatus(t.id, 'Completed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition"
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NEW TASK MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Assign Housekeeping / Repair Task
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Room Number *</label>
                <select
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.roomNumber}>
                      Room #{r.roomNumber} ({r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Task Type</label>
                <select
                  value={taskType}
                  onChange={(e: any) => setTaskType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="Full Clean">Full Clean</option>
                  <option value="Touch-Up">Touch-Up</option>
                  <option value="Deep Clean">Deep Clean</option>
                  <option value="Maintenance Repair">Maintenance Repair</option>
                  <option value="Minibar Restock">Minibar Restock</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assigned Staff</label>
                <input
                  type="text"
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
