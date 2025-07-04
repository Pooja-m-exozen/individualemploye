"use client";
import React, { useState, useEffect, useRef } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaDownload, FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const statusOptions = ["Approved", "Pending", "Rejected"];

function getStatusColor(status: string, theme: string) {
  switch (status?.toLowerCase()) {
    case "approved":
      return theme === "dark"
        ? "bg-emerald-900 text-emerald-200 border-emerald-700"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending":
      return theme === "dark"
        ? "bg-amber-900 text-amber-200 border-amber-700"
        : "bg-amber-100 text-amber-800 border-amber-200";
    case "rejected":
      return theme === "dark"
        ? "bg-red-900 text-red-200 border-red-700"
        : "bg-red-100 text-red-800 border-red-200";
    default:
      return theme === "dark"
        ? "bg-gray-700 text-gray-200 border-gray-600"
        : "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export interface UniformRequest {
  _id?: string;
  employeeId: string;
  fullName: string;
  projectName: string;
  uniformType: string[];
  approvalStatus: string;
  requestDate?: string;
  designation?: string;
  gender?: string;
  size?: Record<string, string>;
  qty?: number;
  issuedStatus?: string;
  remarks?: string;
  approvedBy?: string;
  approvedDate?: string;
  issuedBy?: string;
  issuedDate?: string;
  dcNumber?: string;
  documentPath?: string;
}

export default function StoreRequestsPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<UniformRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UniformRequest | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const rowsPerPage = 5;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("https://cafm.zenapi.co.in/api/uniforms/all")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch uniform requests");
        const data = await res.json();
        setRequests(Array.isArray(data.uniforms) ? data.uniforms : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
        setLoading(false);
      });
  }, []);

  // Filtered and paginated data
  const filtered = requests.filter((req) => {
    const matchesStatus = statusFilter ? req.approvalStatus === statusFilter : true;
    const matchesSearch = search
      ? (
          req.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
          req.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          req.projectName?.toLowerCase().includes(search.toLowerCase()) ||
          req.uniformType?.join(", ").toLowerCase().includes(search.toLowerCase())
        )
      : true;
    return matchesStatus && matchesSearch;
  });
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // CSV Export
  function exportToCSV() {
    if (!filtered.length) return;
    const headers = [
      "Employee ID",
      "Name",
      "Project",
      "Uniform Type",
      "Status",
      "Request Date"
    ];
    const rows = filtered.map(req => [
      req.employeeId,
      req.fullName,
      req.projectName,
      Array.isArray(req.uniformType) ? req.uniformType.join("; ") : "",
      req.approvalStatus,
      req.requestDate ? new Date(req.requestDate).toLocaleDateString() : ""
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `uniform-requests-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <ManagerDashboardLayout>
      {/* Modal for viewing details */}
      {selectedRequest && (
        <dialog ref={modalRef} open className="fixed z-50 left-0 top-0 w-full h-full flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-xl shadow-lg max-w-lg w-full p-6 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-3 right-3 ${theme === "dark" ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"}`}
              onClick={() => setSelectedRequest(null)}
              aria-label="Close"
            >
              <FaTimesCircle className="w-6 h-6" />
            </button>
            <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Uniform Request Details</h2>
            <div className="space-y-2 text-sm">
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Employee ID:</span> {selectedRequest.employeeId}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Name:</span> {selectedRequest.fullName}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Designation:</span> {selectedRequest.designation}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Gender:</span> {selectedRequest.gender}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Project:</span> {selectedRequest.projectName}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Uniform Type:</span> {Array.isArray(selectedRequest.uniformType) ? selectedRequest.uniformType.join(", ") : ""}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Size:</span> {selectedRequest.size ? Object.entries(selectedRequest.size).map(([k,v]) => `${k}: ${v}`).join(", ") : ""}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Quantity:</span> {selectedRequest.qty}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Status:</span> {selectedRequest.approvalStatus}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Issued Status:</span> {selectedRequest.issuedStatus}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Request Date:</span> {selectedRequest.requestDate ? new Date(selectedRequest.requestDate).toLocaleString() : ""}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Remarks:</span> {selectedRequest.remarks}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Approved By:</span> {selectedRequest.approvedBy}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Approved Date:</span> {selectedRequest.approvedDate ? new Date(selectedRequest.approvedDate).toLocaleString() : ""}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Issued By:</span> {selectedRequest.issuedBy}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Issued Date:</span> {selectedRequest.issuedDate ? new Date(selectedRequest.issuedDate).toLocaleString() : ""}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">DC Number:</span> {selectedRequest.dcNumber}</div>
              {selectedRequest.documentPath && (
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Document:</span> <a href={selectedRequest.documentPath} target="_blank" rel="noopener noreferrer" className={theme === "dark" ? "text-blue-300 underline" : "text-blue-700 underline"}>View Document</a></div>
              )}
            </div>
          </div>
        </dialog>
      )}
      <div
        className={`min-h-screen flex flex-col py-8 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950"
            : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
        }`}
      >
        {/* Header */}
        <div
          className={`rounded-2xl mb-8 p-6 flex items-center justify-between shadow-lg w-full max-w-7xl mx-auto transition-colors duration-300 ${
            theme === "dark"
              ? "bg-[#2d3748]"
              : "bg-gradient-to-r from-blue-500 to-blue-800"
          }`}
        >
          <div className="flex items-center gap-5">
            <div
              className={`rounded-xl p-4 flex items-center justify-center ${
                theme === "dark"
                  ? "bg-[#232b38]"
                  : "bg-blue-100"
              }`}
            >
              <FaStore className={`w-10 h-10 ${theme === "dark" ? "text-white" : "text-blue-700"}`} />
            </div>
            <div>
              <h1 className={`text-3xl font-bold mb-1 ${theme === "dark" ? "text-white" : "text-white"}`}>Store Requests</h1>
              <p className={`text-base opacity-90 ${theme === "dark" ? "text-white" : "text-white"}`}>View and manage store requests</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={exportToCSV}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                theme === "dark"
                  ? "bg-gray-900 text-blue-200 hover:bg-blue-900"
                  : "bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              <FaDownload className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 px-6">
          <div className="max-w-7xl mx-auto">
            <div
              className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-800"
                  : "bg-white border-gray-200"
              }`}
            >
              {loading ? (
                <div className="flex flex-col justify-center items-center py-16">
                  <div className="relative">
                    <FaClock className={`animate-spin w-12 h-12 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />
                    <div className={`absolute inset-0 rounded-full border-4 animate-pulse ${theme === "dark" ? "border-blue-900" : "border-blue-100"}`}></div>
                  </div>
                  <p className={theme === "dark" ? "text-gray-200 font-medium mt-4" : "text-gray-600 font-medium mt-4"}>Loading store requests...</p>
                  <p className={theme === "dark" ? "text-sm text-gray-400 mt-1" : "text-sm text-gray-500 mt-1"}>Please wait while we fetch the data</p>
                </div>
              ) : error ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className={theme === "dark" ? "bg-red-900 rounded-full p-4 mb-4" : "bg-red-50 rounded-full p-4 mb-4"}>
                    <FaTimesCircle className={theme === "dark" ? "w-8 h-8 text-red-300" : "w-8 h-8 text-red-600"} />
                  </div>
                  <h3 className={theme === "dark" ? "text-lg font-semibold text-gray-100 mb-2" : "text-lg font-semibold text-gray-900 mb-2"}>Error Loading Data</h3>
                  <p className={theme === "dark" ? "text-gray-300 text-center max-w-md" : "text-gray-600 text-center max-w-md"}>{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className={`mt-4 px-6 py-2 rounded-lg transition-colors duration-200 ${theme === "dark" ? "bg-blue-800 text-white hover:bg-blue-900" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    Try Again
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className={theme === "dark" ? "bg-gray-800 rounded-full p-4 mb-4" : "bg-gray-50 rounded-full p-4 mb-4"}>
                    <FaStore className={theme === "dark" ? "w-8 h-8 text-gray-500" : "w-8 h-8 text-gray-400"} />
                  </div>
                  <h3 className={theme === "dark" ? "text-lg font-semibold text-gray-100 mb-2" : "text-lg font-semibold text-gray-900 mb-2"}>No Requests Found</h3>
                  <p className={theme === "dark" ? "text-gray-300 text-center max-w-md" : "text-gray-600 text-center max-w-md"}>
                    {search || statusFilter
                      ? "No store requests match your current filters. Try adjusting your search criteria."
                      : "No store requests available at the moment."
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Search and Filter Section */}
                  <div className={`px-6 py-4 border-b transition-colors duration-300 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                          <input
                            type="text"
                            placeholder="Search by employee ID, name, project, or uniform type..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900 placeholder-gray-400" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500 placeholder-gray-500"}`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                            showFilters
                              ? theme === "dark"
                                ? "bg-blue-900 text-blue-200 border-blue-800"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                              : theme === "dark"
                              ? "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <FaFilter className="w-4 h-4" />
                          Filters
                          <span className={`text-xs px-2 py-1 rounded-full ml-1 ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>
                            {[statusFilter].filter(Boolean).length}
                          </span>
                        </button>
                      </div>
                    </div>
                    {/* Advanced Filters Panel */}
                    {showFilters && (
                      <div className={`mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                        {/* Status Filter */}
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"}`}
                          >
                            <option value="">All Status</option>
                            {statusOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                        {/* Clear Filters */}
                        <div className={`flex items-center justify-between mt-4 pt-4 border-t col-span-full ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center gap-3">
                            {statusFilter && (
                              <button
                                onClick={() => { setStatusFilter(""); setCurrentPage(1); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${theme === "dark" ? "bg-red-900 text-red-200 hover:bg-red-800" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                              >
                                <FaTimesCircle className="w-4 h-4" />
                                Clear All Filters
                              </button>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={theme === "dark" ? "text-sm text-gray-300" : "text-sm text-gray-600"}>
                              Showing <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{filtered.length}</span> of <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{requests.length}</span> requests
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Requests Table */}
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y transition-colors duration-300 ${theme === "dark" ? "divide-gray-800" : "divide-gray-200"}`}>
                      <thead className={theme === "dark" ? "bg-gray-900" : "bg-gray-50"}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Employee ID</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Project</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Uniform Type</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Request Date</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "bg-gray-900 divide-y divide-gray-800" : "bg-white divide-y divide-gray-200"}>
                        {paginated.map((req, idx) => (
                          <tr key={req._id || idx} className={`transition-all duration-200 group ${theme === "dark" ? "hover:bg-gray-800" : "hover:bg-blue-50"}`}>
                            <td className={`px-6 py-4 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>{req.employeeId}</td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>{req.fullName}</td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>{req.projectName}</td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>{Array.isArray(req.uniformType) ? req.uniformType.join(", ") : ""}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${getStatusColor(req.approvalStatus, theme)}`}>
                                {req.approvalStatus === "Approved" && <FaCheckCircle className="w-3 h-3 mr-1" />}
                                {req.approvalStatus === "Pending" && <FaClock className="w-3 h-3 mr-1" />}
                                {req.approvalStatus === "Rejected" && <FaTimesCircle className="w-3 h-3 mr-1" />}
                                {req.approvalStatus}
                              </span>
                            </td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : ""}</td>
                            <td className="px-6 py-4">
                              <button
                                className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === "dark" ? "bg-blue-900 text-blue-200 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                                onClick={() => setSelectedRequest(req)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className={`px-6 py-4 border-t transition-colors duration-300 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className={theme === "dark" ? "text-sm text-gray-300" : "text-sm text-gray-600"}>
                          Showing <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                          <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>
                            {Math.min(currentPage * rowsPerPage, filtered.length)}
                          </span>{' '}
                          of <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{filtered.length}</span> results
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border ${theme === "dark" ? "text-gray-400 bg-gray-900 border-gray-700 hover:bg-gray-800" : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100"}`}
                          >
                            <FaChevronLeft className="w-4 h-4" />
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`px-3 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
                                    currentPage === pageNum
                                      ? theme === "dark"
                                        ? "bg-blue-800 text-white border-blue-700 shadow-md"
                                        : "bg-blue-600 text-white border-blue-600 shadow-md"
                                      : theme === "dark"
                                      ? "text-gray-300 bg-gray-900 border-gray-700 hover:bg-gray-800"
                                      : "text-gray-700 bg-white border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border ${theme === "dark" ? "text-gray-400 bg-gray-900 border-gray-700 hover:bg-gray-800" : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100"}`}
                          >
                            Next
                            <FaChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}