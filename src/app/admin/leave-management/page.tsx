"use client";
import React, { useState } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaSearch, FaEye } from "react-icons/fa";
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

  // Sort filteredSearchData by startDate descending (most recent first)
  const sortedData = [...filteredSearchData].sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return dateB - dateA;
  });


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
      <div className={`flex flex-col gap-4 p-2 lg:p-4 w-full font-sans h-screen overflow-y-auto ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'
      }`}>
        {/* Tabs and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {['All', 'Approved', 'Rejected', 'Pending'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                  {tab}
              </button>
            ))}
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center flex-1">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search employees..."
                className={`pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full ${theme === 'dark' ? 'bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-blue-300' : 'bg-white text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
              />
            </div>
            {/* Leave Type Filter */}
            <select
              value={filterLeaveType}
              onChange={e => setFilterLeaveType(e.target.value)}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
            >
              <option value="All">All Leave Types</option>
              <option value="EL">EL</option>
              <option value="CL">CL</option>
              <option value="SL">SL</option>
            </select>
          </div>
        </div>
        {/* Excel-style Table */}
        <div className="w-full">
          <div className="overflow-x-auto w-full custom-scrollbar">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                  <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                    <tr>
                      <th className={`px-2 py-3 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Leave Type</th>
                      <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Days</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Reason</th>
                      <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                  </tr>
                </thead>
                  <tbody>
                  {loading ? (
                      <tr>
                        <td colSpan={8} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Loading...
                        </td>
                      </tr>
                  ) : error ? (
                      <tr>
                        <td colSpan={8} className={`text-center py-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                          {error}
                        </td>
                      </tr>
                  ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((leave, index) => (
                        <tr key={leave.leaveId} className={`${
                          index % 2 === 0 
                            ? (theme === 'dark' ? 'bg-gray-800' : 'bg-white') 
                            : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50')
                        } hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-blue-50'} transition-colors`}>
                          <td className={`px-2 py-2 text-center font-medium border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {index + 1}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            <div className="flex items-center gap-2">
                              <Image 
                                src={leave.employeeImage || "/placeholder-user.jpg"} 
                                alt={leave.employeeName} 
                                width={24} 
                                height={24} 
                                className="rounded-full border border-blue-200 dark:border-blue-800" 
                              />
                              <span>{leave.employeeName}</span>
                            </div>
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {leave.leaveType}
                          </td>
                          <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {leave.numberOfDays}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              leave.status === "Approved" 
                                ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') 
                                : leave.status === "Rejected" 
                                ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') 
                                : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            <div className="max-w-[120px] truncate">
                              {leave.reason}
                            </div>
                          </td>
                          <td className={`px-2 py-2 text-center border ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}>
                            <div className="flex gap-1 justify-center">
                            <button
                                onClick={() => setViewRecord(leave)}
                                className={`p-1 rounded transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                              title="View Details"
                            >
                                <FaEye className="w-3 h-3" />
                            </button>
                            {leave.status === "Pending" && (
                              <>
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateLeaveStatus(leave.leaveId, "Approved");
                                      showToast({ message: "Leave approved successfully!", type: "success" });
                                      await refreshLeaveData();
                                    } catch {
                                      showToast({ message: "Failed to approve leave", type: "error" });
                                    }
                                  }}
                                    className={`p-1 rounded transition-colors ${
                                      theme === 'dark'
                                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                                    }`}
                                    title="Approve"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectLeaveId(leave.leaveId);
                                    setRejectModalOpen(true);
                                  }}
                                    className={`p-1 rounded transition-colors ${
                                      theme === 'dark'
                                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    }`}
                                    title="Reject"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
          </div>
      </div>
    </AdminDashboardLayout>
  );
}