'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { FolioTransaction, Reservation, Order, Room } from '@/lib/types';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Building,
  Receipt,
  ShoppingBag,
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export function HotelFinanceView() {
  const [folioTxs, setFolioTxs] = useState<FolioTransaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Hotel Financial ERP & Night Audit</h1>
              <p className="text-xs text-slate-400">Consolidated ledger, RevPAR, ADR, Guest Folios & VAT financial reporting.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Export Financial Report</span>
          </button>
        </div>
      </div>

      {/* Hotel Performance Key Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Hotel Revenue</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{totalGrossHotelRevenue.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB</span></h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Rooms + POS + Services</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">RevPAR (Per Room)</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{revPar.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB</span></h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Revenue / Total Rooms</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">ADR (Average Rate)</p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">{adr.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB</span></h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Room Revenue / Occupied</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Restaurant POS Sales</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{totalRestaurantPosRevenue.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ETB</span></h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Paid Orders</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Revenue Stream Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-300">Room Revenue Stream</h3>
            <span className="text-xs font-mono font-bold text-amber-400">{totalRoomRevenue.toLocaleString()} ETB</span>
          </div>
          <p className="text-xs text-slate-400">Direct bookings, corporate packages, and walk-in stay fees.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-300">Restaurant & Bar POS</h3>
            <span className="text-xs font-mono font-bold text-purple-400">{totalRestaurantPosRevenue.toLocaleString()} ETB</span>
          </div>
          <p className="text-xs text-slate-400">Food, beverages, kitchen orders and room service dining.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-300">Services & Extras</h3>
            <span className="text-xs font-mono font-bold text-emerald-400">{totalServicesRevenue.toLocaleString()} ETB</span>
          </div>
          <p className="text-xs text-slate-400">Laundry, minibar, late checkouts, and hall rentals.</p>
        </div>
      </div>

      {/* Consolidated Master Transactions Ledger */}
      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Consolidated Master Transaction Ledger</h2>
        <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Guest / Ref</th>
                <th className="p-4">Room No.</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Debit (ETB)</th>
                <th className="p-4 text-right">Credit (ETB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {folioTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 text-[11px] text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
                  <td className="p-4 font-bold text-slate-200">{tx.guestName}</td>
                  <td className="p-4 font-mono font-bold text-amber-400">Room #{tx.roomNumber}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                      {tx.category}
                    </span>
                  </td>
                  <td className="p-4 text-slate-300">{tx.description}</td>
                  <td className="p-4 text-right font-mono font-bold text-rose-400">
                    {tx.type === 'Debit' ? tx.amount.toLocaleString() : '-'}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-400">
                    {tx.type === 'Credit' ? tx.amount.toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
