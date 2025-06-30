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
  const [showInstructions, setShowInstructions] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const { theme } = useTheme();

  useEffect(() => {
    fetchRequests();
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

  const filteredRequests = requests.filter(req =>
    req.personalDetails.fullName.toLowerCase().includes(search.toLowerCase()) ||
    req.personalDetails.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col items-center py-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Modern KYC Header */}
        <div className={`rounded-2xl mb-8 p-8 flex items-center gap-6 shadow-lg w-full max-w-5xl mx-auto ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}>
          <div className={`bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700/50' : ''}`}>
            <FaIdCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">KYC Requests</h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-blue-100'}`}>Approve or reject pending KYC submissions</p>
          </div>
        </div>
        {/* Only the content area below header is scrollable */}
        <div className="w-full max-w-5xl mx-auto h-[calc(100vh-64px-48px)] flex flex-col gap-8">
          {/* Instructions Card (below header) */}
          {showInstructions && (
            <div className={`w-full max-w-5xl mx-auto mb-6 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} shadow-xl rounded-2xl p-5 flex gap-4`}>
              <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'} flex items-center justify-center`}>
                <FaInfoCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Instructions & Notes</h3>
                <ul className="space-y-2 text-blue-700 text-sm">
                  <li>• Review all KYC details before approving or rejecting.</li>
                  <li>• Use the search to quickly find employees.</li>
                  <li>• Approve only if all documents and details are valid.</li>
                  <li>• Rejection will notify the employee and admin.</li>
                </ul>
              </div>
              <button onClick={() => setShowInstructions(false)} className="ml-2 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none">×</button>
            </div>
          )}
          {/* Toast/Snackbar */}
          {toast && (
            <div className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
            </div>
          )}
          {/* View Toggle and Search Bar */}
          <div className={`w-full max-w-5xl mx-auto mb-6 flex flex-col md:flex-row items-center gap-3 justify-between sticky top-0 z-30 py-2
            ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}
          >
            <div className="flex gap-2 mb-2 md:mb-0">
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-2 rounded-l-xl font-semibold border transition
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
                className={`px-4 py-2 rounded-r-xl font-semibold border-l-0 border transition
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
            <div className={`flex items-center rounded-xl px-4 py-2 shadow w-full md:w-96 border transition
              ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100'}`}
            >
              <FaSearch className={`mr-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`} />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`flex-1 bg-transparent outline-none placeholder-blue-300 transition
                  ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}
              />
            </div>
          </div>
          {/* Requests List: Card or Table View */}
          <div className="w-full max-w-5xl mx-auto">
            {loading ? (
              <div className="flex flex-col justify-center items-center min-h-[200px] gap-3">
                <FaSpinner className="animate-spin text-blue-600 w-10 h-10" />
                <span className="text-blue-700 font-medium">Loading pending KYC requests...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg">
                <FaTimesCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-lg font-medium">{error}</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-yellow-50 text-yellow-600 p-6 rounded-2xl flex flex-col items-center gap-3 max-w-lg mx-auto shadow-lg">
                <FaUser className="w-10 h-10 flex-shrink-0" />
                <p className="text-lg font-medium">No pending KYC requests found.</p>
              </div>
            ) : (
              viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredRequests.map((req) => (
                    <div
                      key={req._id}
                      className={`rounded-2xl shadow-xl p-7 flex flex-col gap-5 border-l-8 transition group relative
                        ${theme === 'dark' ? 'bg-gray-800 border-blue-700 hover:shadow-blue-900' : 'bg-white border-blue-400 hover:shadow-2xl'}
                      `}
                    >
                      <div className="flex items-center gap-6">
                        <Image
                          src={req.personalDetails.employeeImage || "/placeholder-user.jpg"}
                          alt={req.personalDetails.fullName}
                          width={80}
                          height={80}
                          className={`rounded-full object-cover border-2 shadow group-hover:scale-105 transition
                            ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}
                          `}
                        />
                        <div className="flex-1 min-w-0">
                          <h2 className={`text-xl font-bold mb-1 truncate ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.personalDetails.fullName}</h2>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`text-base ${theme === 'dark' ? 'text-gray-300' : 'text-black'}`}>{req.personalDetails.designation}</span>
                            <span className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-200 bg-gray-700' : 'text-black bg-gray-100'} px-2 py-0.5 rounded`}>{req.personalDetails.employeeId}</span>
                          </div>
                          <p className={`text-xs mb-1 truncate ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`}>{req.personalDetails.projectName}</p>
                          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                          disabled={actionLoading === req._id + "approve"}
                          title="Approve KYC"
                          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-full font-semibold text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
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
                          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-full font-semibold text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
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
                <div className={`overflow-x-auto rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-blue-100'}`}>
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Photo</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Name</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Designation</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Employee ID</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Project</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={theme === 'dark' ? 'divide-gray-700' : 'divide-blue-50'}>
                      {filteredRequests.map((req) => (
                        <tr key={req._id} className={theme === 'dark' ? 'hover:bg-gray-700 transition' : 'hover:bg-blue-50 transition'}>
                          <td className="px-4 py-3">
                            <Image src={req.personalDetails.employeeImage || "/placeholder-user.jpg"} alt={req.personalDetails.fullName} width={48} height={48} className={`rounded-full object-cover border-2 shadow ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`} />
                          </td>
                          <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-blue-800'}`}>{req.personalDetails.fullName}</td>
                          <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.personalDetails.designation}</td>
                          <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.personalDetails.employeeId}</td>
                          <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-500'}`}>{req.personalDetails.projectName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                                disabled={actionLoading === req._id + "approve"}
                                title="Approve KYC"
                                className={`flex items-center justify-center gap-2 px-4 py-1 rounded-full font-semibold text-sm shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
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
                                className={`flex items-center justify-center gap-2 px-4 py-1 rounded-full font-semibold text-sm shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
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