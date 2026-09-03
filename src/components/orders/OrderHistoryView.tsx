'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { Order, OrderStatus } from '@/lib/types';
import { Receipt, Search, Printer, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

export function OrderHistoryView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const updateOrders = () => setOrders(store.getOrders());
    updateOrders();
    const unsubscribe = store.subscribe(updateOrders);
    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    const matchesSearch =
      order.id.toString().includes(searchQuery) ||
      (order.waiterName && order.waiterName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.cashierNote && order.cashierNote.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-140px)] bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100">ORDER AUDIT & HISTORY</h1>
            <p className="text-xs text-slate-400">Complete log of all cashier and kitchen transactions</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search Order # or waiter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready">Ready</option>
            <option value="Served">Served</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Server / Waiter</th>
                <th className="py-3.5 px-4">Note / Table</th>
                <th className="py-3.5 px-4">Items Count</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-900/40">
                  <td className="py-3.5 px-4 font-black text-amber-400">#{order.id}</td>
                  <td className="py-3.5 px-4 text-slate-400">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{order.waiterName || 'Cashier'}</td>
                  <td className="py-3.5 px-4 text-slate-300 italic">{order.cashierNote || '-'}</td>
                  <td className="py-3.5 px-4 font-bold">{order.orderItems.length} items</td>
                  <td className="py-3.5 px-4 font-black text-slate-100">{order.totalAmount.toFixed(2)} ETB</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold border ${
                        order.status === 'Pending'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : order.status === 'Preparing'
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                          : order.status === 'Ready'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="py-1.5 px-3 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs inline-flex items-center gap-1 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Order Receipt Dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-100"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-amber-400 mb-1">Receipt for Order #{selectedOrder.id}</h2>
            <p className="text-xs text-slate-400 mb-4">{new Date(selectedOrder.createdAt).toLocaleString()}</p>

            <div className="py-3 border-y border-slate-800 space-y-2 text-xs">
              {selectedOrder.orderItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.menuItemName} x{item.quantity}</span>
                  <span className="font-bold">{(item.quantity * item.unitPriceAtSale).toFixed(2)} ETB</span>
                </div>
              ))}
            </div>

            <div className="pt-3 text-right">
              <span className="text-xs text-slate-400">Total:</span>
              <span className="text-lg font-black text-amber-400 ml-2">{selectedOrder.totalAmount.toFixed(2)} ETB</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
