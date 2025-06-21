"use client";

import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaClock } from 'react-icons/fa';
import axios from 'axios';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';
import { KYCRecord } from '@/types/kyc';
import { RawAttendanceRecord } from '@/app/types/attendance';

interface Employee {
  employeeId: string;
  employeeImage: string;
  projectName: string;
  fullName: string;
}

interface AttendanceStatus {
  [employeeId: string]: {
    status: string;
    punchInTime?: string;
    punchOutTime?: string;
  };
}

const AttendanceScreen: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({});
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('https://cafm.zenapi.co.in/api/kyc'),
      axios.get('https://cafm.zenapi.co.in/api/attendance/all')
    ])
      .then(([kycRes, attRes]) => {
        const kycForms: KYCRecord[] = kycRes.data.kycForms || [];
        const filteredEmployees: Employee[] = kycForms
          .filter((form: KYCRecord) => form.personalDetails?.projectName === 'Exozen - Ops')
          .map((form: KYCRecord) => ({
            employeeId: form.personalDetails.employeeId,
            employeeImage: form.personalDetails.employeeImage,
            projectName: form.personalDetails.projectName,
            fullName: form.personalDetails.fullName
          }));

        setEmployees(filteredEmployees);

        const attendance: RawAttendanceRecord[] = attRes.data.attendance || [];
        const today = new Date().toISOString().split('T')[0];
        const statusMap: AttendanceStatus = {};

        filteredEmployees.forEach(emp => {
          const att = attendance.find((a: RawAttendanceRecord) =>
            a.employeeId === emp.employeeId &&
            a.projectName === 'Exozen - Ops' &&
            a.date?.startsWith(today)
          );

          if (att?.punchInTime) {
            statusMap[emp.employeeId] = {
              status: 'Present',
              punchInTime: att.punchInTime ?? undefined,
              punchOutTime: att.punchOutTime ?? undefined
            };
          } else {
            statusMap[emp.employeeId] = { status: 'Absent' };
          }
        });

        setAttendanceStatus(statusMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEmployees = employees;

  if (loading) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-[#0f1219]' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <FaClock className="animate-spin text-4xl text-blue-600" />
          <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  const renderAttendanceCard = (employee: Employee) => {
    const status = attendanceStatus[employee.employeeId] || { status: 'Absent' };
    const isPresent = status.status === 'Present';

    // Format date if present
    let punchInDate = '--';
    if (isPresent && status.punchInTime) {
      try {
        const punchInDateTime = new Date(status.punchInTime);
        
        // Format date as DD/MM/YYYY
        punchInDate = punchInDateTime.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }

    return (
      <div className={`rounded-lg p-5 shadow-md transition-colors duration-300 h-[220px] 
        ${theme === 'dark' ? 'bg-[#1a1f2e] border border-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
        <div className="flex items-center gap-3 mb-4">
          {employee.employeeImage ? (
            <Image
              src={employee.employeeImage}
              alt={employee.fullName}
              className="w-12 h-12 rounded-full object-cover border"
              width={48}
              height={48}
            />
          ) : (
            <FaUserCircle className="w-12 h-12 text-gray-400 dark:text-gray-600" />
          )}
          <div>
            <h3 className="text-base font-medium">{employee.fullName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.employeeId}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Project</span>
            <span>{employee.projectName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">Status</span>
            <span className={`flex items-center gap-2 font-semibold ${isPresent ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isPresent ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {status.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Date</span>
            <span>{punchInDate}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen w-full p-6 ${theme === 'dark' ? 'bg-[#0f1219]' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-6">
          <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
            Attendance Records
          </h2>
        </div>

        {/* Employee Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(employee => (
            <div key={employee.employeeId}>
              {renderAttendanceCard(employee)}
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredEmployees.length === 0 && (
          <div className={`text-center py-8 mt-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            <p>No employees found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScreen;
