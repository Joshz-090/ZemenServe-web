'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { store } from '@/lib/store';
import { EventHall, EventBooking, EventHallType } from '@/lib/types';
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
  Edit2,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Layers,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react';

export const PRESET_HALL_TYPES: EventHallType[] = [
  'Grand Ballroom',
  'Executive Boardroom',
  'Conference Hall',
  'Banquet Venue',
  'Meeting Room',
  'Outdoor / Garden Pavilion',
  'Auditorium',
  'VIP Lounge',
];

export const PRESET_AMENITIES = [
  '4K Projector & Screen',
  'Stage & Podium',
  'LED Video Wall',
  'Surround Sound System',
  'Wireless Microphones',
  'High-Speed VIP Wi-Fi',
  'Video Conferencing (Zoom/Teams)',
  'Smart Digital Whiteboard',
  'Dedicated Coffee Station',
  'Dedicated Buffet & Catering Area',
  'Air Conditioning & Climate Control',
  'Ergonomic Executive Chairs',
  'Open-air Gazebo',
  'Outdoor Ambient Lighting',
  'Private Restrooms',
  'Generator Power Backup',
];

interface EventManagementViewProps {
  currentUser?: any;
}

export function EventManagementView({ currentUser: initialUser }: EventManagementViewProps) {
  const [currentUser, setCurrentUser] = useState<any>(initialUser || null);
  const [halls, setHalls] = useState<EventHall[]>([]);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [showHallModal, setShowHallModal] = useState(false);
  const [editingHall, setEditingHall] = useState<EventHall | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hallToDelete, setHallToDelete] = useState<EventHall | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hall Form State
  const [hallName, setHallName] = useState('');
  const [hallType, setHallType] = useState<string>('Conference Hall');
  const [capacity, setCapacity] = useState<number>(100);
  const [dailyRate, setDailyRate] = useState<number>(20000);
  const [hourlyRate, setHourlyRate] = useState<number>(3000);
  const [location, setLocation] = useState('Main Complex');
  const [hallStatus, setHallStatus] = useState<EventHall['status']>('Available');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [description, setDescription] = useState('');
  const [isSavingHall, setIsSavingHall] = useState(false);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
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

  // Determine Manager / Admin status
  const userRole = currentUser?.role || '';
  const isManagerOrAdmin = userRole === 'Manager' || userRole === 'Admin';

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

  // Load Halls & Bookings
  const loadData = async (force = false) => {
    const localHalls = store.getEventHalls();
    const localBookings = store.getEventBookings();
    setHalls(localHalls);
    setBookings(localBookings);

    // Sync with DB
    try {
      const dbHalls = await store.fetchEventHallsFromDB(force);
      if (dbHalls && dbHalls.length > 0) {
        setHalls(dbHalls);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(() => {
      setHalls(store.getEventHalls());
      setBookings(store.getEventBookings());
    });
    return () => unsubscribe();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Hall Modal Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const openCreateHallModal = () => {
    if (!isManagerOrAdmin) {
      showToast('error', 'Access restricted: Only Managers or Admins can create halls.');
      return;
    }
    setEditingHall(null);
    setHallName('');
    setHallType('Conference Hall');
    setCapacity(100);
    setDailyRate(20000);
    setHourlyRate(2500);
    setLocation('Main Complex');
    setHallStatus('Available');
    setSelectedAmenities(['Stage & Podium', 'High-Speed VIP Wi-Fi', 'Wireless Microphones']);
    setDescription('');
    setShowHallModal(true);
  };

  const openEditHallModal = (hall: EventHall) => {
    if (!isManagerOrAdmin) {
      showToast('error', 'Access restricted: Only Managers or Admins can edit halls.');
      return;
    }
    setEditingHall(hall);
    setHallName(hall.name);
    setHallType(hall.hallType || 'Conference Hall');
    setCapacity(hall.capacity);
    setDailyRate(hall.dailyRate);
    setHourlyRate(hall.hourlyRate || 0);
    setLocation(hall.location || 'Main Complex');
    setHallStatus(hall.status);
    setSelectedAmenities(hall.amenities || []);
    setDescription(hall.description || '');
    setShowHallModal(true);
  };

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleAddCustomAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAmenityInput.trim() && !selectedAmenities.includes(customAmenityInput.trim())) {
      setSelectedAmenities([...selectedAmenities, customAmenityInput.trim()]);
      setCustomAmenityInput('');
    }
  };

  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrAdmin) {
      showToast('error', 'Unauthorized. Only Managers and Admins can perform this action.');
      return;
    }

    if (!hallName.trim()) {
      showToast('error', 'Please enter a valid venue name.');
      return;
    }

    setIsSavingHall(true);

    const hallData = {
      name: hallName.trim(),
      hallType,
      capacity: Number(capacity),
      dailyRate: Number(dailyRate),
      hourlyRate: Number(hourlyRate),
      location: location.trim(),
      status: hallStatus,
      amenities: selectedAmenities,
      description: description.trim(),
    };

    try {
      if (editingHall) {
        // Edit existing
        const res = await fetch('/api/events/halls', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingHall.id, ...hallData }),
        });
        const result = await res.json();
        if (result.success) {
          store.updateEventHall(editingHall.id, hallData);
          showToast('success', result.message || `Venue "${hallName}" updated successfully!`);
          setShowHallModal(false);
        } else {
          showToast('error', result.error || 'Failed to update venue.');
        }
      } else {
        // Create new
        const res = await fetch('/api/events/halls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hallData),
        });
        const result = await res.json();
        if (result.success && result.hall) {
          store.addEventHall(hallData);
          showToast('success', result.message || `Venue "${hallName}" created successfully!`);
          setShowHallModal(false);
        } else {
          showToast('error', result.error || 'Failed to create venue.');
        }
      }
      await loadData(true);
    } catch (err: any) {
      showToast('error', err.message || 'An error occurred while saving the venue.');
    } finally {
      setIsSavingHall(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete Hall Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const promptDeleteHall = (hall: EventHall) => {
    if (!isManagerOrAdmin) {
      showToast('error', 'Access restricted: Only Managers or Admins can delete halls.');
      return;
    }
    setHallToDelete(hall);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!hallToDelete || !isManagerOrAdmin) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/events/halls?id=${hallToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.success) {
        store.deleteEventHall(hallToDelete.id);
        showToast('success', result.message || `Venue "${hallToDelete.name}" deleted successfully.`);
        setShowDeleteModal(false);
        setHallToDelete(null);
        await loadData(true);
      } else {
        showToast('error', result.error || 'Could not delete venue.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'An error occurred while deleting the venue.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Event Booking Handler
  // ─────────────────────────────────────────────────────────────────────────
  const openBookingForHall = (hall: EventHall) => {
    setSelectedHallId(hall.id);
    setShowBookingModal(true);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const hall = halls.find((h) => h.id === selectedHallId) || halls[0];
    if (!hall || !eventTitle) return;

    const totalAmount = hall.dailyRate + 10000;

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

    showToast('success', `Event "${eventTitle}" booked successfully at ${hall.name}!`);
    setShowBookingModal(false);
    setEventTitle('');
    setOrganizerName('');
    setOrganizerContact('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered Halls
  // ─────────────────────────────────────────────────────────────────────────
  const filteredHalls = useMemo(() => {
    return halls.filter((hall) => {
      const matchesSearch =
        hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hall.hallType && hall.hallType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (hall.location && hall.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        hall.amenities.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filterType === 'all' || hall.hallType === filterType;
      const matchesStatus = filterStatus === 'all' || hall.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [halls, searchTerm, filterType, filterStatus]);

  // Available unique types from current halls + presets
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    PRESET_HALL_TYPES.forEach((t) => set.add(t));
    halls.forEach((h) => {
      if (h.hallType) set.add(h.hallType);
    });
    return Array.from(set);
  }, [halls]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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
            <Building className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Events, Conference & Banquet Halls</h1>
              {isManagerOrAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Manager Control
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Venue catalog, seating setups, booking calendar, and banquet catering coordination.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Add Venue button (EXCLUSIVELY for Manager / Admin) */}
          {isManagerOrAdmin && (
            <button
              onClick={openCreateHallModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New Venue / Hall</span>
            </button>
          )}

          {/* Book Event Button (Available to all permitted staff) */}
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Book Scheduled Event</span>
          </button>

          <button
            onClick={() => loadData(true)}
            title="Refresh Venues"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search venues by name, type, location, or amenities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available Only</option>
              <option value="Booked">Booked</option>
              <option value="Maintenance">Under Maintenance</option>
            </select>
          </div>
        </div>

        {/* Venue Type Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Venues ({halls.length})
          </button>
          {availableTypes.map((type) => {
            const count = halls.filter((h) => h.hallType === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  filterType === type
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {type} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Venues Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>Hotel Venues & Hall Catalog</span>
            <span className="text-amber-400">({filteredHalls.length})</span>
          </h2>
          {!isManagerOrAdmin && (
            <span className="text-[11px] text-slate-500 font-medium">
              Venue catalog is managed by Manager & Admin
            </span>
          )}
        </div>

        {filteredHalls.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
            <Building className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">No venues found matching your criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the search bar or category filters.</p>
            {isManagerOrAdmin && (
              <button
                onClick={openCreateHallModal}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Venue Now
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHalls.map((hall) => {
              const statusColors =
                hall.status === 'Available'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : hall.status === 'Booked'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

              return (
                <div
                  key={hall.id}
                  className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-xl shadow-black/20 group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Hall Type & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                        {hall.hallType || 'Venue'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusColors}`}>
                        {hall.status}
                      </span>
                    </div>

                    {/* Venue Name & Location */}
                    <div>
                      <h3 className="text-base font-black text-slate-100 group-hover:text-amber-400 transition">
                        {hall.name}
                      </h3>
                      {hall.location && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{hall.location}</span>
                        </p>
                      )}
                    </div>

                    {/* Capacity & Rates */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-500 block">Capacity</span>
                        <span className="font-black text-slate-200 flex items-center gap-1 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          {hall.capacity} pax
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-500 block">Daily Rate</span>
                        <span className="font-mono font-black text-amber-400 block mt-0.5">
                          {hall.dailyRate.toLocaleString()} <span className="text-[9px] text-slate-400">ETB</span>
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {hall.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal">
                        {hall.description}
                      </p>
                    )}

                    {/* Amenities Tags */}
                    {hall.amenities && hall.amenities.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Equipped Amenities
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {hall.amenities.slice(0, 4).map((am, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold text-slate-300 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60"
                            >
                              {am}
                            </span>
                          ))}
                          {hall.amenities.length > 4 && (
                            <span className="text-[10px] font-bold text-amber-400/90 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                              +{hall.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openBookingForHall(hall)}
                      disabled={hall.status === 'Maintenance'}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                        hall.status === 'Maintenance'
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Event</span>
                    </button>

                    {/* Manager Exclusive Edit & Delete buttons */}
                    {isManagerOrAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditHallModal(hall)}
                          title="Edit Venue (Manager Only)"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-amber-400 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => promptDeleteHall(hall)}
                          title="Delete Venue (Manager Only)"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Scheduled Event Bookings Table */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>Scheduled Event Bookings</span>
            <span className="text-amber-400">({bookings.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-3xl bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="p-4">Event Ref</th>
                <th className="p-4">Event Title</th>
                <th className="p-4">Organizer</th>
                <th className="p-4">Venue Hall</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Setup</th>
                <th className="p-4 text-right">Total (ETB)</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                    No scheduled event bookings yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
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
                      <div className="text-[10px] text-amber-400 font-mono">
                        {b.startTime} - {b.endTime}
                      </div>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CREATE / EDIT HALL MODAL (MANAGER & ADMIN ONLY) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showHallModal && isManagerOrAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">
                    {editingHall ? `Edit Venue: ${editingHall.name}` : 'Create New Hotel Venue / Hall'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure venue dimensions, rate structures, seating capacity, and equipment.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHallModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHall} className="space-y-4 text-xs">
              {/* Row 1: Name and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lalibela Grand Ballroom"
                    value={hallName}
                    onChange={(e) => setHallName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Venue Category / Type *
                  </label>
                  <select
                    value={hallType}
                    onChange={(e) => setHallType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                  >
                    {PRESET_HALL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Location and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Floor / Wing Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ground Floor, East Wing"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={hallStatus}
                    onChange={(e: any) => setHallStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Available">Available for Booking</option>
                    <option value="Booked">Booked</option>
                    <option value="Maintenance">Under Maintenance / Renovation</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Capacity, Daily Rate, Hourly Rate */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Max Capacity (Pax) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Daily Rate (ETB) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Hourly Rate (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Venue Description & Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe lighting, acoustics, scenic views, or special staging features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {/* Amenities Selection */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">
                  Select Equipped Amenities & Features
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  {PRESET_AMENITIES.map((am) => {
                    const isSelected = selectedAmenities.includes(am);
                    return (
                      <button
                        key={am}
                        type="button"
                        onClick={() => toggleAmenity(am)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{am}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amenity Adder */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add other custom amenity (e.g. Translation Booth)..."
                    value={customAmenityInput}
                    onChange={(e) => setCustomAmenityInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px]"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowHallModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHall}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSavingHall ? 'Saving Venue...' : editingHall ? 'Update Venue' : 'Create Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DELETE CONFIRMATION MODAL (MANAGER & ADMIN ONLY) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showDeleteModal && hallToDelete && isManagerOrAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">Delete Venue</h3>
                <p className="text-xs text-slate-400">This action requires Manager confirmation.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-white font-bold">{hallToDelete.name}</strong> ({hallToDelete.hallType}) from the hotel venue
              catalog?
            </p>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div>Capacity: {hallToDelete.capacity} pax</div>
              <div>Daily Rate: {hallToDelete.dailyRate.toLocaleString()} ETB</div>
              <div>Location: {hallToDelete.location || 'Main Complex'}</div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setHallToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* BOOK EVENT MODAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                Book Conference or Banquet Event
              </h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Shareholders Summit 2026"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Organizer Company / Contact Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Bank of Ethiopia"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Organizer Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+251 911 000 000"
                  value={organizerContact}
                  onChange={(e) => setOrganizerContact(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Selected Venue
                </label>
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.hallType} - Cap: {h.capacity} pax - {h.dailyRate.toLocaleString()} ETB/day)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Setup Format
                  </label>
                  <select
                    value={setupFormat}
                    onChange={(e: any) => setSetupFormat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Banquet">Banquet Seating</option>
                    <option value="Theater">Theater / Auditorium</option>
                    <option value="Classroom">Classroom Style</option>
                    <option value="U-Shape">Executive U-Shape</option>
                    <option value="Cocktail">Cocktail Standing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Attendees (Pax)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={expectedAttendees}
                    onChange={(e) => setExpectedAttendees(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Deposit Paid (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={depositPaid}
                    onChange={(e) => setDepositPaid(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
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
