"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSpinner, FaCheck, FaTimes, FaBan, FaUserAlt, FaTimesCircle } from "react-icons/fa";

const dummyKycDetails = [
  {
    employeeId: "EMP001",
    employeeImage: "https://via.placeholder.com/50",
    fullName: "John Doe",
    designation: "Security Guard",
  },
];

const dummyLeaveData = [
  {
    leaveType: "EL",
    startDate: "2025-06-10",
    endDate: "2025-06-15",
    numberOfDays: 5,
    reason: "Vacation",
    status: "Pending",
  },
  {
    leaveType: "CL",
    startDate: "2025-06-12",
    endDate: "2025-06-15",
    numberOfDays: 3,
    reason: "Personal Work",
    status: "Approved",
  },
  {
    leaveType: "SL",
    startDate: "2025-06-14",
    endDate: "2025-06-16",
    numberOfDays: 2,
    reason: "Sick Leave",
    status: "Rejected",
  },
];

export default function LeaveManagementViewPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState("All");

  const filteredLeaveData =
    activeTab === "All"
      ? dummyLeaveData
      : dummyLeaveData.filter((leave) => leave.status === activeTab);

  const filteredSearchData = filteredLeaveData.filter(
    (leave) =>
      (filterLeaveType === "All" || leave.leaveType === filterLeaveType) &&
      (leave.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.startDate.includes(searchQuery) ||
        leave.endDate.includes(searchQuery) ||
        dummyKycDetails[0]?.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const clearSearch = () => {
    setSearchQuery("");
    setFilterLeaveType("All");
  };

  return (
    <ManagerDashboardLayout>
      <div className="p-4 md:p-8 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg">
          <div className="bg-white text-blue-600 p-6 rounded-full flex items-center justify-center shadow-md">
            <FaUserAlt className="text-3xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Employee Leave Report</h1>
            <p className="text-lg">
              Easily manage leave details for employees in your projects.
            </p>
          </div>
        </div>
        {/* Tabs for Filtering */}
        <div className="flex gap-4 mb-6">
          {["All", "Approved", "Rejected", "Canceled", "Pending"].map((tab) => (
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
        {/* Search Bar with Filters */}
        <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Search by name, date, or leave type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-2 text-gray-500 hover:text-red-500"
              >
                <FaTimesCircle className="text-xl" />
              </button>
            )}
          </div>
          <div>
            <select
              value={filterLeaveType}
              onChange={(e) => setFilterLeaveType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            >
              <option value="All">All Leave Types</option>
              <option value="EL">EL</option>
              <option value="CL">CL</option>
              <option value="SL">SL</option>
            </select>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
          <div className="min-w-[1200px]">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Leave Details</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  {activeTab === "Pending" && (
                    <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSearchData.map((leave, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="p-4">
                      <div className="flex items-center space-x-4">
                        <img
                          src={dummyKycDetails[0]?.employeeImage || ""}
                          alt={dummyKycDetails[0]?.fullName || "Employee"}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{dummyKycDetails[0]?.fullName || "N/A"}</div>
                          <div className="text-sm text-gray-500">{dummyKycDetails[0]?.employeeId || "N/A"}</div>
                          <div className="text-sm text-gray-500">{dummyKycDetails[0]?.designation || "N/A"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {leave.numberOfDays} {leave.numberOfDays === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>
                        {leave.reason}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          leave.status === "Approved"
                            ? "bg-green-100 text-green-800"
                            : leave.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : leave.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>
                    {activeTab === "Pending" && (
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => console.log("Approve")}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors duration-200"
                            title="Approve"
                          >
                            <FaCheck className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => console.log("Reject")}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Reject"
                          >
                            <FaTimes className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => console.log("Cancel")}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                            title="Cancel"
                          >
                            <FaBan className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
} 