"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSpinner, FaUserAlt, FaTimesCircle, FaSearch, FaEye } from "react-icons/fa";
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
  const [viewRecord, setViewRecord] = useState<typeof allLeaves[0] | null>(null);

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

  function getApprovedBy(record: Record<string, unknown>): string {
    if (typeof record === 'object' && record && 'approvedBy' in record) {
      return (record as any).approvedBy || 'N/A';
    }
    return 'N/A';
  }

  function getRejectionReason(record: Record<string, unknown>): string {
    if (typeof record === 'object' && record && 'rejectionReason' in record) {
      return (record as any).rejectionReason || '-';
    }
    return '-';
  }

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
      {viewRecord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Leave Details</h2>
              <button onClick={() => setViewRecord(null)} className="text-2xl font-bold hover:text-red-500">&times;</button>
            </div>
            <div className="space-y-2">
              <div><span className="font-semibold">Employee Name:</span> {viewRecord.employeeName}</div>
              <div><span className="font-semibold">Employee ID:</span> {viewRecord.employeeId}</div>
              <div><span className="font-semibold">Leave Type:</span> {viewRecord.leaveType}</div>
              <div><span className="font-semibold">No of Days:</span> {viewRecord.numberOfDays}</div>
              <div><span className="font-semibold">Date:</span> {viewRecord.startDate ? new Date(viewRecord.startDate).toISOString().split('T')[0] : 'N/A'}</div>
              <div><span className="font-semibold">End Date:</span> {viewRecord.endDate ? new Date(viewRecord.endDate).toISOString().split('T')[0] : 'N/A'}</div>
              <div><span className="font-semibold">Status:</span> {viewRecord.status}</div>
              <div><span className="font-semibold">Reason:</span> {viewRecord.reason}</div>
              <div><span className="font-semibold">Approved By:</span> {viewRecord ? String(getApprovedBy(viewRecord)) : "N/A"}</div>
              <div><span className="font-semibold">Applied On:</span> {viewRecord.appliedOn ? new Date(viewRecord.appliedOn).toISOString().split('T')[0] : 'N/A'}</div>
              <div><span className="font-semibold">Last Updated:</span> {viewRecord.lastUpdated ? new Date(viewRecord.lastUpdated).toISOString().split('T')[0] : 'N/A'}</div>
              <div><span className="font-semibold">Emergency Contact:</span> {viewRecord.emergencyContact || 'N/A'}</div>
              <div><span className="font-semibold">Rejection Reason:</span> {viewRecord ? String(getRejectionReason(viewRecord)) : "-"}</div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setViewRecord(null)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`p-4 md:p-8 min-h-screen transition-colors duration-300 ${
          theme === "dark" ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        {/* Header */}
        <div className={`rounded-2xl mb-6 p-6 flex items-center gap-5 shadow-lg ${theme === "dark" ? "bg-[#23272f]" : "bg-gradient-to-r from-blue-500 to-blue-700"}`}>
          <div className={`${theme === "dark" ? "bg-gray-800" : "bg-blue-600 bg-opacity-30"} rounded-xl p-3 flex items-center justify-center`}>
            <FaUserAlt className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 text-white">Employee Leave Report</h1>
            <p className="text-base opacity-90 text-white">Easily manage leave details for employees in your projects.</p>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            <div className="relative flex-1 min-w-[180px] max-w-xs shadow-sm">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, date, or leave type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-black"}`}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className={`absolute right-2 top-2 transition-colors duration-200 ${theme === "dark" ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"}`}
                >
                  <FaTimesCircle className="text-xl" />
                </button>
              )}
            </div>
          </div>
          <div>
            <select
              value={filterLeaveType}
              onChange={(e) => setFilterLeaveType(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 shadow-sm transition-colors duration-300 ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-800" : "bg-white border-gray-300 text-gray-900 focus:ring-blue-600"}`}
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
              <div className={`overflow-x-auto rounded-xl border shadow-xl ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-blue-100 bg-white"}`}>
                <table className="w-full">
                  <thead className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-blue-50'}`}>
                    <tr>
                      <th className={`p-4 text-xs font-bold uppercase tracking-wider text-left ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>Date</th>
                      <th className={`p-4 text-xs font-bold uppercase tracking-wider text-left ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>Employee ID</th>
                      <th className={`p-4 text-xs font-bold uppercase tracking-wider text-left ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>Employee Name</th>
                      <th className={`p-4 text-xs font-bold uppercase tracking-wider text-left ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>Leave Type</th>
                      <th className={`p-4 text-xs font-bold uppercase tracking-wider text-left ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>No of Days</th>
                      <th className={`p-4 text-xs font-bold uppercase tracking-wider text-left ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>Reason</th>
                      <th className={`p-4 text-xs font-bold uppercase tracking-wider text-left ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((leave, idx) => (
                      <tr
                        key={leave.leaveId}
                        className={`align-top ${
                          theme === 'dark'
                            ? idx % 2 === 0
                              ? 'bg-gray-900'
                              : 'bg-gray-800'
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-blue-50'
                        } hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors duration-150`}
                      >
                        <td className="p-4 align-top font-bold text-left">
                          {leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : 'N/A'}
                        </td>
                        <td className="p-4 align-top text-left">{leave.employeeId}</td>
                        <td className="p-4 align-top text-left">{leave.employeeName}</td>
                        <td className="p-4 align-top text-left">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            leave.leaveType === 'EL'
                              ? 'bg-blue-100 text-blue-700'
                              : leave.leaveType === 'CL'
                                ? 'bg-yellow-100 text-yellow-800'
                                : leave.leaveType === 'SL'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-200 text-gray-700'
                          }`}>
                            {leave.leaveType}
                          </span>
                        </td>
                        <td className="p-4 align-top text-left">{leave.numberOfDays}</td>
                        <td className="p-4 align-top whitespace-pre-line break-words max-w-[180px] text-left" title={leave.reason}>
                          {leave.reason}
                        </td>
                        <td className="p-4 align-top text-center">
                          <button
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            title="View"
                            onClick={() => setViewRecord(leave)}
                          >
                            <FaEye />
                            <span className="font-semibold">View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                  : theme === 'dark'
                    ? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg font-semibold border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  currentPage === page
                    ? theme === 'dark'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-lg'
                      : 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                  : theme === 'dark'
                    ? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}