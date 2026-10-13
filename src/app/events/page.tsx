'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EventManagementView } from '@/components/events/EventManagementView';

export default function EventsPage() {
  return (
    <DashboardLayout>
      <EventManagementView />
    </DashboardLayout>
  );
}

