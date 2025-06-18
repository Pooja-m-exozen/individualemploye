"use client";

import { useTheme } from "@/context/ThemeContext";
import React, { useState, useEffect } from 'react';
import { FaChartLine, FaChartBar, FaChartPie, FaCalendarAlt, FaUserClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
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
}

const dummyPerformanceData: PerformanceMetric[] = [
  {
    employeeId: 'EMP001',
    fullName: 'Alice Johnson',
    designation: 'Software Engineer',
    attendanceRate: 95,
    leaveUtilization: 12,
    taskCompletion: 88,
    punctualityScore: 92,
    monthlyTrend: [85, 88, 90, 87, 92, 95],
  },
  {
    employeeId: 'EMP002',
    fullName: 'Bob Williams',
    designation: 'Project Manager',
    attendanceRate: 98,
    leaveUtilization: 8,
    taskCompletion: 95,
    punctualityScore: 96,
    monthlyTrend: [90, 92, 94, 96, 95, 98],
  },
  {
    employeeId: 'EMP003',
    fullName: 'Charlie Brown',
    designation: 'UX Designer',
    attendanceRate: 92,
    leaveUtilization: 15,
    taskCompletion: 85,
    punctualityScore: 88,
    monthlyTrend: [82, 85, 88, 85, 90, 92],
  },
];

const PerformanceScreen: React.FC = () => {
  const { theme } = useTheme();
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'attendance' | 'tasks' | 'punctuality'>('attendance');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPerformanceData(dummyPerformanceData);
      setLoading(false);
    }, 1000);
  }, []);

  const getMetricColor = (value: number) => {
    if (value >= 90) return 'text-green-600';
    if (value >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricIcon = (value: number) => {
    if (value >= 90) return <FaCheckCircle className="text-green-500" />;
    if (value >= 75) return <FaExclamationTriangle className="text-yellow-500" />;
    return <FaExclamationTriangle className="text-red-500" />;
  };

  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: performanceData.map((employee, index) => ({
      label: employee.fullName,
      data: employee.monthlyTrend,
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.1)`,
      tension: 0.4,
    })),
  };

  const barChartData = {
    labels: performanceData.map(emp => emp.fullName),
    datasets: [
      {
        label: 'Task Completion Rate',
        data: performanceData.map(emp => emp.taskCompletion),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const doughnutChartData = {
    labels: ['On Time', 'Late', 'Absent'],
    datasets: [
      {
        data: [75, 15, 10],
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaChartLine className="animate-spin text-blue-500 text-4xl" />
        <p className="ml-3 text-lg text-gray-600">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className={`${
          theme === 'dark' ? 'bg-gray-700' : 'bg-white'
        } rounded-xl shadow-lg p-6`}>
          <h3 className={`text-lg font-semibold mb-2 ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
          }`}>
            Team Performance
          </h3>
          <p className={`text-3xl font-bold ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`}>
            92%
          </p>
        </div>

        {/* Add more performance metric cards */}
      </div>

      {/* Performance Reviews */}
      <div className={`${
        theme === 'dark' ? 'bg-gray-700' : 'bg-white'
      } rounded-xl shadow-lg p-6`}>
        <h2 className={`text-xl font-bold mb-4 ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
        }`}>
          Recent Performance Reviews
        </h2>
        <div className="space-y-4">
          {/* Performance review cards */}
          <div className={`${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          } rounded-lg p-4`}>
            {/* Add performance review content */}
          </div>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Average Attendance</h3>
            <FaCalendarAlt className="text-blue-500 text-xl" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-blue-600">95%</div>
            <div className="text-sm text-green-500">↑ 2.5%</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Task Completion</h3>
            <FaChartBar className="text-green-500 text-xl" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-green-600">89%</div>
            <div className="text-sm text-green-500">↑ 1.8%</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Punctuality</h3>
            <FaUserClock className="text-yellow-500 text-xl" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-yellow-600">92%</div>
            <div className="text-sm text-red-500">↓ 0.5%</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Leave Utilization</h3>
            <FaChartPie className="text-purple-500 text-xl" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-purple-600">12%</div>
            <div className="text-sm text-green-500">↓ 1.2%</div>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance Trends</h3>
        <div className="h-80">
          <Line
            data={lineChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: 'Monthly Performance Trend',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Detailed Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Attendance Rate</h3>
          <div className="h-80">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Attendance Distribution</h3>
          <div className="h-80">
            <Doughnut
              data={doughnutChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Individual Performance Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Individual Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Completion
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Punctuality
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Utilization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceData.map((employee) => (
                <tr key={employee.employeeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.fullName}</div>
                        <div className="text-sm text-gray-500">{employee.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getMetricIcon(employee.attendanceRate)}
                      <span className={`ml-2 text-sm font-medium ${getMetricColor(employee.attendanceRate)}`}>
                        {employee.attendanceRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getMetricIcon(employee.taskCompletion)}
                      <span className={`ml-2 text-sm font-medium ${getMetricColor(employee.taskCompletion)}`}>
                        {employee.taskCompletion}%
                      </span>
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
                      {getMetricIcon(100 - employee.leaveUtilization)}
                      <span className={`ml-2 text-sm font-medium ${getMetricColor(100 - employee.leaveUtilization)}`}>
                        {employee.leaveUtilization}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceScreen;