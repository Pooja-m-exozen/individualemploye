"use client";

import React from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import ProtectiveRoute from "@/components/ProtectiveRoute";

export default function ManagerDashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectiveRoute
      requiredRole="Manager"
      password="Manager@2025exo!"
      redirectPath="/dashboard"
    >
      <ManagerDashboardLayout>{children}</ManagerDashboardLayout>
    </ProtectiveRoute>
  );
} 