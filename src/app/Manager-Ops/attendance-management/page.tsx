"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaClock, FaSignInAlt, FaSignOutAlt, FaDownload } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from 'xlsx';

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
  projectName: string;
}

interface AttendanceRecord {
  employeeId: string;
  projectName: string;
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  status: string;
}

interface RegularizationRequest {
  requestId: string;
  employeeId: string;
  fullName: string;
  projectName: string;
  date: string;
  reason: string;
  status: string;
}

const AttendanceManagementPage = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("View Attendance");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Add utility to get all dates in range
  const getDateRange = (start: string, end: string): string[] => {
    const result: string[] = [];
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      result.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return result;
  };

  // Fetch all employees and all attendance records
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employees
        const empRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const empData = await empRes.json();
        let exozenEmployees: Employee[] = [];
        if (empData.kycForms) {
          exozenEmployees = empData.kycForms
            .filter((form: any) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: any) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              projectName: form.personalDetails.projectName,
            }));
          setEmployees(exozenEmployees);
        }
        // Fetch all attendance records
        const attRes = await fetch("https://cafm.zenapi.co.in/api/attendance/all");
        const attData = await attRes.json();
        let allRecords: AttendanceRecord[] = [];
        if (attData.attendance) {
          allRecords = attData.attendance.filter((rec: any) => rec.projectName === "Exozen - Ops");
        }
        // If date range is set, build attendance matrix
        if (fromDate && toDate && exozenEmployees.length > 0) {
          const dateRange = getDateRange(fromDate, toDate);
          const matrix: AttendanceRecord[] = [];
          for (const emp of exozenEmployees) {
            for (const date of dateRange) {
              const rec = allRecords.find(r => r.employeeId === emp.employeeId && r.date.slice(0,10) === date);
              if (rec && rec.punchInTime && rec.punchOutTime) {
                matrix.push({
                  employeeId: emp.employeeId,
                  projectName: emp.projectName,
                  date,
                  punchInTime: rec.punchInTime,
                  punchOutTime: rec.punchOutTime,
                  status: "Present"
                });
              } else {
                matrix.push({
                  employeeId: emp.employeeId,
                  projectName: emp.projectName,
                  date,
                  punchInTime: null,
                  punchOutTime: null,
                  status: "Absent"
                });
              }
            }
          }
          setAttendanceRecords(matrix);
        } else {
          setAttendanceRecords([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setEmployees([]);
        setAttendanceRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Only refetch when fromDate or toDate changes
  }, [fromDate, toDate]);

  // Modified regularization requests fetch
  const fetchRegularizationRequests = async () => {
    try {
      const promises = employees.map(async (employee) => {
        const response = await fetch(
          `https://cafm.zenapi.co.in/api/attendance/${employee.employeeId}/monthly-stats?month=${new Date().getMonth() + 1}&year=2025`
        );
        const data = await response.json();
        
        if (data.success && data.data.punctualityIssues?.lateArrivals > 0) {
          return {
            requestId: `REQ-${employee.employeeId}-${Date.now()}`,
            employeeId: employee.employeeId,
            fullName: employee.fullName,
            projectName: employee.projectName,
            date: new Date().toISOString().split('T')[0],
            reason: "Late Arrival",
            status: "Pending"
          };
        }
        return null;
      });

      const results = await Promise.all(promises);
      setRegularizationRequests(results.filter(req => req !== null));
    } catch (error) {
      console.error("Error fetching regularization requests:", error);
    }
  };

  // Call fetchRegularizationRequests when employees are loaded
  React.useEffect(() => {
    if (employees.length > 0) {
      fetchRegularizationRequests();
    }
  }, [employees]);

  // Updated export function to properly handle date range and API response
  const exportAttendanceData = async () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates");
      return;
    }
    setLoading(true);
    try {
      const exportData = attendanceRecords.map(record => {
        const employee = employees.find(emp => emp.employeeId === record.employeeId);
        return {
          'Employee ID': record.employeeId,
          'Employee Name': employee ? employee.fullName : '',
          'Project': record.projectName,
          'Date': record.date,
          'Status': record.status,
          'Punch In': record.punchInTime || '',
          'Punch Out': record.punchOutTime || ''
        };
      });
      if (exportData.length === 0) {
        alert('No attendance records found for Exozen - Ops in selected range');
        return;
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `Exozen_Ops_Attendance_${fromDate}_to_${toDate}.xlsx`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Improved hours calculation
  const calculateHours = (punchIn: string | null, punchOut: string | null): string => {
    if (!punchIn || !punchOut) return "N/A";
    try {
      const [punchInHours, punchInMinutes] = punchIn.split(':').map(Number);
      const [punchOutHours, punchOutMinutes] = punchOut.split(':').map(Number);
      
      let diffHours = punchOutHours - punchInHours;
      let diffMinutes = punchOutMinutes - punchInMinutes;
      
      if (diffMinutes < 0) {
        diffHours--;
        diffMinutes += 60;
      }
      
      return `${diffHours}h ${diffMinutes}m`;
    } catch {
      return "N/A";
    }
  };

  const handleApprove = (requestId: string) => {
    setRegularizationRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.requestId === requestId
          ? { ...request, status: "Approved" }
          : request
      )
    );
  };

  const handleReject = (requestId: string) => {
    setRegularizationRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.requestId === requestId
          ? { ...request, status: "Rejected" }
          : request
      )
    );
  };

  const filteredAttendanceRecords = attendanceRecords.filter((record) => {
    const employee = employees.find(emp => emp.employeeId === record.employeeId);
    return (
      (record.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (employee && employee.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.date.includes(searchQuery))
    );
  });

  const filteredRegularizationRequests = regularizationRequests.filter((request) => {
    const requestDate = new Date(request.date);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return (
      (!from || requestDate >= from) &&
      (!to || requestDate <= to) &&
      (request.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.projectName.toLowerCase().includes(searchQuery) ||
        request.date.includes(searchQuery))
    );
  });

  useEffect(() => {
    if (!fromDate) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDayOfMonth.toISOString().split('T')[0]);
    }
    if (!toDate) {
      const now = new Date();
      setToDate(now.toISOString().split('T')[0]);
    }
  }, [fromDate, toDate]);

  return (
    <ManagerOpsLayout>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Header */}
        <div className={`m-6 rounded-2xl p-6 flex items-center gap-5 shadow-lg ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-gray-800 to-gray-700'
            : 'bg-gradient-to-r from-blue-500 to-blue-800'
        }`}>
          <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
            <FaClock className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Attendance Management</h1>
            <p className="text-white text-base opacity-90">
              Manage attendance and regularization requests for employees.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-6 flex gap-4 mb-6">
          {["View Attendance", "Attendance Regularization Requests"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-blue-600 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className={`mx-6 mb-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } rounded-lg p-6 shadow-lg`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID or Name"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm`}
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={exportAttendanceData}
              disabled={loading || !fromDate || !toDate}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm`}
            >
              <FaDownload />
              Export Attendance
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "View Attendance" && (
          <div className={`mx-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Attendance Records</h2>
                <div className="flex gap-2">
                  {/* Export button is above */}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center min-h-[300px]">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                  theme === 'dark' ? 'border-blue-400' : 'border-blue-600'
                }`}></div>
              </div>
            ) : (
              <div className={`overflow-x-auto`}>
                <table className="w-full">
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-black'} uppercase tracking-wider`}>Employee</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-black'} uppercase tracking-wider`}>Employee ID</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-black'} uppercase tracking-wider`}>Project</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-black'} uppercase tracking-wider`}>Date</th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-black'} uppercase tracking-wider`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredAttendanceRecords
                      .slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record, index) => {
                        const employee = employees.find(emp => emp.employeeId === record.employeeId);
                        return (
                          <tr key={index} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-4">
                                <img
                                  src={employee?.employeeImage || "/default-avatar.png"}
                                  alt={employee?.fullName}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200"
                                />
                                <div>
                                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{employee?.fullName}</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-black'}`}>{employee?.designation}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {record.employeeId}
                              </span>
                            </td>
                            <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>
                              {record.projectName.replace(' - FMS', '')}
                            </td>
                            <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>
                              {new Date(record.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                record.status === 'Present'
                                  ? theme === 'dark' 
                                    ? 'bg-green-900/30 text-green-400' 
                                    : 'bg-green-100 text-green-800'
                                  : theme === 'dark'
                                    ? 'bg-red-900/30 text-red-400'
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Empty state */}
            {!loading && filteredAttendanceRecords.length === 0 && (
              <div className={`text-center py-12 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className={`mt-2 text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-200' : 'text-black'
                }`}>No records found</h3>
                <p className="mt-1 text-sm">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Attendance Regularization Requests" && (
          <div className={`mx-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-lg p-6 overflow-x-auto`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Regularization Requests</h2>
                <p className={`text-sm mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                }`}>Review and manage attendance regularization requests</p>
              </div>
            </div>

            <div className="relative">
              <div className={`overflow-x-auto rounded-lg border ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <table className="w-full text-left">
                  <thead className={`${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <tr>
                      <th className={`px-6 py-4 text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-black'
                      } uppercase tracking-wider`}>Request ID</th>
                      <th className={`px-6 py-4 text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-black'
                      } uppercase tracking-wider`}>Employee</th>
                      <th className={`px-6 py-4 text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-black'
                      } uppercase tracking-wider`}>Project</th>
                      <th className={`px-6 py-4 text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-black'
                      } uppercase tracking-wider`}>Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-black'
                      } uppercase tracking-wider`}>Reason</th>
                      <th className={`px-6 py-4 text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-black'
                      } uppercase tracking-wider`}>Status</th>
                      <th className={`px-6 py-4 text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-black'
                      } uppercase tracking-wider`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                    {filteredRegularizationRequests.map((request, index) => (
                      <tr key={index} className={`${
                        theme === 'dark' 
                          ? 'hover:bg-gray-700' 
                          : 'hover:bg-gray-50'
                      } transition-colors duration-200`}>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-gray-700 text-gray-200'
                              : 'bg-gray-200 text-black'
                          }`}>
                            {request.requestId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src="/default-avatar.png"
                              alt={request.fullName}
                              className={`w-10 h-10 rounded-full object-cover ring-2 ${
                                theme === 'dark' ? 'ring-gray-600' : 'ring-gray-100'
                              }`}
                            />
                            <div>
                              <p className={`font-medium ${
                                theme === 'dark' ? 'text-white' : 'text-black'
                              }`}>{request.fullName}</p>
                              <p className={`text-sm ${
                                theme === 'dark' ? 'text-gray-400' : 'text-black'
                              }`}>{request.employeeId}</p>
                              <p className={`text-sm ${
                                theme === 'dark' ? 'text-gray-400' : 'text-black'
                              }`}>{request.projectName.replace(' - FMS', '')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-blue-900/30 text-blue-400'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {request.projectName}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-black'
                        }`}>{request.date}</td>
                        <td className="px-6 py-4">
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-300' : 'text-black'
                          } truncate max-w-xs`}>{request.reason}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            request.status === "Approved"
                              ? theme === 'dark'
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-green-100 text-green-800'
                              : request.status === "Rejected"
                                ? theme === 'dark'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'bg-red-100 text-red-800'
                                : theme === 'dark'
                                  ? 'bg-yellow-900/30 text-yellow-400'
                                  : 'bg-gray-200 text-black'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {request.status === "Pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request.requestId)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-black hover:bg-gray-800 text-white'
                                }`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request.requestId)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-800 hover:bg-black text-white'
                                }`}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>No actions available</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty state with theme support */}
              {filteredRegularizationRequests.length === 0 && (
                <div className="text-center py-12">
                  <svg className={`mx-auto h-12 w-12 ${
                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className={`mt-2 text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-black'
                  }`}>No regularization requests found</h3>
                  <p className={`mt-1 text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ManagerOpsLayout>
  );
};

export default AttendanceManagementPage;