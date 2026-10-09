'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { EventHall, EventBooking } from '@/lib/types';
import {
  Building,
  Users,
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle,
  Tag,
  Sparkles,
  DollarSign,
  Phone,
  FileText,
} from 'lucide-react';

export function EventManagementView() {
  const [halls, setHalls] = useState<EventHall[]>([]);
  const [bookings, setBookings] = useState<EventBooking[]>([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerContact, setOrganizerContact] = useState('');
  const [selectedHallId, setSelectedHallId] = useState<number>(1);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [expectedAttendees, setExpectedAttendees] = useState<number>(100);
  const [setupFormat, setSetupFormat] = useState<any>('Banquet');
  const [cateringPackage, setCateringPackage] = useState('VIP Buffet');
  const [depositPaid, setDepositPaid] = useState<number>(10000);

  const loadData = () => {
    setHalls(store.getEventHalls());
    setBookings(store.getEventBookings());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const hall = halls.find((h) => h.id === selectedHallId) || halls[0];
    if (!hall || !eventTitle) return;

    const totalAmount = hall.dailyRate + 10000; // Hall + Catering estimate

    store.createEventBooking({
      eventTitle,
      organizerName,
      organizerContact: organizerContact || '+251 900 000 000',
      hallId: hall.id,
      hallName: hall.name,
      eventDate,
      startTime,
      endTime,
      expectedAttendees: Number(expectedAttendees),
      setupFormat,
      cateringPackage,
      totalAmount,
      depositPaid: Number(depositPaid) || 0,
      status: 'Confirmed',
    });

    setShowModal(false);
    setEventTitle('');
    setOrganizerName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Events, Conference & Banquet Halls</h1>
              <p className="text-xs text-slate-400">Hall reservations, equipment rentals, meeting setups & corporate catering.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Book Conference Hall / Event</span>
        </button>
      </div>

      {/* Available Halls Cards */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Conference & Banquet Venues</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {halls.map((hall) => (
            <div key={hall.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-100">{hall.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  {hall.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-300">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Users className="w-4 h-4" />
                  <span>Cap: {hall.capacity} pax</span>
                </div>
                <div className="font-mono font-bold text-slate-200">
                  {hall.dailyRate.toLocaleString()} ETB / day
                </div>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {hall.amenities.map((am, i) => (
                  <span key={i} className="text-[9px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                    {am}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Bookings Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Scheduled Event Bookings</h2>
        <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="p-4">Event Ref</th>
                <th className="p-4">Event Title</th>
                <th className="p-4">Organizer</th>
                <th className="p-4">Hall Venue</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Format</th>
                <th className="p-4 text-right">Total (ETB)</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-mono font-bold text-amber-400">{b.bookingRef}</td>
                  <td className="p-4 font-bold text-slate-100">{b.eventTitle}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-200">{b.organizerName}</div>
                    <div className="text-[10px] text-slate-400">{b.organizerContact}</div>
                  </td>
                  <td className="p-4 font-bold text-slate-300">{b.hallName}</td>
                  <td className="p-4">
                    <div className="text-slate-200">{b.eventDate}</div>
                    <div className="text-[10px] text-amber-400">{b.startTime} - {b.endTime}</div>
                  </td>
                  <td className="p-4 text-slate-300">{b.setupFormat}</td>
                  <td className="p-4 text-right font-mono font-black text-slate-100">
                    {b.totalAmount.toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW EVENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                Book Event / Conference Hall
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Conference"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Organizer Company / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Organizer name"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Hall Venue</label>
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Cap: {h.capacity} pax - {h.dailyRate} ETB/day)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Setup Format</label>
                  <select
                    value={setupFormat}
                    onChange={(e: any) => setSetupFormat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="Banquet">Banquet</option>
                    <option value="Theater">Theater</option>
                    <option value="Classroom">Classroom</option>
                    <option value="U-Shape">U-Shape</option>
                    <option value="Cocktail">Cocktail</option>
                  </select>
                </div>
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
                  Confirm Event Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
