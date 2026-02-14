"use client";

import React from "react";
import ProtectiveRoute from "@/components/ProtectiveRoute";

export default function ManagerRootLayout({
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
      {children}
    </ProtectiveRoute>
  );
}
