'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { HousekeepingView } from '@/components/housekeeping/HousekeepingView';

export default function HousekeepingPage() {
  return (
    <DashboardLayout>
      <HousekeepingView />
    </DashboardLayout>
  );
}

