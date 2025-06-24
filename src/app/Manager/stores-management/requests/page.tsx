"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaDownload, FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";

const dummyRequests = [
  { id: "REQ001", item: "Uniform Shirt", quantity: 50, requestedBy: "John Doe", date: "2025-06-10", status: "Pending" },
  { id: "REQ002", item: "Safety Shoes", quantity: 30, requestedBy: "Jane Smith", date: "2025-06-11", status: "Approved" },
  { id: "REQ003", item: "Helmet", quantity: 10, requestedBy: "Alice Brown", date: "2025-06-12", status: "Rejected" },
  { id: "REQ004", item: "Gloves", quantity: 100, requestedBy: "Bob Lee", date: "2025-06-13", status: "Pending" },
];

const statusOptions = ["Approved", "Pending", "Rejected"];

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default function StoreRequestsPage() {
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col py-8">
        {/* Header */}
        <div className="rounded-2xl mb-8 p-6 flex items-center justify-between shadow-lg bg-gradient-to-r from-blue-500 to-blue-800 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-5">
            <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
              <FaStore className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Store Requests</h1>
              <p className="text-white text-base opacity-90">View and manage store requests</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md">
              <FaDownload className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-16">
                  <div className="relative">
                    <FaClock className="animate-spin text-blue-600 w-12 h-12" />
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse"></div>
                  </div>
                  <p className="text-gray-600 font-medium mt-4">Loading store requests...</p>
                  <p className="text-sm text-gray-500 mt-1">Please wait while we fetch the data</p>
                </div>
              ) : error ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className="bg-red-50 rounded-full p-4 mb-4">
                    <FaTimesCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                  <p className="text-gray-600 text-center max-w-md">{error}</p>
                  <button 
                    onClick={() => setError(null)}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Try Again
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className="bg-gray-50 rounded-full p-4 mb-4">
                    <FaStore className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Found</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    {search || statusFilter
                      ? "No store requests match your current filters. Try adjusting your search criteria."
                      : "No store requests available at the moment."
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Search and Filter Section */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search by request ID, item, or requester..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            showFilters 
                              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <FaFilter className="w-4 h-4" />
                          Filters
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full ml-1">
                            {[statusFilter].filter(Boolean).length}
                          </span>
                        </button>
                      </div>
                    </div>
                    {/* Advanced Filters Panel */}
                    {showFilters && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Status Filter */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                              Status
                            </label>
                            <select
                              value={statusFilter}
                              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 text-sm"
                            >
                              <option value="">All Status</option>
                              {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {/* Clear Filters */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-3">
                            {statusFilter && (
                              <button
                                onClick={() => { setStatusFilter(""); setCurrentPage(1); }}
                                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors duration-200"
                              >
                                <FaTimesCircle className="w-4 h-4" />
                                Clear All Filters
                              </button>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> of <span className="font-semibold text-gray-900">{dummyRequests.length}</span> requests
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Requests Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Request ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Item</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Quantity</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Requested By</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginated.map((req, idx) => (
                          <tr key={idx} className="hover:bg-blue-50 transition-all duration-200 group">
                            <td className="px-6 py-4 font-bold text-blue-800">{req.id}</td>
                            <td className="px-6 py-4">{req.item}</td>
                            <td className="px-6 py-4">{req.quantity}</td>
                            <td className="px-6 py-4">{req.requestedBy}</td>
                            <td className="px-6 py-4">{req.date}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${getStatusColor(req.status)}`}>
                                {req.status === "Approved" && <FaCheckCircle className="w-3 h-3 mr-1" />}
                                {req.status === "Pending" && <FaClock className="w-3 h-3 mr-1" />}
                                {req.status === "Rejected" && <FaTimesCircle className="w-3 h-3 mr-1" />}
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button className="px-4 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                          <span className="font-semibold text-gray-900">
                            {Math.min(currentPage * rowsPerPage, filtered.length)}
                          </span>{' '}
                          of <span className="font-semibold text-gray-900">{filtered.length}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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