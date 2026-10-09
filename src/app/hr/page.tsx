'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StaffHrView } from '@/components/hr/StaffHrView';

export default function HrPage() {
  return (
    <DashboardLayout>
      <StaffHrView />
    </DashboardLayout>
  );
}

