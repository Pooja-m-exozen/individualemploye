"use client";

import React, { useEffect } from "react";
import CoordinatorDashboardLayout from "@/components/dashboard/CoordinatorDashboardLayout";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth";

export default function EmployeeManagementLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return <CoordinatorDashboardLayout>{children}</CoordinatorDashboardLayout>;
} 