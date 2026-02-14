"use client";

import React, { useEffect } from "react";
import HrdDashboardLayout from "@/components/dashboard/HrdDashboardLayout";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth";

export default function IDCardReportLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return <HrdDashboardLayout>{children}</HrdDashboardLayout>;
} 