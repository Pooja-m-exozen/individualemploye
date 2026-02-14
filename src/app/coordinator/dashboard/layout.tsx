"use client";

import React from "react";
import CoordinatorDashboardLayout from "@/components/dashboard/CoordinatorDashboardLayout";

export default function CoordinatorDashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CoordinatorDashboardLayout>{children}</CoordinatorDashboardLayout>;
} 