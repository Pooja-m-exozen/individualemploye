"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSpinner, FaUserAlt, FaTimesCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { getAllEmployeesLeaveHistory, EmployeeWithLeaveHistory } from "@/services/leave";
import { showToast, ToastStyles } from "@/components/Toast";
import { api } from "@/services/api";

export default function LeaveManagementViewPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState("All");
  const [allLeaveData, setAllLeaveData] = useState<EmployeeWithLeaveHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectLeaveId, setRejectLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  React.useEffect(() => {
    setLoading(true);
    getAllEmployeesLeaveHistory()
      .then((data) => {
        setAllLeaveData(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch leave history for all employees");
        setLoading(false);
      });
  }, []);

  // Flatten all leave records with employee info
  const allLeaves = allLeaveData.flatMap((emp) =>
    (emp.leaveHistory?.leaveHistory || []).map((leave) => ({
      ...leave,
      employeeName: emp.kyc.personalDetails.fullName,
      employeeId: emp.kyc.personalDetails.employeeId,
      designation: emp.kyc.personalDetails.designation,
      employeeImage: emp.kyc.personalDetails.employeeImage,
    }))
  );

  const filteredLeaveData =
    activeTab === "All"
      ? allLeaves
      : allLeaves.filter((leave) => leave.status === activeTab);

  const filteredSearchData = filteredLeaveData.filter(
    (leave) =>
      (filterLeaveType === "All" || leave.leaveType === filterLeaveType) &&
      (leave.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.startDate.includes(searchQuery) ||
        leave.endDate.includes(searchQuery) ||
        leave.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.employeeId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Calculate paginated data
  const totalRows = filteredSearchData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedData = filteredSearchData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Reset to first page when filters/search change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterLeaveType]);

  const clearSearch = () => {
    setSearchQuery("");
    setFilterLeaveType("All");
  };

  const updateLeaveStatus = async (
    leaveId: string,
    status: "Approved" | "Rejected",
    rejectionReason?: string
  ) => {
    const payload: { status: "Approved" | "Rejected"; rejectionReason?: string } = { status };
    if (status === "Rejected" && rejectionReason) {
      payload.rejectionReason = rejectionReason;
    }
    const response = await api.put(`/leave/update/${leaveId}`, payload);
    return response.data;
  };

  const refreshLeaveData = async () => {
    setLoading(true);
    try {
      const data = await getAllEmployeesLeaveHistory();
      setAllLeaveData(data);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      await updateLeaveStatus(leaveId, "Approved");
      showToast({ message: "Leave approved successfully!", type: "success" });
      await refreshLeaveData();
    } catch {
      showToast({ message: "Failed to approve leave", type: "error" });
    }
  };

  const handleReject = (leaveId: string) => {
    setRejectLeaveId(leaveId);
    setRejectionReason("");
    setRejectionError("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectionError("Rejection reason is required.");
      return;
    }
    if (!rejectLeaveId) return;
    setRejectModalOpen(false);
    try {
      await updateLeaveStatus(rejectLeaveId, "Rejected", rejectionReason.trim());
      showToast({ message: "Leave rejected successfully!", type: "success" });
      await refreshLeaveData();
    } catch {
      showToast({ message: "Failed to reject leave", type: "error" });
    } finally {
      setRejectLeaveId(null);
      setRejectionReason("");
      setRejectionError("");
    }
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectLeaveId(null);
    setRejectionReason("");
    setRejectionError("");
  };

  return (
    <ManagerDashboardLayout>
      <ToastStyles />
      <style>{`
        .custom-toast-container {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
      `}</style>
      {/* Move toast container to top right */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Reject Leave Request</h2>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-black"
                rows={4}
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              {rejectionError && <div className="text-red-500 text-sm mb-2">{rejectionError}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div
        className={`p-4 md:p-8 min-h-screen transition-colors duration-300 ${
          theme === "dark" ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r ${
            theme === "dark"
              ? "from-blue-900 to-blue-700 text-white"
              : "from-blue-600 to-blue-800 text-white"
          } rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg`}
        >
          <div
            className={`$${
              theme === "dark"
                ? "bg-gray-800 text-blue-200"
                : "bg-white text-blue-600"
            } p-6 rounded-full flex items-center justify-center shadow-md`}
          >
            <FaUserAlt className="text-3xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Employee Leave Report</h1>
            <p className="text-lg">Easily manage leave details for employees in your projects.</p>
          </div>
        </div>
        {/* Tabs for Filtering */}
        <div className="flex gap-4 mb-6">
          {["All", "Approved", "Rejected", "Pending"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? theme === "dark"
                    ? "bg-blue-700 text-white shadow-lg"
                    : "bg-blue-600 text-white shadow-lg"
                  : theme === "dark"
                  ? "bg-gray-800 text-gray-300 hover:bg-blue-800 hover:text-white"
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
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 shadow-sm transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-800 placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 focus:ring-blue-600 placeholder-gray-400"
              }`}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={`absolute right-2 top-2 transition-colors duration-200 ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-red-400"
                    : "text-gray-500 hover:text-red-500"
                }`}
              >
                <FaTimesCircle className="text-xl" />
              </button>
            )}
          </div>
          <div>
            <select
              value={filterLeaveType}
              onChange={(e) => setFilterLeaveType(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 shadow-sm transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-800"
                  : "bg-white border-gray-300 text-gray-900 focus:ring-blue-600"
              }`}
            >
              <option value="All">All Leave Types</option>
              <option value="EL">EL</option>
              <option value="CL">CL</option>
              <option value="SL">SL</option>
            </select>
          </div>
        </div>
        <div
          className={`rounded-xl shadow-lg p-6 overflow-x-auto transition-colors duration-300 ${
            theme === "dark" ? "bg-gray-800" : "bg-white"
          }`}
        >
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <FaSpinner className="animate-spin text-3xl text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : (
            <div className="min-w-[1200px]">
              <table className="w-full">
                <thead>
                  <tr className={theme === "dark" ? "border-b-2 border-gray-700" : "border-b-2 border-gray-200"}>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Employee</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Leave Details</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Duration</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Reason</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                    {activeTab === "Pending" && (
                      <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-gray-700" : "divide-y divide-gray-200"}>
                  {paginatedData.map((leave) => (
                    <tr
                      key={leave.leaveId}
                      className={`transition-colors duration-200 ${
                        theme === "dark"
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="p-4">
                        <div>
                          <div className={theme === "dark" ? "font-medium text-gray-100" : "font-medium text-gray-900"}>{leave.employeeName || "N/A"}</div>
                          <div className={theme === "dark" ? "text-sm text-gray-400" : "text-sm text-gray-500"}>{leave.employeeId || "N/A"}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={
                          theme === "dark"
                            ? "px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm font-medium"
                            : "px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        }>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className={theme === "dark" ? "text-sm text-gray-100" : "text-sm text-gray-900"}>
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </div>
                          <div className={theme === "dark" ? "text-sm text-gray-400" : "text-sm text-gray-500"}>
                            {leave.numberOfDays} {leave.numberOfDays === 1 ? 'day' : 'days'}
                            {leave.isHalfDay ? ` (${leave.halfDayType || 'Half Day'})` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={theme === "dark" ? "text-sm text-gray-100 max-w-xs truncate" : "text-sm text-gray-900 max-w-xs truncate"} title={leave.reason}>
                          {leave.reason}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                            leave.status === "Approved"
                              ? theme === "dark"
                                ? "bg-green-900 text-green-200"
                                : "bg-green-100 text-green-800"
                              : leave.status === "Rejected"
                              ? theme === "dark"
                                ? "bg-red-900 text-red-200"
                                : "bg-red-100 text-red-800"
                              : leave.status === "Pending"
                              ? theme === "dark"
                                ? "bg-yellow-900 text-yellow-200"
                                : "bg-yellow-100 text-yellow-800"
                              : theme === "dark"
                              ? "bg-gray-700 text-gray-200"
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
                              onClick={() => handleApprove(leave.leaveId)}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                                theme === "dark"
                                  ? "bg-green-800 text-white hover:bg-green-700"
                                  : "bg-green-500 text-white hover:bg-green-600"
                              }`}
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(leave.leaveId)}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                                theme === "dark"
                                  ? "bg-red-800 text-white hover:bg-red-700"
                                  : "bg-red-500 text-white hover:bg-red-600"
                              }`}
                              title="Reject"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-4 gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border font-medium transition-colors duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-white hover:bg-blue-800'
                      : 'bg-white text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Prev
                </button>
                <span className="mx-2 text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border font-medium transition-colors duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-white hover:bg-blue-800'
                      : 'bg-white text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}