"use client";

import React, { useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth";
import { useTheme } from "@/context/ThemeContext";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { theme } = useTheme(); // grab the theme from context

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
}
