'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { store } from '@/lib/store';
import { MenuItem, Waiter, Order } from '@/lib/types';
import { Search, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, Printer, Utensils, User, Clock, CreditCard, X, Filter, ChevronLeft, ChevronRight, Grid, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

// Module-Level Cache Memory for 0ms instant load
let posMenuCache: MenuItem[] | null = null;
let posWaiterCache: Waiter[] | null = null;
let posActiveOrdersCache: Order[] | null = null;

export function CashierPosView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => posMenuCache || []);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [waiters, setWaiters] = useState<Waiter[]>(() => posWaiterCache || []);
  const [activeOrders, setActiveOrders] = useState<Order[]>(() => posActiveOrdersCache || []);

  // Filter Active Orders by Waiter
  const [selectedWaiterFilter, setSelectedWaiterFilter] = useState<string>('ALL');
  const [showActiveOrdersModal, setShowActiveOrdersModal] = useState<boolean>(false);
  const [activeOrdersModalSearch, setActiveOrdersModalSearch] = useState<string>('');

  // Mode: Creating 'NEW' order vs Appending/Paying 'SELECTED_ACTIVE' order
  const [selectedActiveOrder, setSelectedActiveOrder] = useState<Order | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWaiterId, setSelectedWaiterId] = useState<number>(0);
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [cashierNote, setCashierNote] = useState<string>('');
  
  // Cart state for new items
  const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number }[]>([]);
  
  // Checkout & Receipt Modals state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Telebirr' | 'CBE Birr' | 'Card'>('Cash');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [completedOrderForReceipt, setCompletedOrderForReceipt] = useState<Order | null>(null);

  // Scroll Container Ref for Active Orders Bar
  const activeOrdersScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Synchronize Database Waiters
    store.fetchWaitersFromDB();

    const updateState = () => {
      const items = store.getMenuItems().filter((i) => i.isActive);
      const loadedWaiters = store.getWaiters().filter((w) => w.isActive);
      const loadedActiveOrders = store.getActiveOrders();

      posMenuCache = items;
      posWaiterCache = loadedWaiters;
      posActiveOrdersCache = loadedActiveOrders;

      setMenuItems(items);
      setWaiters(loadedWaiters);
      setActiveOrders(loadedActiveOrders);

      if (loadedWaiters.length > 0 && !selectedWaiterId) {
        setSelectedWaiterId(loadedWaiters[0].id);
      }

      const cats = Array.from(new Set(items.map((i) => i.category)));
      setCategories(['All', ...cats]);
    };

    updateState();
    const unsubscribe = store.subscribe(updateState);
    return () => unsubscribe();
  }, [selectedWaiterId]);

  // Scroll Left / Right for Active Orders track
  const scrollActiveOrdersTrack = (direction: 'left' | 'right') => {
    if (activeOrdersScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      activeOrdersScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // FIFO Sorted Active Orders (Oldest order created first at the front)
  const filteredActiveOrders = useMemo(() => {
    return activeOrders
      .filter((ord) => (selectedWaiterFilter === 'ALL' ? true : ord.waiterName === selectedWaiterFilter))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [activeOrders, selectedWaiterFilter]);

  // Active Orders for Full Modal Grid Search
  const modalGridFilteredOrders = useMemo(() => {
    return filteredActiveOrders.filter((ord) => {
      const noteMatch = (ord.cashierNote || '').toLowerCase().includes(activeOrdersModalSearch.toLowerCase().trim());
      const waiterMatch = (ord.waiterName || '').toLowerCase().includes(activeOrdersModalSearch.toLowerCase().trim());
      const idMatch = ord.id.toString().includes(activeOrdersModalSearch.trim());
      return noteMatch || waiterMatch || idMatch;
    });
  }, [filteredActiveOrders, activeOrdersModalSearch]);

  // Unique Waiters present in active orders for filter pills
  const activeWaitersList = useMemo(() => {
    const waiterNames = Array.from(new Set(activeOrders.map((o) => o.waiterName || 'Staff')));
    return waiterNames;
  }, [activeOrders]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) => (i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItem.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as { menuItem: MenuItem; quantity: number }[]
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((i) => i.menuItem.id !== id));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [cart]);

  // --- HANDLE 1: CREATE NEW ACTIVE ORDER ---
  const handleCreateActiveOrder = () => {
    if (cart.length === 0) return;

    const cartPayload = cart.map((i) => ({ menuItemId: i.menuItem.id, quantity: i.quantity }));
    const note = tableNumber ? `${tableNumber}${cashierNote ? ' - ' + cashierNote : ''}` : cashierNote;
    
    const newOrder = store.createActiveOrder(cartPayload, note, selectedWaiterId, tableNumber);

    setCart([]);
    setCashierNote('');
    setSelectedActiveOrder(newOrder);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  // --- HANDLE 2: APPEND NEW ITEMS TO EXISTING ACTIVE ORDER ---
  const handleAppendItemsToActiveOrder = () => {
    if (!selectedActiveOrder || cart.length === 0) return;

    const cartPayload = cart.map((i) => ({ menuItemId: i.menuItem.id, quantity: i.quantity }));
    const updatedOrder = store.appendOrderItems(selectedActiveOrder.id, cartPayload);

    if (updatedOrder) {
      setSelectedActiveOrder(updatedOrder);
    }
    setCart([]);

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
    });
  };

  // --- HANDLE 3: OPEN PAYMENT CHECKOUT MODAL ---
  const handleOpenPayment = (orderToPay: Order) => {
    setSelectedActiveOrder(orderToPay);
    setCashGiven(orderToPay.totalAmount.toString());
    setShowPaymentModal(true);
    setShowActiveOrdersModal(false);
  };

  // --- HANDLE CANCEL ACTIVE ORDER ---
  const handleCancelOrder = (orderToCancel: Order) => {
    const reason = window.prompt(`Are you sure you want to CANCEL Order #${orderToCancel.id}? Enter reason:`, 'Customer Left / Request');
    if (reason !== null) {
      store.cancelActiveOrder(orderToCancel.id, reason || 'Cancelled by Cashier');
      if (selectedActiveOrder?.id === orderToCancel.id) {
        setSelectedActiveOrder(null);
        setCart([]);
      }
    }
  };

  // --- HANDLE 4: COMPLETE PAYMENT & PRINT RECEIPT ---
  const handleCompletePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActiveOrder) return;

    const completed = store.completeOrderPayment(selectedActiveOrder.id, paymentMethod);
    if (completed) {
      setCompletedOrderForReceipt(completed);
    }

    setShowPaymentModal(false);
    setSelectedActiveOrder(null);
    setCart([]);

    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden w-full">
      {/* ACTIVE UNPAID ORDERS BAR (WITH SCROLL ARROWS & FULL GRID VIEW BUTTON FOR 30+ ORDERS) */}
      <div className="bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-amber-500/20 shadow-xl flex flex-col gap-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
              ACTIVE UNPAID TABLES ({activeOrders.length})
              <span className="text-[10px] font-normal text-slate-400 lowercase">(oldest order first)</span>
            </h3>

            {/* FULL GRID MANAGER BUTTON */}
            <button
              onClick={() => setShowActiveOrdersModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-amber-500/30"
              title="Open full grid view of all active table orders"
            >
              <Grid className="w-3.5 h-3.5" /> All Tables ({activeOrders.length})
            </button>
          </div>

          {/* WAITER FILTER PILLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-amber-400" /> Waiter Filter:
            </span>
            <button
              onClick={() => setSelectedWaiterFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedWaiterFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All Waiters ({activeOrders.length})
            </button>

            {activeWaitersList.map((wName) => {
              const count = activeOrders.filter((o) => o.waiterName === wName).length;
              return (
                <button
                  key={wName}
                  onClick={() => setSelectedWaiterFilter(wName)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedWaiterFilter === wName
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {wName} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE ORDER CARDS TRACK (WITH LEFT/RIGHT SCROLL CONTROLS) */}
        <div className="relative flex items-center">
          {/* Scroll Left Button */}
          <button
            onClick={() => scrollActiveOrdersTrack('left')}
            className="absolute left-0 z-20 p-1.5 rounded-r-xl bg-slate-950/90 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border-r border-y border-amber-500/30 transition shadow-lg cursor-pointer"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={activeOrdersScrollRef}
            className="flex items-center gap-3 overflow-x-auto py-1 px-8 w-full scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-slate-950 scroll-smooth"
          >
            <button
              onClick={() => {
                setSelectedActiveOrder(null);
                setCart([]);
              }}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer min-w-[150px] justify-center ${
                selectedActiveOrder === null
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Plus className="w-4 h-4" /> + New Active Order
            </button>

            {filteredActiveOrders.length === 0 ? (
              <span className="text-xs text-slate-500 italic px-2">No active orders match filter</span>
            ) : (
              filteredActiveOrders.map((ord) => {
                const isSelected = selectedActiveOrder?.id === ord.id;
                const isReadyToServe = ord.status === 'Ready';
                const minutesAgo = Math.floor((new Date().getTime() - new Date(ord.createdAt).getTime()) / 60000);
                return (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setSelectedActiveOrder(ord);
                      setCart([]);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 transition cursor-pointer shrink-0 border min-w-[220px] ${
                      isReadyToServe
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/40 animate-pulse'
                        : isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-xl shadow-amber-500/10'
                        : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isReadyToServe && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                          </span>
                        )}
                        <span className="font-black text-slate-100">#{ord.id}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            isReadyToServe
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isReadyToServe ? 'READY TO SERVE 🔔' : ord.cashierNote || 'Dine-In'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Server: <span className="text-slate-200 font-bold">{ord.waiterName}</span> ({minutesAgo}m)
                      </p>
                    </div>

                    <div className="text-right border-l border-slate-800/80 pl-2.5">
                      <span className="font-mono font-bold text-amber-400 block">{ord.totalAmount.toFixed(2)} ETB</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPayment(ord);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 transition cursor-pointer"
                      >
                        Pay Now
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scrollActiveOrdersTrack('right')}
            className="absolute right-0 z-20 p-1.5 rounded-l-xl bg-slate-950/90 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border-l border-y border-amber-500/30 transition shadow-lg cursor-pointer"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN POS VIEW (GRID LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* LEFT MENU SELECTION (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-amber-500/20 shadow-2xl">
          {/* Search & Category Header */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search food or beverages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm font-medium"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.menuItem.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    inCart
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-amber-500/30 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/10 uppercase tracking-wider">
                        {item.category}
                      </span>
                      {inCart && (
                        <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                          +{inCart.quantity}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-slate-100 group-hover:text-amber-400 transition-colors text-base mb-1">
                      {item.name}
                    </h3>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60">
                    <span className="text-base font-black text-amber-400 tracking-tight">
                      {item.price.toFixed(2)} <span className="text-xs font-normal text-slate-400">ETB</span>
                    </span>
                    <button className="p-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT CART & ORDER SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-2xl p-5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-100 text-base">
                  {selectedActiveOrder ? `Updating Order #${selectedActiveOrder.id}` : 'Create New Active Order'}
                </h2>
                <p className="text-xs text-amber-400 font-semibold">
                  {selectedActiveOrder ? selectedActiveOrder.cashierNote : 'Dine-In Customer Order'}
                </p>
              </div>
            </div>
          </div>

          {/* New Order Waiter (DATABASE WAITERS ONLY) & Table Selection */}
          {!selectedActiveOrder && (
            <div className="py-3 border-b border-slate-800/80 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Assigned Waiter (Database Accounts) *
                </label>
                {waiters.length === 0 ? (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                    No active Waiter staff registered in Database. Add Waiter user in User Management.
                  </div>
                ) : (
                  <select
                    value={selectedWaiterId}
                    onChange={(e) => setSelectedWaiterId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    {waiters.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Table Number *</label>
                  <input
                    type="text"
                    placeholder="Table 4"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Order Note</label>
                  <input
                    type="text"
                    placeholder="Extra Injera"
                    value={cashierNote}
                    onChange={(e) => setCashierNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 placeholder-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE ORDER EXISTING ITEMS SUMMARY */}
          {selectedActiveOrder && (
            <div className="py-2.5 px-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1.5 my-2">
              <div className="flex justify-between items-center text-xs font-bold text-amber-400">
                <span>Existing Order Items (Active):</span>
                <span>{selectedActiveOrder.totalAmount.toFixed(2)} ETB</span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {selectedActiveOrder.orderItems.map((item, idx) => (
                  <div key={`${item.id || idx}-${item.menuItemId || idx}-${idx}`} className="flex justify-between text-xs text-slate-300">
                    <span>
                      {item.menuItemName} ({item.quantity}x)
                    </span>
                    <span className="font-mono">{(item.quantity * item.unitPriceAtSale).toFixed(2)} ETB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cart Item List (Newly Added Items) */}
          <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">
              {selectedActiveOrder ? '+ Add New Items To Order:' : 'Order Items:'}
            </p>
            {cart.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Utensils className="w-8 h-8 mb-2 stroke-1 opacity-40 text-amber-500" />
                <p className="text-xs font-medium">No new items added to cart</p>
              </div>
            ) : (
              cart.map(({ menuItem, quantity }) => (
                <div
                  key={menuItem.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800"
                >
                  <div className="flex-1 pr-2">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{menuItem.name}</h4>
                    <p className="text-xs text-amber-400 font-semibold mt-0.5">
                      {(menuItem.price * quantity).toFixed(2)} ETB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(menuItem.id, -1)}
                        className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-100">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(menuItem.id, 1)}
                        className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(menuItem.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Total & Checkout Footer */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between text-base font-black text-amber-400 pt-1">
                <span>Total Bill Amount:</span>
                <span>
                  {((selectedActiveOrder ? selectedActiveOrder.totalAmount : 0) + cartTotal).toFixed(2)} ETB
                </span>
              </div>
            </div>

            {selectedActiveOrder ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    disabled={cart.length === 0}
                    onClick={handleAppendItemsToActiveOrder}
                    className="flex-1 py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    + Add Items to Order
                  </button>
                  <button
                    onClick={() => handleOpenPayment(selectedActiveOrder)}
                    className="flex-1 py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Pay & Close Order
                  </button>
                </div>
                <button
                  onClick={() => handleCancelOrder(selectedActiveOrder)}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-400" /> Cancel Active Order #{selectedActiveOrder.id}
                </button>
              </div>
            ) : (
              <button
                disabled={cart.length === 0}
                onClick={handleCreateActiveOrder}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs tracking-wide shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> CREATE ACTIVE UNPAID ORDER
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FULL ACTIVE TABLES GRID MANAGER MODAL (HANDLES 30+ CONCURRENT ORDERS EASILY) */}
      {showActiveOrdersModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col">
            <button onClick={() => setShowActiveOrdersModal(false)} className="absolute right-5 top-5 text-slate-400 hover:text-slate-100">
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pr-8">
              <div>
                <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                  <Grid className="w-6 h-6 text-amber-400" /> Active Tables Manager ({activeOrders.length})
                </h2>
                <p className="text-xs text-slate-400">View, search, update items, or collect payment for open tables</p>
              </div>

              {/* Modal Search Input */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search table, order #, or server..."
                  value={activeOrdersModalSearch}
                  onChange={(e) => setActiveOrdersModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Grid of Active Tables */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {modalGridFilteredOrders.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm italic">
                  No active orders match search query &quot;{activeOrdersModalSearch}&quot;
                </div>
              ) : (
                modalGridFilteredOrders.map((ord) => {
                  const minutesAgo = Math.floor((new Date().getTime() - new Date(ord.createdAt).getTime()) / 60000);
                  return (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-black text-amber-400 font-mono">#{ord.id}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {ord.cashierNote || 'Dine-In'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 space-y-0.5">
                          <p>Server: <span className="font-bold text-slate-100">{ord.waiterName}</span></p>
                          <p className="text-[11px] text-slate-400">Created: {minutesAgo} min ago ({new Date(ord.createdAt).toLocaleTimeString()})</p>
                        </div>

                        <div className="pt-2 border-t border-slate-900 text-xs space-y-1 max-h-24 overflow-y-auto">
                          {ord.orderItems.map((i, idx) => (
                            <div key={`${i.id || idx}-${i.menuItemId || idx}-${idx}`} className="flex justify-between text-slate-300 text-[11px]">
                              <span>{i.menuItemName} ({i.quantity}x)</span>
                              <span className="font-mono text-slate-400">{(i.quantity * i.unitPriceAtSale).toFixed(2)} ETB</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-base font-black text-amber-400 font-mono">
                          {ord.totalAmount.toFixed(2)} ETB
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleCancelOrder(ord)}
                            className="px-2 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 font-bold text-xs transition cursor-pointer"
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setSelectedActiveOrder(ord);
                              setCart([]);
                              setShowActiveOrdersModal(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition cursor-pointer"
                          >
                            Add Items
                          </button>
                          <button
                            onClick={() => handleOpenPayment(ord)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition cursor-pointer shadow-md shadow-emerald-500/20"
                          >
                            Pay
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT & RECEIPT CHECKOUT MODAL */}
      {showPaymentModal && selectedActiveOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button onClick={() => setShowPaymentModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-100">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-100 mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" /> Complete Payment & Checkout
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Order #{selectedActiveOrder.id} ({selectedActiveOrder.cashierNote}) — Server: {selectedActiveOrder.waiterName}
            </p>

            <form onSubmit={handleCompletePaymentSubmit} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400">Total Amount Due:</span>
                <span className="text-xl font-black text-amber-400">{selectedActiveOrder.totalAmount.toFixed(2)} ETB</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Cash', 'Telebirr', 'CBE Birr', 'Card'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Cash' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Cash Given (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                  <div className="mt-2 flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Change Due:</span>
                    <span className="text-emerald-400 font-bold">
                      {Math.max(0, (parseFloat(cashGiven) || 0) - selectedActiveOrder.totalAmount).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Pay & Close Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {completedOrderForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 print:border-none print:shadow-none print:bg-white print:text-black">
            <button
              onClick={() => setCompletedOrderForReceipt(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Content Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-700 print:border-slate-300">
              <h2 className="text-xl font-black text-amber-400 tracking-wider print:text-black">ZEMENSERVE</h2>
              <p className="text-xs text-slate-400 print:text-slate-600 font-medium">Hotel & Restaurant Management POS</p>
              <p className="text-xs text-slate-500 print:text-slate-500 mt-1">Addis Ababa, Ethiopia | TEL: +251 911 000 000</p>
            </div>

            {/* Receipt Meta */}
            <div className="py-3 border-b border-dashed border-slate-700 print:border-slate-300 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-600">Order #:</span>
                <span className="font-bold text-amber-400 print:text-black">#{completedOrderForReceipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-600">Date/Time:</span>
                <span>{new Date(completedOrderForReceipt.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-600">Waiter / Server:</span>
                <span>{completedOrderForReceipt.waiterName}</span>
              </div>
              {completedOrderForReceipt.cashierNote && (
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Note / Table:</span>
                  <span className="font-semibold text-amber-300 print:text-black">{completedOrderForReceipt.cashierNote}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-700 print:border-slate-300 text-xs space-y-2 max-h-48 overflow-y-auto">
              <div className="flex justify-between font-bold text-slate-400 print:text-slate-600">
                <span>ITEM</span>
                <span>QTY x PRICE</span>
                <span>AMOUNT</span>
              </div>
              {completedOrderForReceipt.orderItems.map((item, idx) => (
                <div key={`${item.id || idx}-${item.menuItemId || idx}-${idx}`} className="flex justify-between items-center text-slate-200 print:text-black">
                  <span className="font-medium">{item.menuItemName}</span>
                  <span className="text-slate-400 print:text-slate-600">
                    {item.quantity} x {item.unitPriceAtSale.toFixed(2)}
                  </span>
                  <span className="font-bold">{(item.quantity * item.unitPriceAtSale).toFixed(2)} ETB</span>
                </div>
              ))}
            </div>

            {/* Receipt Totals */}
            <div className="py-3 border-b border-dashed border-slate-700 print:border-slate-300 text-sm space-y-1.5">
              <div className="flex justify-between font-black text-lg text-amber-400 print:text-black">
                <span>TOTAL PAID:</span>
                <span>{completedOrderForReceipt.totalAmount.toFixed(2)} ETB</span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="pt-4 text-center text-xs text-slate-400 print:text-slate-600 space-y-1">
              <p className="font-medium">Ameseginalehu! Thank you for dining with us!</p>
              <p className="text-[10px] text-slate-500">ZemenServe POS System</p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-amber-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Customer Receipt
              </button>
              <button
                onClick={() => setCompletedOrderForReceipt(null)}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
