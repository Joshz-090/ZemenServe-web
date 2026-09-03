'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { Waiter, Order } from '@/lib/types';
import { Users, Plus, UserCheck, DollarSign, ShoppingBag } from 'lucide-react';

export function WaiterManagementView() {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [newWaiterName, setNewWaiterName] = useState<string>('');

  useEffect(() => {
    const updateData = () => {
      setWaiters(store.getWaiters());
      setOrders(store.getOrders());
    };

    updateData();
    const unsubscribe = store.subscribe(updateData);
    return () => unsubscribe();
  }, []);

  const handleAddWaiter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWaiterName.trim()) return;
    store.addWaiter(newWaiterName.trim());
    setNewWaiterName('');
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100">WAITERS & STAFF MANAGEMENT</h1>
            <p className="text-xs text-slate-400">Server roster, table assignments, and sales metrics</p>
          </div>
        </div>

        {/* Add Waiter Form */}
        <form onSubmit={handleAddWaiter} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="New waiter name..."
            value={newWaiterName}
            onChange={(e) => setNewWaiterName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
            required
          />
          <button
            type="submit"
            className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" /> Add Waiter
          </button>
        </form>
      </div>

      {/* Waiters Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {waiters.map((waiter) => {
          const waiterOrders = orders.filter((o) => o.waiterId === waiter.id && o.isPaid === true && o.status !== 'Cancelled');
          const totalSales = waiterOrders.reduce((sum, o) => sum + o.totalAmount, 0);

          return (
            <div key={waiter.id} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-sm">
                    {waiter.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{waiter.name}</h3>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Active Duty
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Orders Handled</p>
                  <p className="text-lg font-black text-amber-400 mt-0.5">{waiterOrders.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Revenue</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">{totalSales.toFixed(2)} ETB</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
