"use client";

import React from "react";
import HrdDashboardLayout from "@/components/dashboard/HrdDashboardLayout";

export default function HrdDashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HrdDashboardLayout>{children}</HrdDashboardLayout>;
} 