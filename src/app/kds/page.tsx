'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KitchenDisplayView } from '@/components/kitchen/KitchenDisplayView';

export default function KdsTabMinimalPage() {
  return (
    <DashboardLayout>
      <KitchenDisplayView />
    </DashboardLayout>
  );
}
