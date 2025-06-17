"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaClock, FaSignInAlt, FaSignOutAlt } from "react-icons/fa";

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  imageUrl: string;
}

interface AttendanceRecord {
  employeeId: string;
  projectName: string;
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  status: string;
}

interface RegularizationRequest {
  requestId: string;
  employeeId: string;
  fullName: string;
  projectName: string;
  date: string;
  reason: string;
  status: string; // Pending, Approved, Rejected
}

const AttendanceManagementPage = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<string>("View Attendance");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  useEffect(() => {
    // Dummy data for employees
    const dummyEmployees: Employee[] = [
      {
        employeeId: "EFMS3257",
        fullName: "John Doe",
        designation: "Software Engineer",
        projectName: "Exozen-Ops",
        imageUrl: "https://via.placeholder.com/50",
      },
      {
        employeeId: "EFMS3258",
        fullName: "Jane Smith",
        designation: "Project Manager",
        projectName: "Exozen-Ops",
        imageUrl: "https://via.placeholder.com/50",
      },
    ];

    setEmployees(dummyEmployees);

    // Dummy data for attendance records
    const dummyAttendanceRecords: AttendanceRecord[] = [
      {
        employeeId: "EFMS3257",
        projectName: "Exozen-Ops",
        date: "2025-06-13",
        punchInTime: "09:00 AM",
        punchOutTime: "05:00 PM",
        status: "Present",
      },
      {
        employeeId: "EFMS3258",
        projectName: "Exozen-Ops",
        date: "2025-06-13",
        punchInTime: "09:30 AM",
        punchOutTime: "05:30 PM",
        status: "Present",
      },
    ];

    setAttendanceRecords(dummyAttendanceRecords);

    // Dummy data for regularization requests
    const dummyRegularizationRequests: RegularizationRequest[] = [
      {
        requestId: "REQ001",
        employeeId: "EFMS3257",
        fullName: "John Doe",
        projectName: "Exozen-Ops",
        date: "2025-06-12",
        reason: "Forgot to punch in",
        status: "Pending",
      },
      {
        requestId: "REQ002",
        employeeId: "EFMS3258",
        fullName: "Jane Smith",
        projectName: "Exozen-Ops",
        date: "2025-06-11",
        reason: "System error during punch out",
        status: "Approved",
      },
    ];

    setRegularizationRequests(dummyRegularizationRequests);
  }, []);

  const calculateHours = (punchIn: string, punchOut: string): string => {
    const punchInDate = new Date(`2025-06-13T${punchIn}`);
    const punchOutDate = new Date(`2025-06-13T${punchOut}`);
    if (isNaN(punchInDate.getTime()) || isNaN(punchOutDate.getTime())) {
      return "N/A"; // Handle invalid dates
    }
    const diff = punchOutDate.getTime() - punchInDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleApprove = (requestId: string) => {
    setRegularizationRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.requestId === requestId
          ? { ...request, status: "Approved" }
          : request
      )
    );
  };

  const handleReject = (requestId: string) => {
    setRegularizationRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.requestId === requestId
          ? { ...request, status: "Rejected" }
          : request
      )
    );
  };

  const filteredAttendanceRecords = attendanceRecords.filter((record) => {
    const recordDate = new Date(record.date);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return (
      (!from || recordDate >= from) &&
      (!to || recordDate <= to) &&
      (record.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.date.includes(searchQuery))
    );
  });

  const filteredRegularizationRequests = regularizationRequests.filter((request) => {
    const requestDate = new Date(request.date);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return (
      (!from || requestDate >= from) &&
      (!to || requestDate <= to) &&
      (request.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.projectName.toLowerCase().includes(searchQuery) ||
        request.date.includes(searchQuery))
    );
  });

  return (
    <ManagerOpsLayout>
      <div className="p-4 md:p-8 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg">
          <div className="bg-white text-blue-600 p-6 rounded-full flex items-center justify-center shadow-md">
            <FaClock className="text-3xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-lg">
              Manage attendance and regularization requests for employees.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {["View Attendance", "Attendance Regularization Requests"].map((tab) => (
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
        </div>

        {/* Tab Content */}
        {activeTab === "View Attendance" && (
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Attendance Records</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center items-center min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
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
                      {filteredAttendanceRecords.map((record, index) => {
                        const employee = employees.find(
                          (emp) => emp.employeeId === record.employeeId
                        );
                        const hoursWorked =
                          record.punchInTime && record.punchOutTime
                            ? calculateHours(record.punchInTime, record.punchOutTime)
                            : "N/A";

                        return (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors duration-200"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img
                                    src={employee?.imageUrl || "/default-avatar.png"}
                                    alt={employee?.fullName || "Employee"}
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                                  />
                                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"></span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{employee?.fullName || "N/A"}</p>
                                  <p className="text-sm text-gray-500">
                                    {employee?.designation || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {record.employeeId}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-900">{record.projectName}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {record.date}
                              </div>
                            </td>
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
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  record.status === "Present"
                                    ? "bg-green-100 text-green-800"
                                    : record.status === "Absent"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {record.status || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium text-gray-900">{hoursWorked}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredAttendanceRecords.length === 0 && (
                  <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "Attendance Regularization Requests" && (
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Regularization Requests</h2>
                <p className="text-sm text-gray-500 mt-1">Review and manage attendance regularization requests</p>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Request ID</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRegularizationRequests.map((request, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {request.requestId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src="/default-avatar.png"
                              alt={request.fullName}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{request.fullName}</p>
                              <p className="text-sm text-gray-500">{request.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {request.projectName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900">{request.date}</td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="text-sm text-gray-900 truncate">{request.reason}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              request.status === "Approved"
                                ? "bg-green-100 text-green-800"
                                : request.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {request.status === "Pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request.requestId)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request.requestId)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No actions available</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRegularizationRequests.length === 0 && (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No regularization requests found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ManagerOpsLayout>
  );
};

export default AttendanceManagementPage;