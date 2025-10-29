"use client";

import React from "react";
import ProtectiveRoute from "@/components/ProtectiveRoute";

export default function ManagerOpsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectiveRoute
      requiredRole="Ops"
      password="Opsexo2025!"
      redirectPath="/dashboard"
    >
      {children}
    </ProtectiveRoute>
  );
}
