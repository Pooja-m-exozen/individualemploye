"use client";

import React from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";

export default function ManagerDashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerDashboardLayout>{children}</ManagerDashboardLayout>;
} 