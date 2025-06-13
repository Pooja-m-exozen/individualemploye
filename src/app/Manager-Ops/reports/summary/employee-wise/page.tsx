"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaUser, FaIdCard, FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => void;
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
          historyData.leaveHistory.map((history: any) => ({
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

    doc.text("Attendance Report", 14, 10);
    doc.autoTable({
      startY: 15,
      head: [["Date", "Status", "Check-In", "Check-Out"]],
      body: attendance.map((record) => [
        new Date(record.date).toLocaleDateString(),
        record.status,
        record.punchInTime,
        record.punchOutTime,
      ]),
    });

    doc.addPage();
    doc.text("Leave Balance", 14, 10);
    doc.autoTable({
      startY: 15,
      head: [["Leave Type", "Allocated", "Used", "Remaining", "Pending"]],
      body: Object.entries(leaveBalance?.balances || {}).map(([type, balance]) => [
        type,
        balance.allocated,
        balance.used,
        balance.remaining,
        balance.pending,
      ]),
    });

    doc.save(`Employee_Summary_${selectedEmployee}.pdf`);
  };

  return (
    <ManagerOpsLayout>
      <div className="min-h-screen font-sans bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="p-6">
          <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
            <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
              <FaIdCard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Employee Summary Report
              </h1>
              <p className="text-white text-base opacity-90">
                View attendance and leave details for employees in the "Exozen - Ops" project.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
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
                          fetchAttendance(employee.employeeId); // Fetch attendance data
                          fetchLeaveDetails(employee.employeeId); // Fetch leave data
                        }}
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
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
                    <h2 className="text-2xl font-bold text-gray-800">
                      Summary for {selectedEmployee}
                    </h2>
                    <div className="flex gap-4">
                      <button
                        onClick={downloadExcel}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <FaFileExcel /> Download Excel
                      </button>
                      <button
                        onClick={downloadPDF}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <FaFilePdf /> Download PDF
                      </button>
                    </div>
                  </div>

                  {attendanceLoading || leaveLoading ? (
                    <div className="flex justify-center items-center">
                      <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Attendance Details
                        </h3>
                        {attendance.length > 0 ? (
                          <table className="w-full bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                              <tr>
                                <th className="p-4 text-left font-semibold">Date</th>
                                <th className="p-4 text-left font-semibold">Status</th>
                                <th className="p-4 text-left font-semibold">Total Working Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendance.map((record, index) => {
                                const totalWorkingHours =
                                  record.punchInTime && record.punchOutTime
                                    ? (
                                        (new Date(record.punchOutTime).getTime() -
                                          new Date(record.punchInTime).getTime()) /
                                        (1000 * 60 * 60)
                                      ).toFixed(2)
                                    : "N/A";

                                return (
                                  <tr
                                    key={index}
                                    className={`${
                                      index % 2 === 0 ? "bg-white" : "bg-gray-100"
                                    } hover:bg-blue-50 transition-colors`}
                                  >
                                    <td className="p-4 text-gray-700">
                                      {new Date(record.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-gray-700">{record.status}</td>
                                    <td className="p-4 text-gray-700">{totalWorkingHours}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-gray-600">No attendance data available.</p>
                        )}
                      </div>

                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Leave Details
                        </h3>
                        {leaveBalance && leaveHistory.length > 0 ? (
                          <div>
                            <h4 className="text-md font-semibold text-gray-700 mb-2">
                              Leave Balance
                            </h4>
                            <table className="w-full bg-gray-50 rounded-lg overflow-hidden shadow-sm mb-4">
                              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                <tr>
                                  <th className="p-4 text-left font-semibold">Leave Type</th>
                                  <th className="p-4 text-left font-semibold">Allocated</th>
                                  <th className="p-4 text-left font-semibold">Used</th>
                                  <th className="p-4 text-left font-semibold">Remaining</th>
                                  <th className="p-4 text-left font-semibold">Pending</th>
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
                                      <td className="p-4 text-gray-700">{type}</td>
                                      <td className="p-4 text-gray-700">{balance.allocated}</td>
                                      <td className="p-4 text-gray-700">{balance.used}</td>
                                      <td className="p-4 text-gray-700">{balance.remaining}</td>
                                      <td className="p-4 text-gray-700">{balance.pending}</td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>

                            <h4 className="text-md font-semibold text-gray-700 mb-2">
                              Leave History
                            </h4>
                            <table className="w-full bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
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
                                {leaveHistory.map((record, index) => (
                                  <tr
                                    key={record.leaveId}
                                    className={`${
                                      index % 2 === 0 ? "bg-white" : "bg-gray-100"
                                    } hover:bg-blue-50 transition-colors`}
                                  >
                                    <td className="p-4 text-gray-700">{record.leaveType}</td>
                                    <td className="p-4 text-gray-700">
                                      {new Date(record.startDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-gray-700">
                                      {new Date(record.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-gray-700">{record.numberOfDays}</td>
                                    <td className="p-4 text-gray-700">{record.status}</td>
                                    <td className="p-4 text-gray-700">{record.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-gray-600">No leave data available.</p>
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