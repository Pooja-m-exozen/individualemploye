"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner } from "react-icons/fa";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [leaveBalances, setLeaveBalances] = useState<Record<string, Record<string, LeaveBalance>>>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [holidays, setHolidays] = useState<number>(2); // Example: Static holidays for the month.

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter((form: any) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: any) => ({
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
      <div className="min-h-screen font-sans bg-gray-100">
        <div className="p-6">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6 rounded-lg shadow mb-6">
            <h1 className="text-3xl font-bold">Attendance Employee-Wise</h1>
            <p className="text-sm mt-2">View detailed attendance and leave summaries for all employees.</p>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-blue-600 text-white">
                  <tr>
                    <th className="p-3 border">Employee Image</th>
                    <th className="p-3 border">Employee ID</th>
                    <th className="p-3 border">Name</th>
                    <th className="p-3 border">Designation</th>
                    <th className="p-3 border">Total Days</th>
                    <th className="p-3 border">Present Days</th>
                    <th className="p-3 border">Half Days</th>
                    <th className="p-3 border">Partially Absent</th>
                    <th className="p-3 border">Week Offs</th>
                    <th className="p-3 border">Holidays</th>
                    <th className="p-3 border">Used EL</th>
                    <th className="p-3 border">Used CL</th>
                    <th className="p-3 border">Used SL</th>
                    <th className="p-3 border">Comp Off</th>
                    <th className="p-3 border">Loss of Pay</th>
                    <th className="p-3 border">Total Payable Days</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, index) => {
                    const summary = calculateAttendanceSummary(employee.employeeId);
                    return (
                      <tr
                        key={employee.employeeId}
                        className={`hover:bg-gray-100 ${
                          index % 2 === 0 ? "bg-gray-50" : "bg-white"
                        }`}
                      >
                        <td className="p-3 border">
                          <img
                            src={employee.imageUrl}
                            alt={employee.fullName}
                            className="w-12 h-12 rounded-full"
                            onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                          />
                        </td>
                        <td className="p-3 border">{employee.employeeId}</td>
                        <td className="p-3 border">{employee.fullName}</td>
                        <td className="p-3 border">{employee.designation}</td>
                        <td className="p-3 border">{summary.totalDays}</td>
                        <td className="p-3 border">{summary.presentDays}</td>
                        <td className="p-3 border">{summary.halfDays}</td>
                        <td className="p-3 border">{summary.partialAbsentDays}</td>
                        <td className="p-3 border">{summary.weekOffs}</td>
                        <td className="p-3 border">{summary.holidays}</td>
                        <td className="p-3 border">{summary.usedEL}</td>
                        <td className="p-3 border">{summary.usedCL}</td>
                        <td className="p-3 border">{summary.usedSL}</td>
                        <td className="p-3 border">{summary.usedCompOff}</td>
                        <td className="p-3 border">{summary.lossOfPay}</td>
                        <td className="p-3 border">{summary.totalPayableDays}</td>
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