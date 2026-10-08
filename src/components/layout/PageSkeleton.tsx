'use client';

import React from 'react';

interface PageSkeletonProps {
  pathname: string;
}

export function PageSkeleton({ pathname }: PageSkeletonProps) {
  if (pathname === '/pos') {
    return (
      <div className="flex-1 flex flex-col gap-4 overflow-hidden w-full">
        {/* Active Unpaid Orders Bar Skeleton */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-amber-500/10 flex flex-col gap-2 shrink-0">
          <div className="flex justify-between items-center">
            <div className="w-48 h-5 rounded-md shimmer-skeleton" />
            <div className="w-32 h-5 rounded-md shimmer-skeleton" />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 w-52 rounded-xl shimmer-skeleton shrink-0" />
            ))}
          </div>
        </div>

        {/* POS Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Menu Selection (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden bg-slate-900/60 p-5 rounded-2xl border border-amber-500/10">
            {/* Search & Categories */}
            <div className="flex justify-between items-center gap-4">
              <div className="w-72 h-10 rounded-xl shimmer-skeleton" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-20 h-9 rounded-xl shimmer-skeleton" />
                ))}
              </div>
            </div>

            {/* Menu Items Cards Grid (matching exact 165px card geometry) */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 auto-rows-[165px]">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-[165px] rounded-2xl p-3.5 border border-slate-800/80 bg-slate-950/60 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="w-16 h-4 rounded-md shimmer-skeleton" />
                    <div className="w-8 h-4 rounded-md shimmer-skeleton" />
                  </div>
                  <div className="space-y-1.5 my-auto">
                    <div className="w-3/4 h-4 rounded shimmer-skeleton" />
                    <div className="w-1/2 h-3 rounded shimmer-skeleton" />
                  </div>
                  <div className="pt-2.5 border-t border-slate-800/60 flex justify-between items-center">
                    <div className="w-16 h-5 rounded shimmer-skeleton" />
                    <div className="w-8 h-8 rounded-xl shimmer-skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Order Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col bg-slate-900/60 p-5 rounded-2xl border border-amber-500/10 gap-4">
            <div className="w-44 h-6 rounded-md shimmer-skeleton" />
            <div className="w-full h-10 rounded-xl shimmer-skeleton" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 rounded-xl shimmer-skeleton" />
              <div className="h-9 rounded-xl shimmer-skeleton" />
            </div>
            <div className="flex-1 space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl shimmer-skeleton" />
              ))}
            </div>
            <div className="h-12 rounded-xl shimmer-skeleton mt-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (pathname === '/daily-report' || pathname === '/reports') {
    return (
      <div className="flex-1 flex flex-col gap-6 overflow-hidden w-full">
        {/* Reports Header Skeleton */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/60">
          <div className="space-y-2">
            <div className="w-56 h-7 rounded-lg shimmer-skeleton" />
            <div className="w-72 h-4 rounded shimmer-skeleton" />
          </div>
          <div className="w-40 h-10 rounded-xl shimmer-skeleton" />
        </div>

        {/* 4 Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <div className="w-24 h-4 rounded shimmer-skeleton" />
                <div className="w-8 h-8 rounded-xl shimmer-skeleton" />
              </div>
              <div className="w-32 h-8 rounded-lg shimmer-skeleton" />
            </div>
          ))}
        </div>

        {/* Reports Analytics Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
            <div className="w-48 h-6 rounded shimmer-skeleton" />
            <div className="flex-1 rounded-xl shimmer-skeleton min-h-[220px]" />
          </div>
          <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
            <div className="w-40 h-6 rounded shimmer-skeleton" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 rounded-xl shimmer-skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default Skeleton for other pages (Admin, Menu, Inventory, Orders, Waiters)
  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden w-full">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800/60">
        <div className="space-y-2">
          <div className="w-52 h-7 rounded-lg shimmer-skeleton" />
          <div className="w-64 h-4 rounded shimmer-skeleton" />
        </div>
        <div className="w-36 h-10 rounded-xl shimmer-skeleton" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-28 h-4 rounded shimmer-skeleton" />
            <div className="w-20 h-7 rounded shimmer-skeleton" />
          </div>
        ))}
      </div>

      <div className="flex-1 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 rounded-xl shimmer-skeleton" />
        ))}
      </div>
    </div>
  );
}
