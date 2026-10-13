'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { HotelFinanceView } from '@/components/finance/HotelFinanceView';

export default function FinancePage() {
  return (
    <DashboardLayout>
      <HotelFinanceView />
    </DashboardLayout>
  );
}

