'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeaveReport from '../components/LeaveReport';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { getEmployeeId } from '@/services/auth';

interface LeaveBalance {
  EL: number;
  CL: number;
  SL: number;
  CompOff: number;
}

interface LeaveRecord {
  leaveId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  isHalfDay: boolean;
  halfDayType: string | null;
  status: string;
  reason: string;
  emergencyContact: string;
  appliedOn: string;
  lastUpdated: string;
}

interface LeaveData {
  employeeId: string;
  employeeName: string;
  totalLeaves: number;
  leaveBalances: LeaveBalance;
  leaveHistory: LeaveRecord[];
}

const LeavePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveData = async () => {
    setLoading(true);
    setError(null);
    try {
      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found');
      }
      const response = await fetch(`https://cafm.zenapi.co.in/api/leave/history/${employeeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leave data');
      }
      const data = await response.json();
      setLeaveData(data);
    } catch (error) {
      console.error('Error fetching leave data:', error);
      setError('Failed to fetch leave data. Please try again later.');
      setLeaveData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <LeaveReport
          loading={loading}
          leaveData={leaveData}
          handleBack={handleBack}
          formatDate={formatDate}
        />
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeavePage; 