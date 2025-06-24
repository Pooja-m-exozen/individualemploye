"use client";

import React, { useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth";

export default function AttendanceReportLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return <ManagerDashboardLayout>{children}</ManagerDashboardLayout>;
} 