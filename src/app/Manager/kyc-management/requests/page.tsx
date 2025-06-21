"use client";

import React, { useEffect, useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaIdCard, FaUser, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaInfoCircle } from "react-icons/fa";

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

export default function KYCRequestsPage() {
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const data = await res.json();
      setRequests((data.kycForms || []).filter((k: any) => k.status === "Pending"));
    } catch (err: any) {
      setError("Failed to fetch KYC requests.");
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
    } catch (err: any) {
      setError(err.message || "Failed to update KYC status.");
      setToast({ type: "error", message: err.message || "Failed to update KYC status." });
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
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'} flex flex-col items-center py-8 relative`}>
        {/* Header */}
        <div className={`rounded-2xl mb-8 p-8 flex items-center gap-6 shadow-lg ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'} w-full max-w-5xl mx-auto`}>
          <div className={`bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700/50' : ''}`}>
            <FaIdCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">KYC Requests</h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-blue-100'}`}>Approve or reject pending KYC submissions</p>
          </div>
        </div>
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
        <div className="w-full max-w-5xl mx-auto mb-6 flex flex-col md:flex-row items-center gap-3 justify-between sticky top-0 z-30 bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-2">
          <div className="flex gap-2 mb-2 md:mb-0">
            <button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-l-xl font-semibold border ${viewMode === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200'} transition`}>Card View</button>
            <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-r-xl font-semibold border-l-0 border ${viewMode === 'table' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200'} transition`}>Table View</button>
          </div>
          <div className="flex items-center bg-white border border-blue-100 rounded-xl px-4 py-2 shadow w-full md:w-96">
            <FaSearch className="text-blue-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-blue-900 placeholder-blue-300"
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
                  <div key={req._id} className="bg-white rounded-2xl shadow-xl p-7 flex flex-col gap-5 border-l-8 border-blue-400 hover:shadow-2xl transition group relative">
                    <div className="flex items-center gap-6">
                      <img
                        src={req.personalDetails.employeeImage || "/placeholder-user.jpg"}
                        alt={req.personalDetails.fullName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-blue-200 shadow group-hover:scale-105 transition"
                      />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-black-800 mb-1 truncate">{req.personalDetails.fullName}</h2>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-base font text-black">{req.personalDetails.designation}</span>
                          <span className="text-sm font-bold text-black bg-gray-100 px-2 py-0.5 rounded">{req.personalDetails.employeeId}</span>
                        </div>
                        <p className="text-xs text-blue-400 mb-1 truncate">{req.personalDetails.projectName}</p>
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">Pending</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                        disabled={actionLoading === req._id + "approve"}
                        title="Approve KYC"
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold text-base shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-white" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req._id, "reject", req.personalDetails.employeeId)}
                        disabled={actionLoading === req._id + "reject"}
                        title="Reject KYC"
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-red-400 to-red-600 text-white font-semibold text-base shadow hover:from-red-500 hover:to-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300"
                      >
                        {actionLoading === req._id + "reject" ? <FaSpinner className="animate-spin" /> : <FaTimesCircle className="text-white" />}
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl shadow-lg bg-white">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Photo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {filteredRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-3">
                          <img src={req.personalDetails.employeeImage || "/placeholder-user.jpg"} alt={req.personalDetails.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow" />
                        </td>
                        <td className="px-4 py-3 font-bold text-blue-800">{req.personalDetails.fullName}</td>
                        <td className="px-4 py-3 font text-black">{req.personalDetails.designation}</td>
                        <td className="px-4 py-3 font text-black">{req.personalDetails.employeeId}</td>
                        <td className="px-4 py-3 text-blue-500">{req.personalDetails.projectName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">Pending</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                              disabled={actionLoading === req._id + "approve"}
                              title="Approve KYC"
                              className="flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold text-sm shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-white" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(req._id, "reject", req.personalDetails.employeeId)}
                              disabled={actionLoading === req._id + "reject"}
                              title="Reject KYC"
                              className="flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-red-400 to-red-600 text-white font-semibold text-sm shadow hover:from-red-500 hover:to-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300"
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
    </ManagerDashboardLayout>
  );
} 