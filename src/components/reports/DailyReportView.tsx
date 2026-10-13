import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { DailyReportSummary } from '@/lib/types';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Printer,
  FileSpreadsheet,
  PieChart,
  ShieldCheck,
  Calendar,
  Bed,
  UtensilsCrossed,
  Users,
  CheckCircle,
} from 'lucide-react';

interface DailyReportViewProps {
  userRole?: string;
}

export function DailyReportView({ userRole }: DailyReportViewProps) {
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getYesterdayISO = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayISO());
  const [filterMode, setFilterMode] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [summary, setSummary] = useState<DailyReportSummary | null>(null);

  useEffect(() => {
    const updateSummary = () => {
      const target = filterMode === 'all' ? undefined : selectedDateStr;
      const data = store.getDailyReportSummary(target);

      let formattedDateLabel = 'All-Time Cumulative Report';
      if (filterMode !== 'all' && selectedDateStr) {
        const parts = selectedDateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day);
          formattedDateLabel = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      }

      setSummary({
        date: formattedDateLabel,
        ...data,
      });
    };

    updateSummary();
    const unsubscribe = store.subscribe(updateSummary);
    return () => unsubscribe();
  }, [selectedDateStr, filterMode]);

  if (!summary) return null;

  const grossMargin = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;

  const handlePrintReport = () => {
    window.print();
  };

  const handleSelectToday = () => {
    setFilterMode('today');
    setSelectedDateStr(getTodayISO());
  };

  const handleSelectYesterday = () => {
    setFilterMode('yesterday');
    setSelectedDateStr(getYesterdayISO());
  };

  const handleSelectAllTime = () => {
    setFilterMode('all');
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterMode('custom');
    setSelectedDateStr(e.target.value);
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl overflow-y-auto">
      {/* Cashier Read-Only Banner */}
      {userRole === 'Cashier' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 text-amber-400 text-xs font-bold shrink-0">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <span>🔒 READ-ONLY VIEW (CASHIER MODE)</span>
            <p className="text-[11px] text-slate-400 font-normal">
              You are viewing financial reports in Read-Only mode. Operational configuration changes are restricted to Manager and Admin accounts.
            </p>
          </div>
        </div>
      )}

      {/* Report Header & Interactive Date Picker Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              DAILY MANAGER FINANCIAL REPORT
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LAN Standard PDF Report
              </span>
            </h1>
            <p className="text-xs text-slate-400">Date: {summary.date}</p>
          </div>
        </div>

        {/* Date Selector & Action Controls */}
        <div className="flex flex-wrap items-center gap-3 print:hidden w-full md:w-auto">
          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={handleSelectToday}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'today'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleSelectYesterday}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'yesterday'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={handleSelectAllTime}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Calendar Picker Input */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-semibold hidden sm:inline">Choose Date:</span>
            <input
              type="date"
              value={selectedDateStr}
              onChange={handleCustomDateChange}
              className="bg-transparent text-slate-100 text-xs font-bold outline-none cursor-pointer selection:bg-amber-500"
            />
          </div>

          <button
            onClick={handlePrintReport}
            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Grand Revenue */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Revenue</p>
              <h2 className="text-xl font-black text-amber-400 mt-1">
                {summary.totalRevenue.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ETB</span>
              </h2>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Lodging + Food & Bev + Others</p>
        </div>

        {/* Room Lodging Revenue */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">Room Revenue</p>
              <h2 className="text-xl font-black text-indigo-400 mt-1">
                {(summary.roomRevenue || 0).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ETB</span>
              </h2>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">{summary.totalLodgingBookings || 0} room booking(s) active</p>
        </div>

        {/* Food & Beverage Revenue */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">Food & Bev (POS)</p>
              <h2 className="text-xl font-black text-emerald-400 mt-1">
                {(summary.foodRevenue || 0).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ETB</span>
              </h2>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">{summary.totalOrders} paid restaurant order(s)</p>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total COGS</p>
              <h2 className="text-xl font-black text-rose-400 mt-1">
                {summary.totalCogs.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ETB</span>
              </h2>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Recipe ingredient costs</p>
        </div>

        {/* Net Profit */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/40 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Net Operating Profit</p>
              <h2 className="text-xl font-black text-emerald-400 mt-1">
                {summary.netProfit.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ETB</span>
              </h2>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Margin: {grossMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* SECTION 1: Room Lodging Sales & Occupancy Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <Bed className="w-4 h-4 text-indigo-400" />
            ROOM LODGING SALES & OCCUPANCY BREAKDOWN
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            Total Room Lodging: <strong className="text-indigo-300">{(summary.roomRevenue || 0).toLocaleString()} ETB</strong>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Room</th>
                <th className="py-3 px-3.5">Room Type</th>
                <th className="py-3 px-3.5">Guest Full Name</th>
                <th className="py-3 px-3.5">National ID / FIN #</th>
                <th className="py-3 px-3.5">Check-In / Out</th>
                <th className="py-3 px-3.5 text-center">Nights</th>
                <th className="py-3 px-3.5 text-right">Nightly Rate</th>
                <th className="py-3 px-3.5 text-right">Total Lodging</th>
                <th className="py-3 px-3.5 text-right">Deposit</th>
                <th className="py-3 px-3.5 text-right">Balance Due</th>
                <th className="py-3 px-3.5 text-center">Meal Plan</th>
                <th className="py-3 px-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {!summary.roomSales || summary.roomSales.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    No room lodging bookings or occupancies registered for this report date.
                  </td>
                </tr>
              ) : (
                summary.roomSales.map((sale, idx) => (
                  <tr key={`${sale.reservationId}-${idx}`} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3.5 font-black text-amber-400">#{sale.roomNumber}</td>
                    <td className="py-3 px-3.5 font-bold text-slate-300">{sale.roomType}</td>
                    <td className="py-3 px-3.5 font-bold text-slate-100">
                      <div>{sale.guestName}</div>
                      {sale.guestPhone && <div className="text-[10px] text-slate-400 font-normal">{sale.guestPhone}</div>}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-amber-300">
                      <div>{sale.idNumber || 'N/A'}</div>
                      <div className="text-[9px] text-slate-500">{sale.idType || 'Fayda ID'}</div>
                    </td>
                    <td className="py-3 px-3.5 text-[11px] text-slate-300">
                      <div>In: {sale.checkInDate}</div>
                      <div>Out: {sale.checkOutDate}</div>
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-indigo-400">{sale.nights}</td>
                    <td className="py-3 px-3.5 text-right font-medium">{sale.rate.toLocaleString()} ETB</td>
                    <td className="py-3 px-3.5 text-right font-black text-amber-400">
                      {sale.total.toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-emerald-400">
                      {(sale.depositPaid || 0).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-400">
                      {(sale.balanceDue || 0).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {sale.mealPlan || 'Room Only'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        sale.status === 'Checked-In'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : sale.status === 'Checked-Out'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Food & Beverage (POS) Sales Breakdown */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
            FOOD & BEVERAGE SALES & PROFIT BREAKDOWN
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            Total F&B: <strong className="text-emerald-300">{(summary.foodRevenue || 0).toLocaleString()} ETB</strong>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Menu Dish</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Qty Sold</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-right">Ingredient Cost</th>
                <th className="py-3 px-4 text-right">Item Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {summary.itemsSold.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No restaurant or bar items sold on this report date.
                  </td>
                </tr>
              ) : (
                summary.itemsSold.map((item) => {
                  const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                  return (
                    <tr key={item.menuItemId} className="hover:bg-slate-900/40">
                      <td className="py-3.5 px-4 font-bold text-slate-100">{item.name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{item.category}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">{item.quantity}</td>
                      <td className="py-3.5 px-4 text-right font-semibold">{item.revenue.toFixed(2)} ETB</td>
                      <td className="py-3.5 px-4 text-right text-rose-400">{item.cost.toFixed(2)} ETB</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                        {item.profit.toFixed(2)} ETB
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-sky-400">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
