'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/services/auth';
import { useEffect } from 'react';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  return <DashboardLayout>{children}</DashboardLayout>;
} 