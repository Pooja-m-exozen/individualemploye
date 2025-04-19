'use client';

import React from 'react';
import { FaUserFriends, FaBuilding, FaBriefcase, FaFileAlt } from 'react-icons/fa';
import MetricCard from '@/components/dashboard/MetricCard';

export default function DashboardPage() {
  // In a real application, these would come from an API
  const metrics = {
    employees: 150,
    departments: 8,
    designations: 12,
    pendingKyc: 5
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Employees"
          value={metrics.employees}
          icon={<FaUserFriends />}
          color="bg-blue-600"
        />
        
        <MetricCard
          title="Total Departments"
          value={metrics.departments}
          icon={<FaBuilding />}
          color="bg-green-600"
        />
        
        <MetricCard
          title="Total Designations"
          value={metrics.designations}
          icon={<FaBriefcase />}
          color="bg-purple-600"
        />
        
        <MetricCard
          title="Pending KYC Verifications"
          value={metrics.pendingKyc}
          icon={<FaFileAlt />}
          color="bg-red-600"
        />
      </div>
    </div>
  );
} 