"use client";

import React from "react";
import ProtectiveRoute from "@/components/ProtectiveRoute";

export default function HRRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectiveRoute
      requiredRole="HR"
      password="Hrd@exozen2025!"
      redirectPath="/dashboard"
    >
      {children}
    </ProtectiveRoute>
  );
}
