"use client";

import React from "react";
import TaskDashboardLayout from "@/components/dashboard/TaskDashboardLayout";

export default function TaskDashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TaskDashboardLayout>{children}</TaskDashboardLayout>;
} 