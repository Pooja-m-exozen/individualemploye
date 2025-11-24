"use client";

import React, { useState } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaSearch } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { getAllEmployeesLeaveHistory, EmployeeWithLeaveHistory } from "@/services/leave";
import { showToast, ToastStyles } from "@/components/Toast";
import { api } from "@/services/api";
import Image from "next/image";

export default function LeaveManagementViewPage() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterEmpId, setFilterEmpId] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [allLeaveData, setAllLeaveData] = useState<EmployeeWithLeaveHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<typeof allLeaves[0] | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectLeave, setRejectLeave] = useState<typeof allLeaves[0] | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  // Initialize date filters as empty to show all data by default
  React.useEffect(() => {
    setFromDate("");
    setToDate("");
  }, []);

  const allLeaves = allLeaveData.flatMap((emp) =>
    (emp.leaveHistory?.leaveHistory || []).map((leave) => ({
      ...leave,
      employeeName: emp.kyc.personalDetails.fullName,
      employeeId: emp.kyc.personalDetails.employeeId,
      designation: emp.kyc.personalDetails.designation,
      employeeImage: emp.kyc.personalDetails.employeeImage,
    }))
  );

  // Enhanced filtering with date range
  const filteredLeaves = allLeaves.filter((leave) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      leave.employeeId.toLowerCase().includes(searchLower) ||
      leave.employeeName.toLowerCase().includes(searchLower) ||
      (leave.designation && leave.designation.toLowerCase().includes(searchLower)) ||
      (leave.leaveType && leave.leaveType.toLowerCase().includes(searchLower)) ||
      (leave.reason && leave.reason.toLowerCase().includes(searchLower));

    const matchesEmpId = filterEmpId === "" || leave.employeeId.toLowerCase().includes(filterEmpId.toLowerCase());
    const matchesName = filterName === "" || leave.employeeName.toLowerCase().includes(filterName.toLowerCase());
    const matchesLeaveType = filterLeaveType === "All" || leave.leaveType === filterLeaveType;
    const matchesStatus = filterStatus === "All" || leave.status === filterStatus;
    const matchesStartDate = filterStartDate === "" || (leave.startDate && leave.startDate.slice(0, 10) === filterStartDate);
    
    // Date range filtering
    let matchesFromDate = true;
    let matchesToDate = true;
    if (fromDate && leave.startDate) {
      matchesFromDate = leave.startDate.slice(0, 10) >= fromDate;
    }
    if (toDate && leave.startDate) {
      matchesToDate = leave.startDate.slice(0, 10) <= toDate;
    }
    
    return matchesSearch && matchesEmpId && matchesName && matchesLeaveType && matchesStatus && matchesStartDate && matchesFromDate && matchesToDate;
  });

  // Get unique values for dropdowns
  const uniqueLeaveTypes = Array.from(new Set(allLeaves.map(l => l.leaveType).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(allLeaves.map(l => l.status).filter(Boolean)));

  const updateLeaveStatus = async (leaveId: string, status: string, reason?: string) => {
    try {
      const payload: { status: string; rejectionReason?: string } = { status };
      if (status === "Rejected" && reason) {
        payload.rejectionReason = reason;
      }
      const response = await api.put(`/leave/update/${leaveId}`, payload);
      if (response.data) {
        showToast({ message: "Leave status updated successfully.", type: "success" });
        
        // Update the local state immediately without refetching
        setAllLeaveData(prevData => 
          prevData.map(emp => {
            if (!emp.leaveHistory?.leaveHistory) return emp;
            
            const updatedLeaveHistory = emp.leaveHistory.leaveHistory.map(leave => {
              if (leave.leaveId === leaveId) {
                return {
                  ...leave,
                  status: status,
                  lastUpdated: new Date().toISOString(),
                  ...(status === "Rejected" && reason ? { rejectionReason: reason } : {}),
                };
              }
              return leave;
            });
            
            return {
              ...emp,
              leaveHistory: {
                ...emp.leaveHistory,
                leaveHistory: updatedLeaveHistory,
              },
            };
          })
        );
      }
    } catch (error) {
      showToast({ message: "Failed to update leave status.", type: "error" });
      console.error("Error updating leave status:", error);
    }
  };

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
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Leave Type Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={filterLeaveType}
                onChange={e => setFilterLeaveType(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="All">All Leave Types</option>
                {uniqueLeaveTypes.map((type: string) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {/* Status Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="All">All Status</option>
                {uniqueStatuses.map((status: string) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee name, ID, or reason..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="From Date"
              />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="To Date"
              />
              <button
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                onClick={() => {
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
                }}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

      {viewRecord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Leave Details</h2>
              <button
                onClick={() => setViewRecord(null)}
                className="text-2xl font-bold hover:text-red-500"
              >
                &times;
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Employee Name:</span>{" "}
                {viewRecord.employeeName}
              </div>
              <div>
                <span className="font-semibold">Employee ID:</span>{" "}
                {viewRecord.employeeId}
              </div>
              <div>
                <span className="font-semibold">Leave Type:</span>{" "}
                {viewRecord.leaveType}
              </div>
              <div>
                <span className="font-semibold">No of Days:</span>{" "}
                {viewRecord.numberOfDays}
              </div>
              <div>
                <span className="font-semibold">Date:</span>{" "}
                {viewRecord.startDate
                  ? new Date(viewRecord.startDate).toISOString().split("T")[0]
                  : "N/A"}
              </div>
              <div>
                <span className="font-semibold">End Date:</span>{" "}
                {viewRecord.endDate
                  ? new Date(viewRecord.endDate).toISOString().split("T")[0]
                  : "N/A"}
              </div>
              <div>
                <span className="font-semibold">Status:</span> {viewRecord.status}
              </div>
              <div>
                <span className="font-semibold">Reason:</span> {viewRecord.reason}
              </div>
              <div>
                <span className="font-semibold">Applied On:</span>{" "}
                {viewRecord.appliedOn
                  ? new Date(viewRecord.appliedOn).toISOString().split("T")[0]
                  : "N/A"}
              </div>
              <div>
                <span className="font-semibold">Last Updated:</span>{" "}
                {viewRecord.lastUpdated
                  ? new Date(viewRecord.lastUpdated).toISOString().split("T")[0]
                  : "N/A"}
              </div>
              <div>
                <span className="font-semibold">Emergency Contact:</span>{" "}
                {viewRecord.emergencyContact || "N/A"}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md relative">
              <button
                onClick={() => { setRejectModalOpen(false); setRejectLeave(null); setRejectionReason(""); }}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold"
                aria-label="Close"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">Reject Leave</h2>
              <textarea
                className={`w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  theme === "dark" 
                    ? "bg-gray-800 border-gray-600 text-white" 
                    : "bg-white border-gray-300 text-black"
                }`}
                rows={4}
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setRejectModalOpen(false); setRejectLeave(null); setRejectionReason(""); }}
                  className={`px-4 py-2 rounded-lg font-semibold border transition ${
                    theme === 'dark' 
                      ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (rejectLeave) {
                      await updateLeaveStatus(rejectLeave.leaveId, "Rejected", rejectionReason);
                      setRejectModalOpen(false);
                      setRejectLeave(null);
                      setRejectionReason("");
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading leave records...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-16 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Photo</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee ID</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee Name</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Leave Type</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Start Date</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>End Date</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase w-48 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Reason</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className={`px-2 py-1 sticky left-0 z-20 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 w-16 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={filterEmpId} 
                        onChange={e => setFilterEmpId(e.target.value)} 
                        placeholder="Filter ID" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={filterName} 
                        onChange={e => setFilterName(e.target.value)} 
                        placeholder="Filter Name" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={filterLeaveType} 
                        onChange={e => setFilterLeaveType(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="All">All</option>
                        {uniqueLeaveTypes.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        type="date"
                        value={filterStartDate} 
                        onChange={e => setFilterStartDate(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={filterStatus} 
                        onChange={e => setFilterStatus(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="All">All</option>
                        {uniqueStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                  </tr>
              </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No leave records found</td>
                    </tr>
                  ) : filteredLeaves.map((leave, index) => (
                    <tr key={leave.leaveId} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                      <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{index + 1}</td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <Image
                          src={leave.employeeImage || "/placeholder-user.jpg"}
                          alt={leave.employeeName}
                          width={32}
                          height={32}
                          className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                        />
                      </td>
                      <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{leave.employeeId}</td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={leave.employeeName || "-"}>{leave.employeeName || "-"}</div></td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={leave.designation || "-"}>{leave.designation || "-"}</div></td>
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={leave.leaveType}>{leave.leaveType}</div></td>
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{leave.startDate ? new Date(leave.startDate).toLocaleDateString() : "N/A"}</td>
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{leave.endDate ? new Date(leave.endDate).toLocaleDateString() : "N/A"}</td>
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                          leave.status === 'Approved' 
                            ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                            : leave.status === 'Rejected'
                            ? theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                            : theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {leave.status || "N/A"}
                        </span>
                      </td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="break-words whitespace-normal max-w-xs" title={leave.reason || "-"}>
                          {leave.reason || "-"}
                        </div>
                      </td>
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        {leave.status === "Pending" ? (
                          <div className="flex gap-1">
                            <button
                              className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'border-green-500 text-green-400 bg-gray-800 hover:bg-gray-700 focus:ring-green-400' 
                                  : 'border-green-500 text-green-600 bg-white hover:bg-green-50 focus:ring-green-400'
                              }`}
                              onClick={async () => {
                                await updateLeaveStatus(leave.leaveId, "Approved");
                              }}
                            >
                              Approve
                            </button>
                            <button
                              className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'border-red-500 text-red-400 bg-gray-800 hover:bg-gray-700 focus:ring-red-400' 
                                  : 'border-red-500 text-red-600 bg-white hover:bg-red-50 focus:ring-red-400'
                              }`}
                              onClick={() => { setRejectLeave(leave); setRejectModalOpen(true); }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                              theme === 'dark' 
                                ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                            }`}
                            onClick={() => setViewRecord(leave)}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>

        {/* Leave Detail Modal */}
        {viewRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold" onClick={() => setViewRecord(null)}>✕</button>
              <h2 className="text-2xl font-bold mb-4 text-center">Leave Record Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Image src={viewRecord.employeeImage || "/placeholder-user.jpg"} alt="Employee" width={64} height={64} className="w-16 h-16 rounded-full object-cover border" />
                  <div>
                    <div className="font-bold text-lg">{viewRecord.employeeName || viewRecord.employeeId}</div>
                    <div className="text-xs text-gray-500">{viewRecord.employeeId}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><b>Designation:</b> {viewRecord.designation || '-'}</div>
                  <div><b>Leave Type:</b> {viewRecord.leaveType || '-'}</div>
                  <div><b>Start Date:</b> {viewRecord.startDate ? new Date(viewRecord.startDate).toLocaleDateString() : '-'}</div>
                  <div><b>End Date:</b> {viewRecord.endDate ? new Date(viewRecord.endDate).toLocaleDateString() : '-'}</div>
                  <div><b>Status:</b> {viewRecord.status || '-'}</div>
                  <div><b>Applied On:</b> {viewRecord.appliedOn ? new Date(viewRecord.appliedOn).toLocaleDateString() : '-'}</div>
                  <div className="col-span-2">
                    <b>Reason:</b> 
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{viewRecord.reason || 'No reason provided'}</span>
                  </div>
                  <div className="col-span-2">
                    <b>Emergency Contact:</b> 
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{viewRecord.emergencyContact || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}