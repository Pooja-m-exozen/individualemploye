"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";

export default function KYCUploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      {children}
    </div>
  );
}
