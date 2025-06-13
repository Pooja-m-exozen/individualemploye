"use client";

import React from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";

const LeaveManagementPage = (): JSX.Element => {
  return (
    <ManagerOpsLayout>
      <div className="p-4 md:p-8 min-h-screen">
        <h1 className="text-3xl font-bold">Leave Management</h1>
        {/* Add leave management-specific content here */}
      </div>
    </ManagerOpsLayout>
  );
};

export default LeaveManagementPage;