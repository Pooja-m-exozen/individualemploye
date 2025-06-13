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
  imageUrl: string; // Added for employee image
}

interface Attendance {
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
}

const OverallAttendancePage = (): JSX.Element => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

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
              imageUrl: form.personalDetails.employeeImage || "/default-avatar.png", // Corrected property for employee image
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

    if (employees.length > 0) {
      fetchAttendance();
    }
  }, [employees, month, year]);

  const calculateStatus = (punchInTime: string | null, punchOutTime: string | null): string => {
    if (!punchInTime || !punchOutTime) return "A"; // Absent
    const hoursWorked =
      (new Date(punchOutTime).getTime() - new Date(punchInTime).getTime()) / (1000 * 60 * 60);

    if (hoursWorked >= 8) return "P"; // Present
    if (hoursWorked > 4.5 && hoursWorked < 8) return "H/A"; // Half-day Present
    if (hoursWorked > 1 && hoursWorked <= 4.5) return "P/A"; // Partial Present
    return "A"; // Absent
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "P":
        return "bg-green-100 text-green-700";
      case "A":
        return "bg-red-100 text-red-700";
      case "H/A":
        return "bg-orange-100 text-orange-700";
      case "P/A":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Overall Attendance Report", 14, 10);
    const tableData = employees.map((employee) => {
      const row = [
        employee.employeeId,
        employee.fullName,
        ...Array.from({ length: 31 }, (_, i) => {
          const date = new Date(year, month - 1, i + 1).toISOString().split("T")[0];
          const attendanceRecord = attendanceData[employee.employeeId]?.find(
            (record) => record.date === date
          );
          return attendanceRecord
            ? calculateStatus(attendanceRecord.punchInTime, attendanceRecord.punchOutTime)
            : "A";
        }),
      ];
      return row;
    });

    const headers = [
      "Employee ID",
      "Employee Name",
      ...Array.from({ length: 31 }, (_, i) =>
        new Date(year, month - 1, i + 1).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
        })
      ),
    ];

    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 20,
    });

    doc.save("Overall_Attendance_Report.pdf");
  };

  const downloadExcel = () => {
    const worksheetData = employees.map((employee) => ({
      "Employee ID": employee.employeeId,
      "Employee Name": employee.fullName,
      ...Object.fromEntries(
        Array.from({ length: 31 }, (_, i) => {
          const date = new Date(year, month - 1, i + 1).toISOString().split("T")[0];
          const attendanceRecord = attendanceData[employee.employeeId]?.find(
            (record) => record.date === date
          );
          const status = attendanceRecord
            ? calculateStatus(attendanceRecord.punchInTime, attendanceRecord.punchOutTime)
            : "A";
          return [
            new Date(year, month - 1, i + 1).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
            }),
            status,
          ];
        })
      ),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Overall Attendance");
    XLSX.writeFile(workbook, "Overall_Attendance_Report.xlsx");
  };

  return (
    <ManagerOpsLayout>
      <div className="min-h-screen font-sans bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="p-6">
          {/* Header */}
          <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
            <h1 className="text-3xl font-bold text-white">Overall Attendance Report</h1>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border rounded-lg p-2"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border rounded-lg p-2"
            >
              {[2025, 2024, 2023].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Download Buttons */}
          <div className="flex justify-end gap-4 mb-6">
            <button
              onClick={downloadExcel}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Download Excel
            </button>
            <button
              onClick={downloadPDF}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Download PDF
            </button>
          </div>

          {/* Attendance Table */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-md overflow-hidden">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                  <tr>
                    <th className="p-4 text-left font-semibold">Employee Image</th>
                    <th className="p-4 text-left font-semibold">Employee ID</th>
                    <th className="p-4 text-left font-semibold">Employee Name</th>
                    {Array.from({ length: 31 }, (_, i) => (
                      <th key={i + 1} className="p-4 text-center font-semibold">
                        {new Date(year, month - 1, i + 1).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.employeeId} className="border-b hover:bg-gray-100">
                      <td className="p-4 text-gray-700">
                        <img
                          src={employee.imageUrl}
                          alt={employee.fullName}
                          className="w-12 h-12 rounded-full border border-gray-300"
                        />
                      </td>
                      <td className="p-4 text-gray-700 font-medium">{employee.employeeId}</td>
                      <td className="p-4 text-gray-700 font-medium">{employee.fullName}</td>
                      {Array.from({ length: 31 }, (_, i) => {
                        const date = new Date(year, month - 1, i + 1).toISOString().split("T")[0];
                        const attendanceRecord = attendanceData[employee.employeeId]?.find(
                          (record) => record.date === date
                        );
                        const status = attendanceRecord
                          ? calculateStatus(attendanceRecord.punchInTime, attendanceRecord.punchOutTime)
                          : "A";
                        return (
                          <td
                            key={i + 1}
                            className={`p-4 text-center ${getStatusColor(status)} font-semibold`}
                          >
                            {status}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ManagerOpsLayout>
  );
};

export default OverallAttendancePage;