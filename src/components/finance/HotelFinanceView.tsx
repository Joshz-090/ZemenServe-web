'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { FolioTransaction, Reservation, Order, Room } from '@/lib/types';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Scale,
  Calendar,
  Building,
  Receipt,
  ShoppingBag,
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  Lock,
  Layers,
  FolderTree,
  FileText,
  Truck,
  Coins,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { CoaView } from './CoaView';
import { JournalView } from './JournalView';
import { InvoicesView } from './InvoicesView';
import { BillsView } from './BillsView';
import { TreasuryView } from './TreasuryView';
import { ReportsView } from './ReportsView';

interface HotelFinanceViewProps {
  initialTab?: 'overview' | 'coa' | 'journal' | 'invoices' | 'bills' | 'treasury' | 'reports';
}

export function HotelFinanceView({ initialTab = 'overview' }: HotelFinanceViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'coa' | 'journal' | 'invoices' | 'bills' | 'treasury' | 'reports'>(initialTab);
  const [folioTxs, setFolioTxs] = useState<FolioTransaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = () => {
    setFolioTxs(store.getFolioTransactions());
    setReservations(store.getReservations());
    setOrders(store.getOrders());
    setRooms(store.getRooms());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleRunNightAudit = async () => {
    setIsAuditing(true);
    setAuditFeedback(null);
    try {
      const res = await fetch('/api/finance/night-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditDate: selectedDate }),
      });
      const json = await res.json();
      if (json.success) {
        setAuditFeedback(`Night Audit complete for ${selectedDate}: ${json.result?.occupiedRoomsAudited} rooms posted (ETB ${json.result?.totalRoomRevenueBilled?.toLocaleString()}).`);
      } else {
        setAuditFeedback(`Night Audit error: ${json.message}`);
      }
    } catch (err: any) {
      setAuditFeedback(`Failed to run night audit: ${err.message}`);
    } finally {
      setIsAuditing(false);
      setTimeout(() => setAuditFeedback(null), 8000);
    }
  };

  // Financial Metric Calculations
  const totalRoomRevenue = folioTxs
    .filter((t) => t.category === 'Room Charge' && t.type === 'Debit')
    .reduce((s, t) => s + t.amount, 0);

  const totalRestaurantPosRevenue = orders
    .filter((o) => o.isPaid && o.status !== 'Cancelled')
    .reduce((s, o) => s + o.totalAmount, 0);

  const totalServicesRevenue = folioTxs
    .filter(
      (t) =>
        t.type === 'Debit' &&
        t.category !== 'Room Charge' &&
        t.category !== 'Payment Deposit'
    )
    .reduce((s, t) => s + t.amount, 0);

  const totalGrossHotelRevenue = totalRoomRevenue + totalRestaurantPosRevenue + totalServicesRevenue;

  // Hotel Key Indicators (RevPAR & ADR)
  const totalRoomsCount = rooms.length || 1;
  const occupiedRoomsCount = rooms.filter((r) => r.status === 'Occupied').length;
  const adr = occupiedRoomsCount > 0 ? Math.round(totalRoomRevenue / occupiedRoomsCount) : 0;
  const revPar = Math.round(totalGrossHotelRevenue / totalRoomsCount);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <DollarSign className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Hotel Financial ERP & Accounting</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Double-Entry Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              General Ledger, Chart of Accounts, Invoicing, Supplier Bills, Treasury & Ethiopian Tax Reporting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-mono"
            />
          </div>

          <button
            onClick={handleRunNightAudit}
            disabled={isAuditing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{isAuditing ? 'Auditing...' : 'Run Night Audit'}</span>
          </button>
        </div>
      </div>

      {/* Night Audit Feedback Alert */}
      {auditFeedback && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-between">
          <span>{auditFeedback}</span>
          <button onClick={() => setAuditFeedback(null)} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
      )}

      {/* Primary Sub-Navigation Hub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
        {[
          { id: 'overview', label: 'Command Center', icon: BarChart3 },
          { id: 'coa', label: 'Chart of Accounts', icon: FolderTree },
          { id: 'journal', label: 'Journal Entries & GL', icon: FileText },
          { id: 'invoices', label: 'Invoices & AR', icon: Receipt },
          { id: 'bills', label: 'Bills & Payables (AP)', icon: Truck },
          { id: 'treasury', label: 'Treasury & Cashiers', icon: Coins },
          { id: 'reports', label: 'Financial Statements', icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 border ${
                active
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT RENDERING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Performance Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Hotel Revenue</p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">
                  {totalGrossHotelRevenue.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-medium">Room, POS & Events</span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Daily Rate (ADR)</p>
                <h3 className="text-2xl font-black text-slate-100 mt-1">
                  {adr.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Per occupied room</span>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                <Building className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RevPAR (Yield)</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {revPar.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Revenue per available room</span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rooms Occupancy</p>
                <h3 className="text-2xl font-black text-cyan-400 mt-1">
                  {Math.round((occupiedRoomsCount / totalRoomsCount) * 100)}%
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {occupiedRoomsCount} / {totalRoomsCount} Rooms
                </span>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => setActiveTab('journal')}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer group space-y-2 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
              </div>
              <h3 className="text-sm font-black text-slate-100">Double-Entry Journals</h3>
              <p className="text-xs text-slate-400">Post balanced ledger adjustments, view audit logs & manage transaction reversals.</p>
            </div>

            <div
              onClick={() => setActiveTab('invoices')}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer group space-y-2 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
              </div>
              <h3 className="text-sm font-black text-slate-100">Customer Tax Invoicing (AR)</h3>
              <p className="text-xs text-slate-400">Issue Ministry of Revenues compliant invoices with 15% VAT & 10% Service Charge.</p>
            </div>

            <div
              onClick={() => setActiveTab('reports')}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer group space-y-2 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400 border border-cyan-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
              </div>
              <h3 className="text-sm font-black text-slate-100">Financial Reporting Engine</h3>
              <p className="text-xs text-slate-400">Generate real-time Trial Balance, Balance Sheet, P&L (USALI) and MoR Tax Summaries.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coa' && <CoaView />}
      {activeTab === 'journal' && <JournalView />}
      {activeTab === 'invoices' && <InvoicesView />}
      {activeTab === 'bills' && <BillsView />}
      {activeTab === 'treasury' && <TreasuryView />}
      {activeTab === 'reports' && <ReportsView />}
    </div>
  );
}
