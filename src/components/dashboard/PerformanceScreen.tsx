"use client";

import { useTheme } from "@/context/ThemeContext";
import React, { useState, useEffect } from 'react';
import { FaChartLine,  FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceMetric {
  employeeId: string;
  fullName: string;
  designation: string;
  attendanceRate: number;
  leaveUtilization: number;
  taskCompletion: number;
  punctualityScore: number;
  monthlyTrend: number[];
  punchInDays: number;
}

interface PerformanceTrendData {
  metrics: {
    attendance: number[];
    taskCompletion: number[];
    punctuality: number[];
    leaveUtilization: number[];
  };
  labels: string[];
}

interface AttendanceRecord {
  employeeId: string;
  projectName: string;
  date: string;
  status: string;
  punchInTime?: string;
  punchOutTime?: string;
}

interface LeaveRecord {
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

interface KycForm {
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
  };
}

// interface MetricCard {
//   title: string;
//   value: string;
//   change: string;
//   icon: React.ReactNode;
//   color: string;
// }

// Accept an optional employeeId prop for integration with Team Overview and page.tsx
interface PerformanceScreenProps {
  employeeId?: string;
}

const PerformanceScreen: React.FC<PerformanceScreenProps> = ({ employeeId }) => {
  const { theme } = useTheme();
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [trendData, setTrendData] = useState<PerformanceTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchIntegratedData = async () => {
      setLoading(true);
      try {
        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-based
        const currentYear = now.getFullYear();

        // Fetch all employees (for mapping)
        const empRes = await fetch('https://cafm.zenapi.co.in/api/kyc');
        const empData = await empRes.json();
        let employees: { employeeId: string; fullName: string; designation: string; projectName: string }[] = [];
        if (empData.kycForms) {
          employees = empData.kycForms
            .filter((form: KycForm) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: KycForm) => ({
              employeeId: form.personalDetails.employeeId,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              projectName: form.personalDetails.projectName,
            }));
        }
        // If employeeId prop is provided, filter to that employee only
        const filteredEmployees = employeeId
          ? employees.filter(e => e.employeeId === employeeId)
          : employees;

        // Fetch all attendance records
        const attRes = await fetch('https://cafm.zenapi.co.in/api/attendance/all');
        const attData = await attRes.json();
        let allAttendance: AttendanceRecord[] = [];
        if (attData.attendance) {
          allAttendance = attData.attendance.filter((rec: AttendanceRecord) => rec.projectName === "Exozen - Ops");
        }
        // Filter attendance to current month only
        const currentMonthAttendance = allAttendance.filter((rec: AttendanceRecord) => {
          const recDate = new Date(rec.date);
          return recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear;
        });

        // Fetch all leave records for all filtered employees in parallel
        const allLeave = await Promise.all(
          filteredEmployees.map(async (emp) => {
            try {
              const res = await fetch(`https://cafm.zenapi.co.in/api/leave/history/${emp.employeeId}`);
              const data = await res.json();
              if (Array.isArray(data.leaveHistory)) {
                // Filter leave records to current month only
                return data.leaveHistory
                  .filter((leave: LeaveRecord) => {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);
                    // If any part of the leave is in the current month
                    return (
                      (start.getMonth() === currentMonth && start.getFullYear() === currentYear) ||
                      (end.getMonth() === currentMonth && end.getFullYear() === currentYear)
                    );
                  })
                  .map((leave: LeaveRecord) => ({ ...leave, employeeId: emp.employeeId }));
              }
              return [];
            } catch {
              return [];
            }
          })
        );

        // Integrate data and calculate metrics (attendance and leave only, current month only)
        const integratedPerformance: PerformanceMetric[] = filteredEmployees.map((emp) => {
          const empAttendance = currentMonthAttendance.filter((a: AttendanceRecord) => a.employeeId === emp.employeeId);
          const empLeaves = allLeave.flat().filter((l: LeaveRecord) => l.employeeId === emp.employeeId);
          // Count number of days with both punch in and punch out (for current month)
          const punchInDays = empAttendance.filter((a: AttendanceRecord) => a.punchInTime && a.punchOutTime).length;
          const totalDays = empAttendance.length;
          const presentDays = empAttendance.filter((a: AttendanceRecord) => a.status === 'Present').length;
          // const absentDays = empAttendance.filter((a: AttendanceRecord) => a.status === 'Absent').length;
          // const holidayDays = empAttendance.filter((a: AttendanceRecord) => a.status === 'Holiday').length;
          // Count leave types
          // const el = empLeaves.filter((l: LeaveRecord) => l.leaveType === 'EL').length;
          // const cl = empLeaves.filter((l: LeaveRecord) => l.leaveType === 'CL').length;
          // const sl = empLeaves.filter((l: LeaveRecord) => l.leaveType === 'SL').length;
          // Attendance percentage as (presentDays / totalDays) * 100 for current month
          const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
          // Leave utilization (approved leaves / total leaves), capped at 100
          const approvedLeaves = empLeaves.filter((l: LeaveRecord) => l.status === 'Approved').length;
          let leaveUtilization = empLeaves.length > 0 ? Math.round((approvedLeaves / empLeaves.length) * 100) : 0;
          leaveUtilization = Math.min(leaveUtilization, 100);
          // Dummy value for punctualityScore (replace with real if available), capped at 100
          let punctualityScore = 80 + Math.floor(Math.random() * 20);
          punctualityScore = Math.min(punctualityScore, 100);
          // Monthly trend (attendance and leave only)
          const monthlyTrend = [attendanceRate, leaveUtilization, punctualityScore];
          return {
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            designation: emp.designation,
            attendanceRate,
            leaveUtilization,
            taskCompletion: 0, // Not used
            punctualityScore,
            monthlyTrend,
            punchInDays, // Add punchInDays for current month
          };
        });
        setPerformanceData(integratedPerformance);
        // Update trendData for attendance and leave only
        setTrendData({
          metrics: {
            attendance: integratedPerformance.map(e => e.attendanceRate),
            leaveUtilization: integratedPerformance.map(e => e.leaveUtilization),
            punctuality: integratedPerformance.map(e => e.punctualityScore),
            taskCompletion: integratedPerformance.map(() => 0), // Provide empty array for compatibility
          },
          labels: integratedPerformance.map(e => e.fullName),
        });
      } catch (err) {
        setError('Failed to fetch integrated performance data');
        console.error('Error fetching integrated performance data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIntegratedData();
  }, [employeeId]);

  const getMetricColor = (value: number): string => {
    if (value >= 90) return 'text-green-600';
    if (value >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricIcon = (value: number): React.ReactElement => {
    if (value >= 90) return <FaCheckCircle className="text-green-500" />;
    if (value >= 75) return <FaExclamationTriangle className="text-yellow-500" />;
    return <FaExclamationTriangle className="text-red-500" />;
  };

  // const getChange = (current: number, previous: number): string => {
  //   const diff = Math.round(current - previous);
  //   const direction = current > previous ? '↑' : '↓';
  //   return `${direction} ${Math.abs(diff)}%`;
  // };

  // const metricCards: MetricCard[] = [
  //   {
  //     title: 'Average Attendance',
  //     value: trendData ? `${Math.round(trendData.metrics.attendance[trendData.metrics.attendance.length - 1])}%` : 'N/A',
  //     change: trendData && trendData.metrics.attendance.length > 1 
  //       ? getChange(
  //           trendData.metrics.attendance[trendData.metrics.attendance.length - 1],
  //           trendData.metrics.attendance[trendData.metrics.attendance.length - 2]
  //         )
  //       : 'N/A',
  //     icon: <FaCalendarAlt />,
  //     color: 'blue'
  //   },
  //   {
  //     title: 'Punctuality',
  //     value: trendData ? `${Math.round(trendData.metrics.punctuality[trendData.metrics.punctuality.length - 1])}%` : 'N/A',
  //     change: trendData && trendData.metrics.punctuality.length > 1
  //       ? getChange(
  //           trendData.metrics.punctuality[trendData.metrics.punctuality.length - 1],
  //           trendData.metrics.punctuality[trendData.metrics.punctuality.length - 2]
  //         )
  //       : 'N/A',
  //     icon: <FaUserClock />,
  //     color: 'yellow'
  //   },
  //   {
  //     title: 'Leave Utilization',
  //     value: trendData ? `${Math.round(trendData.metrics.leaveUtilization[trendData.metrics.leaveUtilization.length - 1])}%` : 'N/A',
  //     change: trendData && trendData.metrics.leaveUtilization.length > 1
  //       ? getChange(
  //           trendData.metrics.leaveUtilization[trendData.metrics.leaveUtilization.length - 1],
  //           trendData.metrics.leaveUtilization[trendData.metrics.leaveUtilization.length - 2]
  //         )
  //       : 'N/A',
  //     icon: <FaChartPie />,
  //     color: 'purple'
  //   },
  // ];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: isDark ? '#f3f4f6' : '#1f2937',
        },
      },
      title: {
        color: isDark ? '#f3f4f6' : '#1f2937',
        display: true,
        text: 'Overall Performance Trends',
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#d1d5db' : '#374151',
        },
        grid: {
          color: isDark ? '#374151' : '#e5e7eb',
        },
      },
      y: {
        ticks: {
          color: isDark ? '#d1d5db' : '#374151',
        },
        grid: {
          color: isDark ? '#374151' : '#e5e7eb',
        },
        min: 0,
        max: 100,
      },
    },
  };

  const lineChartData = {
    labels: trendData?.labels || [],
    datasets: [
      {
        label: 'Attendance',
        data: trendData?.metrics.attendance || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Punctuality',
        data: trendData?.metrics.punctuality || [],
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Leave Utilization',
        data: trendData?.metrics.leaveUtilization || [],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: performanceData.map(emp => emp.fullName),
    datasets: [
      {
        label: 'Punctuality',
        data: performanceData.map(emp => emp.punctualityScore),
        backgroundColor: 'rgba(234, 179, 8, 0.5)',
        borderColor: 'rgb(234, 179, 8)',
        borderWidth: 1,
      },
    ],
  };

  // Calculate average metrics for the doughnut chart
  const calculateAverages = () => {
    if (!performanceData.length) return [0, 0, 0];
    
    const totalEmployees = performanceData.length;
    const onTime = performanceData.filter(emp => emp.punctualityScore >= 90).length;
    const late = performanceData.filter(emp => emp.punctualityScore >= 75 && emp.punctualityScore < 90).length;
    const absent = performanceData.filter(emp => emp.punctualityScore < 75).length;

    return [
      (onTime / totalEmployees) * 100,
      (late / totalEmployees) * 100,
      (absent / totalEmployees) * 100,
    ];
  };

  const doughnutChartData = {
    labels: ['On Time', 'Late', 'Absent'],
    datasets: [
      {
        data: calculateAverages(),
        backgroundColor: [
          'rgba(34, 197, 94, 0.5)',
          'rgba(234, 179, 8, 0.5)',
          'rgba(239, 68, 68, 0.5)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Calculate overall team averages for the current month
  const avgAttendance = performanceData.length > 0 ? Math.round(performanceData.reduce((sum, e) => sum + e.attendanceRate, 0) / performanceData.length) : 0;
  const avgPunctuality = performanceData.length > 0 ? Math.round(performanceData.reduce((sum, e) => sum + e.punctualityScore, 0) / performanceData.length) : 0;
  const avgLeaveUtilization = performanceData.length > 0 ? Math.round(performanceData.reduce((sum, e) => sum + e.leaveUtilization, 0) / performanceData.length) : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaChartLine className="animate-spin text-blue-500 text-4xl" />
        <p className="ml-3 text-lg text-gray-600">Loading performance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <FaExclamationTriangle className="mx-auto text-red-500 text-4xl mb-4" />
          <p className="text-lg text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
      <div className={`min-h-screen p-6 transition-colors duration-300 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
        
        {/* Team Metrics Row: Attendance, Punctuality, Leave Utilization */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className={`flex-1 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-white'}`}> 
            <span className="text-sm font-medium text-gray-500 mb-1">Avg. Attendance</span>
            <span className="text-2xl font-bold text-blue-600">{avgAttendance}%</span>
          </div>
          <div className={`flex-1 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-white'}`}> 
            <span className="text-sm font-medium text-gray-500 mb-1">Avg. Punctuality</span>
            <span className="text-2xl font-bold text-yellow-600">{avgPunctuality}%</span>
          </div>
          <div className={`flex-1 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-white'}`}> 
            <span className="text-sm font-medium text-gray-500 mb-1">Avg. Leave Utilization</span>
            <span className="text-2xl font-bold text-purple-600">{avgLeaveUtilization}%</span>
          </div>
        </div>

        {/* Line Chart - Overall Performance Trends */}
        <div className={`p-6 rounded-lg shadow-md mb-6 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
          <h3 className="text-xl font-semibold mb-4">Overall Performance Trends</h3>
          <div className="h-80">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Bar & Doughnut Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
            <h3 className="text-xl font-semibold mb-4">Punctuality</h3>
            <div className="h-80">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>
          <div className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
            <h3 className="text-xl font-semibold mb-4">Attendance Distribution</h3>
            <div className="h-80">
              <Doughnut data={doughnutChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
          <h3 className="text-xl font-semibold mb-4">Individual Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className={`${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <tr>
                  {['Employee', 'Punctuality', 'Leave Utilization', 'Days Punched In'].map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-200 dark:divide-gray-600 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                {performanceData.map((employee) => (
                  <tr key={employee.employeeId} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium">{employee.fullName}</div>
                        <div className="text-sm text-gray-500">{employee.designation}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getMetricIcon(employee.punctualityScore)}
                        <span className={`ml-2 text-sm font-medium ${getMetricColor(employee.punctualityScore)}`}>
                          {employee.punctualityScore}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getMetricIcon(employee.leaveUtilization)}
                        <span className={`ml-2 text-sm font-medium ${getMetricColor(employee.leaveUtilization)}`}>
                          {employee.leaveUtilization}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.punchInDays}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceScreen;