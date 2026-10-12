'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { HotelContract, MealPlan } from '@/lib/types';
import {
  Building,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Utensils,
  Briefcase,
  Tag,
  Check,
} from 'lucide-react';

const COMMON_AMENITIES = [
  'Buffet Breakfast',
  'Lunch & Dinner Included',
  'Airport Shuttle Service',
  'High-Speed Wi-Fi',
  'Free Laundry Service',
  'Spa & Fitness Access',
  'Late Checkout 16:00',
  'VIP Executive Lounge Access',
  'Conference Hall 20% Discount',
  'Complimentary Minibar',
  '24/7 Butler Service',
];

const PREDEFINED_MEAL_PLANS: MealPlan[] = [
  'Full Board (FB)',
  'Half Board (HB)',
  'Bed & Breakfast (BB)',
  'All-Inclusive',
  'Room Only',
];

// Module-level in-memory cache for instant 0ms rendering across tab switches
let contractCacheMemory: HotelContract[] | null = null;

interface AdminContractsPanelProps {
  currentUser?: any;
}

export function AdminContractsPanel({ currentUser }: AdminContractsPanelProps) {
  const [contracts, setContracts] = useState<HotelContract[]>(() => {
    if (contractCacheMemory && contractCacheMemory.length > 0) return contractCacheMemory;
    const fromStore = store.getContracts();
    if (fromStore.length > 0) {
      contractCacheMemory = fromStore;
      return fromStore;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMealPlan, setFilterMealPlan] = useState('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<HotelContract | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState<HotelContract['clientType']>('Corporate');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan>('Full Board (FB)');
  const [roomType, setRoomType] = useState('Deluxe Double');
  const [agreedRate, setAgreedRate] = useState<number>(3200);
  const [discountPercentage, setDiscountPercentage] = useState<number>(20);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000 * 180).toISOString().split('T')[0]
  );
  const [includedAmenities, setIncludedAmenities] = useState<string[]>([
    'Buffet Breakfast',
    'Lunch & Dinner Included',
    'Airport Shuttle Service',
  ]);
  const [notes, setNotes] = useState('');

  const loadContracts = async (force = false) => {
    // Only show loading indicator if we don't already have contracts in memory cache
    if (contracts.length === 0 && (!contractCacheMemory || contractCacheMemory.length === 0)) {
      setIsLoading(true);
    }
    try {
      const data = store.fetchContractsFromDB
        ? await store.fetchContractsFromDB(force)
        : (store.getContracts ? store.getContracts() : []);
      contractCacheMemory = data;
      setContracts(data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Instant SWR: quiet background validation, instant cached render
    loadContracts(false);
    const unsubscribe = store.subscribe(() => {
      const updated = store.getContracts ? store.getContracts() : [];
      contractCacheMemory = updated;
      setContracts(updated);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const toggleAmenity = (amenity: string) => {
    if (includedAmenities.includes(amenity)) {
      setIncludedAmenities(includedAmenities.filter((p) => p !== amenity));
    } else {
      setIncludedAmenities([...includedAmenities, amenity]);
    }
  };

  const handleResetForm = () => {
    setName('');
    setClientName('');
    setClientType('Corporate');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setMealPlan('Full Board (FB)');
    setRoomType('Deluxe Double');
    setAgreedRate(3200);
    setDiscountPercentage(20);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 86400000 * 180).toISOString().split('T')[0]);
    setIncludedAmenities(['Buffet Breakfast', 'Lunch & Dinner Included', 'Airport Shuttle Service']);
    setNotes('');
    setEditingContract(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !contactPerson.trim() || !phone.trim()) {
      showNotification('error', 'Please provide Client Name, Contact Person, and Phone.');
      return;
    }

    const payload: Omit<HotelContract, 'id'> = {
      contractNumber: editingContract?.contractNumber || `CTR-${Date.now().toString().slice(-4)}`,
      name: name.trim() || `${clientName.trim()} Rate Agreement`,
      clientName: clientName.trim(),
      clientType,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      roomType: roomType.trim() || 'All Room Types',
      agreedRate: Number(agreedRate) || 1000,
      mealPlan,
      includedAmenities,
      discountPercentage: Number(discountPercentage) || 0,
      startDate,
      endDate,
      status: 'Active',
      notes: notes.trim(),
      createdBy: currentUser?.name || 'Manager',
    };

    if (editingContract) {
      const res = await store.updateContractAsync(editingContract.id, payload);
      if (res.success) {
        showNotification('success', `Agreement "${payload.clientName}" updated successfully!`);
        setShowModal(false);
        handleResetForm();
      } else {
        showNotification('error', res.error || 'Failed to update contract.');
      }
    } else {
      const res = await store.addContractAsync(payload);
      if (res.success) {
        showNotification('success', `Corporate contract for "${payload.clientName}" saved to database!`);
        setShowModal(false);
        handleResetForm();
      } else {
        showNotification('error', res.error || 'Failed to create contract.');
      }
    }
  };

  const handleToggleStatus = async (contract: HotelContract) => {
    const newStatus = contract.status === 'Active' ? 'Expired' : 'Active';
    const res = await store.updateContractAsync(contract.id, { status: newStatus });
    if (res.success) {
      showNotification('success', `Contract for "${contract.clientName}" set to ${newStatus}.`);
    } else {
      showNotification('error', 'Failed to toggle status.');
    }
  };

  const handleDeleteContract = async (contract: HotelContract) => {
    if (confirm(`Are you sure you want to delete corporate agreement for "${contract.clientName}"?`)) {
      const res = await store.deleteContractAsync(contract.id);
      if (res.success) {
        showNotification('success', `Agreement for "${contract.clientName}" deleted.`);
      } else {
        showNotification('error', res.error || 'Failed to delete agreement.');
      }
    }
  };

  const handleEditOpen = (contract: HotelContract) => {
    setEditingContract(contract);
    setName(contract.name || '');
    setClientName(contract.clientName);
    setClientType(contract.clientType);
    setContactPerson(contract.contactPerson);
    setPhone(contract.phone);
    setEmail(contract.email || '');
    setMealPlan(contract.mealPlan);
    setRoomType(contract.roomType);
    setAgreedRate(contract.agreedRate);
    setDiscountPercentage(contract.discountPercentage || 0);
    setStartDate(contract.startDate);
    setEndDate(contract.endDate);
    setIncludedAmenities(contract.includedAmenities || []);
    setNotes(contract.notes || '');
    setShowModal(true);
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.clientType === filterType;
    const matchesMeal = filterMealPlan === 'all' || c.mealPlan === filterMealPlan;
    return matchesSearch && matchesType && matchesMeal;
  });

  // KPI Calculations
  const activeContractsCount = contracts.filter((c) => c.status === 'Active').length;
  const foodPackageContracts = contracts.filter(
    (c) => c.status === 'Active' && (c.mealPlan === 'Full Board (FB)' || c.mealPlan === 'Half Board (HB)')
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Corporate Contracts & Exceptional Cases</h2>
              <p className="text-xs text-slate-400">
                Configure special rate agreements, room + food packages (Full Board/Half Board), airline crew deals & exceptional cases.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadContracts(true)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
            title="Refresh Contracts"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              handleResetForm();
              setShowModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Corporate Agreement / Food Contract</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Agreements</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{activeContractsCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Corporate & Diplomatic Partners</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Room + Food Packages</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{foodPackageContracts}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Full Board / Half Board Packages</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{contracts.length}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Agreements In Database</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search agreement, client or contact..."
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
            <option value="all">All Client Types</option>
            <option value="Airline">Airline</option>
            <option value="Corporate">Corporate</option>
            <option value="Government / NGO">Government / NGO</option>
            <option value="Travel Agency">Travel Agency</option>
            <option value="VIP Client">VIP Client</option>
          </select>

          <select
            value={filterMealPlan}
            onChange={(e) => setFilterMealPlan(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Meal Packages</option>
            {PREDEFINED_MEAL_PLANS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {(searchTerm || filterType !== 'all' || filterMealPlan !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterMealPlan('all');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Agreement / Client</th>
              <th className="py-3.5 px-4">Ref #</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Target Room</th>
              <th className="py-3.5 px-4">Meal Plan (Food Contract)</th>
              <th className="py-3.5 px-4">Agreed Rate</th>
              <th className="py-3.5 px-4">Validity</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No corporate contracts found. Click "New Corporate Agreement / Food Contract" to add one.
                </td>
              </tr>
            ) : (
              filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-900/50 transition">
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-slate-100 text-sm">{contract.clientName}</p>
                      {contract.name && <p className="text-[11px] text-amber-400 font-medium">{contract.name}</p>}
                      <p className="text-[10px] text-slate-400">
                        Contact: {contract.contactPerson} ({contract.phone})
                      </p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{contract.contractNumber}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[10px]">
                      {contract.clientType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{contract.roomType}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                        contract.mealPlan === 'Full Board (FB)'
                          ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                          : contract.mealPlan === 'Half Board (HB)'
                          ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                          : contract.mealPlan === 'Bed & Breakfast (BB)'
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Utensils className="w-3 h-3" />
                      <span>{contract.mealPlan}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {contract.agreedRate.toLocaleString()} ETB
                      </span>
                      {contract.discountPercentage && contract.discountPercentage > 0 ? (
                        <p className="text-[10px] text-emerald-400 font-bold">-{contract.discountPercentage}% Discount</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] text-slate-400">
                    <div>{contract.startDate}</div>
                    <div className="text-[10px] text-slate-500">to {contract.endDate}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleStatus(contract)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition ${
                        contract.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30'
                      }`}
                      title="Click to toggle Active/Expired"
                    >
                      {contract.status}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleEditOpen(contract)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-slate-800 transition"
                        title="Edit Agreement"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteContract(contract)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Agreement"
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

      {/* CREATE / EDIT AGREEMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">
                    {editingContract ? 'Edit Agreement / Rate Deal' : 'New Corporate Contract / Exceptional Deal'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure room with food packages, corporate rates, and managerial exceptional terms.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  handleResetForm();
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agreement / Contract Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ethiopian Airlines Crew Lodging Package"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Client Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ethiopian Airlines Group"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Client Type
                  </label>
                  <select
                    value={clientType}
                    onChange={(e: any) => setClientType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Airline">Airline</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Government / NGO">Government / NGO</option>
                    <option value="Travel Agency">Travel Agency</option>
                    <option value="VIP Client">VIP Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Capt. Yared Hailu"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+251 911 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Meal Plan / Food Package - direct requirement */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Utensils className="w-4 h-4" />
                  <span>Meal Contract & Room Boarding Package</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Meal Package / Board Plan *
                    </label>
                    <select
                      value={mealPlan}
                      onChange={(e: any) => setMealPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="Full Board (FB)">Full Board (FB) - Room + All 3 Meals Included</option>
                      <option value="Half Board (HB)">Half Board (HB) - Room + Breakfast & Dinner</option>
                      <option value="Bed & Breakfast (BB)">Bed & Breakfast (BB) - Room + Morning Buffet</option>
                      <option value="All-Inclusive">All-Inclusive - Room + Meals + Drinks</option>
                      <option value="Room Only">Room Only - Standard Lodging Without Food</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Applicable Room Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deluxe Double, King Size, or All Room Types"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Allocations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agreed Special Rate (ETB / Night) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={agreedRate}
                    onChange={(e) => setAgreedRate(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agreement Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agreement End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Included Amenities / Perks */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Special Inclusions & Perks for this Agreement
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-2xl border border-slate-800 max-h-36 overflow-y-auto">
                  {COMMON_AMENITIES.map((amenity) => {
                    const isChecked = includedAmenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
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

              {/* Managerial Notes / Exceptional Cases */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Managerial Notes & Exceptional Conditions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved by General Manager. Includes 24/7 crew dining buffet and flight delay leeway."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    handleResetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  {editingContract ? 'Save Agreement Changes' : 'Confirm & Save Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
