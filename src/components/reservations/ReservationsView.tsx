'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { Reservation, Room } from '@/lib/types';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  User,
  Bed,
  Phone,
  DollarSign,
  Tag,
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building,
  Sparkles,
} from 'lucide-react';

export function ReservationsView() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // New Reservation Modal State
  const [showModal, setShowModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number>(1);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );
  const [bookingSource, setBookingSource] = useState<any>('Hotel Website');
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setReservations(store.getReservations());
    setRooms(store.getRooms());
  };

  useEffect(() => {
    store.fetchReservationsFromDB();
    store.fetchRoomsFromDB();
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const filteredReservations = reservations.filter((res) => {
    const matchesSearch =
      res.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || res.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || res.bookingSource === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const room = rooms.find((r) => r.id === selectedRoomId) || rooms[0];
    if (!room || !guestName) return;

    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    if (end <= start) {
      setErrorMessage('Check-out date must be after check-in date.');
      return;
    }

    const nights = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
    const totalAmount = room.pricePerNight * nights;

    setSubmitting(true);
    const res = await store.createReservationAsync({
      guestId: Math.floor(Math.random() * 1000),
      guestName,
      guestPhone: guestPhone || '+251 900 000 000',
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomType: room.type,
      checkInDate,
      checkOutDate,
      nights,
      numberOfGuests: room.capacity,
      status: 'Reserved',
      bookingSource,
      nightlyRate: room.pricePerNight,
      totalAmount,
      depositPaid: Number(depositPaid) || 0,
      paymentStatus: Number(depositPaid) >= totalAmount ? 'Paid' : depositPaid > 0 ? 'Partial' : 'Pending',
    });
    setSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to create reservation.');
      return;
    }

    setShowModal(false);
    setGuestName('');
    setGuestPhone('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Reservations & Room Calendar</h1>
              <p className="text-xs text-slate-400">Booking grid, seasonal rates, online booking & channel management.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation Booking</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Reservations</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{reservations.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Checked-In Guests</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              {reservations.filter((r) => r.status === 'Checked-In').length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Upcoming Reserved</p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">
              {reservations.filter((r) => r.status === 'Reserved').length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Booking Revenue</p>
            <h3 className="text-xl font-black text-amber-300 mt-1">
              {reservations.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()} <span className="text-[10px] text-slate-400">ETB</span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search booking ref, guest or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Reservation Statuses</option>
            <option value="Reserved">Reserved (Upcoming)</option>
            <option value="Checked-In">Checked-In Active</option>
            <option value="Checked-Out">Checked-Out Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Booking Channels</option>
            <option value="Direct Walk-in">Direct Walk-in</option>
            <option value="Hotel Website">Hotel Website</option>
            <option value="Booking.com">Booking.com</option>
            <option value="Expedia">Expedia</option>
            <option value="Corporate Partner">Corporate Partner</option>
          </select>
        </div>
      </div>

      {/* Reservation Data Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-4">Booking Ref</th>
              <th className="p-4">Guest Name</th>
              <th className="p-4">Room & Type</th>
              <th className="p-4">Dates</th>
              <th className="p-4">Source</th>
              <th className="p-4 text-right">Total (ETB)</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredReservations.map((res) => (
              <tr key={res.id} className="hover:bg-slate-800/40 transition">
                <td className="p-4 font-mono font-bold text-amber-400">{res.bookingRef}</td>
                <td className="p-4 font-bold text-slate-100">
                  {res.guestName}
                  <div className="text-[10px] font-normal text-slate-400">{res.guestPhone}</div>
                </td>
                <td className="p-4">
                  <span className="font-bold text-slate-200">Room #{res.roomNumber}</span>
                  <div className="text-[10px] text-slate-400">{res.roomType}</div>
                </td>
                <td className="p-4">
                  <div className="text-slate-200">{res.checkInDate} to {res.checkOutDate}</div>
                  <div className="text-[10px] text-amber-400/90 font-medium">{res.nights} Night(s)</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                    {res.bookingSource}
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-black text-slate-100">
                  {res.totalAmount.toLocaleString()}
                  <div className="text-[10px] font-normal text-emerald-400">
                    Deposit: {res.depositPaid.toLocaleString()}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      res.status === 'Checked-In'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : res.status === 'Reserved'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : res.status === 'Checked-Out'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {res.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {res.status === 'Reserved' && (
                    <button
                      onClick={() => store.checkInReservation(res.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20"
                    >
                      Check-In
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NEW RESERVATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                New Hotel Room Reservation
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-3 text-xs">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Guest Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Guest Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Room *</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room #{r.roomNumber} - {r.type} ({r.pricePerNight} ETB/night)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Check-In</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Check-Out</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Source</label>
                  <select
                    value={bookingSource}
                    onChange={(e: any) => setBookingSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="Direct Walk-in">Direct Walk-in</option>
                    <option value="Hotel Website">Hotel Website</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Expedia">Expedia</option>
                    <option value="Corporate Partner">Corporate Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Deposit Paid (ETB)</label>
                  <input
                    type="number"
                    value={depositPaid}
                    onChange={(e) => setDepositPaid(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-right font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  Save Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
