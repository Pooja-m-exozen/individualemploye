"use client";

import React from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";

const OpsManagerDashboard = (): JSX.Element => {
  return (
    <ManagerOpsLayout>
      <div className="p-4 md:p-8 min-h-screen">
        <h1 className="text-3xl font-bold">Ops Manager Dashboard</h1>
        <p>Welcome to the Ops Manager Dashboard!</p>
      </div>
    </ManagerOpsLayout>
  );
};

export default OpsManagerDashboard;