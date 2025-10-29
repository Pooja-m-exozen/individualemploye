"use client";

import React from "react";
import ProtectiveRoute from "@/components/ProtectiveRoute";

export default function CoordinatorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectiveRoute
      requiredRole="Coordinator"
      password="coordinator@exozen2025!"
      redirectPath="/dashboard"
    >
      {children}
    </ProtectiveRoute>
  );
}
