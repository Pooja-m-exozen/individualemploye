"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaDownload, FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const dummyRequests = [
  { id: "REQ001", item: "Uniform Shirt", quantity: 50, requestedBy: "John Doe", date: "2025-06-10", status: "Pending" },
  { id: "REQ002", item: "Safety Shoes", quantity: 30, requestedBy: "Jane Smith", date: "2025-06-11", status: "Approved" },
  { id: "REQ003", item: "Helmet", quantity: 10, requestedBy: "Alice Brown", date: "2025-06-12", status: "Rejected" },
  { id: "REQ004", item: "Gloves", quantity: 100, requestedBy: "Bob Lee", date: "2025-06-13", status: "Pending" },
];

const statusOptions = ["Approved", "Pending", "Rejected"];

function getStatusColor(status: string, theme: string) {
  switch (status.toLowerCase()) {
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

export default function StoreRequestsPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Filtered and paginated data
  const filtered = dummyRequests.filter(req => {
    const matchesStatus = statusFilter ? req.status === statusFilter : true;
    const matchesSearch = search ? (
      req.id.toLowerCase().includes(search.toLowerCase()) ||
      req.item.toLowerCase().includes(search.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(search.toLowerCase())
    ) : true;
    return matchesStatus && matchesSearch;
  });
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <ManagerDashboardLayout>
      <div
        className={`min-h-screen flex flex-col py-8 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950"
            : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
        }`}
      >
        {/* Header */}
        <div
          className={`rounded-2xl mb-8 p-6 flex items-center justify-between shadow-lg w-full max-w-7xl mx-auto bg-gradient-to-r ${
            theme === "dark"
              ? "from-blue-900 to-blue-700"
              : "from-blue-500 to-blue-800"
          }`}
        >
          <div className="flex items-center gap-5">
            <div
              className={`rounded-xl p-4 flex items-center justify-center ${
                theme === "dark"
                  ? "bg-blue-900 bg-opacity-40"
                  : "bg-blue-600 bg-opacity-30"
              }`}
            >
              <FaStore className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Store Requests</h1>
              <p className="text-white text-base opacity-90">View and manage store requests</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                theme === "dark"
                  ? "bg-gray-900 text-blue-200 hover:bg-blue-900"
                  : "bg-white text-blue-600 hover:bg-blue-50"
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
                    onClick={() => setError(null)}
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
                            placeholder="Search by request ID, item, or requester..."
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
                              Showing <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{filtered.length}</span> of <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{dummyRequests.length}</span> requests
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
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Request ID</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Item</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Quantity</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Requested By</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Date</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "bg-gray-900 divide-y divide-gray-800" : "bg-white divide-y divide-gray-200"}>
                        {paginated.map((req, idx) => (
                          <tr key={idx} className={`transition-all duration-200 group ${theme === "dark" ? "hover:bg-gray-800" : "hover:bg-blue-50"}`}>
                            <td className={`px-6 py-4 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{req.id}</td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-gray-100" : ""}`}>{req.item}</td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-gray-100" : ""}`}>{req.quantity}</td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-gray-100" : ""}`}>{req.requestedBy}</td>
                            <td className={`px-6 py-4 ${theme === "dark" ? "text-gray-100" : ""}`}>{req.date}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${getStatusColor(req.status, theme)}`}>
                                {req.status === "Approved" && <FaCheckCircle className="w-3 h-3 mr-1" />}
                                {req.status === "Pending" && <FaClock className="w-3 h-3 mr-1" />}
                                {req.status === "Rejected" && <FaTimesCircle className="w-3 h-3 mr-1" />}
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === "dark" ? "bg-blue-900 text-blue-200 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className={`px-6 py-4 border-t transition-colors duration-300 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between">
                        <div className={theme === "dark" ? "text-sm text-gray-300" : "text-sm text-gray-600"}>
                          Showing <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                          <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>
                            {Math.min(currentPage * rowsPerPage, filtered.length)}
                          </span>{' '}
                          of <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{filtered.length}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === "dark" ? "text-gray-400 bg-gray-900 border border-gray-700 hover:bg-gray-800" : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"}`}
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
                                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    currentPage === pageNum
                                      ? theme === "dark"
                                        ? "bg-blue-800 text-white shadow-md"
                                        : "bg-blue-600 text-white shadow-md"
                                      : theme === "dark"
                                      ? "text-gray-300 bg-gray-900 border border-gray-700 hover:bg-gray-800"
                                      : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
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
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === "dark" ? "text-gray-400 bg-gray-900 border border-gray-700 hover:bg-gray-800" : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"}`}
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