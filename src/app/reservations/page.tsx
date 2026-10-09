'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReservationsView } from '@/components/reservations/ReservationsView';

export default function ReservationsPage() {
  return (
    <DashboardLayout>
      <ReservationsView />
    </DashboardLayout>
  );
}

