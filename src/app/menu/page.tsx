'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DigitalMenuManagementView } from '@/components/menu/DigitalMenuManagementView';

export default function MenuPage() {
  return (
    <DashboardLayout>
      <DigitalMenuManagementView />
    </DashboardLayout>
  );
}
