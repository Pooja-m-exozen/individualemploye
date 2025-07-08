"use client";

import React, { useEffect } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth";

export default function AttendanceReportLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return <AdminDashboardLayout>{children}</AdminDashboardLayout>;
} 