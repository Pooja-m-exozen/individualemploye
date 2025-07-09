"use client";

import React, { useEffect, useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaIdCard, FaUser, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaInfoCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

interface KYCRequest {
  _id: string;
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    employeeImage: string;
    projectName: string;
  };
  status: string;
}

type ViewMode = 'card' | 'table';

export default function KYCRequestsPage() {
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchRequests();
    fetch("https://cafm.zenapi.co.in/api/project/projects")
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Silently fail on project fetch error
      });
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const data = await res.json();
      setRequests((data.kycForms || []).filter((k: KYCRequest) => k.status === "Pending"));
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to fetch KYC requests: ${err.message}`);
      } else {
        setError("An unknown error occurred while fetching KYC requests.");
      }
    } finally {
      setLoading(false);
    }
  };

  const designationOptions = Array.from(new Set(requests.map(f => f.personalDetails.designation))).filter(Boolean);

  const handleAction = async (id: string, action: "approve" | "reject", employeeId: string) => {
    setActionLoading(id + action);
    setError(null);
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.reason || data.message || "Action failed");
      setRequests((prev) => prev.filter((req) => req._id !== id));
      setToast({ type: "success", message: data.message || `KYC ${action}d successfully.` });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update KYC status.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesProject = projectFilter === "All Projects" || req.personalDetails.projectName === projectFilter;
    const matchesDesignation = designationFilter === "All Designations" || req.personalDetails.designation === designationFilter;
    const matchesSearch = req.personalDetails.fullName.toLowerCase().includes(search.toLowerCase()) ||
      req.personalDetails.employeeId.toLowerCase().includes(search.toLowerCase());
    return matchesProject && matchesDesignation && matchesSearch;
  });

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col items-center py-4 md:py-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}
        style={{overflow: 'hidden'}}
      >
        {/* Modern KYC Header */}
        <div className={`rounded-2xl mb-4 md:mb-8 p-4 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-lg w-full max-w-full md:max-w-5xl mx-auto ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}>
          <div className={`bg-blue-600 bg-opacity-30 rounded-xl p-3 md:p-4 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700/50' : ''}`}>
            <FaIdCard className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">KYC Requests</h1>
            <p className={`text-base md:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-blue-100'}`}>Approve or reject pending KYC submissions</p>
          </div>
        </div>
        <div className="w-full max-w-full md:max-w-5xl mx-auto flex flex-col gap-4 md:gap-8 px-2 md:px-0">
          {/* Instructions Card (below header) */}
          {showInstructions && (
            <div className={`w-full max-w-full md:max-w-5xl mx-auto mb-4 md:mb-6 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} shadow-xl rounded-2xl p-3 md:p-5 flex gap-2 md:gap-4 flex-col md:flex-row`}>
              <div className={`p-2 md:p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'} flex items-center justify-center`}>
                <FaInfoCircle className={`w-5 h-5 md:w-6 md:h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2 text-blue-800">Instructions & Notes</h3>
                <ul className="space-y-1 md:space-y-2 text-blue-700 text-xs md:text-sm">
                  <li>• Review all KYC details before approving or rejecting.</li>
                  <li>• Use the search to quickly find employees.</li>
                  <li>• Approve only if all documents and details are valid.</li>
                  <li>• Rejection will notify the employee and admin.</li>
                </ul>
              </div>
              <button onClick={() => setShowInstructions(false)} className="ml-0 md:ml-2 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none">×</button>
            </div>
          )}
          {/* Toast/Snackbar */}
          {toast && (
            <div className={`fixed top-4 right-2 md:top-8 md:right-8 z-50 px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-lg text-white font-semibold text-sm md:text-base flex items-center gap-2 md:gap-3 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
            </div>
          )}
          {/* View Toggle and Search Bar */}
          <div className={`w-full max-w-full md:max-w-5xl mx-auto mb-4 md:mb-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 justify-between sticky top-0 z-30 py-2
            ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}
            style={{overflowX: 'visible'}}
          >
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
              <div className="flex gap-0.5 md:gap-2 w-full md:w-auto">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 md:px-4 py-2 rounded-l-xl font-semibold border transition w-1/2 md:w-auto
                    ${viewMode === 'card'
                      ? theme === 'dark'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-blue-600 text-white border-blue-600'
                      : theme === 'dark'
                        ? 'bg-gray-800 text-blue-200 border-gray-700'
                        : 'bg-white text-blue-700 border-blue-200'}
                  `}
                >
                  Card View
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 md:px-4 py-2 rounded-r-xl font-semibold border-l-0 border transition w-1/2 md:w-auto
                    ${viewMode === 'table'
                      ? theme === 'dark'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-blue-600 text-white border-blue-600'
                      : theme === 'dark'
                        ? 'bg-gray-800 text-blue-200 border-gray-700'
                        : 'bg-white text-blue-700 border-blue-200'}
                  `}
                >
                  Table View
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full">
              {/* Project Dropdown */}
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`w-full md:w-auto appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                style={{minWidth: 0, maxWidth: '100%'}}
              >
                <option value="All Projects">All Projects</option>
                {projectList.map(p => (
                  <option key={p._id} value={p.projectName}>{p.projectName}</option>
                ))}
              </select>

              {/* Designation Dropdown */}
              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className={`w-full md:w-auto appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                style={{minWidth: 0, maxWidth: '100%'}}
              >
                <option value="All Designations">All Designations</option>
                {designationOptions.map(designation => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>

              {/* Search Bar */}
              <div className={`relative flex items-center rounded-xl px-2 md:px-4 py-2 shadow w-full border transition
                ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100'}`}
                style={{minWidth: 0, maxWidth: '100%'}}
              >
                <FaSearch className={`mr-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`} />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setSelectedRequestId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && search) {
                      const found = filteredRequests.find(req =>
                        req.personalDetails.employeeId.toLowerCase() === search.toLowerCase() ||
                        req.personalDetails.fullName.toLowerCase() === search.toLowerCase()
                      );
                      if (found) {
                        setSelectedRequestId(found._id);
                        document.getElementById(found._id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  }}
                  className={`flex-1 bg-transparent outline-none placeholder-blue-300 transition
                    ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}
                />
              </div>
            </div>
          </div>
          {/* Requests List: Card or Table View */}
          <div
            className="w-full max-w-full md:max-w-5xl mx-auto flex-1"
            style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto', overflowX: 'visible' }}
          >
            {loading ? (
              <div className="flex flex-col justify-center items-center min-h-[120px] md:min-h-[200px] gap-2 md:gap-3">
                <FaSpinner className="animate-spin text-blue-600 w-8 h-8 md:w-10 md:h-10" />
                <span className="text-blue-700 font-medium text-base md:text-lg">Loading pending KYC requests...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 md:p-6 rounded-2xl flex items-center gap-2 md:gap-3 max-w-full md:max-w-lg mx-auto shadow-lg">
                <FaTimesCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                <p className="text-base md:text-lg font-medium">{error}</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-yellow-50 text-yellow-600 p-4 md:p-6 rounded-2xl flex flex-col items-center gap-2 md:gap-3 max-w-full md:max-w-lg mx-auto shadow-lg">
                <FaUser className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0" />
                <p className="text-base md:text-lg font-medium">No pending KYC requests found.</p>
              </div>
            ) : (
              viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  {filteredRequests.map((req) => (
                    <div
                      key={req._id}
                      id={req._id}
                      className={`rounded-2xl shadow-xl p-4 md:p-7 flex flex-col gap-3 md:gap-5 border-l-4 md:border-l-8 transition group relative
                        ${selectedRequestId === req._id ? 'ring-2 ring-blue-500' : ''}
                        ${theme === 'dark' ? 'bg-gray-800 border-blue-700 hover:shadow-blue-900' : 'bg-white border-blue-400 hover:shadow-2xl'}
                      `}
                    >
                      <div className="flex items-center gap-3 md:gap-6">
                        <Image
                          src={req.personalDetails.employeeImage || "/placeholder-user.jpg"}
                          alt={req.personalDetails.fullName}
                          width={60}
                          height={60}
                          className={`rounded-full object-cover border-2 shadow group-hover:scale-105 transition
                            ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}
                          `}
                        />
                        <div className="flex-1 min-w-0">
                          <h2 className={`text-lg md:text-xl font-bold mb-1 truncate ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.personalDetails.fullName}</h2>
                          <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                            <span className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-black'}`}>{req.personalDetails.designation}</span>
                            <span className={`text-xs md:text-sm font-bold ${theme === 'dark' ? 'text-gray-200 bg-gray-700' : 'text-black bg-gray-100'} px-2 py-0.5 rounded`}>{req.personalDetails.employeeId}</span>
                          </div>
                          <p className={`text-xs mb-1 truncate ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`}>{req.personalDetails.projectName}</p>
                          <span className={`inline-block text-xs font-semibold px-2 md:px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                        </div>
                      </div>
                      <div className="flex gap-2 md:gap-3 mt-2">
                        <button
                          onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                          disabled={actionLoading === req._id + "approve"}
                          title="Approve KYC"
                          className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-3 md:px-5 py-2 rounded-full font-semibold text-sm md:text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                            ${theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-900 text-white focus:ring-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white focus:ring-blue-400'}
                          `}
                        >
                          {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-white" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req._id, "reject", req.personalDetails.employeeId)}
                          disabled={actionLoading === req._id + "reject"}
                          title="Reject KYC"
                          className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-3 md:px-5 py-2 rounded-full font-semibold text-sm md:text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                            ${theme === 'dark' ? 'bg-gradient-to-r from-red-700 to-red-900 text-white focus:ring-red-700' : 'bg-gradient-to-r from-red-400 to-red-600 text-white focus:ring-red-300'}
                          `}
                        >
                          {actionLoading === req._id + "reject" ? <FaSpinner className="animate-spin" /> : <FaTimesCircle className="text-white" />}
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`overflow-x-auto rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
                  style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className={`min-w-[600px] md:min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-blue-100'}`}>
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}>
                      <tr>
                        <th className={`px-2 md:px-4 py-2 md:py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Photo</th>
                        <th className={`px-2 md:px-4 py-2 md:py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Name</th>
                        <th className={`px-2 md:px-4 py-2 md:py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Designation</th>
                        <th className={`px-2 md:px-4 py-2 md:py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Employee ID</th>
                        <th className={`px-2 md:px-4 py-2 md:py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Project</th>
                        <th className={`px-2 md:px-4 py-2 md:py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Status</th>
                        <th className={`px-2 md:px-4 py-2 md:py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={theme === 'dark' ? 'divide-gray-700' : 'divide-blue-50'}>
                      {filteredRequests.map((req) => (
                        <tr
                          key={req._id}
                          id={req._id}
                          className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} transition ${selectedRequestId === req._id ? (theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-100') : ''}`}>
                          <td className="px-2 md:px-4 py-2 md:py-3">
                            <Image src={req.personalDetails.employeeImage || "/placeholder-user.jpg"} alt={req.personalDetails.fullName} width={40} height={40} className={`rounded-full object-cover border-2 shadow ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`} />
                          </td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-blue-800'}`}>{req.personalDetails.fullName}</td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.personalDetails.designation}</td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.personalDetails.employeeId}</td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-500'}`}>{req.personalDetails.projectName}</td>
                          <td className="px-2 md:px-4 py-2 md:py-3">
                            <span className={`inline-block text-xs font-semibold px-2 md:px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3">
                            <div className="flex gap-1 md:gap-2">
                              <button
                                onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                                disabled={actionLoading === req._id + "approve"}
                                title="Approve KYC"
                                className={`flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1 rounded-full font-semibold text-xs md:text-sm shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                                  ${theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-900 text-white focus:ring-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white focus:ring-blue-400'}
                                `}
                              >
                                {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-white" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(req._id, "reject", req.personalDetails.employeeId)}
                                disabled={actionLoading === req._id + "reject"}
                                title="Reject KYC"
                                className={`flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1 rounded-full font-semibold text-xs md:text-sm shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                                  ${theme === 'dark' ? 'bg-gradient-to-r from-red-700 to-red-900 text-white focus:ring-red-700' : 'bg-gradient-to-r from-red-400 to-red-600 text-white focus:ring-red-300'}
                                `}
                              >
                                {actionLoading === req._id + "reject" ? <FaSpinner className="animate-spin" /> : <FaTimesCircle className="text-white" />}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
} 