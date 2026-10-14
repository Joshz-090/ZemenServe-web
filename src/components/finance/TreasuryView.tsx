'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Wallet,
  ArrowRightLeft,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Smartphone,
  Lock,
  Unlock,
  Coins,
  Send,
} from 'lucide-react';

interface DrawerItem {
  id: string;
  name: string;
  station: string;
  glAccountCode: string;
  currentBalance: number;
  status: 'Active' | 'Inactive' | 'In_Use';
  activeShift?: string | null;
  cashier?: string | null;
}

interface BankItem {
  id: string;
  name: string;
  type: string;
  bank: string;
  accountNumber: string;
  glAccountCode: string;
  currentBalance: number;
  status: string;
  isPrimary: boolean;
}

interface ShiftItem {
  shiftNumber: string;
  cashier: string;
  drawerId: string;
  station: string;
  openedAt: string;
  openingFloat: number;
  currentCashSales: number;
  expectedCashNow: number;
}

export function TreasuryView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState<boolean>(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState<boolean>(false);
  const [isMovementOpen, setIsMovementOpen] = useState<boolean>(false);
  const [selectedShiftToClose, setSelectedShiftToClose] = useState<ShiftItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Open Shift Form
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('CDR-FD-01');
  const [cashierName, setCashierName] = useState<string>('Front Desk Cashier');
  const [openingFloat, setOpeningFloat] = useState<number>(2000);

  // Close Shift Form
  const [closingCashCounted, setClosingCashCounted] = useState<number>(0);
  const [dropToSafeAmount, setDropToSafeAmount] = useState<number>(0);
  const [varianceReason, setVarianceReason] = useState<string>('');

  // Cash Movement Form
  const [movementType, setMovementType] = useState<string>('MOBILE_MONEY_SWEEP');
  const [fromAccount, setFromAccount] = useState<string>('1040');
  const [toAccount, setToAccount] = useState<string>('1060');
  const [moveAmount, setMoveAmount] = useState<number>(10000);
  const [moveDesc, setMoveDesc] = useState<string>('Sweep Telebirr clearing into CBE operating account');

  const fetchTreasury = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/treasury/summary');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch treasury data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasury();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/treasury/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawerId: selectedDrawerId,
          cashierName: cashierName.trim(),
          openingFloat: Number(openingFloat),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: `Shift ${json.shift?.shiftNumber} opened on ${selectedDrawerId}.` });
        setIsOpenShiftOpen(false);
        fetchTreasury();
      } else {
        setFeedback({ type: 'error', message: json.message || 'Failed to open shift.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error opening shift.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftToClose) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/treasury/shifts/${selectedShiftToClose.shiftNumber}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingCashCounted: Number(closingCashCounted),
          dropToSafeAmount: Number(dropToSafeAmount),
          varianceReason: varianceReason.trim(),
          closedBy: 'Supervisor Cashier',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: 'success',
          message: `Shift ${selectedShiftToClose.shiftNumber} closed successfully with status ${json.shift?.varianceStatus}.`,
        });
        setIsCloseShiftOpen(false);
        setSelectedShiftToClose(null);
        fetchTreasury();
      } else {
        setFeedback({ type: 'error', message: json.message || 'Failed to close shift.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error closing shift.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/treasury/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movementType,
          fromAccountCode: fromAccount,
          toAccountCode: toAccount,
          amount: Number(moveAmount),
          description: moveDesc.trim(),
          performedBy: 'Treasury Officer',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: 'success',
          message: `Cash movement executed & posted to GL (${json.journalEntryNumber}).`,
        });
        setIsMovementOpen(false);
        fetchTreasury();
      } else {
        setFeedback({ type: 'error', message: json.message || 'Failed to execute transfer.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing cash transfer.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const summary = data?.summary || { totalLiquidAssets: 0, totalDrawerCash: 0, totalBankBalances: 0, totalMobileMoney: 0 };
  const drawers: DrawerItem[] = data?.drawers || [];
  const banks: BankItem[] = data?.bankAccounts || [];
  const activeShifts: ShiftItem[] = data?.activeShifts || [];

  // Live variance calculation in Close Shift modal
  const liveVariance = selectedShiftToClose ? closingCashCounted - selectedShiftToClose.expectedCashNow : 0;

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

      {/* Treasury Asset Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Liquid Treasury</p>
            <h3 className="text-xl font-black text-amber-400 mt-1">
              {summary.totalLiquidAssets.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash in Registers & Safe</p>
            <h3 className="text-xl font-black text-emerald-400 mt-1">
              {summary.totalDrawerCash.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commercial Bank of Ethiopia</p>
            <h3 className="text-xl font-black text-cyan-400 mt-1">
              {summary.totalBankBalances.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telebirr & CBE Birr Wallets</p>
            <h3 className="text-xl font-black text-indigo-400 mt-1">
              {summary.totalMobileMoney.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Active Shift Sessions:</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {activeShifts.length} Open
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTreasury}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Refresh Treasury"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsMovementOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>Transfer / Sweep</span>
          </button>

          <button
            onClick={() => setIsOpenShiftOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Open Cashier Shift</span>
          </button>
        </div>
      </div>

      {/* Active Cashier Shifts Panel */}
      {activeShifts.length > 0 && (
        <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-5 space-y-4 shadow-xl shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Active Cashier Shift Registers</h3>
            </div>
            <span className="text-[11px] text-amber-400/90 font-mono">Live Float & Collections</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeShifts.map((shift) => (
              <div key={shift.shiftNumber} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400 text-xs">{shift.shiftNumber}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {shift.station}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-300 font-semibold">{shift.cashier}</div>
                  <div className="text-[11px] text-slate-500 font-mono">Drawer: {shift.drawerId}</div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Opening Float:</span>
                    <span>ETB {shift.openingFloat.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Cash Sales:</span>
                    <span className="text-emerald-400">+ETB {shift.currentCashSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-900">
                    <span>Expected Cash:</span>
                    <span className="text-amber-400">ETB {shift.expectedCashNow.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedShiftToClose(shift);
                    setClosingCashCounted(shift.expectedCashNow);
                    setIsCloseShiftOpen(true);
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
                >
                  <Lock className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Count Cash & Close Shift</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Drawers & Bank Registers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical Cash Drawers */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Physical Cash Registers & Vault</h3>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs font-medium">
            {drawers.map((d) => (
              <div key={d.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{d.id}</span>
                    <span className="font-semibold text-slate-200">{d.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Station: {d.station} | GL: <span className="font-mono text-cyan-400">{d.glAccountCode}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-sm text-emerald-400">
                    ETB {d.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      d.status === 'In_Use'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {d.status === 'In_Use' ? `In Use (${d.cashier})` : 'Available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bank & Mobile Wallets */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Commercial Bank Accounts & Wallets</h3>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs font-medium">
            {banks.map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{b.name}</span>
                    {b.isPrimary && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {b.bank} | Acct: {b.accountNumber} | GL: <span className="text-cyan-400">{b.glAccountCode}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-sm text-cyan-400">
                    ETB {b.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">{b.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Cashier Shift Modal */}
      {isOpenShiftOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Open Cashier Shift</h3>
                  <p className="text-[11px] text-slate-400">Lock drawer register & record opening float</p>
                </div>
              </div>
              <button onClick={() => setIsOpenShiftOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleOpenShift} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Select Drawer Register *</label>
                <select
                  value={selectedDrawerId}
                  onChange={(e) => setSelectedDrawerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  {drawers
                    .filter((d) => d.status === 'Active')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} - {d.name} ({d.station})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Cashier User Name *</label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Opening Cash Float (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Opening...' : 'Start Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift & Cash Count Modal with Live Variance */}
      {isCloseShiftOpen && selectedShiftToClose && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Close Shift & Reconcile Cash</h3>
                  <p className="text-[11px] text-slate-400">{selectedShiftToClose.shiftNumber} ({selectedShiftToClose.cashier})</p>
                </div>
              </div>
              <button onClick={() => setIsCloseShiftOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleCloseShift} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Opening Float:</span>
                  <span>ETB {selectedShiftToClose.openingFloat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cash Sales Recorded:</span>
                  <span className="text-emerald-400">+ETB {selectedShiftToClose.currentCashSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-1">
                  <span>Expected Cash in Drawer:</span>
                  <span className="text-amber-400">ETB {selectedShiftToClose.expectedCashNow.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Actual Physical Cash Counted (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingCashCounted}
                  onChange={(e) => setClosingCashCounted(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Live Variance Calculation Badge */}
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  Math.abs(liveVariance) < 0.01
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : liveVariance < 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                }`}
              >
                <span>Reconciliation Result:</span>
                <span>
                  {Math.abs(liveVariance) < 0.01
                    ? 'Balanced (0.00)'
                    : liveVariance < 0
                    ? `Shortage of ETB ${Math.abs(liveVariance).toFixed(2)}`
                    : `Overage of ETB ${liveVariance.toFixed(2)}`}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Shift Drop to Main Safe (Account 1030)</label>
                <input
                  type="number"
                  step="0.01"
                  max={closingCashCounted}
                  value={dropToSafeAmount}
                  onChange={(e) => setDropToSafeAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Remaining cash stays as opening float for next shift.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Variance Reason / Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Small coin discrepancy or change float issue"
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Closing...' : 'Confirm Shift Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Cash Transfer / Sweep Modal */}
      {isMovementOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Internal Treasury Transfer</h3>
                  <p className="text-[11px] text-slate-400">Auto-posts Double-Entry GL Journal</p>
                </div>
              </div>
              <button onClick={() => setIsMovementOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleCashMovement} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Transfer Operation Type *</label>
                <select
                  value={movementType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setMovementType(t);
                    if (t === 'MOBILE_MONEY_SWEEP') {
                      setFromAccount('1040');
                      setToAccount('1060');
                      setMoveDesc('Sweep Telebirr clearing into CBE bank operating account');
                    } else if (t === 'SAFE_TO_DRAWER_FLOAT') {
                      setFromAccount('1030');
                      setToAccount('1010');
                      setMoveDesc('Replenish Front Desk register float from Main Safe');
                    } else if (t === 'DRAWER_TO_SAFE_DROP') {
                      setFromAccount('1010');
                      setToAccount('1030');
                      setMoveDesc('Drop physical cash into Main Safe vault');
                    } else if (t === 'BANK_DEPOSIT') {
                      setFromAccount('1010');
                      setToAccount('1060');
                      setMoveDesc('Deposit cash register takings into CBE Bank');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="MOBILE_MONEY_SWEEP">Mobile Money Sweep (Telebirr 1040 to CBE 1060)</option>
                  <option value="SAFE_TO_DRAWER_FLOAT">Float Replenishment (Safe 1030 to Drawer 1010)</option>
                  <option value="DRAWER_TO_SAFE_DROP">Safe Drop (Drawer 1010 to Safe 1030)</option>
                  <option value="BANK_DEPOSIT">Bank Deposit (Drawer 1010 to CBE Bank 1060)</option>
                  <option value="PETTY_CASH_EXPENSE">Petty Cash Disbursement (Drawer 1010 to Expenses 6900)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">From Account (Credit)</label>
                  <input
                    type="text"
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">To Account (Debit)</label>
                  <input
                    type="text"
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Transfer Amount (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Memo / Audit Description *</label>
                <input
                  type="text"
                  required
                  value={moveDesc}
                  onChange={(e) => setMoveDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMovementOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || moveAmount <= 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Transferring...' : 'Execute & Post GL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
