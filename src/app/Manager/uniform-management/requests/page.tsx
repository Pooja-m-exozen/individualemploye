"use client";

import React, { useEffect, useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaTshirt, FaUser, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaInfoCircle, FaPlus } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

interface UniformRequest {
  _id: string;
  employee: {
    employeeId: string;
    fullName: string;
    designation: string;
    employeeImage: string;
    projectName: string;
  };
  status: string;
  requestedItems: string[];
}

// Mock employees and items for creation
const MOCK_EMPLOYEES = [
  {
    employeeId: "EMP003",
    fullName: "Alice Johnson",
    designation: "Technician",
    employeeImage: "/placeholder-user.jpg",
    projectName: "Project Gamma",
  },
  {
    employeeId: "EMP004",
    fullName: "Bob Williams",
    designation: "Driver",
    employeeImage: "/placeholder-user.jpg",
    projectName: "Project Delta",
  },
];
const MOCK_ITEMS = ["Shirt", "Trousers", "Cap", "Jacket", "Shoes", "Belt"];

export default function UniformRequestsPage() {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<UniformRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequest, setNewRequest] = useState<{
    employeeId: string;
    requestedItems: string[];
  }>({ employeeId: "", requestedItems: [] });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      setTimeout(() => {
        setRequests([
          {
            _id: "1",
            employee: {
              employeeId: "EMP001",
              fullName: "John Doe",
              designation: "Security Guard",
              employeeImage: "/placeholder-user.jpg",
              projectName: "Project Alpha",
            },
            status: "Pending",
            requestedItems: ["Shirt", "Trousers", "Cap"],
          },
          {
            _id: "2",
            employee: {
              employeeId: "EMP002",
              fullName: "Jane Smith",
              designation: "Supervisor",
              employeeImage: "/placeholder-user.jpg",
              projectName: "Project Beta",
            },
            status: "Pending",
            requestedItems: ["Jacket", "Shoes"],
          },
        ]);
        setLoading(false);
      }, 800);
    } catch (err: any) {
      setError("Failed to fetch uniform requests.");
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id + action);
    setError(null);
    try {
      setRequests((prev) => prev.filter((req) => req._id !== id));
      setToast({ type: "success", message: `Uniform request ${action}d successfully.` });
    } catch (err: any) {
      setError(err.message || "Failed to update uniform request status.");
      setToast({ type: "error", message: err.message || "Failed to update uniform request status." });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.employeeId || newRequest.requestedItems.length === 0) return;
    setCreateLoading(true);
    const employee = MOCK_EMPLOYEES.find(emp => emp.employeeId === newRequest.employeeId);
    if (!employee) {
      setCreateLoading(false);
      setToast({ type: "error", message: "Employee not found." });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setRequests(prev => [
      {
        _id: Date.now().toString(),
        employee,
        status: "Pending",
        requestedItems: newRequest.requestedItems,
      },
      ...prev,
    ]);
    setShowCreateModal(false);
    setNewRequest({ employeeId: "", requestedItems: [] });
    setCreateLoading(false);
    setToast({ type: "success", message: "Uniform request created successfully." });
    setTimeout(() => setToast(null), 3500);
  };

  const filteredRequests = requests.filter(req =>
    req.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
    req.employee.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900'} flex flex-col items-center py-8 relative`}>
        {/* Header */}
        <div className="mb-8 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-6 rounded-2xl px-8 py-8 bg-gradient-to-r from-blue-600 to-blue-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500 bg-opacity-30">
              <FaTshirt className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">Uniform Requests</h1>
              <p className="text-lg text-blue-100">Approve or reject pending uniform requests</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow hover:from-green-600 hover:to-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <FaPlus /> Create Request
            </button>
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
                <li>• Review all uniform requests before approving or rejecting.</li>
                <li>• Use the search to quickly find employees.</li>
                <li>• Approve only if all requested items are valid and available.</li>
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
        <div className={`w-full max-w-5xl mx-auto mb-6 flex flex-col md:flex-row items-center gap-3 justify-between sticky top-0 z-30 py-2 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
          <div className="flex gap-2 mb-2 md:mb-0">
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 rounded-l-xl font-semibold border transition ${viewMode === 'card'
                ? theme === 'dark'
                  ? 'bg-blue-800 text-white border-blue-800'
                  : 'bg-blue-600 text-white border-blue-600'
                : theme === 'dark'
                  ? 'bg-gray-800 text-blue-200 border-blue-900'
                  : 'bg-white text-blue-700 border-blue-200'}`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-r-xl font-semibold border-l-0 border transition ${viewMode === 'table'
                ? theme === 'dark'
                  ? 'bg-blue-800 text-white border-blue-800'
                  : 'bg-blue-600 text-white border-blue-600'
                : theme === 'dark'
                  ? 'bg-gray-800 text-blue-200 border-blue-900'
                  : 'bg-white text-blue-700 border-blue-200'}`}
            >
              Table View
            </button>
          </div>
          <div className={`flex items-center rounded-xl px-4 py-2 shadow w-full md:w-96 border ${theme === 'dark' ? 'bg-gray-800 border-blue-900' : 'bg-white border-blue-100'}`}>
            <FaSearch className={theme === 'dark' ? 'text-blue-300 mr-2' : 'text-blue-400 mr-2'} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`flex-1 bg-transparent outline-none ${theme === 'dark' ? 'text-blue-100 placeholder-blue-400' : 'text-blue-900 placeholder-blue-300'}`}
            />
          </div>
        </div>
        {/* Create Request Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
              <button
                className={`absolute top-3 right-4 text-2xl font-bold focus:outline-none ${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                onClick={() => setShowCreateModal(false)}
                title="Close"
              >×</button>
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}><FaTshirt /> Create Uniform Request</h2>
              <form onSubmit={handleCreateRequest} className="space-y-5">
                <div>
                  <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Employee</label>
                  <select
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'}`}
                    value={newRequest.employeeId}
                    onChange={e => setNewRequest(r => ({ ...r, employeeId: e.target.value }))}
                    required
                  >
                    <option value="">Select employee...</option>
                    {MOCK_EMPLOYEES.map(emp => (
                      <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Requested Items</label>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_ITEMS.map(item => (
                      <label
                        key={item}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg cursor-pointer border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-900 text-blue-100' : 'bg-blue-50 border-blue-100 text-blue-700'}`}
                      >
                        <input
                          type="checkbox"
                          className={theme === 'dark' ? 'accent-blue-400' : 'accent-blue-600'}
                          checked={newRequest.requestedItems.includes(item)}
                          onChange={e => {
                            setNewRequest(r => e.target.checked
                              ? { ...r, requestedItems: [...r.requestedItems, item] }
                              : { ...r, requestedItems: r.requestedItems.filter(i => i !== item) }
                            );
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={createLoading || !newRequest.employeeId || newRequest.requestedItems.length === 0}
                  className={`w-full py-2 rounded-xl font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400 ${theme === 'dark' ? 'bg-gradient-to-r from-green-800 to-green-900 text-white hover:from-green-900 hover:to-green-950' : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'}`}
                >
                  {createLoading ? <FaSpinner className="animate-spin inline mr-2" /> : <FaPlus className="inline mr-2" />}Create Request
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Requests List: Card or Table View */}
        <div className="w-full max-w-5xl mx-auto">
          {loading ? (
            <div className="flex flex-col justify-center items-center min-h-[200px] gap-3">
              <FaSpinner className={theme === 'dark' ? "animate-spin text-blue-300 w-10 h-10" : "animate-spin text-blue-600 w-10 h-10"} />
              <span className={theme === 'dark' ? "text-blue-200 font-medium" : "text-blue-700 font-medium"}>Loading pending uniform requests...</span>
            </div>
          ) : error ? (
            <div className={theme === 'dark' ? "bg-red-900 text-red-200 p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg" : "bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg"}>
              <FaTimesCircle className="w-6 h-6 flex-shrink-0" />
              <p className="text-lg font-medium">{error}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className={theme === 'dark' ? "bg-yellow-900 text-yellow-200 p-6 rounded-2xl flex flex-col items-center gap-3 max-w-lg mx-auto shadow-lg" : "bg-yellow-50 text-yellow-600 p-6 rounded-2xl flex flex-col items-center gap-3 max-w-lg mx-auto shadow-lg"}>
              <FaUser className="w-10 h-10 flex-shrink-0" />
              <p className="text-lg font-medium">No pending uniform requests found.</p>
            </div>
          ) : (
            viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredRequests.map((req) => (
                  <div key={req._id} className={`${theme === 'dark' ? 'bg-gray-800 border-blue-900' : 'bg-white border-blue-400'} rounded-2xl shadow-xl p-7 flex flex-col gap-5 border-l-8 hover:shadow-2xl transition group relative`}>
                    <div className="flex items-center gap-6">
                      <img
                        src={req.employee.employeeImage || "/placeholder-user.jpg"}
                        alt={req.employee.fullName}
                        className={`w-20 h-20 rounded-full object-cover border-2 ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'} shadow group-hover:scale-105 transition`}
                      />
                      <div className="flex-1 min-w-0">
                        <h2 className={`text-xl font-bold mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-black-800'}`}>{req.employee.fullName}</h2>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-base font ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.employee.designation}</span>
                          <span className={`text-sm font-bold px-2 py-0.5 rounded ${theme === 'dark' ? 'text-blue-100 bg-blue-900' : 'text-black bg-gray-100'}`}>{req.employee.employeeId}</span>
                        </div>
                        <p className={`text-xs mb-1 truncate ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`}>{req.employee.projectName}</p>
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                        <div className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className="font-semibold">Requested Items:</span> {req.requestedItems.join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => handleAction(req._id, "approve")}
                        disabled={actionLoading === req._id + "approve"}
                        title="Approve Request"
                        className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-full font-semibold text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-800 to-blue-900 text-white hover:from-blue-900 hover:to-blue-950' : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800'}`}
                      >
                        {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-white" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req._id, "reject")}
                        disabled={actionLoading === req._id + "reject"}
                        title="Reject Request"
                        className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-full font-semibold text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300 ${theme === 'dark' ? 'bg-gradient-to-r from-red-800 to-red-900 text-white hover:from-red-900 hover:to-red-950' : 'bg-gradient-to-r from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700'}`}
                      >
                        {actionLoading === req._id + "reject" ? <FaSpinner className="animate-spin" /> : <FaTimesCircle className="text-white" />}
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${theme === 'dark' ? 'overflow-x-auto rounded-2xl shadow-lg bg-gray-800 border-blue-900' : 'overflow-x-auto rounded-2xl shadow-lg bg-white border-blue-100'}`}>
                <table className="min-w-full divide-y">
                  <thead className={theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Photo</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Name</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Designation</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Employee ID</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Project</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Requested Items</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-y divide-blue-900' : 'divide-y divide-blue-50'}>
                    {filteredRequests.map((req) => (
                      <tr key={req._id} className={theme === 'dark' ? 'hover:bg-blue-900 transition' : 'hover:bg-blue-50 transition'}>
                        <td className="px-4 py-3">
                          <img src={req.employee.employeeImage || "/placeholder-user.jpg"} alt={req.employee.fullName} className={`w-12 h-12 rounded-full object-cover border-2 shadow ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`} />
                        </td>
                        <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{req.employee.fullName}</td>
                        <td className={`px-4 py-3 font ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.employee.designation}</td>
                        <td className={`px-4 py-3 font ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{req.employee.employeeId}</td>
                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-500'}`}>{req.employee.projectName}</td>
                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{req.requestedItems.join(", ")}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(req._id, "approve")}
                              disabled={actionLoading === req._id + "approve"}
                              title="Approve Request"
                              className={`flex items-center justify-center gap-2 px-4 py-1 rounded-full font-semibold text-sm shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-800 to-blue-900 text-white hover:from-blue-900 hover:to-blue-950' : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800'}`}
                            >
                              {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-white" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(req._id, "reject")}
                              disabled={actionLoading === req._id + "reject"}
                              title="Reject Request"
                              className={`flex items-center justify-center gap-2 px-4 py-1 rounded-full font-semibold text-sm shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300 ${theme === 'dark' ? 'bg-gradient-to-r from-red-800 to-red-900 text-white hover:from-red-900 hover:to-red-950' : 'bg-gradient-to-r from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700'}`}
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