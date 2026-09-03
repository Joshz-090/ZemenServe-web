'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';

export default function AdminPage() {
  return (
    <DashboardLayout>
      <AdminDashboardView />
    </DashboardLayout>
  );
}
