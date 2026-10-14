'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LoginPage } from '@/components/auth/LoginPage';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
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
  LogOut,
  Key,
  Calendar,
  DollarSign,
  Building,
  Bed
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Module-Level User Cache for Instant 0ms Sidebar Hydration across routes
let cachedUserSession: any = null;

const getCachedUser = () => {
  if (cachedUserSession) return cachedUserSession;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('zemenserve_session_user');
      if (stored) {
        cachedUserSession = JSON.parse(stored);
        return cachedUserSession;
      }
    } catch {}
  }
  return null;
};

const setCachedUser = (user: any) => {
  cachedUserSession = user;
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        sessionStorage.setItem('zemenserve_session_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('zemenserve_session_user');
      }
    } catch {}
  }
};

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  isExpanded: boolean;
  badge?: React.ReactNode;
  badgeDot?: boolean;
  onNavigate: () => void;
}

function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active,
  isExpanded,
  badge,
  badgeDot,
  onNavigate,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={!isExpanded ? label : undefined}
      className={`group/item relative h-10 w-full rounded-xl text-xs font-bold transition-all duration-200 flex items-center px-2.5 overflow-hidden ${
        active
          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-black'
          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
      }`}
    >
      {/* Fixed Icon Container - Never shifts, never resizes */}
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
        {badgeDot && !isExpanded && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
        )}
      </div>

      {/* Label Text - Smooth sliding and fade-in without wrapping */}
      <span
        className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-w-44 opacity-100 ml-3 translate-x-0'
            : 'max-w-0 opacity-0 ml-0 -translate-x-2 pointer-events-none'
        }`}
      >
        {label}
      </span>

      {/* Trailing Badge or Active Indicator */}
      <div
        className={`ml-auto shrink-0 flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-w-16 opacity-100 translate-x-0'
            : 'max-w-0 opacity-0 translate-x-2 pointer-events-none'
        }`}
      >
        {badge ? (
          badge
        ) : active ? (
          <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
        ) : null}
      </div>
    </Link>
  );
}

function SidebarSectionHeader({ title, isExpanded }: { title: string; isExpanded: boolean }) {
  return (
    <div className="pt-2 pb-1 overflow-hidden">
      <div
        className={`whitespace-nowrap transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-w-48 opacity-100 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500'
            : 'max-w-full opacity-100 mx-2 border-t border-slate-800/80'
        }`}
      >
        {isExpanded ? title : null}
      </div>
    </div>
  );
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
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isExpanded = isMobile ? isSidebarOpen : isSidebarHovered;

  // Check active session on mount
  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setCurrentUser(cached);
      setAuthLoading(false);
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.user) {
            setCachedUser(data.user);
            setCurrentUser(data.user);
          } else {
            setCachedUser(null);
            setCurrentUser(null);
          }
        } else {
          setCachedUser(null);
          setCurrentUser(null);
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
      setCachedUser(null);
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
      if (role === 'Admin' || role === 'Manager') {
        if (pathname === '/') {
          router.replace('/admin');
        }
      } else if (role === 'Receptionist') {
        const allowed = ['/reception', '/reservations', '/events'];
        if (!allowed.includes(pathname)) {
          router.replace('/reception');
        }
      } else if (role === 'Housekeeper') {
        const allowed = ['/reception'];
        if (!allowed.includes(pathname)) {
          router.replace('/reception');
        }
      } else if (role === 'Accountant') {
        const allowed = ['/daily-report', '/reports', '/orders'];
        if (!pathname.startsWith('/finance') && !allowed.includes(pathname)) {
          router.replace('/finance');
        }
      } else if (role === 'Cashier') {
        const allowed = ['/pos', '/menu', '/inventory', '/daily-report', '/reports', '/orders', '/reception'];
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

  // 1. Display a sleek branded loading screen while verifying session against server (NEVER flash UI)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070a12] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 animate-pulse flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black tracking-widest text-slate-200 uppercase">ZemenServe ERP</h2>
          <p className="text-xs text-slate-500 font-medium">Verifying secure authentication...</p>
        </div>
      </div>
    );
  }

  // 2. Display Login Page if user is unauthenticated
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCachedUser(user);
          setCurrentUser(user);
          if (user.role === 'Admin' || user.role === 'Manager') router.push('/admin');
          else if (user.role === 'Cashier') router.push('/pos');
          else if (user.role === 'Chef') router.push('/kitchen');
          else if (user.role === 'Waiter') router.push('/waiters');
          else if (user.role === 'Housekeeper') router.push('/reception');
          else if (user.role === 'Receptionist') router.push('/reception');
          else if (user.role === 'Accountant') router.push('/finance');
          else router.push('/admin');
        }}
      />
    );
  }

  const isCurrent = (path: string) => {
    if (path === '/daily-report' || path === '/reports') {
      return pathname === '/daily-report' || pathname === '/reports';
    }
    if (path === '/finance') {
      return pathname.startsWith('/finance');
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

      {/* Desktop Spacer so page layout stays anchored and never shifts */}
      <div className="hidden lg:block w-[72px] shrink-0" />

      {/* Persistent Mini/Expanded Sidebar */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`fixed top-0 left-0 bottom-0 z-40 h-screen bg-slate-950/95 backdrop-blur-2xl border-r border-amber-500/15 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isExpanded
            ? 'w-72 shadow-2xl shadow-black/90 border-r-amber-500/30'
            : 'w-72 lg:w-[72px]'
        } ${isSidebarOpen ? 'pt-16 lg:pt-0' : ''}`}
      >
        {/* SIDEBAR HEADER */}
        <div className="h-16 px-3 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/40 to-transparent flex items-center overflow-hidden shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/20 text-slate-950 font-black flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div
            className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded
                ? 'max-w-48 opacity-100 ml-3 translate-x-0'
                : 'max-w-0 opacity-0 ml-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-slate-100">
                Zemen<span className="text-amber-400">Serve</span>
              </h1>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-amber-400/90 font-bold tracking-wide flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3" /> Hotel ERP System
            </p>
          </div>
        </div>

        {/* System Date & Time Status Bar */}
        <div className="px-2.5 pt-3 pb-1 shrink-0">
          <div
            className={`rounded-xl border border-slate-800/80 bg-slate-900/60 transition-all duration-300 ease-in-out overflow-hidden flex items-center ${
              isExpanded ? 'h-11 px-2.5 justify-between' : 'h-9 px-0 justify-center'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 flex items-center justify-center shrink-0 text-amber-400">
                <Clock className="w-4 h-4 shrink-0" />
              </div>
              <div
                className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${
                  isExpanded
                    ? 'max-w-36 opacity-100 translate-x-0'
                    : 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
                }`}
              >
                <span className="text-[11px] font-bold text-slate-200 leading-tight">{timeStr || '--:--:--'}</span>
                <span className="text-[9px] text-slate-400 font-medium leading-tight">{dateStr || 'System Time'}</span>
              </div>
            </div>

            <div
              className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-w-16 opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION ITEMS */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4 no-scrollbar">
          {/* Executive Console (Visible to Admin & Manager) */}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
            <div>
              <SidebarSectionHeader title="Executive Management" isExpanded={isExpanded} />
              <nav className="space-y-1">
                <SidebarNavItem
                  href="/admin"
                  label="Admin Dashboard"
                  icon={ShieldCheck}
                  active={isCurrent('/admin')}
                  isExpanded={isExpanded}
                  onNavigate={closeSidebarOnMobile}
                />
              </nav>
            </div>
          )}

          {/* Front Office & Rooms */}
          <div>
            <SidebarSectionHeader title="Front Office & Rooms" isExpanded={isExpanded} />
            <nav className="space-y-1">
              <SidebarNavItem
                href="/reception"
                label="Reception Desk"
                icon={Key}
                active={isCurrent('/reception')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/reservations"
                label="Reservations Grid"
                icon={Calendar}
                active={isCurrent('/reservations')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
            </nav>
          </div>

          {/* Restaurant & Bar POS */}
          <div>
            <SidebarSectionHeader title="Restaurant & Dining POS" isExpanded={isExpanded} />
            <nav className="space-y-1">
              <SidebarNavItem
                href="/pos"
                label="Cashier POS"
                icon={ShoppingBag}
                active={isCurrent('/pos')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/kitchen"
                label="Kitchen Display (KDS)"
                icon={ChefHat}
                active={isCurrent('/kitchen') || isCurrent('/kds')}
                isExpanded={isExpanded}
                badge={
                  pendingOrdersCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
                      {pendingOrdersCount}
                    </span>
                  ) : undefined
                }
                badgeDot={pendingOrdersCount > 0}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/menu"
                label="Digital Menu"
                icon={Utensils}
                active={isCurrent('/menu')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/orders"
                label="Orders Log"
                icon={Receipt}
                active={isCurrent('/orders')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
            </nav>
          </div>

          {/* Hotel ERP & Management */}
          <div>
            <SidebarSectionHeader title="Hotel ERP & Management" isExpanded={isExpanded} />
            <nav className="space-y-1">
              <SidebarNavItem
                href="/finance"
                label="Finance & Ledger"
                icon={DollarSign}
                active={isCurrent('/finance')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/events"
                label="Events & Halls"
                icon={Building}
                active={isCurrent('/events')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/hr"
                label="Staff & HR"
                icon={Users}
                active={isCurrent('/hr')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/inventory"
                label="Inventory Stock"
                icon={Package}
                active={isCurrent('/inventory')}
                isExpanded={isExpanded}
                badge={
                  lowStockCount > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  ) : undefined
                }
                badgeDot={lowStockCount > 0}
                onNavigate={closeSidebarOnMobile}
              />
              <SidebarNavItem
                href="/daily-report"
                label="Daily Reports"
                icon={BarChart3}
                active={isCurrent('/daily-report') || isCurrent('/reports')}
                isExpanded={isExpanded}
                onNavigate={closeSidebarOnMobile}
              />
            </nav>
          </div>
        </div>

        {/* LOGGED IN USER PROFILE */}
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          <div
            className={`rounded-2xl bg-slate-900 border border-slate-800 flex items-center transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? 'h-14 px-2.5 justify-between' : 'h-11 px-0 justify-center'
            }`}
          >
            {/* User Avatar & Info */}
            <div className="flex items-center min-w-0">
              <div
                className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0"
                title={!isExpanded ? `${currentUser?.name || 'User'} (${currentUser?.role || 'Staff'})` : undefined}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div
                className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${
                  isExpanded
                    ? 'max-w-36 opacity-100 ml-2.5 translate-x-0'
                    : 'max-w-0 opacity-0 ml-0 -translate-x-2 pointer-events-none'
                }`}
              >
                <p className="text-xs font-bold text-slate-100 truncate">{currentUser?.name || 'User'}</p>
                <p className="text-[10px] text-amber-400 font-medium truncate">
                  {currentUser?.role || 'Staff'} • @{currentUser?.username || 'user'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <div
              className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-w-10 opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
              }`}
            >
              <button
                onClick={handleLogout}
                className="p-1.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg transition shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 flex flex-col pt-20 lg:pt-8 overflow-y-auto">
        {authLoading ? (
          <PageSkeleton pathname={pathname} />
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
