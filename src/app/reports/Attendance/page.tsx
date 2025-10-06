'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AttendanceReport from '../components/AttendanceReport';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { getEmployeeId, isAuthenticated } from '@/services/auth';
import { useTheme } from "@/context/ThemeContext";
import { RawAttendanceRecord } from '@/app/types/attendance';
import { MonthSummaryResponse } from '@/app/types/attendance';

const AttendancePage = () => {
  const router = useRouter();
  const [attendanceData, setAttendanceData] = useState<RawAttendanceRecord[]>([]);
  const [summaryData, setSummaryData] = useState<MonthSummaryResponse['data'] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeId, setEmployeeId] = useState<string>('');
  const { theme } = useTheme();


  const fetchAttendanceData = useCallback(async () => {
    try {
      const id = getEmployeeId();
      if (!id) {
        router.push('/login');
        return;
      }
      setEmployeeId(id);
      
      // Fetch both attendance data and summary data in parallel
      const [attendanceResponse, summaryResponse] = await Promise.all([
        fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${id}&month=${selectedMonth}&year=${selectedYear}`),
        fetch(`https://cafm.zenapi.co.in/api/attendance/${id}/monthly-summary?month=${selectedMonth}&year=${selectedYear}`)
      ]);
      
      const attendanceData = await attendanceResponse.json();
      const summaryData = await summaryResponse.json();
      
      if (attendanceData.attendance) {
        // Debug logging for August 15 records
        const august15Records = attendanceData.attendance.filter((rec: RawAttendanceRecord) => 
          rec.date.includes('08-15') || rec.date.includes('2025-08-15')
        );
        if (august15Records.length > 0) {
          console.log('Found August 15 records from API:', august15Records);
        }
        
        // Pass the raw data to AttendanceReport, which will handle transformation
        setAttendanceData(attendanceData.attendance);
      } else {
        setAttendanceData([]);
      }
      
      if (summaryData.success && summaryData.data) {
        console.log('Monthly summary data fetched:', summaryData.data);
        setSummaryData(summaryData.data);
      } else {
        console.log('No summary data available');
        setSummaryData(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setAttendanceData([]);
      setSummaryData(null);
    }
  }, [selectedMonth, selectedYear, router]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchAttendanceData();
  }, [fetchAttendanceData, router]);

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };


  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  };

  // const formatTime = (dateString: string) => {
  //   if (!dateString) return 'N/A';
  //   return new Date(dateString).toLocaleTimeString('en-US', {
  //     hour: '2-digit',
  //     minute: '2-digit',
  //     hour12: true,
  //     timeZone: 'Asia/Kolkata',
  //   });
  // };

  return (
    <DashboardLayout>
      <AttendanceReport
        attendanceData={attendanceData}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        handleMonthChange={handleMonthChange}
        handleYearChange={handleYearChange}
        handleBack={handleBack}
        formatDate={formatDate}
        employeeId={employeeId}
        theme={theme}
        summary={summaryData} // Pass the summary data
      />
    </DashboardLayout>
  );
};

export default AttendancePage;