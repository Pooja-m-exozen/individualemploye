"use client";

import React from "react";
import Image from "next/image";

import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaSpinner, FaUser } from "react-icons/fa";
// import { Bar, Doughnut } from "react-chartjs-2";
import { useTheme } from "@/context/ThemeContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement, // Register BarElement for Bar charts
  ArcElement, // Register ArcElement for Doughnut charts
  Title,
  Tooltip,
  Legend
);

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
  projectName: string;
}

// Types for API responses
interface KycForm {
  personalDetails: {
    employeeId: string;
    employeeImage: string;
    fullName: string;
    designation: string;
    projectName: string;
  };
}

interface KycApiResponse {
  kycForms: KycForm[];
}

interface PunctualityStats {
  punctualityIssues?: {
    lateArrivals?: number;
    earlyArrivals?: number;
    earlyLeaves?: number;
  };
  lateArrivals?: number;
  earlyArrivals?: number;
  earlyLeaves?: number;
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  halfDays: number;
  partiallyAbsentDays: number;
  weekOffs: number;
  holidays: number;
  el: number;
  sl: number;
  cl: number;
  compOff: number;
  lop: number;
}

interface GraphData {
  totalDays: number;
  presentDays: number;
  halfDays: number;
  partiallyAbsentDays: number;
  weekOffs: number;
  holidays: number;
  el: number;
  sl: number;
  cl: number;
  compOff: number;
  lop: number;
  attendanceRate: string;
  punctualityIssues: {
    lateArrivals: number;
    earlyArrivals: number;
    earlyLeaves: number;
  };
}

const TeamOverviewPage = () => {
  const { theme } = useTheme();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [graphData, setGraphData] = React.useState<GraphData | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<string>("5"); // Default month
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("");

  // Get unique project names for dropdown
  const projectNames = React.useMemo(() => {
    const names = employees.map(e => e.projectName).filter(Boolean);
    return ["all", ...Array.from(new Set(names))];
  }, [employees]);

  // Filter employees by project and search
  const filteredEmployees = employees.filter(emp => {
    const matchesProject = projectFilter === "all" || emp.projectName === projectFilter;
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      emp.employeeId.toLowerCase().includes(search) ||
      emp.fullName.toLowerCase().includes(search) ||
      emp.designation.toLowerCase().includes(search) ||
      emp.projectName.toLowerCase().includes(search);
    return matchesProject && matchesSearch;
  });

  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data: KycApiResponse = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            // .filter(
            //   (form: KycForm) =>
            //     form.personalDetails.projectName === "Exozen - Ops" // Filter by project name
            // )
            .map((form: KycForm) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              projectName: form.personalDetails.projectName,
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

  const fetchGraphData = async (employeeId: string | undefined, month: string) => {
    if (!employeeId) return;

    try {
      const attendanceSummaryResponse = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-summary?month=${month}&year=2025`
      );
      const attendanceSummaryData: {
        success: boolean;
        data: { summary: AttendanceSummary };
        message?: string;
      } = await attendanceSummaryResponse.json();

      const punctualityStatsResponse = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-stats?month=${month}&year=2025`
      );
      const punctualityStatsData: {
        success: boolean;
        data: PunctualityStats;
        message?: string;
      } = await punctualityStatsResponse.json();

      if (attendanceSummaryData.success && punctualityStatsData.success) {
        const attendanceStats = attendanceSummaryData.data.summary || {};
        const punctualityStats = punctualityStatsData.data || {};

        setGraphData({
          totalDays: attendanceStats.totalDays || 0,
          presentDays: attendanceStats.presentDays || 0,
          halfDays: attendanceStats.halfDays || 0,
          partiallyAbsentDays: attendanceStats.partiallyAbsentDays || 0,
          weekOffs: attendanceStats.weekOffs || 0,
          holidays: attendanceStats.holidays || 0,
          el: attendanceStats.el || 0,
          sl: attendanceStats.sl || 0,
          cl: attendanceStats.cl || 0,
          compOff: attendanceStats.compOff || 0,
          lop: attendanceStats.lop || 0,
          attendanceRate: attendanceStats.totalDays
            ? ((attendanceStats.presentDays / attendanceStats.totalDays) * 100).toFixed(2) + "%"
            : "0%",
          punctualityIssues: {
            lateArrivals: (punctualityStats.punctualityIssues?.lateArrivals ?? punctualityStats.lateArrivals) || 0,
            earlyArrivals: (punctualityStats.punctualityIssues?.earlyArrivals ?? punctualityStats.earlyArrivals) || 0,
            earlyLeaves: (punctualityStats.punctualityIssues?.earlyLeaves ?? punctualityStats.earlyLeaves) || 0,
          },
        });
      } else {
        console.error(
          "Failed to fetch data:",
          attendanceSummaryData.message || punctualityStatsData.message
        );
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  React.useEffect(() => {
    if (selectedEmployee) {
      fetchGraphData(selectedEmployee.employeeId, selectedMonth);
    }
  }, [selectedMonth, selectedEmployee]);

  return (
    <AdminDashboardLayout>
      <div className={`flex flex-col gap-6 p-4 lg:p-6 max-w-7xl mx-auto w-full font-sans ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'
      }`}>
        {/* Header */}
        <div className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-0 shadow-lg ${
          theme === 'dark'
            ? 'bg-[#2d3748] text-blue-100'
            : ''
        }`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
              <FaUser className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Team Overview</h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center w-full sm:w-auto">
            {/* Project Dropdown */}
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-blue-900/20 text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              {projectNames.map(name => (
                <option key={name} value={name}>{name === "all" ? "All Projects" : name}</option>
              ))}
            </select>
            {/* Search Bar */}
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by ID, name, designation, project..."
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-64 ${theme === 'dark' ? 'bg-blue-900/20 text-blue-100 placeholder-blue-200 focus:ring-blue-300' : 'bg-white/80 text-gray-900 placeholder-gray-500 focus:ring-white'}`}
            />
          </div>
        </div>
        {/* Content */}
        <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'} rounded-b-xl shadow-md border border-t-0`}>
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center min-h-[300px]">
                <FaSpinner className={`animate-spin ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                } w-12 h-12`} />
              </div>
            ) : employees.length === 0 ? (
              <div className={`$${
                theme === 'dark'
                  ? 'bg-yellow-900/20 text-yellow-200'
                  : 'bg-yellow-50 text-yellow-600'
              } p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg`}>
                <FaUser className="w-6 h-6 flex-shrink-0" />
                <p className="text-lg font-medium">
                  No employees found.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Employee Details Cards */}
                <div className={`${
                  theme === 'dark'
                    ? 'bg-gray-800 shadow-lg'
                    : 'bg-white shadow-lg'
                } rounded-lg p-4 sm:p-6`}> 
                  <h2 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Employee Details</h2>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto pr-1 sm:pr-2">
                    {filteredEmployees.map((employee) => (
                      <div
                        key={employee.employeeId}
                        className={`$${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600'
                            : 'bg-white border-gray-200'
                        } rounded-xl border p-3 sm:p-4 transition-all duration-200 hover:shadow-md ${
                          selectedEmployee?.employeeId === employee.employeeId
                            ? 'ring-2 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ${
                            theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'
                          } flex-shrink-0`}>
                            {employee.employeeImage ? (
                              <Image
                                src={employee.employeeImage}
                                alt={employee.fullName}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-100">
                                <FaUser className="w-7 h-7 text-blue-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow">
                            <h3 className={`text-sm sm:text-base font-semibold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-800'
                            }`}>{employee.fullName}</h3>
                            <p className={`text-xs sm:text-sm ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                            }`}>{employee.designation}</p>
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            } mt-1`}>ID: {employee.employeeId}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              fetchGraphData(employee.employeeId, selectedMonth);
                            }}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                              selectedEmployee?.employeeId === employee.employeeId
                                ? 'bg-blue-600 text-white'
                                : theme === 'dark'
                                  ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            {selectedEmployee?.employeeId === employee.employeeId ? 'Selected' : 'View Details'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Graph Section */}
                <div className={`${
                  theme === 'dark'
                    ? 'bg-gray-800 shadow-lg'
                    : 'bg-white shadow-lg'
                } rounded-lg p-4 sm:p-6 flex flex-col items-center`}>
                  {/* Month Selector */}
                  <div className="w-full mb-4 sm:mb-6">
                    <label
                      htmlFor="month-select"
                      className={`block text-sm sm:text-base font-medium mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      Select Month:
                    </label>
                    <select
                      id="month-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-white text-gray-900 border-gray-200'
                      }`}
                    >
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                  {selectedEmployee && graphData ? (
                    <div className="flex flex-col gap-4 sm:gap-6 w-full">
                      {/* Employee Image Section */}
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-lg border-4 border-blue-500">
                          {selectedEmployee.employeeImage ? (
                            <Image
                              src={selectedEmployee.employeeImage}
                              alt={selectedEmployee.fullName}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className="w-16 h-16 sm:w-20 sm:h-20 text-blue-500" />
                          )}
                        </div>
                      </div>
                      {/* Graphs Grid */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                        {/* Punctuality Issues */}
                        <div className={`rounded-xl p-4 sm:p-6 ${
                          theme === 'dark'
                            ? 'bg-gray-700'
                            : 'bg-white'
                        } shadow-lg`}>
                          <h3 className={`text-base sm:text-lg font-bold mb-2 sm:mb-4 text-center ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            Punctuality Stats
                          </h3>
                          <div className="relative flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 mx-auto">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="45"
                                strokeWidth="10"
                                fill="none"
                                className={theme === 'dark' ? 'stroke-gray-600' : 'stroke-gray-200'}
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="45"
                                strokeWidth="10"
                                fill="none"
                                className="stroke-blue-500"
                                strokeDasharray={`${(parseFloat(graphData.attendanceRate) / 100) * 282.74}, 282.74`}
                                strokeDashoffset="0"
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 0.5s' }}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl font-bold"
                              style={{ pointerEvents: 'none' }}
                            >
                              {graphData.attendanceRate}
                            </span>
                          </div>
                          {/* Punctuality Details */}
                          <div className={`mt-4 grid grid-cols-1 gap-1 sm:gap-2 text-xs sm:text-sm ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            <p>Late Arrivals: {graphData.punctualityIssues.lateArrivals}</p>
                            <p>Early Arrivals: {graphData.punctualityIssues.earlyArrivals}</p>
                            <p>Early Leaves: {graphData.punctualityIssues.earlyLeaves}</p>
                          </div>
                        </div>
                        {/* Attendance Summary */}
                        <div className={`rounded-xl p-4 sm:p-6 ${
                          theme === 'dark'
                            ? 'bg-gray-700'
                            : 'bg-white'
                        } shadow-lg`}>
                          <h3 className={`text-base sm:text-lg font-bold mb-2 sm:mb-4 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            Attendance Summary
                          </h3>
                          <div className="space-y-2 sm:space-y-3">
                            <div className={`flex justify-between items-center py-1 sm:py-2 border-b ${
                              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                            }`}>
                              <span className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                              }`}>Total Days</span>
                              <span className={`text-sm sm:text-base font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-800'
                              }`}>{graphData.totalDays}</span>
                            </div>
                            <div className={`flex justify-between items-center py-1 sm:py-2 border-b ${
                              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                            }`}>
                              <span className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                              }`}>Present</span>
                              <span className={`text-sm sm:text-base font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-800'
                              }`}>{graphData.presentDays}</span>
                            </div>
                            <div className={`flex justify-between items-center py-1 sm:py-2 border-b ${
                              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                            }`}>
                              <span className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                              }`}>Half Days</span>
                              <span className={`text-sm sm:text-base font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-800'
                              }`}>{graphData.halfDays}</span>
                            </div>
                            <div className={`flex justify-between items-center py-1 sm:py-2 border-b ${
                              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                            }`}>
                              <span className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                              }`}>Partially Absent</span>
                              <span className={`text-sm sm:text-base font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-800'
                              }`}>{graphData.partiallyAbsentDays}</span>
                            </div>
                            <div className={`flex justify-between items-center py-1 sm:py-2 ${
                              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                            }`}>
                              <span className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                              }`}>Week Offs</span>
                              <span className={`text-sm sm:text-base font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-800'
                              }`}>{graphData.weekOffs}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Select an employee to view attendance details
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default TeamOverviewPage;

