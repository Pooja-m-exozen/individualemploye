"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaUser, FaIdCard, FaBriefcase } from "react-icons/fa";
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
  _id?: string; // Added property
}

const EmployeeWiseAttendancePage = (): JSX.Element => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);

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
        `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${month}&year=${year}`
      );
      const data = await response.json();

      if (data.attendance) {
        setAttendance(data.attendance);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      attendance.map((record) => ({
        Date: new Date(record.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        Project: record.projectName || "N/A",
        "Check-In": record.punchInTime
          ? new Date(record.punchInTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "N/A",
        "Check-Out": record.punchOutTime
          ? new Date(record.punchOutTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "N/A",
        "Hours Worked":
          record.punchInTime && record.punchOutTime
            ? (
                (new Date(record.punchOutTime).getTime() -
                  new Date(record.punchInTime).getTime()) /
                (1000 * 60 * 60)
              ).toFixed(2)
            : "N/A",
        "Day Type": record.isLate ? "Late" : "Regular",
        Status: record.status,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "Attendance_Report.xlsx");
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 10);
    doc.autoTable({
      head: [
        [
          "Date",
          "Project",
          "Check-In",
          "Check-Out",
          "Hours Worked",
          "Day Type",
          "Status",
        ],
      ],
      body: attendance.map((record) => [
        new Date(record.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        record.projectName || "N/A",
        record.punchInTime
          ? new Date(record.punchInTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "N/A",
        record.punchOutTime
          ? new Date(record.punchOutTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "N/A",
        record.punchInTime && record.punchOutTime
          ? (
              (new Date(record.punchOutTime).getTime() -
                new Date(record.punchInTime).getTime()) /
              (1000 * 60 * 60)
            ).toFixed(2)
          : "N/A",
        record.isLate ? "Late" : "Regular",
        record.status,
      ]),
      startY: 20,
    });
    doc.save("Attendance_Report.pdf");
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
                Employee-wise Attendance Report
              </h1>
              <p className="text-white text-base opacity-90">
                View attendance details for employees in the "Exozen - Ops"
                project.
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
              <div className="flex gap-4 mb-4">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="border rounded-lg p-2"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("default", {
                        month: "long",
                      })}
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
                          fetchAttendance(employee.employeeId);
                        }}
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        View Attendance
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance Details */}
              {selectedEmployee && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                      Attendance Details for {selectedEmployee}
                    </h2>
                    <div className="flex gap-4">
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
                  </div>

                  {attendanceLoading ? (
                    <div className="flex justify-center items-center">
                      <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
                    </div>
                  ) : attendance.length === 0 ? (
                    <p className="text-gray-600 text-lg">
                      No attendance records found for the selected month.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full bg-white rounded-lg shadow-md overflow-hidden">
                        <thead className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
                          <tr>
                            <th className="p-4 text-left font-semibold">Date</th>
                            <th className="p-4 text-left font-semibold">Project</th>
                            <th className="p-4 text-left font-semibold">Check-In</th>
                            <th className="p-4 text-left font-semibold">Check-Out</th>
                            <th className="p-4 text-left font-semibold">Hours Worked</th>
                            <th className="p-4 text-left font-semibold">Day Type</th>
                            <th className="p-4 text-left font-semibold">Status</th>
                            <th className="p-4 text-left font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((record, index) => {
                            const hoursWorked =
                              record.punchInTime && record.punchOutTime
                                ? (
                                    (new Date(record.punchOutTime).getTime() -
                                      new Date(record.punchInTime).getTime()) /
                                    (1000 * 60 * 60)
                                  ).toFixed(2)
                                : "N/A";

                            return (
                              <tr
                                key={record._id}
                                className={`border-b ${
                                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                                } hover:bg-gray-100 transition-colors`}
                              >
                                <td className="p-4 text-gray-700">
                                  {new Date(record.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                                </td>
                                <td className="p-4 text-gray-700">
                                  {record.projectName || "N/A"}
                                </td>
                                <td className="p-4 text-gray-700">
                                  {record.punchInTime
                                    ? new Date(record.punchInTime).toLocaleTimeString(
                                        "en-US",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        }
                                      )
                                    : "N/A"}
                                </td>
                                <td className="p-4 text-gray-700">
                                  {record.punchOutTime
                                    ? new Date(record.punchOutTime).toLocaleTimeString(
                                        "en-US",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        }
                                      )
                                    : "N/A"}
                                </td>
                                <td className="p-4 text-gray-700">{hoursWorked}</td>
                                <td className="p-4 text-gray-700">
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm ${
                                      record.isLate
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {record.isLate ? "Late" : "Regular"}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm ${
                                      record.status === "Present"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {record.status}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <button
                                    onClick={() =>
                                      console.log("Viewing record:", record)
                                    }
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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

export default EmployeeWiseAttendancePage;