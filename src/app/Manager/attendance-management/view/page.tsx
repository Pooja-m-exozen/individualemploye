"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaClock, FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

export default function AttendanceViewPage() {
  const { theme } = useTheme();
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
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-700 text-blue-100' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white'} rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg`}>
          <div className={`${theme === 'dark' ? 'bg-gray-900 text-blue-400' : 'bg-white text-blue-600'} p-6 rounded-full flex items-center justify-center shadow-md`}>
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
                  ? theme === 'dark'
                    ? 'bg-blue-800 text-white shadow-lg'
                    : 'bg-blue-600 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gray-900 text-blue-200 hover:bg-blue-800 hover:text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Filters */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-4 rounded-lg shadow flex items-center gap-4`}>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Employee ID, Project, or Date"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'focus:ring-blue-600'}`}
              />
              <FaClock className={`${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'} absolute right-3 top-2.5`} />
            </div>
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>From Date</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'focus:ring-blue-600'}`}
              />
              <FaSignInAlt className={`${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'} absolute right-3 top-2.5`} />
            </div>
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>To Date</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'focus:ring-blue-600'}`}
              />
              <FaSignOutAlt className={`${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'} absolute right-3 top-2.5`} />
            </div>
          </div>
          {/* Project Filter only for Project Wise Attendance tab */}
          {activeTab === "Project Wise Attendance" && (
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Project</label>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800' : 'focus:ring-blue-600'}`}
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
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 overflow-x-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Attendance Records</h2>
              <div className="flex gap-2">
                <button className={`${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}>Export</button>
                <button className={`${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}>Refresh</button>
              </div>
            </div>
            <div className="relative">
              <div className={`overflow-x-auto rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Employee</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Employee ID</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Project</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Punch In</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Punch Out</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Status</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {attendanceRecords.map((record, index) => {
                      const employee = employees.find(emp => emp.employeeId === record.employeeId);
                      const hoursWorked = calculateHours(record.punchInTime, record.punchOutTime);
                      return (
                        <tr key={index} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img src={employee?.imageUrl || "/default-avatar.png"} alt={employee?.fullName || "Employee"} className={`w-10 h-10 rounded-full object-cover ring-2 ${theme === 'dark' ? 'ring-gray-800' : 'ring-gray-100'}`} />
                                <span className={`absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ${theme === 'dark' ? 'ring-gray-900' : 'ring-white'}`}></span>
                              </div>
                              <div>
                                <p className={`font-medium ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>{employee?.fullName || "N/A"}</p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-gray-500'}`}>{employee?.designation || "N/A"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>{record.employeeId}</span>
                          </td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>{record.projectName}</td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{record.date}</td>
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
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${record.status === "Present" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : record.status === "Absent" ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{record.status || "N/A"}</span>
                          </td>
                          <td className={`px-6 py-4 font-medium ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>{hoursWorked}</td>
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
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 overflow-x-auto`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Project Wise Attendance</h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-300' : 'text-gray-500'}`}>Review and manage project wise attendance</p>
              </div>
            </div>
            <div className="relative">
              <div className={`overflow-x-auto rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Project</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Employee</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{row.projectName}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{row.employee}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{row.date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>{row.status}</span>
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