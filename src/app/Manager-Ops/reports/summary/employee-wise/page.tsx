"use client";

import React, { JSX, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaUser, FaIdCard, FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import Image from "next/image";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Parameters<typeof autoTable>[1]) => void;
  }
}

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
}

interface Attendance {
  date: string;
  status: string;
  punchInTime: string;
  punchOutTime: string;
  projectName?: string;
  isLate?: boolean;
}

interface LeaveBalance {
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  totalPending: number;
  balances: {
    [key: string]: {
      allocated: number;
      used: number;
      remaining: number;
      pending: number;
    };
  };
}

interface LeaveHistory {
  leaveId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: string;
  reason: string;
}

const EmployeeSummaryPage = (): JSX.Element => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [leaveLoading, setLeaveLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter(
              (form: { personalDetails: { projectName: string } }) => form.personalDetails.projectName === "Exozen - Ops"
            )
            .map((form: { personalDetails: { employeeId: string; employeeImage: string; fullName: string; designation: string } }) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
            }));

          setEmployees(filteredEmployees);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const fetchAttendance = async (employeeId: string) => {
    setAttendanceLoading(true);
    try {
      const response = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`
      );
      const data = await response.json();
      console.log("Attendance API Response:", data); // Debugging log

      if (data.attendance) {
        setAttendance(data.attendance);
      } else {
        console.error("No attendance data found.");
        setAttendance([]);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchLeaveDetails = async (employeeId: string) => {
    setLeaveLoading(true);
    try {
      const balanceResponse = await fetch(
        `https://cafm.zenapi.co.in/api/leave/balance/${employeeId}`
      );
      const balanceData = await balanceResponse.json();

      if (balanceData) {
        setLeaveBalance({
          totalAllocated: balanceData.totalAllocated || 0,
          totalUsed: balanceData.totalUsed || 0,
          totalRemaining: balanceData.totalRemaining || 0,
          totalPending: balanceData.totalPending || 0,
          balances: balanceData.balances || {},
        });
      }

      const historyResponse = await fetch(
        `https://cafm.zenapi.co.in/api/leave/history/${employeeId}`
      );
      const historyData = await historyResponse.json();

      if (historyData && Array.isArray(historyData.leaveHistory)) {
        setLeaveHistory(
          historyData.leaveHistory.map((history: LeaveHistory) => ({
            leaveId: history.leaveId,
            leaveType: history.leaveType,
            startDate: history.startDate,
            endDate: history.endDate,
            numberOfDays: history.numberOfDays,
            status: history.status,
            reason: history.reason,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching leave details:", error);
    } finally {
      setLeaveLoading(false);
    }
  };

  const downloadExcel = () => {
    const attendanceSheet = XLSX.utils.json_to_sheet(
      attendance.map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Status: record.status,
        "Check-In": record.punchInTime,
        "Check-Out": record.punchOutTime,
      }))
    );

    const leaveBalanceSheet = XLSX.utils.json_to_sheet(
      Object.entries(leaveBalance?.balances || {}).map(([type, balance]) => ({
        "Leave Type": type,
        Allocated: balance.allocated,
        Used: balance.used,
        Remaining: balance.remaining,
        Pending: balance.pending,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, "Attendance");
    XLSX.utils.book_append_sheet(workbook, leaveBalanceSheet, "Leave Balance");
    XLSX.writeFile(workbook, `Employee_Summary_${selectedEmployee}.xlsx`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const selectedEmp = employees.find(emp => emp.employeeId === selectedEmployee);

    // Add header with employee details
    doc.setFontSize(20);
    doc.text('Employee Summary Report', 14, 15);
    doc.setFontSize(12);
    doc.text(`Employee Name: ${selectedEmp?.fullName || ''}`, 14, 25);
    doc.text(`Employee ID: ${selectedEmp?.employeeId || ''}`, 14, 32);
    doc.text(`Designation: ${selectedEmp?.designation || ''}`, 14, 39);

    // Attendance Section with simplified columns
    doc.setFontSize(14);
    doc.text('Attendance Details', 14, 50);
    autoTable(doc, {
      startY: 55,
      head: [['Date', 'Status', 'Total Working Hours']],
      body: attendance.map((record: Attendance) => {
        const workingHours = record.punchInTime && record.punchOutTime
          ? ((new Date(record.punchOutTime).getTime() - new Date(record.punchInTime).getTime()) / (1000 * 60 * 60)).toFixed(2)
          : 'N/A';
        
        return [
          new Date(record.date).toLocaleDateString(),
          record.status,
          workingHours
        ];
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Leave Balance Section
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Leave Balance Details', 14, 15);
    if (leaveBalance) {
      autoTable(doc, {
        startY: 20,
        head: [['Leave Type', 'Allocated', 'Used', 'Remaining', 'Pending']],
        body: Object.entries(leaveBalance.balances).map(([type, balance]) => [
          type,
          balance.allocated,
          balance.used,
          balance.remaining,
          balance.pending
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] }
      });
    }

    // Leave History Section
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Leave History', 14, finalY);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason']],
      body: leaveHistory.map((record) => [
        record.leaveType,
        new Date(record.startDate).toLocaleDateString(),
        new Date(record.endDate).toLocaleDateString(),
        record.numberOfDays,
        record.status,
        record.reason
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.save(`Employee_Summary_${selectedEmployee}.pdf`);
  };

  return (
    <ManagerOpsLayout>
      <div className={`min-h-screen font-sans ${theme === 'light' ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}`}>
        <div className="p-6">
          <div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${theme === 'light' ? 'bg-gradient-to-r from-blue-500 to-blue-800' : 'bg-gradient-to-r from-gray-700 to-gray-800'}`}>
            <div className={`${theme === 'light' ? 'bg-blue-600 bg-opacity-30' : 'bg-gray-600 bg-opacity-30'} rounded-xl p-4 flex items-center justify-center`}>
              <FaIdCard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Employee Summary Report
              </h1>
              <p className="text-white text-base opacity-90">
                View attendance and leave details for employees in the &quot;Exozen - Ops&quot; project.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className={`animate-spin ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'} w-12 h-12`} />
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <div className="flex gap-6">
                  {employees.map((employee) => (
                    <div
                      key={employee.employeeId}
                      className={`min-w-[300px] rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow ${
                        theme === 'light' ? 'bg-white' : 'bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-full ${theme === 'light' ? 'bg-blue-100' : 'bg-gray-700'} flex items-center justify-center overflow-hidden`}>
                          {employee.employeeImage ? (
                            <Image
                              src={employee.employeeImage}
                              alt={employee.fullName}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className={`w-8 h-8 ${theme === 'light' ? 'text-blue-500' : 'text-blue-400'}`} />
                          )}
                        </div>
                        <div>
                          <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                            {employee.fullName}
                          </h3>
                          <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {employee.employeeId}
                          </p>
                        </div>
                      </div>
                      <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} mb-4`}>
                        <span className="font-medium">Designation:</span>{" "}
                        {employee.designation}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee.employeeId);
                          setAttendance([]); // Clear previous attendance
                          setLeaveBalance(null); // Clear previous leave balance
                          setLeaveHistory([]); // Clear previous leave history
                          fetchAttendance(employee.employeeId);
                          fetchLeaveDetails(employee.employeeId);
                        }}
                        className={`w-full ${theme === 'light' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 rounded-lg transition-colors`}
                      >
                        View Summary
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {selectedEmployee && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>
                      Summary for {selectedEmployee}
                    </h2>
                    <div className="flex gap-4">
                      <button
                        onClick={downloadExcel}
                        className={`${
                          theme === 'light' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}
                      >
                        <FaFileExcel /> Download Excel
                      </button>
                      <button
                        onClick={downloadPDF}
                        className={`${
                          theme === 'light' 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-red-600 hover:bg-red-700'
                        } text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}
                      >
                        <FaFilePdf /> Download PDF
                      </button>
                    </div>
                  </div>

                  {attendanceLoading || leaveLoading ? (
                    <div className="flex justify-center items-center">
                      <FaSpinner className={`animate-spin ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'} w-12 h-12`} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className={`rounded-lg shadow-lg p-6 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                        <h3 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>
                          Attendance Details
                        </h3>
                        {attendance.length > 0 ? (
                          <div className={`overflow-hidden rounded-lg border ${
                            theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                          }`}>
                            <table className="w-full">
                              <thead className={`${
                                theme === 'light' 
                                  ? 'bg-gray-50 text-gray-700'
                                  : 'bg-gray-800 text-gray-200'
                              }`}>
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Total Working Hours</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {attendance.map((record, index) => {
                                  const totalWorkingHours = record.punchInTime && record.punchOutTime
                                    ? ((new Date(record.punchOutTime).getTime() -
                                        new Date(record.punchInTime).getTime()) /
                                        (1000 * 60 * 60)
                                    ).toFixed(2)
                                    : "N/A";

                                  return (
                                    <tr key={index} className={`${
                                      theme === 'light'
                                        ? 'hover:bg-gray-50'
                                        : 'hover:bg-gray-750'
                                    }`}>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>
                                        {new Date(record.date).toLocaleDateString()}
                                      </td>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>
                                        {record.status}
                                      </td>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>
                                        {totalWorkingHours}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                            No attendance data available.
                          </p>
                        )}
                      </div>

                      <div className={`rounded-lg shadow-lg p-6 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                        <h3 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>
                          Leave Details
                        </h3>
                        {leaveBalance ? (
                          <div>
                            <h4 className={`text-md font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>
                              Leave Balance
                            </h4>
                            {Object.keys(leaveBalance.balances).length > 0 ? (
                              <table className={`w-full border ${
                                theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                              } rounded-lg overflow-hidden mb-6`}>
                                <thead className={`${
                                  theme === 'light' 
                                    ? 'bg-gray-50 text-gray-700'
                                    : 'bg-gray-800 text-gray-200'
                                }`}>
                                  <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Leave Type</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Allocated</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Used</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Remaining</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Pending</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {Object.entries(leaveBalance.balances).map(([type, balance],) => (
                                    <tr key={type} className={`${
                                      theme === 'light'
                                        ? 'hover:bg-gray-50'
                                        : 'hover:bg-gray-750'
                                    }`}>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>{type}</td>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>{balance.allocated}</td>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>{balance.used}</td>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>{balance.remaining}</td>
                                      <td className={`px-4 py-3 text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>{balance.pending}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} mb-6`}>
                                No leave balance data available for this employee.
                              </p>
                            )}

                            <h4 className={`text-md font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>
                              Leave History
                            </h4>
                            {leaveHistory.length > 0 ? (
                              <div className="max-h-[400px] overflow-auto rounded-lg">
                                <table className={`w-full border ${
                                  theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                                }`}>
                                  <thead className={`${
                                    theme === 'light' 
                                      ? 'bg-gray-50 text-gray-700'
                                      : 'bg-gray-800 text-gray-200'
                                  }`}>
                                    <tr>
                                      <th className="px-4 py-3 text-left text-sm font-semibold">Leave Type</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold">Start Date</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold">End Date</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold">Days</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold">Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {leaveHistory.map((record,) => (
                                      <tr key={record.leaveId} className={`${
                                        theme === 'light'
                                          ? 'hover:bg-gray-50'
                                          : 'hover:bg-gray-750'
                                      }`}>
                                        <td className={`px-4 py-3 text-sm ${
                                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                        }`}>{record.leaveType}</td>
                                        <td className={`px-4 py-3 text-sm ${
                                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                        }`}>{new Date(record.startDate).toLocaleDateString()}</td>
                                        <td className={`px-4 py-3 text-sm ${
                                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                        }`}>{new Date(record.endDate).toLocaleDateString()}</td>
                                        <td className={`px-4 py-3 text-sm ${
                                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                        }`}>{record.numberOfDays}</td>
                                        <td className={`px-4 py-3 text-sm ${
                                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                        }`}>{record.status}</td>
                                        <td className={`px-4 py-3 text-sm ${
                                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                        }`}>{record.reason}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                No leave history available for this employee.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                            Loading leave details...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ManagerOpsLayout>
  );
};

export default EmployeeSummaryPage;