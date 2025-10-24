"use client";

import React from "react";
import ProtectiveRoute from "@/components/ProtectiveRoute";

export default function TaskRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectiveRoute
      requiredRole="Task"
      password="Taskexozen@2025!"
      redirectPath="/dashboard"
    >
      {children}
    </ProtectiveRoute>
  );
}
