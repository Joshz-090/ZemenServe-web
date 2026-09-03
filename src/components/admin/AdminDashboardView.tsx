'use client';

import React, { useState, useEffect } from 'react';
import { UserManagementPanel } from './UserManagementPanel';
import { store } from '@/lib/store';
import { AuditLog, HotelSettings, Ingredient, MenuItem, SystemUser, UserRole } from '@/lib/types';
import { ShieldCheck, Lock, Key, Settings, Users, DollarSign, PackageCheck, FileText, CheckCircle2, AlertCircle, Plus, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser?: any;
}

export function AdminDashboardView({ currentUser }: AdminDashboardViewProps) {
  // Security Gate: Always require explicit password entry whenever /admin is opened
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'prices' | 'stock' | 'audit'>('settings');

  // State slices
  const [settings, setSettings] = useState<HotelSettings>(store.getSettings());
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newName || !newUserPin) return;

    store.addSystemUser({
      username: newUsername,
      name: newName,
      role: newRole,
      pin: newUserPin,
      isActive: true,
    });

    setNewUsername('');
    setNewName('');
    setNewUserPin('');
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
    <div className="flex flex-col gap-5 h-[calc(100vh-140px)] bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              ADMINISTRATION & SYSTEM CONTROL
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Authorized
              </span>
            </h1>
            <p className="text-xs text-slate-400">Manage hotel profile, staff roles, menu prices, and system audit logs</p>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Staff Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'prices' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Prices & Menu
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'stock' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" /> Stock Override
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Audit Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setPinInput('');
            }}
            className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 ml-2"
            title="Lock Admin Control"
          >
            <Lock className="w-3.5 h-3.5" /> Lock Access
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto pr-1">
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
