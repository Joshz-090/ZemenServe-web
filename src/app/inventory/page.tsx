'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InventoryManagementView } from '@/components/inventory/InventoryManagementView';

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <InventoryManagementView />
    </DashboardLayout>
  );
}
