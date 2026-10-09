'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { Room, Guest, Reservation, FolioTransaction } from '@/lib/types';
import {
  Bed,
  UserCheck,
  LogOut,
  Key,
  Receipt,
  Plus,
  Search,
  FileText,
  CheckCircle,
  Calendar,
  DollarSign,
  Building,
  Phone,
  Mail,
  UserPlus,
  CreditCard,
  Printer,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter,
  X,
  AlertTriangle,
} from 'lucide-react';

interface FrontDeskViewProps {
  currentUser?: any;
}

export function FrontDeskView({ currentUser }: FrontDeskViewProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [folioTransactions, setFolioTransactions] = useState<FolioTransaction[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedRoomForCheckIn, setSelectedRoomForCheckIn] = useState<Room | null>(null);
  const [showFolioModal, setShowFolioModal] = useState<Reservation | null>(null);
  const [showNewGuestModal, setShowNewGuestModal] = useState(false);

  // Check-In Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState<'National ID' | 'Passport' | 'Driver License'>('National ID');
  const [nationality, setNationality] = useState('Ethiopian');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [bookingSource, setBookingSource] = useState<any>('Direct Walk-in');

  // New Folio Charge Form State
  const [chargeCategory, setChargeCategory] = useState<any>('Room Service');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState<number>(0);

  const loadData = () => {
    setRooms(store.getRooms());
    setReservations(store.getReservations());
    setGuests(store.getGuests());
    setFolioTransactions(store.getFolioTransactions());
  };

  const [checkInErrorMessage, setCheckInErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    store.fetchRoomsFromDB();
    store.fetchReservationsFromDB();
    store.fetchGuestsFromDB();
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const occupiedRoomsCount = rooms.filter((r) => r.status === 'Occupied').length;
  const availableRoomsCount = rooms.filter((r) => r.status === 'Clean' || r.status === 'Inspected').length;
  const dirtyRoomsCount = rooms.filter((r) => r.status === 'Dirty').length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRoomsCount / rooms.length) * 100) : 0;

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.currentGuestName && room.currentGuestName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFloor = selectedFloor === 'all' || room.floor === selectedFloor;
    const matchesStatus = selectedStatus === 'all' || room.status === selectedStatus;
    return matchesSearch && matchesFloor && matchesStatus;
  });

  const handleOpenCheckIn = (room: Room) => {
    setSelectedRoomForCheckIn(room);
    setDepositAmount(room.pricePerNight);
    setCheckInErrorMessage(null);
    setShowCheckInModal(true);
  };

  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInErrorMessage(null);
    if (!selectedRoomForCheckIn || !guestName) return;

    // Calculate nights
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    if (end <= start) {
      setCheckInErrorMessage('Check-out date must be after check-in date.');
      return;
    }
    const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));

    // Register or find guest
    let guest = guests.find((g) => g.fullName.toLowerCase() === guestName.toLowerCase());
    if (!guest) {
      guest = store.addGuest({
        fullName: guestName,
        phone: guestPhone || '+251 900 000 000',
        email: guestEmail || 'guest@hotel.com',
        idPassportNumber: idNumber || 'ID-NEW',
        idType,
        nationality,
        vipStatus: false,
        notes: '',
      });
    }

    const nightlyRate = selectedRoomForCheckIn.pricePerNight;
    const totalAmount = nightlyRate * diffDays;

    const res = await store.createReservationAsync({
      guestId: guest.id,
      guestName: guest.fullName,
      guestPhone: guest.phone,
      roomId: selectedRoomForCheckIn.id,
      roomNumber: selectedRoomForCheckIn.roomNumber,
      roomType: selectedRoomForCheckIn.type,
      checkInDate,
      checkOutDate,
      nights: diffDays,
      numberOfGuests: selectedRoomForCheckIn.capacity,
      status: 'Checked-In',
      bookingSource,
      nightlyRate,
      totalAmount,
      depositPaid: Number(depositAmount) || 0,
      paymentStatus: Number(depositAmount) >= totalAmount ? 'Paid' : depositAmount > 0 ? 'Partial' : 'Pending',
    });

    if (!res.success) {
      setCheckInErrorMessage(res.error || 'Check-in failed due to reservation conflict.');
      return;
    }

    store.updateRoomStatus(selectedRoomForCheckIn.id, 'Occupied');

    setShowCheckInModal(false);
    resetForm();
  };

  const handleExecuteCheckOut = (resId: number) => {
    const res = reservations.find((r) => r.id === resId);
    if (!res) return;

    // Check outstanding folio balance
    const folio = store.getFolioForReservation(resId);
    const debits = folio.filter((t) => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
    const credits = folio.filter((t) => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
    const balance = debits - credits;

    if (balance > 0) {
      if (
        !confirm(
          `Guest has an unpaid folio balance of ${balance.toLocaleString()} ETB.\nProceed to settle and check out?`
        )
      ) {
        return;
      }
      // Auto settle balance
      store.postFolioTransaction({
        reservationId: resId,
        roomNumber: res.roomNumber,
        guestName: res.guestName,
        category: 'Payment Deposit',
        description: `Final Checkout Settlement Payment`,
        amount: balance,
        type: 'Credit',
        paymentMethod: 'Cash',
        postedBy: currentUser?.name || 'Receptionist',
      });
    }

    store.checkOutReservation(resId);
    setShowFolioModal(null);
  };

  const handleAddFolioCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFolioModal || chargeAmount <= 0) return;

    store.postFolioTransaction({
      reservationId: showFolioModal.id,
      roomNumber: showFolioModal.roomNumber,
      guestName: showFolioModal.guestName,
      category: chargeCategory,
      description: chargeDescription || `${chargeCategory} Charge`,
      amount: Number(chargeAmount),
      type: 'Debit',
      postedBy: currentUser?.name || 'Receptionist',
    });

    setChargeDescription('');
    setChargeAmount(0);
  };

  const handleAddFolioPayment = (paymentAmount: number, method: any) => {
    if (!showFolioModal || paymentAmount <= 0) return;

    store.postFolioTransaction({
      reservationId: showFolioModal.id,
      roomNumber: showFolioModal.roomNumber,
      guestName: showFolioModal.guestName,
      category: 'Payment Deposit',
      description: `Payment Received via ${method}`,
      amount: paymentAmount,
      type: 'Credit',
      paymentMethod: method,
      postedBy: currentUser?.name || 'Receptionist',
    });
  };

  const resetForm = () => {
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setIdNumber('');
    setDepositAmount(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Front Office & Reception Desk</h1>
              <p className="text-xs text-slate-400">Guest registration, live room matrix, key cards & checkout folios.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowNewGuestModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>New Guest Registration</span>
          </button>
          <button
            onClick={() => {
              const cleanRoom = rooms.find((r) => r.status === 'Clean');
              if (cleanRoom) handleOpenCheckIn(cleanRoom);
              else alert('No clean rooms available currently!');
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <UserCheck className="w-4 h-4" />
            <span>Walk-In Quick Check-In</span>
          </button>
        </div>
      </div>

      {/* Realtime KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Occupancy Rate</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{occupancyRate}%</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{occupiedRoomsCount} of {rooms.length} Rooms Occupied</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Bed className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Ready</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{availableRoomsCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Inspected & Clean Rooms</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Needs Cleaning</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">{dirtyRoomsCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Assigned to Housekeeping</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Bookings</p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">{reservations.filter(r => r.status === 'Checked-In').length}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Guests currently checked in</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search room, type or guest name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Floors</option>
            <option value={1}>Floor 1</option>
            <option value={2}>Floor 2</option>
            <option value={3}>Floor 3</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Room Statuses</option>
            <option value="Clean">Clean Ready</option>
            <option value="Occupied">Occupied</option>
            <option value="Dirty">Dirty Cleanup Needed</option>
            <option value="Inspected">Inspected</option>
            <option value="Out of Service">Out of Service</option>
          </select>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
            title="Refresh Room Matrix"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Room Grid Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Live Hotel Room Matrix</h2>
          <span className="text-xs text-slate-500">Showing {filteredRooms.length} rooms</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const activeRes = reservations.find(
              (r) => (r.roomId === room.id || r.roomNumber === room.roomNumber) && r.status === 'Checked-In'
            );

            return (
              <div
                key={room.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative group ${
                  room.status === 'Occupied'
                    ? 'bg-gradient-to-br from-amber-950/30 to-slate-900/90 border-amber-500/40 hover:border-amber-400'
                    : room.status === 'Clean' || room.status === 'Inspected'
                    ? 'bg-slate-900/70 border-emerald-500/30 hover:border-emerald-400'
                    : room.status === 'Dirty'
                    ? 'bg-slate-900/70 border-rose-500/30 hover:border-rose-400'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                {/* Room Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-100">#{room.roomNumber}</span>
                      <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                        Fl. {room.floor}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        room.status === 'Occupied'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : room.status === 'Clean'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : room.status === 'Inspected'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : room.status === 'Dirty'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-300">{room.type}</p>
                  <p className="text-xs font-black text-amber-400/90 mt-1">
                    {room.pricePerNight.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB / night</span>
                  </p>

                  {/* Guest Info if Occupied */}
                  {room.status === 'Occupied' && activeRes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="truncate">{activeRes.guestName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Check-out:</span>
                        <span className="font-semibold text-slate-200">{activeRes.checkOutDate}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Ref:</span>
                        <span className="font-mono text-amber-400">{activeRes.bookingRef}</span>
                      </div>
                    </div>
                  )}

                  {/* Amenities Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {room.amenities.slice(0, 3).map((am, i) => (
                      <span key={i} className="text-[9px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80">
                        {am}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  {room.status === 'Occupied' && activeRes ? (
                    <>
                      <button
                        onClick={() => setShowFolioModal(activeRes)}
                        className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-700"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Folio & Invoice</span>
                      </button>
                      <button
                        onClick={() => handleExecuteCheckOut(activeRes.id)}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1 border border-rose-500/30"
                        title="Check-Out Guest"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : room.status === 'Clean' || room.status === 'Inspected' ? (
                    <button
                      onClick={() => handleOpenCheckIn(room)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Check-In Guest</span>
                    </button>
                  ) : room.status === 'Dirty' ? (
                    <button
                      onClick={() => store.updateRoomStatus(room.id, 'Inspected')}
                      className="w-full py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-blue-500/30"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Inspected</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => store.updateRoomStatus(room.id, 'Clean')}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    >
                      Enable Room
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHECK-IN MODAL */}
      {showCheckInModal && selectedRoomForCheckIn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Guest Check-In Wizard</h3>
                  <p className="text-xs text-amber-400 font-medium">Room #{selectedRoomForCheckIn.roomNumber} ({selectedRoomForCheckIn.type})</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCheckIn} className="space-y-4 text-xs">
              {checkInErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{checkInErrorMessage}</span>
                </div>
              )}
              {/* Guest Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Guest Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abebe Balcha"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+251 911 000 000"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    ID / Passport No.
                  </label>
                  <input
                    type="text"
                    placeholder="ETH-948201"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    ID Document Type
                  </label>
                  <select
                    value={idType}
                    onChange={(e: any) => setIdType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver License">Driver License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Dates & Source */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Check-In Date
                  </label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Check-Out Date
                  </label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Booking Source
                  </label>
                  <select
                    value={bookingSource}
                    onChange={(e) => setBookingSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Direct Walk-in">Direct Walk-in</option>
                    <option value="Hotel Website">Hotel Website</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Expedia">Expedia</option>
                    <option value="Corporate Partner">Corporate Partner</option>
                  </select>
                </div>
              </div>

              {/* Deposit Payment */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Advance Deposit Payment</p>
                  <p className="text-[11px] text-slate-400">Nightly rate: {selectedRoomForCheckIn.pricePerNight.toLocaleString()} ETB</p>
                </div>
                <div className="w-36">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-right font-black text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GUEST FOLIO & INVOICE MODAL */}
      {showFolioModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Guest Statement & Invoicing Folio</h3>
                  <p className="text-xs text-amber-400 font-medium">
                    Room #{showFolioModal.roomNumber} • Guest: {showFolioModal.guestName} ({showFolioModal.bookingRef})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFolioModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Folio Transaction Table */}
            <div className="space-y-3">
              <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-3">Date/Time</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit (Charge)</th>
                      <th className="p-3 text-right">Credit (Paid)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                    {store.getFolioForReservation(showFolioModal.id).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 text-[10px] text-slate-400">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                            {tx.category}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-200">{tx.description}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400">
                          {tx.type === 'Debit' ? `${tx.amount.toLocaleString()} ETB` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {tx.type === 'Credit' ? `${tx.amount.toLocaleString()} ETB` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Folio Balance Summary Card */}
              {(() => {
                const txs = store.getFolioForReservation(showFolioModal.id);
                const totalDebits = txs.filter((t) => t.type === 'Debit').reduce((a, b) => a + b.amount, 0);
                const totalCredits = txs.filter((t) => t.type === 'Credit').reduce((a, b) => a + b.amount, 0);
                const balance = totalDebits - totalCredits;

                return (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Folio Summary</p>
                      <p className="text-xs text-slate-300">Total Charges: <span className="font-bold text-rose-400">{totalDebits.toLocaleString()} ETB</span></p>
                      <p className="text-xs text-slate-300">Total Payments: <span className="font-bold text-emerald-400">{totalCredits.toLocaleString()} ETB</span></p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Outstanding Balance</p>
                      <h4 className={`text-xl font-black ${balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {balance.toLocaleString()} ETB
                      </h4>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Add Extra Room Charge Form */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-400" />
                Post Extra Charge to Guest Folio
              </h4>
              <form onSubmit={handleAddFolioCharge} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={chargeCategory}
                  onChange={(e: any) => setChargeCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="Room Service">Room Service</option>
                  <option value="Laundry">Laundry</option>
                  <option value="Minibar">Minibar Restock</option>
                  <option value="Spa & Wellness">Spa & Wellness</option>
                  <option value="Late Fee">Late Checkout Fee</option>
                </select>

                <input
                  type="text"
                  placeholder="Charge description..."
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />

                <input
                  type="number"
                  placeholder="Amount (ETB)"
                  value={chargeAmount || ''}
                  onChange={(e) => setChargeAmount(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 text-right font-bold"
                />

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition"
                >
                  Post Charge
                </button>
              </form>
            </div>

            {/* Quick Payment Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => handleAddFolioPayment(500, 'Telebirr')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  + Telebirr
                </button>
              </div>

              <button
                onClick={() => handleExecuteCheckOut(showFolioModal.id)}
                className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Settle Folio & Check-Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW GUEST REGISTRATION MODAL */}
      {showNewGuestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Register New Guest Profile
              </h3>
              <button onClick={() => setShowNewGuestModal(false)} className="text-slate-400 hover:text-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                store.addGuest({
                  fullName: guestName,
                  phone: guestPhone || '+251 900 000 000',
                  email: guestEmail || 'guest@example.com',
                  idPassportNumber: idNumber || 'ID-REG',
                  idType,
                  nationality,
                  vipStatus: false,
                });
                setShowNewGuestModal(false);
                resetForm();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Full Name *</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Phone Number</label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ID / Passport Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewGuestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
