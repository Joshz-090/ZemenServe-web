'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { CashierPosView } from '@/components/pos/CashierPosView';
import { PageSkeleton } from '@/components/layout/PageSkeleton';

interface RootPageContentProps {
  currentUser?: any;
  userRole?: string;
}

function RootPageContent({ userRole }: RootPageContentProps) {
  const router = useRouter();

  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'Admin' || userRole === 'Manager') {
      router.replace('/admin');
    } else if (userRole === 'Cashier') {
      router.replace('/pos');
    } else if (userRole === 'Receptionist') {
      router.replace('/reception');
    } else if (userRole === 'Housekeeper') {
      router.replace('/reception');
    } else if (userRole === 'Accountant') {
      router.replace('/finance');
    } else if (userRole === 'Chef') {
      router.replace('/kitchen');
    } else if (userRole === 'Waiter') {
      router.replace('/waiters');
    } else {
      router.replace('/admin');
    }
  }, [userRole, router]);

  if (userRole === 'Admin' || userRole === 'Manager') {
    return <AdminDashboardView />;
  }

  if (userRole === 'Cashier') {
    return <CashierPosView />;
  }

  return <PageSkeleton pathname="/" />;
}

export default function Home() {
  return (
    <DashboardLayout>
      <RootPageContent />
    </DashboardLayout>
  );
}

