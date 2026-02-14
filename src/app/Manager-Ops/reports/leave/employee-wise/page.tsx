"use client";

import React, { JSX, useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaUser, FaIdCard, FaFileExcel, FaFilePdf } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from "xlsx";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from "jspdf-autotable";
import Image from 'next/image';

// Extend jsPDF to include lastAutoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
    // You can add more properties if needed
  };
}

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
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
  appliedOn: string;
}

const EmployeeWiseLeavePage = (): JSX.Element => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
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

  const fetchLeaveDetails = async (employeeId: string) => {
    setLeaveLoading(true);
    // Clear previous data when fetching new employee details
    setLeaveHistory([]);
    setLeaveBalance(null);
    try {
      // Fetch leave balance
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
          balances: balanceData.balances || {}, // Default to an empty object
        });
      }

      // Fetch leave history
      const historyResponse = await fetch(
        `https://cafm.zenapi.co.in/api/leave/history/${employeeId}`
      );
      const historyData = await historyResponse.json();

      if (historyData && Array.isArray(historyData.leaveHistory)) {
        setLeaveHistory(
          historyData.leaveHistory.map((history: {
            leaveId: string;
            leaveType: string;
            startDate: string;
            endDate: string;
            numberOfDays: number;
            status: string;
            reason: string;
            appliedOn: string;
          }) => ({
            leaveId: history.leaveId,
            leaveType: history.leaveType,
            startDate: history.startDate,
            endDate: history.endDate,
            numberOfDays: history.numberOfDays,
            status: history.status,
            reason: history.reason,
            appliedOn: history.appliedOn,
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
    if (!leaveBalance || !leaveHistory) return;

    const leaveBalanceSheet = XLSX.utils.json_to_sheet(
      Object.entries(leaveBalance.balances).map(([type, balance]) => ({
        "Leave Type": type,
        Allocated: balance.allocated,
        Used: balance.used,
        Remaining: balance.remaining,
        Pending: balance.pending,
      }))
    );

    const leaveHistorySheet = XLSX.utils.json_to_sheet(
      leaveHistory.map((record) => ({
        "Leave Type": record.leaveType,
        "Start Date": new Date(record.startDate).toLocaleDateString(),
        "End Date": new Date(record.endDate).toLocaleDateString(),
        Days: record.numberOfDays,
        Status: record.status,
        Reason: record.reason,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, leaveBalanceSheet, "Leave Balance");
    XLSX.utils.book_append_sheet(workbook, leaveHistorySheet, "Leave History");

    XLSX.writeFile(workbook, `Leave_Details_${selectedEmployee}.xlsx`);
  };

  const downloadPDF = () => {
    if (!leaveBalance || !leaveHistory || !selectedEmployee) return;

    const doc: jsPDFWithAutoTable = new jsPDF();
    const selectedEmployeeData = employees.find(emp => emp.employeeId === selectedEmployee);
    let yPos = 15;

    // Title
    doc.setFontSize(16);
    doc.setTextColor(41, 128, 185);
    doc.text('Employee Leave Report', 14, yPos);
    yPos += 10;

    // Employee Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Employee: ${selectedEmployeeData?.fullName || selectedEmployee}`, 14, yPos);
    yPos += 7;
    doc.text(`Designation: ${selectedEmployeeData?.designation || ''}`, 14, yPos);
    yPos += 7;
    doc.text(`Employee ID: ${selectedEmployee}`, 14, yPos);
    yPos += 12;

    // Monthly Summary header
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text('Leave Balance Summary', 14, yPos);
    yPos += 5;

    // Leave Balance Table
    autoTable(doc, {
      startY: yPos,
      margin: { left: 14 },
      head: [['Leave Type', 'Allocated', 'Used', 'Remaining', 'Pending']],
      body: Object.entries(leaveBalance.balances).map(([type, balance]) => [
        type,
        balance.allocated,
        balance.used,
        balance.remaining,
        balance.pending,
      ]),
      foot: [['Total', leaveBalance.totalAllocated, leaveBalance.totalUsed, 
              leaveBalance.totalRemaining, leaveBalance.totalPending]],
      theme: theme === 'light' ? 'grid' : 'plain',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: '#ffffff',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [41, 128, 185],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 }
      }
    });

    // Get the final Y position after the first table
    yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 15;

    // Leave History header
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text('Leave History', 14, yPos);
    yPos += 5;

    // Leave History Table
    autoTable(doc, {
      startY: yPos,
      margin: { left: 14 },
      head: [['Leave Type', 'Start Date', 'End Date', 'Days', 'Status']],
      body: leaveHistory.map((record) => [
        record.leaveType,
        new Date(record.startDate).toLocaleDateString(),
        new Date(record.endDate).toLocaleDateString(),
        record.numberOfDays,
        record.status,
      ]),
      theme: theme === 'light' ? 'grid' : 'plain',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: '#ffffff',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 }
      }
    });

    // Save the PDF
    doc.save(`Leave_Report_${selectedEmployee}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <ManagerOpsLayout>
      <div className={`min-h-screen font-sans ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50' 
          : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${
            theme === 'light'
              ? 'bg-gradient-to-r from-blue-500 to-blue-800'
              : 'bg-gradient-to-r from-gray-800 to-gray-700'
          }`}>
            <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
              <FaIdCard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Employee-wise Leave Report
              </h1>
              <p className="text-white text-base opacity-90">
                View leave details for employees in the &quot;Exozen - Ops&quot; project.
              </p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className={`animate-spin ${
                theme === 'light' ? 'text-blue-600' : 'text-blue-400'
              } w-12 h-12`} />
            </div>
          ) : employees.length === 0 ? (
            <div className={`${
              theme === 'light' 
                ? 'bg-yellow-50 text-yellow-600' 
                : 'bg-yellow-900 bg-opacity-20 text-yellow-400'
            } p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg`}>
              <FaIdCard className="w-6 h-6 flex-shrink-0" />
              <p className="text-lg font-medium">
                No employees found for the project &quot;Exozen - Ops&quot;.
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <div className="flex gap-6">
                  {employees.map((employee) => (
                    <div
                      key={employee.employeeId}
                      className={`min-w-[300px] rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow ${
                        theme === 'light' 
                          ? 'bg-white' 
                          : 'bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${
                          theme === 'light' ? 'bg-blue-100' : 'bg-blue-900'
                        }`}>
                          {employee.employeeImage ? (
                            <Image
                              src={employee.employeeImage}
                              alt={employee.fullName}
                              className="w-full h-full object-cover"
                              width={64}
                              height={64}
                            />
                          ) : (
                            <FaUser className={`w-8 h-8 ${
                              theme === 'light' ? 'text-blue-500' : 'text-blue-400'
                            }`} />
                          )}
                        </div>
                        <div>
                          <h3 className={`text-lg font-semibold ${
                            theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                          }`}>
                            {employee.fullName}
                          </h3>
                          <p className={`text-sm ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {employee.employeeId}
                          </p>
                        </div>
                      </div>
                      <p className={`mb-4 ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                        <span className={`font-medium ${
                          theme === 'light' ? 'text-gray-800' : 'text-gray-200'
                        }`}>Designation:</span>{" "}
                        {employee.designation}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee.employeeId);
                          fetchLeaveDetails(employee.employeeId);
                        }}
                        className={`w-full py-2 rounded-lg transition-colors ${
                          theme === 'light'
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        View Leave Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Details */}
              {selectedEmployee && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-bold ${
                      theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                    }`}>
                      Leave Details for {selectedEmployee}
                    </h2>
                    <div className="flex gap-4">
                      <button
                        onClick={downloadExcel}
                        className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <FaFileExcel /> Download Excel
                      </button>
                      <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <FaFilePdf /> Download PDF
                      </button>
                    </div>
                  </div>

                  {leaveLoading ? (
                    <div className="flex justify-center items-center">
                      <FaSpinner className={`animate-spin ${
                        theme === 'light' ? 'text-blue-600' : 'text-blue-400'
                      } w-12 h-12`} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Leave Balance Card */}
                      <div className={`rounded-lg shadow-lg p-6 ${
                        theme === 'light' ? 'bg-white' : 'bg-gray-800'
                      }`}>
                        <div className="mb-4">
                          <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                            theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                          }`}>
                            <FaIdCard className="text-blue-500" /> Leave Balance
                          </h3>
                          <p className={`text-sm ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            Overview of leave allocation and usage.
                          </p>
                        </div>
                        {leaveBalance &&
                        leaveBalance.balances &&
                        Object.keys(leaveBalance.balances).length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className={`w-full rounded-lg overflow-hidden shadow-sm ${
                              theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
                            }`}>
                              <thead className={`${
                                theme === 'light'
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  : 'bg-gradient-to-r from-gray-700 to-gray-800'
                              } text-white`}>
                                <tr>
                                  <th className="p-4 text-left font-semibold">
                                    <span className="flex items-center gap-2">
                                      <FaIdCard className="text-white" /> Leave Type
                                    </span>
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    <span className="flex items-center gap-2">
                                      <FaUser className="text-white" /> Allocated
                                    </span>
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    <span className="flex items-center gap-2">
                                      <FaUser className="text-white" /> Used
                                    </span>
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    <span className="flex items-center gap-2">
                                      <FaUser className="text-white" /> Remaining
                                    </span>
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    <span className="flex items-center gap-2">
                                      <FaUser className="text-white" /> Pending
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(leaveBalance.balances).map(
                                  ([type, balance], index) => (
                                    <tr
                                      key={type}
                                      className={`${
                                        theme === 'light'
                                          ? index % 2 === 0 ? "bg-white" : "bg-gray-100"
                                          : index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"
                                      } hover:bg-opacity-80 transition-colors`}
                                    >
                                      <td className={`p-4 font-medium ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                                      }`}>
                                        {type}
                                      </td>
                                      <td className={`p-4 ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>
                                        {balance.allocated}
                                      </td>
                                      <td className={`p-4 ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>
                                        {balance.used}
                                      </td>
                                      <td className={`p-4 ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>
                                        {balance.remaining}
                                      </td>
                                      <td className={`p-4 ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                      }`}>
                                        {balance.pending}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className={`text-center py-8 ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            No leave balance data available.
                          </div>
                        )}
                      </div>

                      {/* Leave History Card */}
                      <div className={`rounded-lg shadow-lg p-6 ${
                        theme === 'light' ? 'bg-white' : 'bg-gray-800'
                      }`}>
                        <div className="mb-4">
                          <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                            theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                          }`}>
                            <FaIdCard className="text-blue-500" /> Leave History
                          </h3>
                          <p className={`text-sm ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            List of all leave applications.
                          </p>
                        </div>
                        {leaveHistory && leaveHistory.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className={`w-full rounded-lg overflow-hidden shadow-sm ${
                              theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
                            }`}>
                              <thead className={`${
                                theme === 'light'
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  : 'bg-gradient-to-r from-gray-700 to-gray-800'
                              } text-white`}>
                                <tr>
                                  <th className="p-4 text-left font-semibold">Leave Type</th>
                                  <th className="p-4 text-left font-semibold">Start Date</th>
                                  <th className="p-4 text-left font-semibold">End Date</th>
                                  <th className="p-4 text-left font-semibold">Days</th>
                                  <th className="p-4 text-left font-semibold">Status</th>
                                  <th className="p-4 text-left font-semibold">Reason</th>
                                </tr>
                              </thead>
                              <tbody>
                                {leaveHistory.map((record, idx) => (
                                  <tr key={record.leaveId} className={`${
                                    theme === 'light'
                                      ? idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'
                                      : idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'
                                  }`}>
                                    <td className={`p-4 font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>{record.leaveType}</td>
                                    <td className={`p-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{new Date(record.startDate).toLocaleDateString()}</td>
                                    <td className={`p-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{new Date(record.endDate).toLocaleDateString()}</td>
                                    <td className={`p-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{record.numberOfDays}</td>
                                    <td className={`p-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{record.status}</td>
                                    <td className={`p-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{record.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className={`text-center py-8 ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            No leave history data available.
                          </div>
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

export default EmployeeWiseLeavePage;