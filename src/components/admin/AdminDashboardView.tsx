'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserManagementPanel } from './UserManagementPanel';
import { store } from '@/lib/store';
import { AuditLog, HotelSettings, Ingredient, MenuItem, SystemUser, UserRole, Room, Reservation, Order } from '@/lib/types';
import {
  ShieldCheck,
  Lock,
  Key,
  Settings,
  Users,
  DollarSign,
  PackageCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  X,
  ShieldAlert,
  LayoutDashboard,
  Bed,
  Calendar,
  ShoppingBag,
  Utensils,
  ChefHat,
  BarChart3,
  Clock,
  ChevronRight,
  Activity,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Building,
  Package,
} from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser?: any;
}

export function AdminDashboardView({ currentUser }: AdminDashboardViewProps) {
  // Auto-authenticated for logged-in Admin/Manager sessions
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'users' | 'prices' | 'stock' | 'audit'>('overview');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');

  // State slices
  const [settings, setSettings] = useState<HotelSettings>(store.getSettings());
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Forms
  const [newUsername, setNewUsername] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('Cashier');
  const [newUserPin, setNewUserPin] = useState<string>('');

  // Stock edit state
  const [selectedIngId, setSelectedIngId] = useState<number>(1);
  const [directStockInput, setDirectStockInput] = useState<string>('');
  const [directStockReason, setDirectStockReason] = useState<string>('Inventory Count Correction');

  useEffect(() => {
    const updateData = () => {
      setSettings(store.getSettings());
      setUsers(store.getSystemUsers());
      setMenuItems(store.getMenuItems());
      setIngredients(store.getIngredients());
      setAuditLogs(store.getAuditLogs());
      setRooms(store.getRooms());
      setReservations(store.getReservations());
      setOrders(store.getOrders());
    };

    updateData();
    const unsubscribe = store.subscribe(updateData);
    return () => unsubscribe();
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinInput.trim();
    if (store.verifyAdminPin(clean)) {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Invalid Admin Password or PIN. Access denied.');
    }
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateSettings(settings);
    setSaveSuccessMsg('System settings updated and saved successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handlePriceUpdate = (id: number, currentPrice: number) => {
    const input = prompt(`Enter new price in ETB for this item (Current: ${currentPrice.toFixed(2)} ETB):`, currentPrice.toString());
    if (input !== null) {
      const val = parseFloat(input);
      if (!isNaN(val) && val >= 0) {
        store.updateMenuItemPrice(id, val);
      }
    }
  };

  const handleDirectStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(directStockInput);
    if (isNaN(val) || val < 0) return;
    store.setIngredientStockDirect(selectedIngId, val, directStockReason);
    setDirectStockInput('');
  };

  // Executive KPI Computations
  const totalRoomRevenue = reservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalPosRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const grandTotalRevenue = totalRoomRevenue + totalPosRevenue;

  const occupiedRoomsCount = rooms.filter((r) => r.status === 'Occupied').length;
  const totalRoomsCount = rooms.length || 1;
  const occupancyPercentage = Math.round((occupiedRoomsCount / totalRoomsCount) * 100);
  const checkedInGuestsCount = reservations.filter((r) => r.status === 'Checked-In').length;
  const upcomingReservationsCount = reservations.filter((r) => r.status === 'Reserved').length;

  const pendingOrdersCount = orders.filter((o) => o.status === 'Pending' || o.status === 'Preparing').length;
  const lowStockIngredients = ingredients.filter((i) => i.stockQuantity <= i.lowStockThreshold);

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditCategoryFilter === 'all') return true;
    return log.user.toLowerCase().includes(auditCategoryFilter.toLowerCase()) ||
           log.action.toLowerCase().includes(auditCategoryFilter.toLowerCase());
  });

  // Locked State Gate
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl">
        <div className="max-w-md w-full bg-slate-950 p-8 rounded-2xl border border-amber-500/30 shadow-2xl text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-100">ADMIN CONTROL CENTER</h2>
            <p className="text-xs text-slate-400 mt-1">Protected managerial configuration & audit area</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Enter Admin Password or PIN</label>
              <input
                type="password"
                maxLength={30}
                placeholder="Enter Security Password or PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center text-lg font-mono bg-slate-900 border border-slate-800 rounded-xl py-3 text-amber-400 focus:outline-none focus:border-amber-500"
                required
                autoFocus
              />
              {pinError && <p className="text-xs text-rose-400 font-bold mt-2">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" /> UNLOCK ADMIN ACCESS
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-140px)] bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl overflow-hidden">
      {/* Sleek Modern Header */}
      <div className="space-y-4 pb-4 border-b border-slate-800/80">
        {/* Row 1: Title & Profile Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">
                Welcome back, <span className="font-bold text-amber-400">{currentUser?.name || 'Manager'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Server
            </span>

            <button
              onClick={() => setIsAuthenticated(false)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition"
              title="Lock Admin Control"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Clean Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-slate-950/80 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Executive Overview
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Staff Accounts ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'prices'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Dish Prices
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" /> Stock Override
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Audit Logs ({auditLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Hotel Settings
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-6">
        {/* TAB 0: EXECUTIVE OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top KPI Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Total Combined Revenue */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/20 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Combined Revenue</p>
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-100 mt-2">
                  {grandTotalRevenue.toLocaleString()} <span className="text-xs font-bold text-amber-400">ETB</span>
                </h2>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>Rooms: <strong className="text-slate-200">{totalRoomRevenue.toLocaleString()} ETB</strong></span>
                  <span>POS: <strong className="text-slate-200">{totalPosRevenue.toLocaleString()} ETB</strong></span>
                </div>
              </div>

              {/* Metric 2: Room Occupancy */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/20 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Hotel Occupancy</p>
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Bed className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-2xl font-black text-slate-100">{occupancyPercentage}%</h2>
                  <span className="text-xs font-bold text-emerald-400">({occupiedRoomsCount}/{totalRoomsCount} Rooms)</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>Checked-In: <strong className="text-slate-200">{checkedInGuestsCount}</strong></span>
                  <span>Reserved: <strong className="text-amber-400">{upcomingReservationsCount}</strong></span>
                </div>
              </div>

              {/* Metric 3: F&B POS & Orders */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 border border-blue-500/20 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">F&B Restaurant POS</p>
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-100 mt-2">{orders.length} <span className="text-xs font-bold text-blue-400">Orders</span></h2>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>Pending: <strong className="text-amber-400">{pendingOrdersCount}</strong></span>
                  <span>Low Stock Alerts: <strong className="text-rose-400">{lowStockIngredients.length}</strong></span>
                </div>
              </div>

              {/* Metric 4: Staff & Security */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 border border-purple-500/20 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-400">Staff Governance</p>
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-100 mt-2">{users.filter((u) => u.isActive).length} <span className="text-xs font-bold text-purple-400">Active Staff</span></h2>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>Security: <strong className="text-emerald-400">HMAC Signed</strong></span>
                  <span>MongoDB: <strong className="text-slate-200">Connected</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Hub */}
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" /> Executive Quick Launcher Hub
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Link
                  href="/reception"
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between space-y-3"
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 w-fit group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200 group-hover:text-amber-400">Front Desk</h4>
                    <p className="text-[10px] text-slate-500">Check-in & Guest Folios</p>
                  </div>
                </Link>

                <Link
                  href="/reservations"
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between space-y-3"
                >
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 w-fit group-hover:bg-blue-500 group-hover:text-slate-950 transition">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200 group-hover:text-amber-400">Room Calendar</h4>
                    <p className="text-[10px] text-slate-500">Reservations & Rates</p>
                  </div>
                </Link>

                <Link
                  href="/pos"
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between space-y-3"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200 group-hover:text-amber-400">POS Terminal</h4>
                    <p className="text-[10px] text-slate-500">Orders & Cashier</p>
                  </div>
                </Link>

                <Link
                  href="/inventory"
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between space-y-3"
                >
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 w-fit group-hover:bg-purple-500 group-hover:text-slate-950 transition">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200 group-hover:text-amber-400">Stock & Recipes</h4>
                    <p className="text-[10px] text-slate-500">Ingredients & COGS</p>
                  </div>
                </Link>

                <Link
                  href="/daily-report"
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between space-y-3"
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 w-fit group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200 group-hover:text-amber-400">Daily Financials</h4>
                    <p className="text-[10px] text-slate-500">P&L & Audit Report</p>
                  </div>
                </Link>

                <button
                  onClick={() => setActiveTab('users')}
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between space-y-3 text-left"
                >
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 w-fit group-hover:bg-rose-500 group-hover:text-slate-950 transition">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200 group-hover:text-amber-400">Staff & Roles</h4>
                    <p className="text-[10px] text-slate-500">User Administration</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Manager Activity Audit Feed ("mostly what he did must come") */}
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                <div>
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" /> Recent Manager & Staff Activity Feed
                  </h3>
                  <p className="text-xs text-slate-400">Real-time audit log of system user operations, overrides, and transactions</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={auditCategoryFilter}
                    onChange={(e) => setAuditCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Action Logs</option>
                    <option value="Admin">Admin & Manager Actions</option>
                    <option value="Front Desk">Front Desk & Reservations</option>
                    <option value="POS">POS & Cashier Charges</option>
                    <option value="Housekeeping">Housekeeping & Staff</option>
                  </select>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredAuditLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-amber-500/30 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-xs">{log.action}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-400 border border-slate-700">
                            {log.user}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}

                {filteredAuditLogs.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                    No activity logs found for the selected filter.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Hotel Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" /> Hotel & System Profile
              </h3>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                MongoDB Live Connected
              </span>
            </div>

            {saveSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Hotel / Restaurant Name</label>
                <input
                  type="text"
                  value={settings.hotelName}
                  onChange={(e) => setSettings({ ...settings, hotelName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Phone Number</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Currency Code</label>
                  <input
                    type="text"
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Address / Location</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">LAN Host Server IP:Port</label>
                  <input
                    type="text"
                    value={settings.lanHostIp}
                    onChange={(e) => setSettings({ ...settings, lanHostIp: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Admin Passkey PIN</label>
                  <input
                    type="text"
                    value={settings.adminPin}
                    onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  Save System Settings
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: System Users & Staff Roles */}
        {activeTab === 'users' && <UserManagementPanel />}

        {/* TAB 3: Prices & Menu Overrides */}
        {activeTab === 'prices' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" /> Instant Dish Price Adjustment
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Dish Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Current Price</th>
                    <th className="py-3.5 px-4">Est. COGS</th>
                    <th className="py-3.5 px-4">Profit Margin</th>
                    <th className="py-3.5 px-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {menuItems.map((item) => {
                    const cogs = store.getItemCost(item.id);
                    const margin = item.price > 0 ? ((item.price - cogs) / item.price) * 100 : 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-4 font-bold text-slate-100">{item.name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{item.category}</td>
                        <td className="py-3.5 px-4 font-black text-amber-400 text-sm">{item.price.toFixed(2)} ETB</td>
                        <td className="py-3.5 px-4 text-rose-400">{cogs.toFixed(2)} ETB</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">{margin.toFixed(1)}%</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handlePriceUpdate(item.id, item.price)}
                            className="py-1 px-3 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-all"
                          >
                            Edit Price
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Stock Override */}
        {activeTab === 'stock' && (
          <div className="max-w-xl bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-amber-400" /> Direct Inventory Level Override
            </h3>
            <p className="text-xs text-slate-400">
              Force update ingredient stock quantity in case of audit discrepancy or physical count adjustments.
            </p>

            <form onSubmit={handleDirectStockSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Select Ingredient</label>
                <select
                  value={selectedIngId}
                  onChange={(e) => setSelectedIngId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (Current: {ing.stockQuantity} {ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">New Absolute Stock Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50"
                  value={directStockInput}
                  onChange={(e) => setDirectStockInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Correction Reason</label>
                <input
                  type="text"
                  value={directStockReason}
                  onChange={(e) => setDirectStockReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
              >
                Apply Admin Stock Override
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: System Audit Logs */}
        {activeTab === 'audit' && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Admin / User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">{log.user}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{log.action}</td>
                    <td className="py-3.5 px-4 text-slate-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
