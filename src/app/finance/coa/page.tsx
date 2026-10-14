'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { HotelFinanceView } from '@/components/finance/HotelFinanceView';

export default function FinanceCoaPage() {
  return (
    <DashboardLayout>
      <HotelFinanceView initialTab="coa" />
    </DashboardLayout>
  );
}
