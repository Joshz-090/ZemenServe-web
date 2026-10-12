'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { store } from '@/lib/store';
import { Reservation, Room, HotelContract, MealPlan } from '@/lib/types';
import { isDateRangeOverlapping, getEthiopianLocalDate } from '@/lib/dateUtils';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  User,
  Bed,
  Phone,
  Mail,
  DollarSign,
  Tag,
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building,
  Sparkles,
  Utensils,
  CreditCard,
  ShieldAlert,
  Users,
  IdCard,
  X,
  FileText,
} from 'lucide-react';

export function ReservationsView() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [contracts, setContracts] = useState<HotelContract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guest Information (All required)
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [idType, setIdType] = useState('National ID (Fayda / FIN)');
  const [idNumber, setIdNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('Ethiopian');
  const [numberOfGuests, setNumberOfGuests] = useState(1);

  // Stay Dates & Room Selection
  const todayStr = useMemo(() => getEthiopianLocalDate(), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // Financial & Agreement
  const [bookingSource, setBookingSource] = useState<any>('Direct Walk-in');
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [selectedContractId, setSelectedContractId] = useState<number | 'none'>('none');
  const [mealPlan, setMealPlan] = useState<MealPlan>('Room Only');
  const [nightlyRateOverride, setNightlyRateOverride] = useState<number>(0);

  const loadData = () => {
    setReservations(store.getReservations ? store.getReservations() : []);
    setRooms(store.getRooms ? store.getRooms() : []);
    setContracts(store.getContracts ? store.getContracts() : []);
  };

  useEffect(() => {
    store.fetchReservationsFromDB?.();
    store.fetchRoomsFromDB?.();
    store.fetchContractsFromDB?.();
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  // Compute availability & conflict details for every room for the currently chosen dates
  const roomAvailabilityMap = useMemo(() => {
    const map = new Map<
      number,
      {
        isAvailable: boolean;
        reason?: string;
        conflictBooking?: Reservation;
      }
    >();

    rooms.forEach((room) => {
      // 1. Out of service check
      if (room.status === 'Out of Service') {
        map.set(room.id, {
          isAvailable: false,
          reason: 'Out of Service / Maintenance',
        });
        return;
      }

      // 2. Currently occupied today check
      if (checkInDate <= todayStr && room.status === 'Occupied') {
        map.set(room.id, {
          isAvailable: false,
          reason: `Currently Occupied today (${room.currentGuestName || 'Guest'})`,
        });
        return;
      }

      // 3. Overlap check against active reservations
      const conflict = reservations.find((res) => {
        if (res.roomId !== room.id && res.roomNumber !== room.roomNumber) return false;
        if (res.status !== 'Reserved' && res.status !== 'Checked-In') return false;
        return isDateRangeOverlapping(checkInDate, checkOutDate, res.checkInDate, res.checkOutDate);
      });

      if (conflict) {
        map.set(room.id, {
          isAvailable: false,
          reason: `Already booked (${conflict.checkInDate} to ${conflict.checkOutDate} by ${conflict.guestName})`,
          conflictBooking: conflict,
        });
      } else {
        map.set(room.id, { isAvailable: true });
      }
    });

    return map;
  }, [rooms, reservations, checkInDate, checkOutDate, todayStr]);

  // Set default selected room when modal opens or rooms load
  useEffect(() => {
    if (showModal && (!selectedRoomId || !rooms.find((r) => r.id === selectedRoomId))) {
      const firstAvail = rooms.find((r) => roomAvailabilityMap.get(r.id)?.isAvailable);
      if (firstAvail) {
        setSelectedRoomId(firstAvail.id);
        setNightlyRateOverride(firstAvail.pricePerNight);
      } else if (rooms.length > 0) {
        setSelectedRoomId(rooms[0].id);
        setNightlyRateOverride(rooms[0].pricePerNight);
      }
    }
  }, [showModal, rooms, roomAvailabilityMap, selectedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const selectedRoomConflict = useMemo(() => {
    if (!selectedRoomId) return null;
    return roomAvailabilityMap.get(selectedRoomId);
  }, [selectedRoomId, roomAvailabilityMap]);

  // Stay calculation
  const calcNights = useMemo(() => {
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  const effectiveRate = useMemo(() => {
    if (nightlyRateOverride > 0) return nightlyRateOverride;
    return selectedRoom ? selectedRoom.pricePerNight : 0;
  }, [nightlyRateOverride, selectedRoom]);

  const totalStayCost = calcNights * effectiveRate;
  const balanceDue = Math.max(0, totalStayCost - Number(depositPaid || 0));

  // Available room count for selected dates
  const availableRoomCount = useMemo(() => {
    return rooms.filter((r) => roomAvailabilityMap.get(r.id)?.isAvailable).length;
  }, [rooms, roomAvailabilityMap]);

  // Filtered reservations for the table
  const filteredReservations = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return reservations.filter((res) => {
      const matchSearch =
        !q ||
        res.guestName.toLowerCase().includes(q) ||
        res.bookingRef.toLowerCase().includes(q) ||
        res.roomNumber.toLowerCase().includes(q) ||
        (res.guestPhone && res.guestPhone.toLowerCase().includes(q)) ||
        (res.idNumber && res.idNumber.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || res.status === statusFilter;
      const matchSource = sourceFilter === 'all' || res.bookingSource === sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }, [reservations, searchTerm, statusFilter, sourceFilter]);

  const handleOpenNewModal = () => {
    setErrorMessage(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setIdNumber('');
    setIdType('National ID (Fayda / FIN)');
    setDateOfBirth('');
    setNationality('Ethiopian');
    setNumberOfGuests(1);
    setCheckInDate(todayStr);
    setCheckOutDate(tomorrowStr);
    setDepositPaid(0);
    setSelectedContractId('none');
    setMealPlan('Room Only');
    setBookingSource('Hotel Website');

    const firstAvail = rooms.find((r) => roomAvailabilityMap.get(r.id)?.isAvailable);
    if (firstAvail) {
      setSelectedRoomId(firstAvail.id);
      setNightlyRateOverride(firstAvail.pricePerNight);
    } else if (rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
      setNightlyRateOverride(rooms[0].pricePerNight);
    }

    setShowModal(true);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Mandatory validations
    if (!guestName.trim()) {
      setErrorMessage('Guest Full Name is required.');
      return;
    }
    if (!guestPhone.trim()) {
      setErrorMessage('Guest Contact Phone Number is required.');
      return;
    }
    if (!guestEmail.trim()) {
      setErrorMessage('Guest Email Address is required.');
      return;
    }
    if (!idNumber.trim()) {
      setErrorMessage('Guest ID / Passport Number is required.');
      return;
    }
    if (!dateOfBirth.trim()) {
      setErrorMessage('Guest Date of Birth / Age is required.');
      return;
    }
    if (!nationality.trim()) {
      setErrorMessage('Guest Nationality is required.');
      return;
    }
    if (!selectedRoom) {
      setErrorMessage('Please select a valid room.');
      return;
    }

    // 2. Date check
    if (calcNights <= 0) {
      setErrorMessage('Check-out date must be strictly after check-in date.');
      return;
    }

    // 3. Room capacity check
    if (numberOfGuests > selectedRoom.capacity) {
      setErrorMessage(
        `Guest count (${numberOfGuests}) exceeds Room #${selectedRoom.roomNumber} maximum capacity of ${selectedRoom.capacity} guests.`
      );
      return;
    }

    // 4. Room conflict check
    if (selectedRoomConflict && !selectedRoomConflict.isAvailable) {
      setErrorMessage(
        `Cannot book Room #${selectedRoom.roomNumber}: ${selectedRoomConflict.reason}`
      );
      return;
    }

    setSubmitting(true);
    const selectedContract =
      selectedContractId !== 'none'
        ? contracts.find((c) => c.id === selectedContractId)
        : undefined;

    const res = await store.createReservationAsync({
      guestId: Math.floor(Math.random() * 10000),
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestEmail: guestEmail.trim(),
      idNumber: idNumber.trim(),
      idType,
      dateOfBirth: dateOfBirth.trim(),
      nationality: nationality.trim(),
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.type,
      checkInDate,
      checkOutDate,
      nights: calcNights,
      numberOfGuests: Number(numberOfGuests) || 1,
      status: 'Reserved',
      bookingSource: selectedContract ? 'Corporate Partner' : bookingSource,
      nightlyRate: effectiveRate,
      totalAmount: totalStayCost,
      depositPaid: Number(depositPaid) || 0,
      paymentStatus:
        Number(depositPaid) >= totalStayCost ? 'Paid' : Number(depositPaid) > 0 ? 'Partial' : 'Pending',
      contractId: selectedContract?.id,
      contractName: selectedContract
        ? selectedContract.name || selectedContract.clientName
        : undefined,
      mealPlan,
    });
    setSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to create reservation.');
      return;
    }

    setShowModal(false);
  };

  const handleCancel = (resId: number, guest: string, roomNum: string) => {
    if (confirm(`Are you sure you want to cancel the reservation for ${guest} in Room #${roomNum}?`)) {
      store.cancelReservation(resId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-2xl text-amber-400 border border-amber-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Reservations & Advance Booking Management
              </h1>
              <p className="text-xs text-slate-400">
                Book future stays, prevent room date conflicts, register guest credentials & manage OTAs.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenNewModal}
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
            <p className="text-[10px] font-bold text-slate-400 uppercase">Booked Revenue</p>
            <h3 className="text-xl font-black text-amber-300 mt-1">
              {reservations
                .filter((r) => r.status !== 'Cancelled')
                .reduce((s, r) => s + r.totalAmount, 0)
                .toLocaleString()}{' '}
              <span className="text-[10px] text-slate-400">ETB</span>
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
            placeholder="Search booking ref, guest, room, phone, ID..."
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
              <th className="p-4">Guest Details</th>
              <th className="p-4">Room & Stay</th>
              <th className="p-4">Dates</th>
              <th className="p-4">Channel</th>
              <th className="p-4 text-right">Total (ETB)</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredReservations.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No reservations match your filters. Click "New Reservation Booking" to create one.
                </td>
              </tr>
            ) : (
              filteredReservations.map((res) => (
                <tr key={res.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4">
                    <span className="font-mono font-bold text-amber-400">{res.bookingRef}</span>
                    <div className="text-[10px] text-slate-500">
                      {res.createdAt ? new Date(res.createdAt).toLocaleDateString() : '—'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-100">{res.guestName}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-slate-500" />
                      <span>{res.guestPhone}</span>
                    </div>
                    {res.idNumber && (
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        ID: {res.idNumber} ({res.idType?.split(' ')[0] || 'ID'})
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-slate-200">Room #{res.roomNumber}</span>
                    <div className="text-[10px] text-slate-400">{res.roomType}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {res.numberOfGuests || 1} Guest{res.numberOfGuests !== 1 ? 's' : ''}
                    </div>
                    {res.mealPlan && res.mealPlan !== 'Room Only' && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 w-fit">
                        <Utensils className="w-2.5 h-2.5" />
                        <span>{res.mealPlan}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-slate-200 font-semibold">
                      {res.checkInDate} ➔ {res.checkOutDate}
                    </div>
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
                      Deposit: {(res.depositPaid || 0).toLocaleString()}
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => store.checkInReservation(res.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-sm"
                          title="Check-In Guest to Room"
                        >
                          Check-In
                        </button>
                        <button
                          onClick={() => handleCancel(res.id, res.guestName, res.roomNumber)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                          title="Cancel Reservation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW RESERVATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">New Hotel Room Reservation</h3>
                  <p className="text-[11px] text-slate-400">
                    All guest credentials & conflict-free dates are strictly verified before confirmation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SECTION 1: STAY DATES & REAL-TIME AVAILABILITY */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> 1. Stay Dates & Conflict Guard
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {availableRoomCount} of {rooms.length} Rooms Free
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Check-In Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Check-Out Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={checkInDate || todayStr}
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Room Selector with live conflict indicators */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Select Room *
                  </label>
                  <select
                    value={selectedRoomId || ''}
                    onChange={(e) => {
                      const rId = Number(e.target.value);
                      setSelectedRoomId(rId);
                      const room = rooms.find((r) => r.id === rId);
                      if (room && selectedContractId === 'none') {
                        setNightlyRateOverride(room.pricePerNight);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {rooms.map((r) => {
                      const avail = roomAvailabilityMap.get(r.id);
                      const isFree = avail?.isAvailable;
                      return (
                        <option key={r.id} value={r.id} disabled={!isFree}>
                          {isFree ? '✅ Available' : '⛔ Unavailable'} — Room #{r.roomNumber} ({r.type}) — {r.pricePerNight.toLocaleString()} ETB/nt {avail?.reason ? `[${avail.reason}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Room Conflict Warning Banner */}
                {selectedRoomConflict && !selectedRoomConflict.isAvailable && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Date Conflict Detected: Room #{selectedRoom?.roomNumber} is NOT free</span>
                    </div>
                    <p className="text-[11px] text-rose-200/90 pl-6">
                      {selectedRoomConflict.reason}. Please select another room or choose different dates.
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 2: REQUIRED GUEST CREDENTIALS */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> 2. Guest Information (All Fields Mandatory)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Guest Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abebe Bikila"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +251 911 234 567"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. guest@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Date of Birth / Age *
                    </label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      ID Type *
                    </label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="National ID (Fayda / FIN)">National ID (Fayda / FIN)</option>
                      <option value="Passport">Passport</option>
                      <option value="Kebele Resident ID">Kebele Resident ID</option>
                      <option value="Driver License">Driver License</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      ID / Passport Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="FIN-948203 or EP123456"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ethiopian"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">
                      Number of Guests Staying *
                    </label>
                    {selectedRoom && (
                      <span className="text-[10px] text-slate-500">
                        Max Capacity: {selectedRoom.capacity} Guests
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={selectedRoom ? selectedRoom.capacity : 10}
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SECTION 3: RATES & CONTRACT AGREEMENTS */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> 3. Commercial Rate & Advance Deposit
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Corporate Partner Contract
                    </label>
                    <select
                      value={selectedContractId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'none') {
                          setSelectedContractId('none');
                          setNightlyRateOverride(selectedRoom ? selectedRoom.pricePerNight : 0);
                          setBookingSource('Hotel Website');
                        } else {
                          const cId = Number(val);
                          setSelectedContractId(cId);
                          const c = contracts.find((contract) => contract.id === cId);
                          if (c) {
                            setNightlyRateOverride(c.agreedRate);
                            setMealPlan(c.mealPlan);
                            setBookingSource('Corporate Partner');
                          }
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="none">Standard Public Rack Rate</option>
                      {contracts
                        .filter((c) => c.status === 'Active')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName} ({c.agreedRate.toLocaleString()} ETB)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Meal Plan Inclusion
                    </label>
                    <select
                      value={mealPlan}
                      onChange={(e: any) => setMealPlan(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 font-bold text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="Room Only">Room Only</option>
                      <option value="Bed & Breakfast (BB)">Bed & Breakfast (BB)</option>
                      <option value="Half Board (HB)">Half Board (HB)</option>
                      <option value="Full Board (FB)">Full Board (FB)</option>
                      <option value="All-Inclusive">All-Inclusive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Booking Channel / Source
                    </label>
                    <select
                      value={bookingSource}
                      onChange={(e: any) => setBookingSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Direct Walk-in">Direct Walk-in</option>
                      <option value="Hotel Website">Hotel Website</option>
                      <option value="Booking.com">Booking.com</option>
                      <option value="Expedia">Expedia</option>
                      <option value="Corporate Partner">Corporate Partner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Advance Deposit Paid (ETB)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={totalStayCost}
                      value={depositPaid}
                      onChange={(e) => setDepositPaid(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Financial Summary Preview */}
                <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Calculated Stay: </span>
                    <span className="font-bold text-slate-200">
                      {calcNights} Night(s) × {effectiveRate.toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Total Cost</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {totalStayCost.toLocaleString()} ETB
                      </span>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-3">
                      <span className="text-[10px] text-slate-500 block">Balance Due</span>
                      <span className="font-mono font-black text-rose-400 text-sm">
                        {balanceDue.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (selectedRoomConflict ? !selectedRoomConflict.isAvailable : false)}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs transition shadow-lg ${
                    selectedRoomConflict && !selectedRoomConflict.isAvailable
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {submitting ? 'Verifying & Saving...' : 'Confirm & Save Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
