"use client";

import React, { JSX, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner } from "react-icons/fa";
// import jsPDF from "jspdf";
import "jspdf-autotable";
// import * as XLSX from "xlsx";
import Image from "next/image";

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  imageUrl: string;
}

interface Attendance {
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
}

interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
  pending: number;
}

const OverallSummaryPage = (): JSX.Element => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [leaveBalances, setLeaveBalances] = useState<Record<string, Record<string, LeaveBalance>>>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [month] = useState<number>(new Date().getMonth() + 1);
  const [year] = useState<number>(new Date().getFullYear());
  const [holidays] = useState<number>(2); // Example: Static holidays for the month.

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        type KycForm = {
          personalDetails: {
            projectName: string;
            employeeId: string;
            fullName: string;
            designation: string;
            employeeImage?: string;
          };
        };

        if (data.kycForms) {
          const filteredEmployees = (data.kycForms as KycForm[])
            .filter((form) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form) => ({
              employeeId: form.personalDetails.employeeId,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              imageUrl: form.personalDetails.employeeImage || "/default-avatar.png",
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

  useEffect(() => {
    const fetchAttendance = async () => {
      const attendancePromises = employees.map(async (employee) => {
        const response = await fetch(
          `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employee.employeeId}&month=${month}&year=${year}`
        );
        const data = await response.json();
        return { employeeId: employee.employeeId, attendance: data.attendance || [] };
      });

      const results = await Promise.all(attendancePromises);
      const attendanceMap: Record<string, Attendance[]> = {};
      results.forEach((result) => {
        attendanceMap[result.employeeId] = result.attendance;
      });
      setAttendanceData(attendanceMap);
    };

    const fetchLeaveBalances = async () => {
      const balancePromises = employees.map(async (employee) => {
        const response = await fetch(
          `https://cafm.zenapi.co.in/api/leave/balance/${employee.employeeId}`
        );
        const data = await response.json();
        return { employeeId: employee.employeeId, balances: data.balances || {} };
      });

      const results = await Promise.all(balancePromises);
      const balancesMap: Record<string, Record<string, LeaveBalance>> = {};
      results.forEach((result) => {
        balancesMap[result.employeeId] = result.balances;
      });
      setLeaveBalances(balancesMap);
    };

    if (employees.length > 0) {
      fetchAttendance();
      fetchLeaveBalances();
    }
  }, [employees, month, year]);

  const calculateAttendanceSummary = (employeeId: string) => {
    const attendance = attendanceData[employeeId] || [];
    const totalDays = new Date(year, month, 0).getDate();
    const weekOffs = Array.from({ length: totalDays }, (_, i) => new Date(year, month - 1, i + 1))
      .filter((date) => date.getDay() === 0 || date.getDay() === 6) // Sundays and Saturdays
      .length;

    let presentDays = 0;
    let halfDays = 0;
    let partialAbsentDays = 0;
    let absentDays = 0;

    attendance.forEach((record) => {
      const status = calculateStatus(record.punchInTime, record.punchOutTime);
      if (status === "P") presentDays++;
      else if (status === "H/A") halfDays++;
      else if (status === "P/A") partialAbsentDays++;
      else absentDays++;
    });

    const usedLeaves = leaveBalances[employeeId] || {};
    const usedEL = usedLeaves["EL"]?.used || 0;
    const usedCL = usedLeaves["CL"]?.used || 0;
    const usedSL = usedLeaves["SL"]?.used || 0;
    const usedCompOff = usedLeaves["CompOff"]?.used || 0;
    const lossOfPay = absentDays;

    const totalPayableDays =
      presentDays + halfDays * 0.5 + partialAbsentDays * 0.25 + usedEL + usedCL + usedSL + usedCompOff;

    return {
      totalDays,
      presentDays,
      halfDays,
      partialAbsentDays,
      weekOffs,
      holidays,
      usedEL,
      usedCL,
      usedSL,
      usedCompOff,
      lossOfPay,
      totalPayableDays,
    };
  };

  const calculateStatus = (punchInTime: string | null, punchOutTime: string | null): string => {
    if (!punchInTime || !punchOutTime) return "A"; // Absent
    const hoursWorked =
      (new Date(punchOutTime).getTime() - new Date(punchInTime).getTime()) / (1000 * 60 * 60);

    if (hoursWorked >= 8) return "P"; // Present
    if (hoursWorked > 4.5 && hoursWorked < 8) return "H/A"; // Half-day Present
    if (hoursWorked > 1 && hoursWorked <= 4.5) return "P/A"; // Partial Present
    return "A"; // Absent
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
          <div className={`rounded-2xl p-6 shadow-lg ${
            theme === 'light' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-800' 
              : 'bg-gradient-to-r from-gray-700 to-gray-800'
          }`}>
            <h1 className="text-3xl font-bold text-white">Attendance Employee-Wise</h1>
            <p className="text-white text-sm mt-2 opacity-90">
              View detailed attendance and leave summaries for all employees.
            </p>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className={`animate-spin ${
                theme === 'light' ? 'text-blue-600' : 'text-blue-400'
              } w-12 h-12`} />
            </div>
          ) : (
            <div className={`rounded-lg shadow-lg p-4 overflow-x-auto ${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            }`}>
              <table className="w-full text-left border-collapse">
                <thead className={`sticky top-0 ${
                  theme === 'light'
                    ? 'bg-gray-50 text-gray-700'
                    : 'bg-gray-800 text-gray-200'
                }`}>
                  <tr>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Employee Image</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Employee ID</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Name</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Designation</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Total Days</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Present Days</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Half Days</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Partially Absent</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Week Offs</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Holidays</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Used EL</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Used CL</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Used SL</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Comp Off</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Loss of Pay</th>
                    <th className={`p-3 border ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                    }`}>Total Payable Days</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'light' ? 'divide-gray-200' : 'divide-gray-700'
                }`}>
                  {employees.map((employee, index) => {
                    const summary = calculateAttendanceSummary(employee.employeeId);
                    return (
                      <tr
                        key={employee.employeeId}
                        className={`${
                          theme === 'light'
                            ? index % 2 === 0
                              ? 'bg-white hover:bg-gray-50'
                              : 'bg-gray-50 hover:bg-gray-100'
                            : index % 2 === 0
                              ? 'bg-gray-800 hover:bg-gray-750'
                              : 'bg-gray-750 hover:bg-gray-700'
                        }`}
                      >
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                        }`}>
                          <Image
                            src={employee.imageUrl}
                            alt={employee.fullName}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        </td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{employee.employeeId}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{employee.fullName}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{employee.designation}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.totalDays}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.presentDays}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.halfDays}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.partialAbsentDays}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.weekOffs}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.holidays}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.usedEL}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.usedCL}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.usedSL}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.usedCompOff}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.lossOfPay}</td>
                        <td className={`p-3 border ${
                          theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-200'
                        }`}>{summary.totalPayableDays}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ManagerOpsLayout>
  );
};

export default OverallSummaryPage;