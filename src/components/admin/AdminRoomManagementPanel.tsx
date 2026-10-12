'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { Room, RoomStatus } from '@/lib/types';
import {
  Bed,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Wifi,
  Tv,
  Sparkles,
  Coffee,
  Check,
  Building,
  Layers,
  DollarSign,
  Users,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

const COMMON_AMENITIES = [
  'Free Wi-Fi',
  '4K Smart TV',
  'Spa Access',
  'Breakfast Included',
  'Air Conditioning (AC)',
  'Jacuzzi',
  'Private Balcony',
  'MiniBar',
  'Ensuite Bathroom',
  'Work Desk & Chair',
  '24/7 Room Service',
  'City View',
  'Living Lounge',
  'Espresso Machine',
];

const PREDEFINED_ROOM_TYPES = [
  'King Size',
  'Deluxe Double',
  'Standard Single',
  'Executive Suite',
  'Presidential Suite',
  'Family Suite',
];

// Module-level in-memory cache for instant 0ms rendering across tab switches
let roomCacheMemory: Room[] | null = null;

interface AdminRoomManagementPanelProps {
  currentUser?: any;
}

export function AdminRoomManagementPanel({ currentUser }: AdminRoomManagementPanelProps) {
  const [rooms, setRooms] = useState<Room[]>(() => {
    if (roomCacheMemory && roomCacheMemory.length > 0) return roomCacheMemory;
    const fromStore = store.getRooms();
    if (fromStore.length > 0) {
      roomCacheMemory = fromStore;
      return fromStore;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Single Room Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('King Size');
  const [customRoomType, setCustomRoomType] = useState('');
  const [floor, setFloor] = useState<number>(1);
  const [pricePerNight, setPricePerNight] = useState<number>(3500);
  const [capacity, setCapacity] = useState<number>(2);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Free Wi-Fi',
    '4K Smart TV',
    'Ensuite Bathroom',
  ]);

  // Batch Generation Form State
  const [batchType, setBatchType] = useState('King Size');
  const [customBatchType, setCustomBatchType] = useState('');
  const [batchFloor, setBatchFloor] = useState<number>(2);
  const [batchQuantity, setBatchQuantity] = useState<number>(6);
  const [batchStartNumber, setBatchStartNumber] = useState<number>(201);
  const [batchPrice, setBatchPrice] = useState<number>(3500);
  const [batchCapacity, setBatchCapacity] = useState<number>(2);
  const [batchAmenities, setBatchAmenities] = useState<string[]>([
    'Free Wi-Fi',
    '4K Smart TV',
    'Ensuite Bathroom',
  ]);

  const loadRooms = async (force = false) => {
    // Only show loading indicator if we don't already have rooms in memory cache
    if (rooms.length === 0 && (!roomCacheMemory || roomCacheMemory.length === 0)) {
      setIsLoading(true);
    }
    try {
      const data = await store.fetchRoomsFromDB(force);
      roomCacheMemory = data;
      setRooms(data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Instant SWR: quiet background validation, instant cached render
    loadRooms(false);
    const unsubscribe = store.subscribe(() => {
      const updated = store.getRooms();
      roomCacheMemory = updated;
      setRooms(updated);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const toggleAmenity = (list: string[], setList: (val: string[]) => void, amenity: string) => {
    if (list.includes(amenity)) {
      setList(list.filter((a) => a !== amenity));
    } else {
      setList([...list, amenity]);
    }
  };

  // Group rooms by Room Type to answer user request:
  // "how many room there meand for example king side if he create on that hotel homeny king side there is"
  const roomTypeStats = React.useMemo(() => {
    const stats: Record<string, { total: number; occupied: number; clean: number; avgPrice: number }> = {};
    rooms.forEach((r) => {
      if (!stats[r.type]) {
        stats[r.type] = { total: 0, occupied: 0, clean: 0, avgPrice: 0 };
      }
      stats[r.type].total += 1;
      if (r.status === 'Occupied') stats[r.type].occupied += 1;
      if (r.status === 'Clean' || r.status === 'Inspected') stats[r.type].clean += 1;
      stats[r.type].avgPrice += r.pricePerNight;
    });

    Object.keys(stats).forEach((type) => {
      stats[type].avgPrice = Math.round(stats[type].avgPrice / stats[type].total);
    });

    return stats;
  }, [rooms]);

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || r.type === filterType;
    const matchesFloor = filterFloor === 'all' || r.floor.toString() === filterFloor;
    return matchesSearch && matchesType && matchesFloor;
  });

  // Handle Single Room Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = roomType === 'Custom' ? customRoomType.trim() : roomType;
    if (!roomNumber.trim() || !finalType) {
      showNotification('error', 'Please provide a valid Room Number and Room Type.');
      return;
    }

    const payload = {
      roomNumber: roomNumber.trim(),
      type: finalType,
      floor: Number(floor) || 1,
      pricePerNight: Number(pricePerNight) || 1000,
      capacity: Number(capacity) || 1,
      amenities: selectedAmenities,
      status: 'Clean' as RoomStatus,
    };

    const res = await store.addRoomAsync(payload);
    if (res.success) {
      showNotification('success', `Room #${payload.roomNumber} (${payload.type}) created and saved to database!`);
      setShowSingleModal(false);
      setRoomNumber('');
    } else {
      showNotification('error', res.error || 'Failed to create room.');
    }
  };

  // Handle Batch Generation Submit
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = batchType === 'Custom' ? customBatchType.trim() : batchType;
    if (!finalType || batchQuantity <= 0 || batchStartNumber <= 0) {
      showNotification('error', 'Please provide valid batch quantity, start number, and room type.');
      return;
    }

    const res = await store.batchAddRoomsAsync({
      type: finalType,
      floor: Number(batchFloor) || 1,
      pricePerNight: Number(batchPrice) || 1000,
      capacity: Number(batchCapacity) || 1,
      amenities: batchAmenities,
      quantity: Number(batchQuantity),
      startNumber: Number(batchStartNumber),
    });

    if (res.success) {
      showNotification(
        'success',
        `Successfully generated and saved ${res.count} "${finalType}" rooms to database!`
      );
      setShowBatchModal(false);
    } else {
      showNotification('error', res.error || 'Failed to batch generate rooms.');
    }
  };

  // Handle Quick Edit Save
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    const res = await store.updateRoomAsync(editingRoom.id, {
      type: editingRoom.type,
      floor: editingRoom.floor,
      pricePerNight: editingRoom.pricePerNight,
      capacity: editingRoom.capacity,
      status: editingRoom.status,
      amenities: editingRoom.amenities,
    });

    if (res.success) {
      showNotification('success', `Room #${editingRoom.roomNumber} updated successfully!`);
      setEditingRoom(null);
    } else {
      showNotification('error', res.error || 'Failed to update room.');
    }
  };

  // Handle Quick Toggle Out of Service
  const handleToggleOutOfService = async (room: Room) => {
    if (room.status === 'Occupied') {
      showNotification('error', `Cannot modify status of Room #${room.roomNumber} while currently Occupied.`);
      return;
    }
    const newStatus: RoomStatus = room.status === 'Out of Service' ? 'Clean' : 'Out of Service';
    const actionDesc = newStatus === 'Out of Service' ? 'removed from active service (hidden from Reception)' : 'restored to active service (Available)';

    const res = await store.updateRoomAsync(room.id, { status: newStatus });
    if (res.success) {
      showNotification('success', `Room #${room.roomNumber} has been ${actionDesc}.`);
    } else {
      showNotification('error', res.error || 'Failed to update room status.');
    }
  };

  // Handle Room Delete
  const handleDeleteRoom = async (room: Room) => {
    if (room.status === 'Occupied') {
      showNotification('error', `Cannot delete Room #${room.roomNumber} while currently Occupied.`);
      return;
    }

    if (confirm(`Are you sure you want to delete Room #${room.roomNumber} (${room.type}) from the database?`)) {
      const res = await store.deleteRoomAsync(room.id);
      if (res.success) {
        showNotification('success', `Room #${room.roomNumber} deleted from database.`);
      } else {
        showNotification('error', res.error || 'Failed to delete room.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bed className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Room Inventory & Capacity Setup</h2>
              <p className="text-xs text-slate-400">
                Create room types, configure pricing, manage amenities (Spa, Wi-Fi, Food, TV) and track inventory.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadRooms(true)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
            title="Refresh Rooms from Database"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowSingleModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Create Single Room</span>
          </button>

          <button
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Layers className="w-4 h-4" />
            <span>Batch Generate Rooms</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dynamic Breakdown by Room Type - Direct requirement fulfillment */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Hotel Room Type Inventory ({Object.keys(roomTypeStats).length} Types Configured)
            </h3>
          </div>
          <span className="text-xs text-amber-400 font-bold">{rooms.length} Total Registered Rooms</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(roomTypeStats).map(([type, stats]) => (
            <div
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative group ${
                filterType === type
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-slate-100 truncate">{type}</span>
                <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {stats.total} {stats.total === 1 ? 'Room' : 'Rooms'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Standard Rate:</span>
                  <span className="font-bold text-slate-200">{stats.avgPrice.toLocaleString()} ETB / night</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Available Clean:</span>
                  <span className="font-bold text-emerald-400">{stats.clean} Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Currently Occupied:</span>
                  <span className="font-bold text-rose-400">{stats.occupied} In-use</span>
                </div>
              </div>

              {/* Occupancy Mini-Bar */}
              <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.occupied / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search room number or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Room Types</option>
            {Object.keys(roomTypeStats).map((t) => (
              <option key={t} value={t}>
                {t} ({roomTypeStats[t].total})
              </option>
            ))}
          </select>

          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
          </select>

          {(searchTerm || filterType !== 'all' || filterFloor !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterFloor('all');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Rooms Inventory Database Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Room #</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Floor</th>
              <th className="py-3.5 px-4">Price / Night</th>
              <th className="py-3.5 px-4">Capacity</th>
              <th className="py-3.5 px-4">Included Amenities</th>
              <th className="py-3.5 px-4">Current Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No rooms matching the criteria. Use "Create Single Room" or "Batch Generate Rooms" above to add rooms.
                </td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-900/50 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-black text-amber-400 text-sm">#{room.roomNumber}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-100">{room.type}</td>
                  <td className="py-3.5 px-4 text-slate-400">Floor {room.floor}</td>
                  <td className="py-3.5 px-4 font-black text-amber-400">
                    {room.pricePerNight.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">ETB</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{room.capacity} Guests</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {room.amenities.map((am, i) => (
                        <span
                          key={i}
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                            am.toLowerCase().includes('spa')
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                              : am.toLowerCase().includes('food') || am.toLowerCase().includes('breakfast')
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              : am.toLowerCase().includes('wi-fi') || am.toLowerCase().includes('wifi')
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                              : am.toLowerCase().includes('tv')
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800/80 border-slate-700 text-slate-400'
                          }`}
                        >
                          {am}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        room.status === 'Occupied'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : room.status === 'Clean'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : room.status === 'Inspected'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : room.status === 'Out of Service'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : room.status === 'Dirty'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {room.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {room.status === 'Out of Service' ? (
                        <button
                          onClick={() => handleToggleOutOfService(room)}
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition text-[10px] font-bold flex items-center gap-1"
                          title="Restore to Service (Makes visible & bookable at Reception)"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleOutOfService(room)}
                          disabled={room.status === 'Occupied'}
                          className={`p-1.5 rounded-lg border transition ${
                            room.status === 'Occupied'
                              ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'
                              : 'bg-slate-900 hover:bg-amber-500/20 border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-400'
                          }`}
                          title={
                            room.status === 'Occupied'
                              ? 'Cannot take occupied room out of service'
                              : 'Take Out of Service (Hides from Receptionist view)'
                          }
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingRoom({ ...room })}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-slate-800 transition"
                        title="Edit Details / Price / Amenities"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        disabled={room.status === 'Occupied'}
                        className={`p-1.5 rounded-lg border transition ${
                          room.status === 'Occupied'
                            ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-900 hover:bg-rose-500/20 border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400'
                        }`}
                        title={room.status === 'Occupied' ? 'Cannot delete occupied room' : 'Delete Room'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: CREATE SINGLE ROOM */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Create New Room</h3>
                  <p className="text-xs text-slate-400">Configure room number, room type, pricing & amenities.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSingleModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 105 or 201"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Floor Level *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Room Type *
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {PREDEFINED_ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Room Type...</option>
                </select>

                {roomType === 'Custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom room type name (e.g. Honeymoon Suite)"
                    value={customRoomType}
                    onChange={(e) => setCustomRoomType(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Price Per Night (ETB) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Guest Capacity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Amenities Checkboxes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Room Features & Amenities
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto">
                  {COMMON_AMENITIES.map((amenity) => {
                    const isChecked = selectedAmenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenity(selectedAmenities, setSelectedAmenities, amenity)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border text-left flex items-center justify-between transition ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{amenity}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSingleModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  Save Room to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH GENERATE ROOMS */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Batch Generate Multiple Rooms</h3>
                  <p className="text-xs text-slate-400">
                    Instantly create and register multiple rooms of a specific room type (e.g., 10 King Size rooms).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Room Type for this Group *
                </label>
                <select
                  value={batchType}
                  onChange={(e) => setBatchType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {PREDEFINED_ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Room Type...</option>
                </select>

                {batchType === 'Custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom room type name (e.g. Standard King Bed)"
                    value={customBatchType}
                    onChange={(e) => setCustomBatchType(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Floor Level *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={batchFloor}
                    onChange={(e) => setBatchFloor(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Quantity (How Many Rooms) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Starting Number *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={batchStartNumber}
                    onChange={(e) => setBatchStartNumber(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Preview calculation */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
                <span className="font-bold">Batch Preview: </span>
                Will generate {batchQuantity} rooms:{' '}
                <span className="font-mono font-bold">
                  #{batchStartNumber} through #{batchStartNumber + batchQuantity - 1}
                </span>{' '}
                on Floor {batchFloor}.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Standard Price Per Night (ETB) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={batchPrice}
                    onChange={(e) => setBatchPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Capacity (Guests) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={batchCapacity}
                    onChange={(e) => setBatchCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Standard Inclusions for this Room Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-2xl border border-slate-800 max-h-44 overflow-y-auto">
                  {COMMON_AMENITIES.map((amenity) => {
                    const isChecked = batchAmenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenity(batchAmenities, setBatchAmenities, amenity)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border text-left flex items-center justify-between transition ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{amenity}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  Generate {batchQuantity} Rooms Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK EDIT ROOM */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Edit Room #{editingRoom.roomNumber}</h3>
                  <p className="text-xs text-slate-400">Update rates, capacity, or room amenities.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRoom(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Room Type
                  </label>
                  <input
                    type="text"
                    value={editingRoom.type}
                    onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Floor Level
                  </label>
                  <input
                    type="number"
                    value={editingRoom.floor}
                    onChange={(e) => setEditingRoom({ ...editingRoom, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Price Per Night (ETB)
                  </label>
                  <input
                    type="number"
                    step={50}
                    value={editingRoom.pricePerNight}
                    onChange={(e) => setEditingRoom({ ...editingRoom, pricePerNight: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Guest Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingRoom.capacity}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Operational Status
                </label>
                <select
                  value={editingRoom.status}
                  disabled={editingRoom.status === 'Occupied'}
                  onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as RoomStatus })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Clean">Available (Clean) — Visible in Reception</option>
                  <option value="Out of Service">Out of Service — Hidden from Reception</option>
                  <option value="Inspected">Inspected (Available)</option>
                  <option value="Dirty">Dirty (Needs Cleaning)</option>
                  {editingRoom.status === 'Occupied' && <option value="Occupied">Occupied (Cannot change while guest checked in)</option>}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Rooms marked "Out of Service" will not appear on the receptionist's room board.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Amenities
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-2xl border border-slate-800 max-h-44 overflow-y-auto">
                  {COMMON_AMENITIES.map((amenity) => {
                    const isChecked = editingRoom.amenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => {
                          const updated = isChecked
                            ? editingRoom.amenities.filter((a) => a !== amenity)
                            : [...editingRoom.amenities, amenity];
                          setEditingRoom({ ...editingRoom, amenities: updated });
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border text-left flex items-center justify-between transition ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{amenity}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
