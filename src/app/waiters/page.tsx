'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WaiterManagementView } from '@/components/waiters/WaiterManagementView';

export default function WaitersPage() {
  return (
    <DashboardLayout>
      <WaiterManagementView />
    </DashboardLayout>
  );
}
