"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaUser, FaIdCard, FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
              (form: any) => form.personalDetails.projectName === "Exozen - Ops"
            )
            .map((form: any) => ({
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
          historyData.leaveHistory.map((history: any) => ({
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
    if (!leaveBalance || !leaveHistory) return;

    const doc = new jsPDF();

    // Leave Balance Table
    doc.text("Leave Balance", 14, 10);
    doc.autoTable({
      startY: 15,
      head: [["Leave Type", "Allocated", "Used", "Remaining", "Pending"]],
      body: Object.entries(leaveBalance.balances).map(([type, balance]) => [
        type,
        balance.allocated,
        balance.used,
        balance.remaining,
        balance.pending,
      ]),
    });

    // Leave History Table
    doc.addPage();
    doc.text("Leave History", 14, 10);
    doc.autoTable({
      startY: 15,
      head: [
        ["Leave Type", "Start Date", "End Date", "Days", "Status", "Reason"],
      ],
      body: leaveHistory.map((record) => [
        record.leaveType,
        new Date(record.startDate).toLocaleDateString(),
        new Date(record.endDate).toLocaleDateString(),
        record.numberOfDays,
        record.status,
        record.reason,
      ]),
    });

    doc.save(`Leave_Details_${selectedEmployee}.pdf`);
  };

  return (
    <ManagerOpsLayout>
      <div className="min-h-screen font-sans bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="p-6">
          {/* Header */}
          <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
            <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
              <FaIdCard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Employee-wise Leave Report
              </h1>
              <p className="text-white text-base opacity-90">
                View leave details for employees in the "Exozen - Ops" project.
              </p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
            </div>
          ) : employees.length === 0 ? (
            <div className="bg-yellow-50 text-yellow-600 p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg">
              <FaIdCard className="w-6 h-6 flex-shrink-0" />
              <p className="text-lg font-medium">
                No employees found for the project "Exozen - Ops".
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <div className="flex gap-6">
                  {employees.map((employee) => (
                    <div
                      key={employee.employeeId}
                      className="min-w-[300px] bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                          {employee.employeeImage ? (
                            <img
                              src={employee.employeeImage}
                              alt={employee.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className="w-8 h-8 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {employee.fullName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {employee.employeeId}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4">
                        <span className="font-medium">Designation:</span>{" "}
                        {employee.designation}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee.employeeId);
                          fetchLeaveDetails(employee.employeeId);
                        }}
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
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
                    <h2 className="text-2xl font-bold text-gray-800">
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
                      <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Leave Balance Card */}
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FaIdCard className="text-blue-500" /> Leave Balance
                          </h3>
                          <p className="text-sm text-gray-500">
                            Overview of leave allocation and usage.
                          </p>
                        </div>
                        {leaveBalance &&
                        leaveBalance.balances &&
                        Object.keys(leaveBalance.balances).length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
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
                                        index % 2 === 0 ? "bg-white" : "bg-gray-100"
                                      } hover:bg-blue-50 transition-colors`}
                                    >
                                      <td className="p-4 text-gray-700 font-medium">
                                        {type}
                                      </td>
                                      <td className="p-4 text-gray-700">
                                        {balance.allocated}
                                      </td>
                                      <td className="p-4 text-gray-700">
                                        {balance.used}
                                      </td>
                                      <td className="p-4 text-gray-700">
                                        {balance.remaining}
                                      </td>
                                      <td className="p-4 text-gray-700">
                                        {balance.pending}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                              <tfoot className="bg-gray-200">
                                <tr>
                                  <td className="p-4 font-semibold text-gray-800">
                                    Total
                                  </td>
                                  <td className="p-4 text-gray-800">
                                    {leaveBalance.totalAllocated}
                                  </td>
                                  <td className="p-4 text-gray-800">
                                    {leaveBalance.totalUsed}
                                  </td>
                                  <td className="p-4 text-gray-800">
                                    {leaveBalance.totalRemaining}
                                  </td>
                                  <td className="p-4 text-gray-800">
                                    {leaveBalance.totalPending}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <p className="text-gray-600">
                            No leave balance data available.
                          </p>
                        )}
                      </div>

                      {/* Leave History Card */}
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FaUser className="text-blue-500" /> Leave History
                          </h3>
                          <p className="text-sm text-gray-500">
                            Detailed history of leave applications for the selected employee.
                          </p>
                        </div>
                        {selectedEmployee && leaveHistory && leaveHistory.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                <tr>
                                  <th className="p-4 text-left font-semibold">
                                    Leave Type
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    Start Date
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    End Date
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    Days
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    Status
                                  </th>
                                  <th className="p-4 text-left font-semibold">
                                    Reason
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {leaveHistory.map((record, index) => (
                                  <tr
                                    key={record.leaveId}
                                    className={`${
                                      index % 2 === 0 ? "bg-white" : "bg-gray-100"
                                    } hover:bg-blue-50 transition-colors`}
                                  >
                                    <td className="p-4 text-gray-700">
                                      {record.leaveType}
                                    </td>
                                    <td className="p-4 text-gray-700">
                                      {new Date(record.startDate).toLocaleDateString(
                                        "en-US",
                                        {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        }
                                      )}
                                    </td>
                                    <td className="p-4 text-gray-700">
                                      {new Date(record.endDate).toLocaleDateString(
                                        "en-US",
                                        {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        }
                                      )}
                                    </td>
                                    <td className="p-4 text-gray-700">
                                      {record.numberOfDays}
                                    </td>
                                    <td className="p-4 text-gray-700">
                                      <span
                                        className={`px-3 py-1 rounded-full text-sm ${
                                          record.status === "Approved"
                                            ? "bg-green-100 text-green-700"
                                            : record.status === "Rejected"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                      >
                                        {record.status}
                                      </span>
                                    </td>
                                    <td className="p-4 text-gray-700">
                                      {record.reason}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-gray-600">
                            {selectedEmployee
                              ? "No leave history data available for this employee."
                              : "Please select an employee to view leave history."}
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

export default EmployeeWiseLeavePage;