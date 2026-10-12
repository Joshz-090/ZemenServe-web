'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { store } from '@/lib/store';
import { Room, Guest, Reservation, FolioTransaction, HotelContract, MealPlan } from '@/lib/types';
import {
  Bed,
  UserCheck,
  LogOut,
  Key,
  Receipt,
  Plus,
  Search,
  CheckCircle,
  Calendar,
  DollarSign,
  Phone,
  CreditCard,
  Printer,
  RefreshCw,
  X,
  AlertTriangle,
  Camera,
  Calculator,
  Upload,
  ChevronRight,
  History,
  CalendarDays,
  Users,
} from 'lucide-react';

interface FrontDeskViewProps {
  currentUser?: any;
}

type CheckInStep = 'fee-confirm' | 'guest-info';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const statusBadge = (status: string) => {
  if (status === 'Occupied') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function FrontDeskView({ currentUser }: FrontDeskViewProps) {

  // ── Data state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [contracts, setContracts] = useState<HotelContract[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Available' | 'Occupied'>('all');

  // ── Check-In wizard
  const [checkInStep, setCheckInStep] = useState<CheckInStep>('fee-confirm');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Check-in form fields
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('National ID (Fayda / FIN)');
  const [idImageUrl, setIdImageUrl] = useState('');
  const [nationality, setNationality] = useState('Ethiopian');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [depositAmount, setDepositAmount] = useState(0);
  const [bookingSource, setBookingSource] = useState('Direct Walk-in');
  const [selectedContractId, setSelectedContractId] = useState<number | 'none'>('none');
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan>('Room Only');
  const [customNightlyRate, setCustomNightlyRate] = useState(0);

  // ── Folio modal
  const [showFolioModal, setShowFolioModal] = useState<Reservation | null>(null);
  const [chargeCategory, setChargeCategory] = useState('Room Service');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState(0);
  const [paymentInputAmount, setPaymentInputAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<any>('Cash');

  // ── ID image modal
  const [viewingIdModal, setViewingIdModal] = useState<{
    guestName: string; idNumber: string; idType: string; idImageUrl: string;
  } | null>(null);

  // ── Guest history
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────────
  const loadData = () => {
    setRooms(store.getRooms());
    setReservations(store.getReservations());
    setGuests(store.getGuests());
    setContracts(store.getContracts ? store.getContracts() : []);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await Promise.all([
      store.fetchRoomsFromDB?.(true) ?? Promise.resolve(),
      store.fetchReservationsFromDB?.(true) ?? Promise.resolve(),
      store.fetchGuestsFromDB?.(true) ?? Promise.resolve(),
      store.fetchContractsFromDB?.(true) ?? Promise.resolve(),
    ]);
    loadData();
    setTimeout(() => setIsSyncing(false), 400);
  };

  useEffect(() => {
    handleSync();
    const unsub = store.subscribe(loadData);
    return () => unsub();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────────────────────────────────────

  // Reception only sees Available and Occupied rooms (spec: no Out of Service / Dirty / Inspected)
  const receptionRooms = useMemo(
    () => rooms.filter((r) => r.status !== 'Out of Service' && r.status !== 'Dirty'),
    [rooms]
  );

  const roomTypes = useMemo(
    () => Array.from(new Set(receptionRooms.map((r) => r.type))).sort(),
    [receptionRooms]
  );

  const filteredRooms = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return receptionRooms.filter((room) => {
      const isAvail = room.status === 'Clean' || room.status === 'Inspected';
      const statusMatch =
        filterStatus === 'all' ||
        (filterStatus === 'Available' && isAvail) ||
        (filterStatus === 'Occupied' && room.status === 'Occupied');
      const typeMatch = filterType === 'all' || room.type === filterType;
      const searchMatch =
        !q ||
        room.roomNumber.toLowerCase().includes(q) ||
        room.type.toLowerCase().includes(q) ||
        (room.currentGuestName && room.currentGuestName.toLowerCase().includes(q));
      return statusMatch && typeMatch && searchMatch;
    });
  }, [receptionRooms, searchTerm, filterType, filterStatus]);

  const availableCount = receptionRooms.filter(
    (r) => r.status === 'Clean' || r.status === 'Inspected'
  ).length;
  const occupiedCount = receptionRooms.filter((r) => r.status === 'Occupied').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIns = reservations.filter((r) => r.checkInDate === todayStr).length;
  const activeGuests = reservations.filter((r) => r.status === 'Checked-In').length;

  // ─────────────────────────────────────────────────────────────────────────
  // Guest history
  // ─────────────────────────────────────────────────────────────────────────
  const historyRows = useMemo(() => {
    return reservations
      .filter((r) => {
        const matchDate = historyDateFilter
          ? r.checkInDate === historyDateFilter || r.checkOutDate === historyDateFilter
          : true;
        const q = historySearch.toLowerCase();
        const matchSearch = !q ||
          r.guestName.toLowerCase().includes(q) ||
          r.roomNumber.includes(q) ||
          (r.idNumber && r.idNumber.toLowerCase().includes(q));
        return matchDate && matchSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reservations, historyDateFilter, historySearch]);

  // ─────────────────────────────────────────────────────────────────────────
  // Check-In helpers
  // ─────────────────────────────────────────────────────────────────────────
  const calcNights = () => {
    const ms = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 3600 * 24)));
  };

  const effectiveRate =
    customNightlyRate > 0 ? customNightlyRate : (selectedRoom?.pricePerNight ?? 0);
  const totalCost = calcNights() * effectiveRate;
  const balanceDue = Math.max(0, totalCost - Number(depositAmount || 0));

  const openCheckIn = (room: Room) => {
    if (room.status !== 'Clean' && room.status !== 'Inspected') return;
    setSelectedRoom(room);
    setCustomNightlyRate(room.pricePerNight);
    setDepositAmount(room.pricePerNight);
    setSelectedContractId('none');
    setGuestName(''); setGuestPhone(''); setGuestEmail('');
    setDateOfBirth(''); setIdNumber(''); setIdImageUrl('');
    setIdType('National ID (Fayda / FIN)');
    setNationality('Ethiopian');
    setNumberOfGuests(1);
    setCheckInDate(todayStr);
    setCheckOutDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setSelectedMealPlan('Room Only');
    setBookingSource('Direct Walk-in');
    setCheckInError(null);
    setCheckInStep('fee-confirm');
    setShowCheckInModal(true);
  };

  const handleContractChange = (val: string) => {
    if (val === 'none') {
      setSelectedContractId('none');
      if (selectedRoom) {
        setCustomNightlyRate(selectedRoom.pricePerNight);
        setDepositAmount(selectedRoom.pricePerNight);
      }
      setBookingSource('Direct Walk-in');
    } else {
      const cId = Number(val);
      setSelectedContractId(cId);
      const contract = contracts.find((c) => c.id === cId);
      if (contract) {
        setCustomNightlyRate(contract.agreedRate);
        setDepositAmount(contract.agreedRate);
        setSelectedMealPlan(contract.mealPlan);
        setBookingSource('Corporate Partner');
      }
    }
  };

  const handleIdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setIdImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInError(null);
    if (!selectedRoom || !guestName.trim()) return;

    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    if (end <= start) {
      setCheckInError('Check-out date must be after check-in date.');
      return;
    }
    const nights = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));

    // Register or find guest
    let guest = guests.find((g) => g.fullName.toLowerCase() === guestName.toLowerCase().trim());
    if (!guest) {
      guest = store.addGuest({
        fullName: guestName.trim(),
        phone: guestPhone || '+251 900 000 000',
        email: guestEmail || 'guest@hotel.com',
        idPassportNumber: idNumber || 'FIN-REG',
        idType,
        dateOfBirth: dateOfBirth || undefined,
        idImageUrl: idImageUrl || undefined,
        nationality,
        vipStatus: false,
        notes: '',
      } as any);
    }

    const finalRate = customNightlyRate > 0 ? customNightlyRate : selectedRoom.pricePerNight;
    const totalAmount = finalRate * nights;
    const selectedContract =
      selectedContractId !== 'none' ? contracts.find((c) => c.id === selectedContractId) : undefined;

    const res = await store.createReservationAsync({
      guestId: guest.id,
      guestName: guest.fullName,
      guestPhone: guest.phone,
      idNumber: idNumber || guest.idPassportNumber,
      idType,
      idImageUrl: idImageUrl || undefined,
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.type,
      checkInDate,
      checkOutDate,
      nights,
      numberOfGuests,
      status: 'Checked-In',
      bookingSource: selectedContract ? 'Corporate Partner' : (bookingSource as any),
      nightlyRate: finalRate,
      totalAmount,
      depositPaid: Number(depositAmount) || 0,
      paymentStatus:
        Number(depositAmount) >= totalAmount ? 'Paid' : depositAmount > 0 ? 'Partial' : 'Pending',
      contractId: selectedContract?.id,
      contractName: selectedContract ? selectedContract.name || selectedContract.clientName : undefined,
      mealPlan: selectedMealPlan,
    });

    if (!res.success) {
      setCheckInError(res.error || 'Check-in failed. Please try again.');
      return;
    }

    setShowCheckInModal(false);
  };

  const handleCheckOut = (resId: number) => {
    const res = reservations.find((r) => r.id === resId);
    if (!res) return;

    const folio = store.getFolioForReservation(resId);
    const debits = folio.filter((t) => t.type === 'Debit').reduce((s, t) => s + t.amount, 0);
    const credits = folio.filter((t) => t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
    const balance = debits - credits;

    if (balance > 0) {
      if (!confirm(`Outstanding balance: ${balance.toLocaleString()} ETB.\nSettle and check out?`)) return;
      store.postFolioTransaction({
        reservationId: resId,
        roomNumber: res.roomNumber,
        guestName: res.guestName,
        category: 'Payment Deposit',
        description: 'Final Checkout Settlement',
        amount: balance,
        type: 'Credit',
        paymentMethod: 'Cash',
        postedBy: currentUser?.name || 'Receptionist',
      });
    }

    store.checkOutReservation(resId);
    setShowFolioModal(null);
  };

  const handleFolioCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFolioModal || chargeAmount <= 0) return;
    store.postFolioTransaction({
      reservationId: showFolioModal.id,
      roomNumber: showFolioModal.roomNumber,
      guestName: showFolioModal.guestName,
      category: chargeCategory as any,
      description: chargeDescription || `${chargeCategory} Charge`,
      amount: Number(chargeAmount),
      type: 'Debit',
      postedBy: currentUser?.name || 'Receptionist',
    });
    setChargeDescription('');
    setChargeAmount(0);
  };

  const handleFolioPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFolioModal || paymentInputAmount <= 0) return;
    store.postFolioTransaction({
      reservationId: showFolioModal.id,
      roomNumber: showFolioModal.roomNumber,
      guestName: showFolioModal.guestName,
      category: 'Payment Deposit',
      description: `Payment via ${paymentMethod}`,
      amount: paymentInputAmount,
      type: 'Credit',
      paymentMethod,
      postedBy: currentUser?.name || 'Receptionist',
    });
    setPaymentInputAmount(0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">


      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 tracking-tight">Front Office — Reception</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Tap any <span className="text-emerald-400 font-bold">Available</span> room to register a guest. Tap{' '}
              <span className="text-amber-400 font-bold">Occupied</span> rooms to manage folio or check out.
            </p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-500/30 text-xs font-bold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {/* ── KPI bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Rooms', value: availableCount, color: 'emerald', Icon: CheckCircle, sub: 'Ready for check-in' },
          { label: 'Occupied Rooms', value: occupiedCount, color: 'amber', Icon: Bed, sub: 'Currently occupied' },
          { label: "Today's Check-Ins", value: todayCheckIns, color: 'blue', Icon: Calendar, sub: 'Arrivals today' },
          { label: 'Active Guests', value: activeGuests, color: 'purple', Icon: UserCheck, sub: 'Currently staying' },
        ].map(({ label, value, color, Icon, sub }) => (
          <div key={label} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <h3 className={`text-2xl font-black text-${color}-400 mt-1`}>{value}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-400`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search room, type or guest…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Room Types</option>
          {roomTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="flex gap-1.5">
          {(['all', 'Available', 'Occupied'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                filterStatus === s
                  ? s === 'all'
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : s === 'Available'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Room Cards Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Room Status Board</h2>
          <span className="text-xs text-slate-500">{filteredRooms.length} rooms</span>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm rounded-2xl border border-slate-800 bg-slate-900/40">
            No rooms match your search or filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => {
              const isAvailable = room.status === 'Clean' || room.status === 'Inspected';
              const activeRes = reservations.find(
                (r) => (r.roomId === room.id || r.roomNumber === room.roomNumber) && r.status === 'Checked-In'
              );

              return (
                <div
                  key={room.id}
                  onClick={() => {
                    if (isAvailable) openCheckIn(room);
                    else if (room.status === 'Occupied' && activeRes) setShowFolioModal(activeRes);
                  }}
                  className={`rounded-2xl border p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 group ${
                    isAvailable
                      ? 'bg-slate-900/70 border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10'
                      : 'bg-gradient-to-br from-amber-950/30 to-slate-900/90 border-amber-500/30 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
                  }`}
                >
                  {/* Top: room number, type, status, price */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-2xl font-black text-slate-100">#{room.roomNumber}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{room.type}</p>
                        {room.floor && (
                          <p className="text-[10px] text-slate-600 mt-0.5">Floor {room.floor}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadge(room.status)}`}>
                        {isAvailable ? 'Available' : room.status}
                      </span>
                    </div>

                    <p className="text-sm font-black text-amber-400">
                      {room.pricePerNight.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-400">ETB / night</span>
                    </p>

                    {/* Capacity indicator */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Users className="w-3 h-3" />
                      <span>Up to {room.capacity} guest{room.capacity !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Occupied guest info */}
                    {room.status === 'Occupied' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-amber-300 truncate">
                            {activeRes?.guestName || room.currentGuestName || 'Occupied'}
                          </span>
                          {(activeRes?.idImageUrl || room.currentIdImageUrl) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingIdModal({
                                  guestName: activeRes?.guestName || room.currentGuestName || 'Guest',
                                  idNumber: activeRes?.idNumber || room.currentGuestIdNumber || '',
                                  idType: activeRes?.idType || room.currentGuestIdType || 'National ID',
                                  idImageUrl: activeRes?.idImageUrl || room.currentIdImageUrl || '',
                                });
                              }}
                              className="ml-auto flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/15 hover:bg-amber-500/30 px-1.5 py-0.5 rounded-md border border-amber-500/30 transition"
                            >
                              <Camera className="w-2.5 h-2.5" /> ID
                            </button>
                          )}
                        </div>
                        {activeRes?.guestPhone && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{activeRes.guestPhone}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                          <div>
                            <span className="block text-slate-600 text-[9px]">Check-In</span>
                            <span className="text-slate-300 font-semibold">{activeRes?.checkInDate || '—'}</span>
                          </div>
                          <div>
                            <span className="block text-slate-600 text-[9px]">Check-Out</span>
                            <span className="text-slate-300 font-semibold">{activeRes?.checkOutDate || '—'}</span>
                          </div>
                        </div>
                        {activeRes && (
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800">
                            <span className="text-slate-500">{activeRes.nights}n • {activeRes.numberOfGuests} guest{activeRes.numberOfGuests !== 1 ? 's' : ''}</span>
                            <span className="font-mono font-black text-amber-400">{activeRes.totalAmount.toLocaleString()} ETB</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom: action button */}
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    {isAvailable ? (
                      <div className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover:from-emerald-400 group-hover:to-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition">
                        <Plus className="w-3.5 h-3.5" /> Check-In Guest
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); if (activeRes) setShowFolioModal(activeRes); }}
                          className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-700"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Folio
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (activeRes) handleCheckOut(activeRes.id); }}
                          className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 text-xs font-bold transition flex items-center gap-1 border border-rose-500/30"
                          title="Check-Out"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Guest History Table ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Guest Stay History</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name, room, ID…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              {historyDateFilter && (
                <button onClick={() => setHistoryDateFilter('')} className="text-slate-500 hover:text-slate-200">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Guest Name</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">ID / FIN</th>
                  <th className="px-4 py-3">Check-In</th>
                  <th className="px-4 py-3">Check-Out</th>
                  <th className="px-4 py-3 text-center">Nights</th>
                  <th className="px-4 py-3 text-center">Guests</th>
                  <th className="px-4 py-3 text-right">Total (ETB)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/60">
                {historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500">No records found.</td>
                  </tr>
                ) : (
                  historyRows.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono text-amber-400 font-bold text-[10px]">{res.bookingRef}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{res.guestName}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-200">#{res.roomNumber}</span>
                        <span className="block text-slate-500 text-[10px]">{res.roomType}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{res.idNumber || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{res.checkInDate}</td>
                      <td className="px-4 py-3 text-slate-300">{res.checkOutDate}</td>
                      <td className="px-4 py-3 text-center text-slate-400">{res.nights}</td>
                      <td className="px-4 py-3 text-center text-slate-400">{res.numberOfGuests}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-amber-400">{res.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          res.status === 'Checked-In' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : res.status === 'Checked-Out' ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : res.status === 'Cancelled' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-right">{historyRows.length} records</p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CHECK-IN MODAL  ·  2-step wizard
      ══════════════════════════════════════════════════════════════════════ */}
      {showCheckInModal && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 my-4">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">
                    Room #{selectedRoom.roomNumber} — {selectedRoom.type}
                  </h3>
                  <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                    {checkInStep === 'fee-confirm' ? 'Step 1 of 2: Confirm Rate & Fee' : 'Step 2 of 2: Guest Registration'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step pills */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`px-3 py-1.5 rounded-full font-black uppercase flex items-center gap-1 ${checkInStep !== 'fee-confirm' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500 text-slate-950'}`}>
                {checkInStep !== 'fee-confirm' && <CheckCircle className="w-3 h-3" />} 1. Rate &amp; Fee
              </span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <span className={`px-3 py-1.5 rounded-full font-black uppercase ${checkInStep === 'guest-info' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                2. Guest Info
              </span>
            </div>

            {checkInError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{checkInError}</span>
              </div>
            )}

            {/* ── STEP 1: Fee ── */}
            {checkInStep === 'fee-confirm' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Check-In Date</label>
                    <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Check-Out Date</label>
                    <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Contract / Rate Agreement</label>
                    <select value={selectedContractId} onChange={(e) => handleContractChange(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
                      <option value="none">Standard Public Rate</option>
                      {contracts.filter((c) => c.status === 'Active').map((c) => (
                        <option key={c.id} value={c.id}>{c.clientName} ({c.agreedRate.toLocaleString()} ETB)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nightly Rate (ETB)</label>
                    <input type="number" value={customNightlyRate} onChange={(e) => setCustomNightlyRate(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-black text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Meal Package</label>
                    <select value={selectedMealPlan} onChange={(e: any) => setSelectedMealPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
                      <option value="Room Only">Room Only – No Meals</option>
                      <option value="Bed & Breakfast (BB)">Bed &amp; Breakfast (BB)</option>
                      <option value="Half Board (HB)">Half Board (HB)</option>
                      <option value="Full Board (FB)">Full Board (FB)</option>
                      <option value="All-Inclusive">All-Inclusive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Booking Source</label>
                    <select value={bookingSource} onChange={(e) => setBookingSource(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
                      <option>Direct Walk-in</option>
                      <option>Hotel Website</option>
                      <option>Booking.com</option>
                      <option>Expedia</option>
                      <option>Corporate Partner</option>
                    </select>
                  </div>
                </div>

                {/* Fare summary — displayed prominently for guest to see */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-900 border border-amber-500/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase tracking-wider">
                    <Calculator className="w-4 h-4" /> Fare Summary — Show to Guest
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    {[
                      { label: 'Nights', value: String(calcNights()), color: 'text-slate-200' },
                      { label: 'Rate / Night', value: `${effectiveRate.toLocaleString()} ETB`, color: 'text-slate-200' },
                      { label: 'Total Cost', value: `${totalCost.toLocaleString()} ETB`, color: 'text-amber-400' },
                      { label: 'Balance Due', value: `${balanceDue.toLocaleString()} ETB`, color: 'text-rose-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                        <p className="text-[9px] uppercase font-bold text-slate-500">{label}</p>
                        <p className={`text-sm font-black mt-0.5 ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Advance Deposit Collected (ETB)</label>
                      <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-black text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (new Date(checkOutDate).getTime() <= new Date(checkInDate).getTime()) {
                        setCheckInError('Check-out must be after check-in.'); return;
                      }
                      setCheckInError(null); setCheckInStep('guest-info');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition"
                  >
                    Guest Accepts — Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Guest Info ── */}
            {checkInStep === 'guest-info' && (
              <form onSubmit={handleCheckIn} className="space-y-4 text-xs">
                {/* Name + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name *</label>
                    <input type="text" required placeholder="e.g. Abebe Balcha" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                    <input type="text" placeholder="+251 911 000 000" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500" />
                  </div>
                </div>

                {/* DOB + Nationality + Number of guests */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date of Birth</label>
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nationality</label>
                    <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      No. of Guests (max {selectedRoom.capacity})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={selectedRoom.capacity}
                      value={numberOfGuests}
                      onChange={(e) => setNumberOfGuests(Math.min(selectedRoom.capacity, Math.max(1, Number(e.target.value))))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">ID Document Type</label>
                    <select value={idType} onChange={(e: any) => setIdType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500">
                      <option value="National ID (Fayda / FIN)">National ID (Fayda / FIN)</option>
                      <option value="Passport">Passport</option>
                      <option value="Kebele Resident ID">Kebele Resident ID</option>
                      <option value="Driver License">Driver License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">FIN / ID Number *</label>
                    <input type="text" required placeholder="FIN-1029-3849-5021" value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500" />
                  </div>
                </div>

                {/* ID Photo */}
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                    <Camera className="w-3.5 h-3.5 text-amber-400" /> Attach ID Photo (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      {idImageUrl ? 'Change Image' : 'Upload ID Image'}
                      <input type="file" accept="image/*" onChange={handleIdImageUpload} className="hidden" />
                    </label>
                    {idImageUrl && (
                      <div className="flex items-center gap-2">
                        <img src={idImageUrl} alt="ID" className="w-10 h-8 rounded-lg object-cover border border-amber-500/40" />
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Attached
                        </span>
                        <button type="button" onClick={() => setIdImageUrl('')} className="text-rose-400 text-[10px] underline font-semibold">Remove</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick fare recap */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Total: <strong>{totalCost.toLocaleString()} ETB</strong> for{' '}
                    <strong>{calcNights()} night{calcNights() > 1 ? 's' : ''}</strong> •
                    Deposit: <strong>{Number(depositAmount).toLocaleString()} ETB</strong> •
                    Balance at checkout: <strong>{balanceDue.toLocaleString()} ETB</strong>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button type="button" onClick={() => setCheckInStep('fee-confirm')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center gap-1">
                    ← Back
                  </button>
                  <button type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition">
                    ✓ Confirm Check-In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FOLIO MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showFolioModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-5 my-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">Guest Folio &amp; Invoice</h3>
                  <p className="text-xs text-amber-400 font-medium mt-0.5">
                    Room #{showFolioModal.roomNumber} • {showFolioModal.guestName} • {showFolioModal.bookingRef}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowFolioModal(null)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Folio table */}
            <div className="overflow-x-auto max-h-52 overflow-y-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-3">Date/Time</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                  {store.getFolioForReservation(showFolioModal.id).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 text-[10px] text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">{tx.category}</span></td>
                      <td className="p-3 text-slate-200">{tx.description}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">{tx.type === 'Debit' ? `${tx.amount.toLocaleString()} ETB` : '—'}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">{tx.type === 'Credit' ? `${tx.amount.toLocaleString()} ETB` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Folio balance */}
            {(() => {
              const txs = store.getFolioForReservation(showFolioModal.id);
              const debits = txs.filter((t) => t.type === 'Debit').reduce((a, b) => a + b.amount, 0);
              const credits = txs.filter((t) => t.type === 'Credit').reduce((a, b) => a + b.amount, 0);
              const bal = debits - credits;
              return (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5 text-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Folio Summary</p>
                    <p className="text-slate-300">Total Charges: <span className="font-bold text-rose-400">{debits.toLocaleString()} ETB</span></p>
                    <p className="text-slate-300">Total Payments: <span className="font-bold text-emerald-400">{credits.toLocaleString()} ETB</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Due</p>
                    <h4 className={`text-xl font-black ${bal > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{bal.toLocaleString()} ETB</h4>
                  </div>
                </div>
              );
            })()}

            {/* Add charge */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-400" /> Post Extra Charge
              </h4>
              <form onSubmit={handleFolioCharge} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select value={chargeCategory} onChange={(e: any) => setChargeCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                  <option>Room Service</option>
                  <option>Laundry</option>
                  <option>Minibar</option>
                  <option>Spa &amp; Wellness</option>
                  <option>Late Fee</option>
                </select>
                <input type="text" placeholder="Description…" value={chargeDescription} onChange={(e) => setChargeDescription(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200" />
                <input type="number" placeholder="Amount (ETB)" value={chargeAmount || ''} onChange={(e) => setChargeAmount(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 text-right font-bold" />
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition">Post Charge</button>
              </form>
            </div>

            {/* Receive payment */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Receive Payment
              </h4>
              <form onSubmit={handleFolioPayment} className="grid grid-cols-3 gap-2">
                <select value={paymentMethod} onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Telebirr</option>
                  <option>CBE Birr</option>
                  <option>Bank Transfer</option>
                </select>
                <input type="number" placeholder="Amount (ETB)" value={paymentInputAmount || ''} onChange={(e) => setPaymentInputAmount(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 text-right font-bold" />
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition">Receive</button>
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button onClick={() => window.print()} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-amber-400" /> Print Receipt
              </button>
              <button onClick={() => handleCheckOut(showFolioModal.id)}
                className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-rose-500/20">
                <LogOut className="w-4 h-4" /> Settle &amp; Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW ID MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {viewingIdModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" /> Guest ID Document
                </h3>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  {viewingIdModal.guestName} • {viewingIdModal.idType}: {viewingIdModal.idNumber}
                </p>
              </div>
              <button onClick={() => setViewingIdModal(null)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2 min-h-60">
              <img src={viewingIdModal.idImageUrl} alt="ID Document" className="max-h-96 w-auto object-contain rounded-xl shadow-lg" />
            </div>
            <div className="flex justify-end">
              <button onClick={() => setViewingIdModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
