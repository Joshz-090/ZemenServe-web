'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LoginPage } from '@/components/auth/LoginPage';
import { store } from '@/lib/store';
import {
  ShoppingBag,
  ChefHat,
  Package,
  BarChart3,
  Receipt,
  Users,
  Utensils,
  ShieldCheck,
  Clock,
  Flame,
  ChevronRight,
  Menu as MenuIcon,
  X,
  ExternalLink,
  Sparkles,
  LogOut
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Check active session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      router.push('/');
    }
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    const syncDatabaseData = async () => {
      try {
        const fetches: Promise<any>[] = [];

        if (pathname === '/pos') {
          fetches.push(store.fetchOrdersFromDB(), store.fetchMenuFromDB(), store.fetchIngredientsFromDB());
        } else if (pathname === '/menu') {
          fetches.push(store.fetchMenuFromDB());
        } else if (pathname === '/inventory') {
          fetches.push(store.fetchIngredientsFromDB(), store.fetchLogsFromDB());
        } else if (pathname === '/daily-report' || pathname === '/reports') {
          fetches.push(store.fetchOrdersFromDB(), store.fetchAuditLogsFromDB());
        } else if (pathname === '/orders') {
          fetches.push(store.fetchOrdersFromDB());
        } else if (pathname === '/waiters') {
          fetches.push(store.fetchWaitersFromDB(), store.fetchOrdersFromDB());
        } else if (pathname === '/admin') {
          fetches.push(store.fetchAuditLogsFromDB(), store.fetchMenuFromDB());
        } else if (pathname === '/kds' || pathname === '/kitchen') {
          fetches.push(store.fetchOrdersFromDB());
        } else {
          fetches.push(store.fetchOrdersFromDB(), store.fetchMenuFromDB());
        }

        await Promise.allSettled(fetches);
      } catch {
        // Silently handle any network errors during background sync
      }
    };

    const updateStats = () => {
      const orders = store.getOrders();
      setPendingOrdersCount(orders.filter((o) => o.status === 'Pending' || o.status === 'Preparing').length);
      const ingredients = store.getIngredients();
      setLowStockCount(ingredients.filter((i) => i.stockQuantity <= i.lowStockThreshold).length);
    };

    syncDatabaseData();
    updateStats();
    const unsubscribe = store.subscribe(updateStats);
    const dbPollInterval = setInterval(syncDatabaseData, 8000);

    return () => {
      unsubscribe();
      clearInterval(timer);
      clearInterval(dbPollInterval);
    };
  }, [pathname]);

  // Role-based Route Access Control & Automatic Redirection Guard
  useEffect(() => {
    if (!authLoading && currentUser) {
      const role = currentUser.role;
      if (role === 'Cashier') {
        const allowed = ['/pos', '/menu', '/inventory', '/daily-report', '/reports', '/orders'];
        if (!allowed.includes(pathname)) {
          router.replace('/pos');
        }
      } else if (role === 'Chef') {
        const allowed = ['/kitchen', '/kds'];
        if (!allowed.includes(pathname)) {
          router.replace('/kitchen');
        }
      } else if (role === 'Waiter') {
        const allowed = ['/waiters', '/menu', '/orders'];
        if (!allowed.includes(pathname)) {
          router.replace('/waiters');
        }
      }
    }
  }, [authLoading, currentUser, pathname, router]);

  // If not logged in and auth finished, display the Login Page
  if (!authLoading && !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'Chef') router.push('/kitchen');
          else if (user.role === 'Waiter') router.push('/waiters');
          else router.push('/pos');
        }}
      />
    );
  }

  const isCurrent = (path: string) => {
    if (path === '/daily-report' || path === '/reports') {
      return pathname === '/daily-report' || pathname === '/reports';
    }
    return pathname === path;
  };

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#070a12] text-slate-100 flex font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-amber-500/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg text-slate-950 font-black">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-100 leading-none">
              Zemen<span className="text-amber-400">Serve</span>
            </h1>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Hotel System</p>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-amber-400"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </div>

      {/* Persistent Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 bottom-0 z-40 w-72 h-screen bg-slate-950/95 backdrop-blur-2xl border-r border-amber-500/15 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isSidebarOpen ? 'pt-16 lg:pt-0' : ''}`}
      >
        {/* SIDEBAR HEADER */}
        <div className="p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/40 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/25 text-slate-950 font-black">
              <Flame className="w-7 h-7 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black tracking-tight text-slate-100">
                  Zemen<span className="text-amber-400">Serve</span>
                </h1>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-amber-400/90 font-bold tracking-wide flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3" /> Production Web App
              </p>
            </div>
          </div>

          {/* System Date & Time Status Card */}
          <div className="mt-4 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2.5 text-amber-400">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-200 leading-tight">{timeStr || '--:--:--'}</span>
                <span className="text-[9px] text-slate-400 font-medium leading-tight">{dateStr || 'Loading date...'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live System</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION ITEMS */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
          {/* Main Operations */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Main Operations
            </div>
            <nav className="space-y-1">
              {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Cashier' || !currentUser) && (
                <Link
                  href="/pos"
                  onClick={closeSidebarOnMobile}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    isCurrent('/pos')
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Cashier POS</span>
                  </div>
                  {isCurrent('/pos') && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              )}

              {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Waiter') && (
                <Link
                  href="/menu"
                  onClick={closeSidebarOnMobile}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    isCurrent('/menu')
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Utensils className="w-4 h-4" />
                    <span>Digital Menu</span>
                  </div>
                  {isCurrent('/menu') && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              )}

              {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Chef' || currentUser?.role === 'Cashier') && (
                <Link
                  href="/inventory"
                  onClick={closeSidebarOnMobile}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    isCurrent('/inventory')
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4" />
                    <span>Inventory {currentUser?.role === 'Cashier' && '(Read-Only)'}</span>
                  </div>
                  {lowStockCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </Link>
              )}

              {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Cashier') && (
                <Link
                  href="/daily-report"
                  onClick={closeSidebarOnMobile}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    isCurrent('/daily-report') || isCurrent('/reports')
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4" />
                    <span>Daily Reports {currentUser?.role === 'Cashier' && '(Read-Only)'}</span>
                  </div>
                  {(isCurrent('/daily-report') || isCurrent('/reports')) && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              )}
            </nav>
          </div>

          {/* Secondary Management */}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Waiter') && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Management & Operations
              </div>
              <nav className="space-y-1">
                <Link
                  href="/orders"
                  onClick={closeSidebarOnMobile}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    isCurrent('/orders')
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="w-4 h-4" />
                    <span>Orders Log</span>
                  </div>
                </Link>

                <Link
                  href="/waiters"
                  onClick={closeSidebarOnMobile}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    isCurrent('/waiters')
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" />
                    <span>Waiters</span>
                  </div>
                </Link>

                {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                  <Link
                    href="/admin"
                    onClick={closeSidebarOnMobile}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                      isCurrent('/admin')
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 font-black'
                        : 'text-amber-400/90 border-amber-500/20 hover:bg-amber-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin Control</span>
                    </div>
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>

        {/* LOGGED IN USER PROFILE & CHEF APP ENDPOINT CARD */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 space-y-2">
          {/* User Badge */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-100 truncate">{currentUser?.name || 'User'}</p>
                <p className="text-[10px] text-amber-400 font-medium truncate">{currentUser?.role || 'Staff'} • @{currentUser?.username || 'user'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Chef Kitchen Endpoint Card - ONLY VISIBLE TO Admin, Manager, Chef */}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Chef') && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-slate-200">Chef Kitchen Endpoint</span>
                </div>
                {pendingOrdersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
                    {pendingOrdersCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Independent view for kitchen display screens & chef bump-bars.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/kitchen"
                  className="px-2.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all text-[11px] font-black flex items-center justify-center gap-1 shadow-md shadow-amber-500/20"
                >
                  <span>Chef Endpoint</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  href="/kds"
                  onClick={closeSidebarOnMobile}
                  className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    isCurrent('/kds')
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span>In-Tab KDS</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 flex flex-col pt-20 lg:pt-8 overflow-y-auto">
        {authLoading ? (
          <div className="flex flex-col gap-6 animate-pulse">
            {/* Main Content Skeleton */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
              <div className="space-y-2">
                <div className="w-48 h-7 rounded-lg bg-slate-800/80" />
                <div className="w-64 h-4 rounded bg-slate-800/50" />
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-32 h-10 rounded-xl bg-slate-900 border border-slate-800" />
                <div className="w-32 h-10 rounded-xl bg-slate-900 border border-slate-800" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4 flex flex-col justify-between">
                  <div className="w-full h-28 rounded-xl bg-slate-800/50" />
                  <div className="space-y-2">
                    <div className="w-3/4 h-4 rounded bg-slate-800/80" />
                    <div className="w-1/2 h-3 rounded bg-slate-800/50" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="w-20 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30" />
                    <div className="w-8 h-8 rounded-xl bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                currentUser,
                userRole: currentUser?.role,
              });
            }
            return child;
          })
        )}
      </main>
    </div>
  );
}
