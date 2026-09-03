'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { store } from '@/lib/store';
import { Order, OrderStatus } from '@/lib/types';
import { ChefHat, Clock, CheckCircle2, Play, AlertCircle, Volume2, VolumeX, UtensilsCrossed, Calendar } from 'lucide-react';

export function KitchenDisplayView() {
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getYesterdayISO = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('Active');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayISO());
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');

  useEffect(() => {
    const updateOrders = () => {
      setOrders(store.getOrders());
    };

    updateOrders();

    // Sync from database on mount & poll every 3 seconds for instant real-time kitchen order updates!
    const syncDbOrders = async () => {
      await store.fetchOrdersFromDB();
      updateOrders();
    };
    syncDbOrders();
    const dbPoll = setInterval(syncDbOrders, 3000);

    const unsubscribe = store.subscribe(updateOrders);

    // Timer tick to update live elapsed minutes
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      clearInterval(dbPoll);
    };
  }, []);

  const [cookedItemsMap, setCookedItemsMap] = useState<Record<string, boolean>>({});

  const toggleItemCooked = (orderId: number, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCookedItemsMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStatusChange = (orderId: number, newStatus: OrderStatus) => {
    store.updateOrderStatus(orderId, newStatus);
  };

  // Date-Filtered Orders (Defaults strictly to TODAY)
  const dateFilteredOrders = useMemo(() => {
    if (dateFilterMode === 'all') return orders;
    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
      return orderDate === selectedDateStr;
    });
  }, [orders, dateFilterMode, selectedDateStr]);

  const activeOrders = dateFilteredOrders.filter((o) => o.status !== 'Served' && o.status !== 'Cancelled');
  const cancelledCount = dateFilteredOrders.filter((o) => o.status === 'Cancelled').length;

  const displayOrders = dateFilteredOrders.filter((o) => {
    if (filterStatus === 'Active') return o.status !== 'Served';
    return o.status === filterStatus;
  });

  const getElapsedTimeStr = (createdAtStr: string) => {
    const diffMs = currentTime - new Date(createdAtStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return '0m';
    return `${mins}m`;
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse';
      case 'Preparing':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'Ready':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse font-black';
      case 'Served':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  const [showHistorySummary, setShowHistorySummary] = useState<boolean>(false);

  const foodItemsPreparedSummary = React.useMemo(() => {
    const map = new Map<string, number>();
    dateFilteredOrders.forEach((o) => {
      if (o.status !== 'Cancelled') {
        o.orderItems.forEach((item) => {
          const itemName = item.menuItemName || 'Item';
          const qty = item.quantity || 1;
          const current = map.get(itemName) || 0;
          map.set(itemName, current + qty);
        });
      }
    });
    return Array.from(map.entries())
      .map(([name, totalQty]) => ({ name, totalQty }))
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [dateFilteredOrders]);

  const handleSelectToday = () => {
    setDateFilterMode('today');
    setSelectedDateStr(getTodayISO());
  };

  const handleSelectYesterday = () => {
    setDateFilterMode('yesterday');
    setSelectedDateStr(getYesterdayISO());
  };

  const handleSelectAllDays = () => {
    setDateFilterMode('all');
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilterMode('custom');
    setSelectedDateStr(e.target.value);
  };

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-140px)] bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl">
      {/* KDS Header & Filter Navigation */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              KITCHEN DISPLAY SYSTEM (KDS)
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                {activeOrders.length} Active
              </span>
              {cancelledCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                  {cancelledCount} Cancelled
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Showing Orders for: <strong className="text-amber-400 font-bold">{dateFilterMode === 'all' ? 'All Days Cumulative' : selectedDateStr}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Quick Date Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={handleSelectToday}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                dateFilterMode === 'today'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleSelectYesterday}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                dateFilterMode === 'yesterday'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={handleSelectAllDays}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                dateFilterMode === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Days
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="date"
              value={selectedDateStr}
              onChange={handleCustomDateChange}
              className="bg-transparent text-slate-100 text-xs font-bold outline-none cursor-pointer selection:bg-amber-500"
            />
          </div>

          <div className="h-6 w-px bg-slate-800 hidden lg:block" />

          {/* Status Tabs */}
          {['Active', 'Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === status
                  ? status === 'Cancelled'
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                    : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {status} {status === 'Active' && `(${activeOrders.length})`}
            </button>
          ))}

          <button
            onClick={() => setShowHistorySummary(!showHistorySummary)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showHistorySummary
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Dish Summary</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800/50 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Food Items Prepared Summary Banner (Collapsible) */}
      {showHistorySummary && (
        <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" /> Food Prepared Today Summary
            </h3>
            <span className="text-[10px] text-slate-400">{foodItemsPreparedSummary.length} Total Dish Types Cooked</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {foodItemsPreparedSummary.map((item, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-200 truncate font-semibold">{item.name}</span>
                <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  x{item.totalQty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {displayOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-500">
            <UtensilsCrossed className="w-16 h-16 mb-4 stroke-1 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-300">No active kitchen orders</h3>
            <p className="text-xs text-slate-500 mt-1">New orders placed at the Cashier POS will pop up here live!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayOrders.map((order) => {
              const elapsedStr = getElapsedTimeStr(order.createdAt);
              const isCancelled = order.status === 'Cancelled';
              const tableNum = (order as any).tableNumber || (order as any).table || 1;
              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between p-5 rounded-2xl border transition-all shadow-lg ${
                    isCancelled
                      ? 'bg-red-950/30 border-red-500/80 shadow-red-500/10'
                      : order.status === 'Pending'
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-amber-500/5'
                      : order.status === 'Preparing'
                      ? 'bg-sky-950/20 border-sky-500/40 shadow-sky-500/5'
                      : order.status === 'Ready'
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-500/5'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div>
                    {/* CANCELLED ALERT BANNER FOR CHEF */}
                    {isCancelled && (
                      <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-2.5 mb-3 flex items-center gap-2 text-red-400 text-xs font-black animate-pulse">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="uppercase tracking-wider">🚫 ORDER CANCELLED</p>
                          <p className="text-[11px] font-normal text-red-300">
                            STOP PREPARING! ({(order as any).cancelReason || 'Cancelled by Cashier'})
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-400">Order</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Table {tableNum}
                          </span>
                        </div>
                        <h2 className={`text-xl font-black ${isCancelled ? 'text-red-400 line-through' : 'text-slate-100'}`}>
                          #{order.id}
                        </h2>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> ({elapsedStr})
                        </span>
                      </div>
                    </div>

                    {/* Waiter & Total Amount */}
                    <div className="py-2.5 border-b border-slate-800/60 text-xs flex justify-between items-center text-slate-300">
                      <span>
                        Server: <strong className="text-amber-400">{order.waiterName || 'Ayele'}</strong>
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {(order.totalAmount || 0).toFixed(2)} ETB
                      </span>
                    </div>

                    {/* Items List (Chefs can check off cooked dishes item-by-item) */}
                    <div className="py-3 space-y-1.5">
                      {order.orderItems.map((item, idx) => {
                        const itemKey = `${order.id}-${idx}`;
                        const isCooked = Boolean(cookedItemsMap[itemKey]);
                        return (
                          <div
                            key={`${item.id || idx}-${idx}`}
                            onClick={() => !isCancelled && toggleItemCooked(order.id, idx)}
                            className={`flex justify-between items-center text-xs font-semibold p-2 rounded-xl transition cursor-pointer border ${
                              isCancelled
                                ? 'bg-red-950/20 border-red-500/20 text-red-300'
                                : isCooked
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                                : 'bg-slate-900/80 border-slate-800 hover:bg-slate-900 text-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {!isCancelled && (
                                <input
                                  type="checkbox"
                                  checked={isCooked}
                                  onChange={() => toggleItemCooked(order.id, idx)}
                                  className="w-3.5 h-3.5 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                                />
                              )}
                              <span className={isCancelled ? 'line-through text-red-300/70' : isCooked ? 'line-through text-emerald-300 font-bold' : 'text-slate-100'}>
                                {item.menuItemName}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                                isCancelled
                                  ? 'bg-red-500/20 text-red-400 line-through'
                                  : isCooked
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              x{item.quantity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chef Action Buttons */}
                  <div className="pt-4 border-t border-slate-800/80">
                    {isCancelled ? (
                      <div className="w-full py-2 px-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 font-black text-xs text-center uppercase tracking-wider">
                        🚫 PREPARATION CANCELLED
                      </div>
                    ) : (
                      <>
                        {order.status === 'Pending' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'Preparing')}
                            className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-current" /> ACCEPT & START COOKING
                          </button>
                        )}

                        {order.status === 'Preparing' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'Ready')}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" /> READY TO TAKE
                          </button>
                        )}

                        {order.status === 'Ready' && (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> READY TO TAKE / SERVING
                          </div>
                        )}

                        {order.status === 'Served' && (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> PAID & CLOSED (BY CASHIER)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
