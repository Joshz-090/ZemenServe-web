'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CashierPosView } from '@/components/pos/CashierPosView';

export default function PosPage() {
  return (
    <DashboardLayout>
      <CashierPosView />
    </DashboardLayout>
  );
}
