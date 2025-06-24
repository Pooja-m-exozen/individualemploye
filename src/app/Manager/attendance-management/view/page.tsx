"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaClock, FaSignInAlt, FaSignOutAlt } from "react-icons/fa";

export default function AttendanceViewPage() {
  const [activeTab, setActiveTab] = useState("View Attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  // Dummy data
  const employees = [
    { employeeId: "EFMS3257", fullName: "John Doe", designation: "Software Engineer", projectName: "Exozen-Ops", imageUrl: "https://via.placeholder.com/50" },
    { employeeId: "EFMS3258", fullName: "Jane Smith", designation: "Project Manager", projectName: "Exozen-Ops", imageUrl: "https://via.placeholder.com/50" },
  ];
  const attendanceRecords = [
    { employeeId: "EFMS3257", projectName: "Exozen-Ops", date: "2025-06-13", punchInTime: "09:00 AM", punchOutTime: "05:00 PM", status: "Present" },
    { employeeId: "EFMS3258", projectName: "Exozen-Ops", date: "2025-06-13", punchInTime: "09:30 AM", punchOutTime: "05:30 PM", status: "Present" },
  ];
  const regularizationRequests = [
    { requestId: "REQ001", employeeId: "EFMS3257", fullName: "John Doe", projectName: "Exozen-Ops", date: "2025-06-12", reason: "Forgot to punch in", status: "Pending" },
    { requestId: "REQ002", employeeId: "EFMS3258", fullName: "Jane Smith", projectName: "Exozen-Ops", date: "2025-06-11", reason: "System error during punch out", status: "Approved" },
  ];

  const calculateHours = (punchIn: string, punchOut: string) => {
    // Dummy calculation
    return punchIn && punchOut ? "8h 0m" : "N/A";
  };

  const attendanceRows = [
    { projectName: "Exozen-Ops", employee: "John Doe (EFMS3257)", date: "2025-06-13", status: "Present" },
    { projectName: "Exozen-Ops", employee: "Jane Smith (EFMS3258)", date: "2025-06-13", status: "Present" },
    // Add more rows with different projectName if needed
  ];
  const uniqueProjects = Array.from(new Set(attendanceRows.map(row => row.projectName)));
  const filteredRows = projectFilter ? attendanceRows.filter(row => row.projectName === projectFilter) : attendanceRows;

  return (
    <ManagerDashboardLayout>
      <div className="p-4 md:p-8 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg">
          <div className="bg-white text-blue-600 p-6 rounded-full flex items-center justify-center shadow-md">
            <FaClock className="text-3xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-lg">Manage attendance and regularization requests for employees.</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {["View Attendance", "Project Wise Attendance"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Employee ID, Project, or Date"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <FaClock className="absolute right-3 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <FaSignInAlt className="absolute right-3 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <FaSignOutAlt className="absolute right-3 top-2.5 text-gray-400" />
            </div>
          </div>
          {/* Project Filter only for Project Wise Attendance tab */}
          {activeTab === "Project Wise Attendance" && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Projects</option>
                {uniqueProjects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {/* Tab Content */}
        {activeTab === "View Attendance" && (
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Attendance Records</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2">Export</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">Refresh</button>
              </div>
            </div>
            <div className="relative">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Punch In</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Punch Out</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendanceRecords.map((record, index) => {
                      const employee = employees.find(emp => emp.employeeId === record.employeeId);
                      const hoursWorked = calculateHours(record.punchInTime, record.punchOutTime);
                      return (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img src={employee?.imageUrl || "/default-avatar.png"} alt={employee?.fullName || "Employee"} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"></span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{employee?.fullName || "N/A"}</p>
                                <p className="text-sm text-gray-500">{employee?.designation || "N/A"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{record.employeeId}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{record.projectName}</td>
                          <td className="px-6 py-4">{record.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-green-600">
                              <FaSignInAlt />
                              {record.punchInTime || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-red-600">
                              <FaSignOutAlt />
                              {record.punchOutTime || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${record.status === "Present" ? "bg-green-100 text-green-800" : record.status === "Absent" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{record.status || "N/A"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">{hoursWorked}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === "Project Wise Attendance" && (
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Project Wise Attendance</h2>
                <p className="text-sm text-gray-500 mt-1">Review and manage project wise attendance</p>
              </div>
            </div>
            <div className="relative">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4">{row.projectName}</td>
                        <td className="px-6 py-4">{row.employee}</td>
                        <td className="px-6 py-4">{row.date}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
} 