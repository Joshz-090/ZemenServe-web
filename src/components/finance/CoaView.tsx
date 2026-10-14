'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  FolderTree,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface AccountItem {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subType?: string;
  normalBalance: 'Debit' | 'Credit';
  balance?: number;
  isActive: boolean;
  ethiopianTaxMapping?: string;
  description?: string;
}

export function CoaView() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New account form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'>('Asset');
  const [newSubType, setNewSubType] = useState('Current Asset');
  const [newNormalBalance, setNewNormalBalance] = useState<'Debit' | 'Credit'>('Debit');
  const [newDescription, setNewDescription] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/coa');
      const data = await res.json();
      if (data.success && data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Standard Ethiopian hotel accounts verified & seeded successfully.' });
        fetchAccounts();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to seed accounts' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error seeding accounts' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim(),
          name: newName.trim(),
          type: newType,
          subType: newSubType.trim(),
          normalBalance: newNormalBalance,
          description: newDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Account ${newCode} (${newName}) created successfully.` });
        setIsCreateOpen(false);
        setNewCode('');
        setNewName('');
        setNewDescription('');
        fetchAccounts();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to create account.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create account.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.code.toLowerCase().includes(search.toLowerCase()) ||
      acc.name.toLowerCase().includes(search.toLowerCase()) ||
      (acc.subType && acc.subType.toLowerCase().includes(search.toLowerCase()));
    const matchesType = selectedType === 'All' || acc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Asset':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Liability':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Equity':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'Revenue':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Expense':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search code or account title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                  selectedType === type
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 disabled:opacity-50"
            title="Idempotently ensure all 52 Ethiopian hotel standard accounts are loaded"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Verify COA</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      {/* Account Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Account Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Sub-Type</th>
                <th className="py-3 px-4 text-center">Normal</th>
                <th className="py-3 px-4 text-right">Balance (ETB)</th>
                <th className="py-3 px-4">Tax / USALI Mapping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                    Loading Chart of Accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No accounts found matching your query.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.code} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{acc.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div>{acc.name}</div>
                      {acc.description && <div className="text-[10px] text-slate-500 font-normal truncate max-w-sm">{acc.description}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeColor(acc.type)}`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{acc.subType || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-[11px] text-slate-400 uppercase font-semibold">
                        {acc.normalBalance}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      {(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {acc.ethiopianTaxMapping || 'Standard'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-950/70 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Showing {filteredAccounts.length} of {accounts.length} registered accounts</span>
          <span className="font-semibold text-amber-400/90">Ethiopian Uniform System of Accounts for Lodging (USALI)</span>
        </div>
      </div>

      {/* Create Account Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Create New Account</h3>
                  <p className="text-[11px] text-slate-400">Define a custom account in the General Ledger</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Account Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1080"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Account Type *</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setNewType(t);
                      if (t === 'Asset' || t === 'Expense') setNewNormalBalance('Debit');
                      else setNewNormalBalance('Credit');
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Hotel Care Revenue"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Sub-Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Operating Revenue"
                    value={newSubType}
                    onChange={(e) => setNewSubType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Normal Balance *</label>
                  <select
                    value={newNormalBalance}
                    onChange={(e) => setNewNormalBalance(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Description / Audit Notes</label>
                <textarea
                  rows={2}
                  placeholder="Operational purpose of this account..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
