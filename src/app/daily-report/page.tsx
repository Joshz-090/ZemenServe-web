'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DailyReportView } from '@/components/reports/DailyReportView';

export default function DailyReportPage() {
  return (
    <DashboardLayout>
      <DailyReportView />
    </DashboardLayout>
  );
}
