"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaClock, FaRegCalendarAlt } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  projectName: string;
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
  status: string;
}

// Add new types for project-wise API
interface ProjectEmployee {
  employeeId: string;
  name: string;
  designation: string;
}
interface ProjectAttendanceRecord {
  _id: { employeeId: string; date: string };
  status: string;
  employeeId: string;
  date: string;
  name: string;
  designation: string;
}

export default function AttendanceViewPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("View Attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [projectEmployees, setProjectEmployees] = useState<ProjectEmployee[]>([]);
  const [projectAttendance, setProjectAttendance] = useState<ProjectAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // Fetch attendance data from API
  const fetchAttendance = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/attendance/all");
      const data = await res.json();
      if (data && data.attendance) {
        setAttendanceData(data.attendance as AttendanceRecord[]);
      } else {
        setAttendanceData([]);
      }
    } catch (err) {
      setError("Failed to fetch attendance data");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project-wise attendance data
  const fetchProjectAttendance = async (project: string, from: string, to: string) => {
    setLoading(true);
    setError("");
    try {
      const url = `https://cafm.zenapi.co.in/api/attendance/project/attendance?projectName=${encodeURIComponent(project)}&fromDate=${from || "2025-01-01"}&toDate=${to || new Date().toISOString().slice(0,10)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.employees && data.attendance) {
        setProjectEmployees(data.employees);
        setProjectAttendance(data.attendance);
      } else {
        setProjectEmployees([]);
        setProjectAttendance([]);
      }
    } catch (err) {
      setError("Failed to fetch project attendance data");
      setProjectEmployees([]);
      setProjectAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Set default project to 'Exozen-Ops' when switching to Project Wise Attendance
  useEffect(() => {
    if (activeTab === "Project Wise Attendance" && !projectFilter) {
      // Find if 'Exozen-Ops' exists in uniqueProjects
      const exozenProject = attendanceData.find(row => row.projectName === "Exozen-Ops");
      if (exozenProject) {
        setProjectFilter("Exozen-Ops");
      } else if (uniqueProjects.length > 0) {
        setProjectFilter(uniqueProjects[0]);
      }
    }
    // eslint-disable-next-line
  }, [activeTab, attendanceData]);

  // Fetch project attendance when project, fromDate, or toDate changes (only in Project Wise Attendance tab)
  useEffect(() => {
    if (activeTab === "Project Wise Attendance" && projectFilter) {
      fetchProjectAttendance(projectFilter, fromDate, toDate);
    }
    // eslint-disable-next-line
  }, [activeTab, projectFilter, fromDate, toDate]);

  // Helper to get YYYY-MM-DD from a date string
  const getDateOnly = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  // Filtering logic
  const filterAttendance = () => {
    return attendanceData.filter((record: AttendanceRecord) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        record.employeeId.toLowerCase().includes(searchLower) ||
        (record.projectName && record.projectName.toLowerCase().includes(searchLower)) ||
        (record.date && new Date(record.date).toLocaleDateString().includes(searchLower));
      // Date filter
      let matchesFrom = true, matchesTo = true;
      const recordDate = getDateOnly(record.date);
      if (fromDate) {
        matchesFrom = recordDate >= fromDate;
      }
      if (toDate) {
        matchesTo = recordDate <= toDate;
      }
      // Project filter (for Project Wise Attendance tab)
      let matchesProject = true;
      if (activeTab === "Project Wise Attendance" && projectFilter) {
        matchesProject = record.projectName === projectFilter;
      }
      return matchesSearch && matchesFrom && matchesTo && matchesProject;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date desc
  };

  const filteredAttendance = filterAttendance();

  // Filtered rows for Project Wise Attendance tab
  const filteredRows = attendanceData
    .filter((record: AttendanceRecord) => {
      // Project filter
      if (projectFilter && record.projectName !== projectFilter) return false;
      // Date filter
      let matchesFrom = true, matchesTo = true;
      const recordDate = getDateOnly(record.date);
      if (fromDate) {
        matchesFrom = recordDate >= fromDate;
      }
      if (toDate) {
        matchesTo = recordDate <= toDate;
      }
      return matchesFrom && matchesTo;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date desc
    .map(record => ({
      employeeId: record.employeeId,
      projectName: record.projectName,
      date: record.date ? new Date(record.date).toLocaleDateString() : "N/A",
      status: record.status || "N/A"
    }));

  // Unique projects for filter dropdown
  const uniqueProjects = Array.from(new Set(attendanceData.map((row: AttendanceRecord) => row.projectName)));

  // Calculate hours worked
  const calculateHours = (punchIn?: string, punchOut?: string) => {
    if (!punchIn || !punchOut) return "N/A";
    const inTime = new Date(punchIn);
    const outTime = new Date(punchOut);
    if (Number.isNaN(inTime.getTime()) || Number.isNaN(outTime.getTime())) return "N/A";
    const diffMs = outTime.getTime() - inTime.getTime();
    if (diffMs < 0) return "N/A";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  // Helper: filter projectAttendance by search, fromDate, toDate
  const filterProjectAttendance = () => {
    const searchLower = searchQuery.toLowerCase();
    return projectAttendance.filter((row) => {
      const matchesSearch =
        row.employeeId.toLowerCase().includes(searchLower) ||
        (row.name && row.name.toLowerCase().includes(searchLower)) ||
        (row.designation && row.designation.toLowerCase().includes(searchLower)) ||
        (row.date && new Date(row.date).toLocaleDateString().includes(searchLower));
      let matchesFrom = true, matchesTo = true;
      const recordDate = row.date ? row.date.slice(0, 10) : "";
      if (fromDate) matchesFrom = recordDate >= fromDate;
      if (toDate) matchesTo = recordDate <= toDate;
      return matchesSearch && matchesFrom && matchesTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

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
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-black border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
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
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
                style={theme === 'dark' ? {} : { color: '#000' }}
              />
              <FaRegCalendarAlt
                className={`absolute right-3 top-2.5 pointer-events-none ${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`}
                size={18}
              />
              <style jsx global>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                  opacity: 0;
                  display: none;
                }
                input[type="date"]::-ms-input-placeholder {
                  color: transparent;
                }
                input[type="date"]::-moz-placeholder {
                  color: transparent;
                }
                input[type="date"]:-ms-input-placeholder {
                  color: transparent;
                }
                input[type="date"]::placeholder {
                  color: transparent;
                }
              `}</style>
            </div>
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>To Date</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
                style={theme === 'dark' ? {} : { color: '#000' }}
              />
              <FaRegCalendarAlt
                className={`absolute right-3 top-2.5 pointer-events-none ${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`}
                size={18}
              />
            </div>
          </div>
          {/* Project Filter only for Project Wise Attendance tab */}
          {activeTab === "Project Wise Attendance" && (
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Project</label>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-black border-gray-300 focus:ring-blue-600'}`}
              >
                {/* No 'All Projects' option, only list unique projects */}
                {uniqueProjects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {/* Tab Content */}
        {activeTab === "View Attendance" && (
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}> {/* removed overflow-x-auto from here */}
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Attendance Records</h2>
              <div className="flex gap-2">
                <button className={`${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}>Export</button>
                <button
                  className={`${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}
                  onClick={fetchAttendance}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="relative">
              <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}> {/* table scrolls vertically */}
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Employee ID</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Project</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {filteredAttendance.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400">No records found.</td></tr>
                    )}
                    {filteredAttendance.map((record, index) => {
                      return (
                        <tr key={record._id || index} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>{record.employeeId}</span>
                          </td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{record.projectName}</td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{record.date ? new Date(record.date).toLocaleDateString() : "N/A"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${record.status === "Present" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : record.status === "Absent" ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{record.status || "N/A"}</span>
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
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}> {/* removed overflow-x-auto from here */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Project Wise Attendance</h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-300' : 'text-gray-500'}`}>Review and manage project wise attendance</p>
              </div>
            </div>
            <div className="relative">
              <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}> {/* table scrolls vertically */}
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Employee ID</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Name</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Designation</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {projectAttendance.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400">No records found.</td></tr>
                    )}
                    {projectAttendance.map((row, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.employeeId}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.name}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.designation}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.date ? new Date(row.date).toLocaleDateString() : "N/A"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${row.status === "Present" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : row.status === "Absent" ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{row.status}</span>
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