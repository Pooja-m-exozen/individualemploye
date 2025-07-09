"use client";
import React, { useState } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaUserAlt, FaTimesCircle, FaSearch, FaEye } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { getAllEmployeesLeaveHistory, EmployeeWithLeaveHistory } from "@/services/leave";
import { showToast, ToastStyles } from "@/components/Toast";
import { api } from "@/services/api";
import Image from "next/image";

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

  // Sort filteredSearchData by startDate descending (most recent first)
  const sortedData = [...filteredSearchData].sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return dateB - dateA;
  });

  // Calculate paginated data
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedData = sortedData.slice(
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
      return (record as Record<string, unknown>).approvedBy as string || 'N/A';
    }
    return 'N/A';
  }

  function getRejectionReason(record: Record<string, unknown>): string {
    if (typeof record === 'object' && record && 'rejectionReason' in record) {
      return (record as Record<string, unknown>).rejectionReason as string || '-';
    }
    return '-';
  }

  return (
    <AdminDashboardLayout>
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh] bg-white dark:bg-gray-800">
            <button
              onClick={closeRejectModal}
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center text-red-600 dark:text-red-400">Reject Leave Request</h2>
            <form onSubmit={handleRejectSubmit}>
              <label className="block mb-2 font-semibold">Reason for rejection:</label>
              <textarea
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              {rejectionError && <div className="text-red-500 text-sm mb-2">{rejectionError}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={closeRejectModal} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" disabled={!rejectionReason.trim()}>Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewRecord && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh] bg-white dark:bg-gray-800">
            <button
              onClick={() => setViewRecord(null)}
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-700 dark:text-blue-400">Leave Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b pb-2">
                <Image src={viewRecord.employeeImage || "/placeholder-user.jpg"} alt={viewRecord.employeeName} width={40} height={40} className="rounded-full border border-blue-200 dark:border-blue-800" />
                <span className="font-medium text-lg text-gray-900 dark:text-gray-100">{viewRecord.employeeName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-300">({viewRecord.employeeId})</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Leave Type:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.leaveType}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">No of Days:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.numberOfDays}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Date:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.startDate ? new Date(viewRecord.startDate).toISOString().split('T')[0] : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">End Date:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.endDate ? new Date(viewRecord.endDate).toISOString().split('T')[0] : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Status:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.status}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Reason:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.reason}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Approved By:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord ? String(getApprovedBy(viewRecord)) : "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Applied On:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.appliedOn ? new Date(viewRecord.appliedOn).toISOString().split('T')[0] : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Last Updated:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.lastUpdated ? new Date(viewRecord.lastUpdated).toISOString().split('T')[0] : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Emergency Contact:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord.emergencyContact || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-500 dark:text-gray-300">Rejection Reason:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewRecord ? String(getRejectionReason(viewRecord)) : "-"}</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setViewRecord(null)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-0 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
          <div className="flex items-center gap-6">
            <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
              <FaUserAlt className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Employee Leave Report</h1>
            </div>
          </div>
        </div>
        {/* Tabs for Filtering - Dropdown on mobile, radio buttons on desktop */}
        <div className="mb-6 mt-6">
          {/* Dropdown for mobile */}
          <div className="md:hidden">
            <select
              value={activeTab}
              onChange={e => setActiveTab(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${theme === 'dark' ? 'bg-[#23272f] text-blue-100 border-gray-700' : 'bg-white text-blue-900 border-gray-300'}`}
            >
              {['All', 'Approved', 'Rejected', 'Pending'].map(tab => (
                <option key={tab} value={tab}>{tab}</option>
              ))}
            </select>
          </div>
          {/* Radio buttons for desktop */}
          <div className="hidden md:flex gap-4 justify-start">
            {['All', 'Approved', 'Rejected', 'Pending'].map(tab => (
              <label key={tab} className="flex items-center cursor-pointer select-none">
                <input
                  type="radio"
                  name="leave-status"
                  value={tab}
                  checked={activeTab === tab}
                  onChange={() => setActiveTab(tab)}
                  className="peer hidden"
                />
                <span className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 border-2
                  ${activeTab === tab
                    ? theme === 'dark'
                      ? 'bg-[#384152] text-white border-blue-400 shadow-md'
                      : 'bg-[#1769ff] text-white border-[#1769ff] shadow-md'
                    : theme === 'dark'
                      ? 'bg-[#23272f] text-blue-100 border-gray-700 hover:bg-[#384152] hover:text-white'
                      : 'bg-white text-blue-600 border-gray-300 hover:bg-blue-50 hover:text-blue-700'}
                  peer-checked:ring-2 peer-checked:ring-blue-400
                `}>
                  {tab}
                </span>
              </label>
            ))}
          </div>
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
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 placeholder-blue-200 focus:ring-blue-300' : 'bg-white/80 text-gray-900 placeholder-gray-500 focus:ring-white'}`}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className={`absolute right-2 top-2 transition-colors duration-200 ${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
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
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 shadow-sm transition-colors duration-300 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              <option value="All">All Leave Types</option>
              <option value="EL">EL</option>
              <option value="CL">CL</option>
              <option value="SL">SL</option>
            </select>
          </div>
        </div>
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 mt-6`}>
          <div className="relative">
            <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <table className="w-full text-left">
                <thead>
                  <tr className={`
                    ${theme === 'dark' ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-900'}
                    rounded-t-xl
                    text-sm font-bold tracking-tight
                    border-b border-blue-200 dark:border-blue-900
                    shadow-sm
                  `}>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tl-xl tracking-tight">Employee</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Date</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Leave Type</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">No of Days</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Status</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Reason</th>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tr-xl tracking-tight text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">Loading...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={7} className="text-center text-red-500 py-8 text-xs">{error}</td></tr>
                  ) : paginatedData.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">No records found.</td></tr>
                  ) : (
                    paginatedData.map((leave) => (
                      <tr key={leave.leaveId} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className="px-3 py-2 text-xs whitespace-nowrap flex items-center gap-2">
                          <Image src={leave.employeeImage || "/placeholder-user.jpg"} alt={leave.employeeName} width={32} height={32} className="rounded-full border border-blue-200 dark:border-blue-800" />
                          <span className={theme === 'dark' ? 'text-blue-100' : 'text-black'}>{leave.employeeName}</span>
                        </td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : 'N/A'}</td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{leave.leaveType}</td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{leave.numberOfDays}</td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{leave.status}</td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap max-w-[120px] truncate ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{leave.reason}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap text-center">
                          <div className="flex flex-row gap-2 justify-center items-center">
                            <button
                              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition shadow-md"
                              title="View Details"
                              onClick={() => setViewRecord(leave)}
                            >
                              <FaEye />
                            </button>
                            {leave.status === "Pending" && (
                              <>
                                <button
                                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition shadow-md"
                                  title="Approve"
                                  onClick={async () => {
                                    try {
                                      await updateLeaveStatus(leave.leaveId, "Approved");
                                      showToast({ message: "Leave approved successfully!", type: "success" });
                                      await refreshLeaveData();
                                    } catch {
                                      showToast({ message: "Failed to approve leave", type: "error" });
                                    }
                                  }}
                                >
                                  {/* Check icon */}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button
                                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition shadow-md"
                                  title="Reject"
                                  onClick={() => {
                                    setRejectLeaveId(leave.leaveId);
                                    setRejectModalOpen(true);
                                  }}
                                >
                                  {/* Times icon */}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
    </AdminDashboardLayout>
  );
}