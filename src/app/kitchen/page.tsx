'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KitchenDisplayView } from '@/components/kitchen/KitchenDisplayView';
import { ChefHat, Monitor, Clock, LogOut, Sparkles } from 'lucide-react';

export default function KitchenPage() {
  const router = useRouter();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Bar for Dedicated Kitchen View */}
      <header className="bg-slate-950/95 backdrop-blur-xl border-b border-amber-500/20 px-6 py-3 sticky top-0 z-40 print:hidden flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950 font-black">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-100">
                Zemen<span className="text-amber-400">Chef</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                Live Kitchen Display
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Dedicated Kitchen Display Screen & Bump-Bar Endpoint
            </p>
          </div>
        </div>

        {/* Header Right Actions: Live Date/Time & Logout */}
        <div className="flex items-center gap-4">
          {/* Live Date & Time Status Card */}
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-sans">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-100 leading-tight">{timeStr || '--:--:--'}</span>
              <span className="text-[9px] text-slate-400 font-medium leading-tight">{dateStr || 'Loading date...'}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
            <Monitor className="w-4 h-4 text-amber-400" />
            <span>KDS Mode</span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-800 text-slate-300 transition-all text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            title="Sign Out of Kitchen Endpoint"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Kitchen Content */}
      <main className="p-6 flex-1 flex flex-col">
        <KitchenDisplayView />
      </main>
    </div>
  );
}
