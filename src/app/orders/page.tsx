'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrderHistoryView } from '@/components/orders/OrderHistoryView';

export default function OrdersPage() {
  return (
    <DashboardLayout>
      <OrderHistoryView />
    </DashboardLayout>
  );
}
