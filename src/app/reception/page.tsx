'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FrontDeskView } from '@/components/reception/FrontDeskView';

export default function ReceptionPage() {
  return (
    <DashboardLayout>
      <FrontDeskView />
    </DashboardLayout>
  );
}

