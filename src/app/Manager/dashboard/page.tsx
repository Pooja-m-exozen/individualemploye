"use client";

import React from "react";
import { FaUsers, FaProjectDiagram, FaFileAlt, FaCheckCircle, FaChartBar, FaBell, FaUserPlus, FaPlusCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const summary = [
  { label: "Total Employees", value: 120, icon: <FaUsers className="w-7 h-7" /> },
  { label: "Active Projects", value: 8, icon: <FaProjectDiagram className="w-7 h-7" /> },
  { label: "Pending KYC", value: 5, icon: <FaFileAlt className="w-7 h-7" /> },
  { label: "Approved Leaves", value: 12, icon: <FaCheckCircle className="w-7 h-7" /> },
];

const attendanceData = [
  { month: "Jan", value: 90 },
  { month: "Feb", value: 95 },
  { month: "Mar", value: 85 },
  { month: "Apr", value: 100 },
  { month: "May", value: 92 },
  { month: "Jun", value: 97 },
];

const leaveTrend = [80, 60, 70, 90, 50, 65];
const leaveMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const projectDistribution = [
  { name: "Alpha", value: 3, color: "#6366f1" },
  { name: "Beta", value: 2, color: "#60a5fa" },
  { name: "Gamma", value: 1, color: "#34d399" },
  { name: "Delta", value: 2, color: "#fbbf24" },
];

const recentActivities = [
  { icon: <FaBell className="text-blue-500" />, text: "John Doe submitted KYC.", time: "2 min ago" },
  { icon: <FaBell className="text-green-500" />, text: "Jane Smith's leave approved.", time: "10 min ago" },
  { icon: <FaBell className="text-yellow-500" />, text: "New project added: Northland.", time: "1 hr ago" },
  { icon: <FaBell className="text-red-500" />, text: "KYC pending for Alice Brown.", time: "2 hr ago" },
];

const pendingApprovals = [
  { id: 1, type: "KYC", employee: "Alice Brown", status: "Pending" },
  { id: 2, type: "Leave", employee: "Bob Lee", status: "Pending" },
  { id: 3, type: "ID Card", employee: "Jane Smith", status: "Pending" },
];

export default function ManagerDashboardPage() {
  const { theme } = useTheme();

  // Pie chart calculations
  const totalProjects = projectDistribution.reduce((sum, p) => sum + p.value, 0);
  let acc = 0;
  const pieSlices = projectDistribution.map((p, i) => {
    const start = acc;
    const angle = (p.value / totalProjects) * 360;
    acc += angle;
    const largeArc = angle > 180 ? 1 : 0;
    const r = 40;
    const x1 = 50 + r * Math.cos((Math.PI * (start - 90)) / 180);
    const y1 = 50 + r * Math.sin((Math.PI * (start - 90)) / 180);
    const x2 = 50 + r * Math.cos((Math.PI * (start + angle - 90)) / 180);
    const y2 = 50 + r * Math.sin((Math.PI * (start + angle - 90)) / 180);
    return (
      <path
        key={p.name}
        d={`M50,50 L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`}
        fill={p.color}
        stroke="#fff"
        strokeWidth={2}
      />
    );
  });

  // Line chart points
  const maxLeave = Math.max(...leaveTrend);
  const points = leaveTrend
    .map((v, i) => `${20 + (i * 100) / (leaveTrend.length - 1)},${120 - (v / maxLeave) * 100}`)
    .join(" ");

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <div
        className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r ${
          theme === "dark"
            ? "from-blue-900 to-blue-700"
            : "from-blue-500 to-blue-800"
        }`}
      >
        <div
          className={`rounded-xl p-4 flex items-center justify-center ${
            theme === "dark" ? "bg-blue-900 bg-opacity-40" : "bg-blue-600 bg-opacity-30"
          }`}
        >
          <FaChartBar className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Manager Dashboard</h1>
          <p className="text-white text-base opacity-90">Overview of employees, projects, and activities.</p>
        </div>
      </div>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8 justify-end">
        <button
          className={`flex items-center gap-2 font-semibold px-5 py-2 rounded-lg shadow transition-colors ${
            theme === "dark"
              ? "bg-blue-700 hover:bg-blue-800 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          <FaUserPlus /> Add Employee
        </button>
        <button
          className={`flex items-center gap-2 font-semibold px-5 py-2 rounded-lg shadow transition-colors ${
            theme === "dark"
              ? "bg-green-700 hover:bg-green-800 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          <FaPlusCircle /> Create Project
        </button>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {summary.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl shadow p-6 flex items-center gap-4 border ${
              theme === "dark"
                ? "bg-gray-800 border-blue-900"
                : "bg-white border-blue-100"
            }`}
          >
            <div
              className={`rounded-xl p-3 flex items-center justify-center ${
                theme === "dark" ? "bg-blue-900" : "bg-blue-100"
              }`}
            >
              {item.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>{item.value}</div>
              <div className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Graphs + Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Attendance Graph */}
        <div
          className={`rounded-2xl shadow p-6 border col-span-2 flex flex-col ${
            theme === "dark" ? "bg-gray-800 border-blue-900" : "bg-white border-blue-100"
          }`}
        >
          <div className={`font-bold mb-4 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Attendance Trend (Last 6 Months)</div>
          <div className="flex items-end h-48 gap-4">
            {attendanceData.map((d) => (
              <div key={d.month} className="flex flex-col items-center flex-1">
                <div
                  className={theme === "dark" ? "w-10 rounded-t-lg bg-blue-700" : "w-10 rounded-t-lg bg-blue-500"}
                  style={{ height: `${d.value * 1.5}px`, minHeight: 10 }}
                ></div>
                <div className={`text-xs mt-2 ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>{d.month}</div>
                <div className={`text-xs font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>{d.value}%</div>
              </div>
            ))}
          </div>
        </div>
        {/* Project Distribution Pie Chart */}
        <div
          className={`rounded-2xl shadow p-6 border flex flex-col items-center ${
            theme === "dark" ? "bg-gray-800 border-blue-900" : "bg-white border-blue-100"
          }`}
        >
          <div className={`font-bold mb-4 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Project Distribution</div>
          <svg width={120} height={120} viewBox="0 0 120 120" className="mb-4">
            {pieSlices}
          </svg>
          <div className="flex flex-wrap gap-2 justify-center">
            {projectDistribution.map((p) => (
              <span key={p.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ background: p.color }}></span>
                <span className={theme === "dark" ? "text-gray-200" : "text-gray-700"}>{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* Leave Trend Line Chart + Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Leave Trend Line Chart */}
        <div
          className={`rounded-2xl shadow p-6 border flex flex-col items-center col-span-2 ${
            theme === "dark" ? "bg-gray-800 border-blue-900" : "bg-white border-blue-100"
          }`}
        >
          <div className={`font-bold mb-4 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Leave Trend (Last 6 Months)</div>
          <svg width={240} height={140} className="mb-4">
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth={3}
              points={points}
            />
            {leaveTrend.map((v, i) => (
              <circle
                key={i}
                cx={20 + (i * 100) / (leaveTrend.length - 1)}
                cy={120 - (v / maxLeave) * 100}
                r={4}
                fill="#6366f1"
              />
            ))}
            {/* X axis */}
            {leaveMonths.map((m, i) => (
              <text
                key={m}
                x={20 + (i * 100) / (leaveMonths.length - 1)}
                y={135}
                textAnchor="middle"
                className={theme === "dark" ? "text-xs fill-gray-400" : "text-xs fill-gray-400"}
              >
                {m}
              </text>
            ))}
          </svg>
        </div>
        {/* Recent Activities */}
        <div
          className={`rounded-2xl shadow p-6 border flex flex-col ${
            theme === "dark" ? "bg-gray-800 border-blue-900" : "bg-white border-blue-100"
          }`}
        >
          <div className={`font-bold mb-4 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Recent Activities</div>
          <ul className="space-y-4">
            {recentActivities.map((act, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full ${theme === "dark" ? "bg-blue-900" : "bg-blue-50"}`}>
                  {act.icon}
                </span>
                <div className="flex-1">
                  <div className={theme === "dark" ? "text-gray-200 text-sm" : "text-gray-700 text-sm"}>{act.text}</div>
                  <div className={theme === "dark" ? "text-xs text-gray-400" : "text-xs text-gray-400"}>{act.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Pending Approvals Table */}
      <div className={`rounded-2xl shadow p-6 border ${theme === "dark" ? "bg-gray-800 border-blue-900" : "bg-white border-blue-100"}`}>
        <div className={`font-bold mb-4 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Pending Approvals</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className={theme === "dark" ? "bg-blue-900" : "bg-blue-50"}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Type</th>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Employee</th>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Status</th>
              </tr>
            </thead>
            <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No pending approvals</td>
                </tr>
              ) : pendingApprovals.map((item) => (
                <tr key={item.id} className={theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"}>
                  <td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{item.type}</td>
                  <td className="px-4 py-3">{item.employee}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}