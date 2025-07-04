"use client";

import React, { useEffect, useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaTshirt, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaInfoCircle, FaPlus } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import Select from "react-select";

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

interface InventorySize {
  _id: string;
  size: string;
  quantity: number;
  unit: string;
}

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  sizeInventory: InventorySize[];
}

// Define available uniform items (if you want to keep them fixed, otherwise make this dynamic)
// const UNIFORM_ITEMS = ["Shirt", "Trousers", "Cap", "Jacket", "Shoes", "Belt"];

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
    sizes: { [key: string]: string[] };
    qty: number;
    remarks: string;
  }>({ employeeId: "", requestedItems: [], sizes: {}, qty: 1, remarks: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with real API call when available
      setRequests([]); // No dummy data, empty by default
      setLoading(false);
    } catch  {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update uniform request status.";
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.employeeId || newRequest.requestedItems.length === 0 || newRequest.qty < 1) return;
    setCreateLoading(true);
    // Prepare API body
    const body = {
      uniformType: newRequest.requestedItems,
      size: newRequest.sizes,
      qty: newRequest.qty,
      remarks: newRequest.remarks
    };
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${newRequest.employeeId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setToast({ type: "error", message: data.message || "Failed to create uniform request." });
        setCreateLoading(false);
        setTimeout(() => setToast(null), 3500);
        return;
      }
      setShowCreateModal(false);
      setNewRequest({ employeeId: "", requestedItems: [], sizes: {}, qty: 1, remarks: "" });
      setCreateLoading(false);
      setToast({ type: "success", message: "Uniform request created successfully." });
      setTimeout(() => setToast(null), 3500);
      // Optionally refresh requests from API if you have a GET endpoint
      // fetchRequests();
    } catch (err) {
      setCreateLoading(false);
      const message = err instanceof Error ? err.message : "Failed to create uniform request.";
      setToast({ type: "error", message });
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Fetch inventory items when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setInventoryLoading(true);
      setInventoryError(null);
      fetch("https://inventory.zenapi.co.in/api/inventory/items")
        .then(res => res.json())
        .then(data => {
          setInventoryItems(Array.isArray(data) ? data : data.items || []);
          setInventoryLoading(false);
        })
        .catch ()
    }
  }, [showCreateModal]);

  const filteredRequests = requests.filter(req =>
    req.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
    req.employee.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900'} flex flex-col py-8 pt-8`}>
        <div className="max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className={`mb-8 rounded-2xl p-8 flex items-center gap-6 shadow-lg bg-gradient-to-r ${
            theme === "dark"
              ? "from-gray-900 to-gray-800"
              : "from-blue-600 to-blue-500"
          }`}>
            <div className={`flex items-center justify-center w-16 h-16 rounded-xl ${
              theme === "dark" ? "bg-gray-800 bg-opacity-60" : "bg-blue-500 bg-opacity-30"
            }`}>
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
                    <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Employee ID</label>
                    <input
                      type="text"
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'}`}
                      placeholder="Enter employee ID..."
                      value={newRequest.employeeId}
                      onChange={e => setNewRequest(r => ({ ...r, employeeId: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Requested Items</label>
                    {inventoryLoading ? (
                      <div className="text-blue-500">Loading items...</div>
                    ) : inventoryError ? (
                      <div className="text-red-500">{inventoryError}</div>
                    ) : (
                      <>
                        <Select
                          isMulti
                          options={inventoryItems.map(item => ({
                            value: item._id,
                            label: `${item.name} (${item.category})`,
                          }))}
                          value={inventoryItems
                            .filter(item => newRequest.requestedItems.includes(item._id))
                            .map(item => ({ value: item._id, label: `${item.name} (${item.category})` }))}
                          onChange={selectedOptions => {
                            const selected = selectedOptions.map(opt => opt.value);
                            setNewRequest(r => {
                              // Remove sizes for unselected items
                              const newSizes = { ...r.sizes };
                              Object.keys(newSizes).forEach(key => {
                                if (!selected.includes(key)) delete newSizes[key];
                              });
                              return { ...r, requestedItems: selected, sizes: newSizes };
                            });
                          }}
                          classNamePrefix="react-select"
                          placeholder="Select requested items..."
                          styles={{
                            control: (base) => ({ ...base, backgroundColor: theme === 'dark' ? '#1a202c' : '#fff', color: theme === 'dark' ? '#fff' : '#222' }),
                            menu: (base) => ({ ...base, backgroundColor: theme === 'dark' ? '#2d3748' : '#fff' }),
                            option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? (theme === 'dark' ? '#2b6cb0' : '#bee3f8') : undefined, color: theme === 'dark' ? '#fff' : '#222' }),
                            multiValue: (base) => ({ ...base, backgroundColor: theme === 'dark' ? '#2b6cb0' : '#bee3f8', color: theme === 'dark' ? '#fff' : '#222' }),
                          }}
                        />
                        {/* Show sizes for each selected item */}
                        {newRequest.requestedItems.map(itemId => {
                          const item = inventoryItems.find(i => i._id === itemId);
                          if (!item || !Array.isArray(item.sizeInventory)) return null;
                          const availableSizes = item.sizeInventory.filter((sz: InventorySize) => sz.quantity > 0);
                          return (
                            <div key={itemId} className="mt-2 ml-2">
                              <div className="font-semibold text-sm mb-1">Sizes for {item.name}:</div>
                              <div className="flex flex-wrap gap-2">
                                {availableSizes.map((sz: InventorySize) => (
                                  <label key={sz._id} className="flex items-center gap-1 text-sm">
                                    <input
                                      type="checkbox"
                                      className={theme === 'dark' ? 'accent-blue-400' : 'accent-blue-600'}
                                      checked={Array.isArray(newRequest.sizes[itemId]) && newRequest.sizes[itemId]?.includes(sz.size)}
                                      onChange={e => {
                                        setNewRequest(r => {
                                          let itemSizes = Array.isArray(r.sizes[itemId]) ? [...r.sizes[itemId]] : [];
                                          if (e.target.checked) {
                                            itemSizes.push(sz.size);
                                          } else {
                                            itemSizes = itemSizes.filter((s) => s !== sz.size);
                                          }
                                          return {
                                            ...r,
                                            sizes: { ...r.sizes, [itemId]: itemSizes }
                                          };
                                        });
                                      }}
                                    />
                                    <span>{sz.size} <span className="text-xs text-gray-400">({sz.quantity} {sz.unit})</span></span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Quantity</label>
                    <input
                      type="number"
                      min={1}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'}`}
                      value={newRequest.qty}
                      onChange={e => setNewRequest(r => ({ ...r, qty: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Remarks</label>
                    <input
                      type="text"
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'}`}
                      placeholder="Remarks..."
                      value={newRequest.remarks}
                      onChange={e => setNewRequest(r => ({ ...r, remarks: e.target.value }))}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createLoading || !newRequest.employeeId || newRequest.requestedItems.length === 0 || Object.values(newRequest.sizes).some(s => !s) || newRequest.qty < 1}
                    className={`w-full py-2 rounded-xl font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400 ${theme === 'dark' ? 'bg-gradient-to-r from-green-800 to-green-900 text-white hover:from-green-900 hover:to-green-950' : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'}`}
                  >
                    {createLoading ? <FaSpinner className="animate-spin inline mr-2" /> : <FaPlus className="inline mr-2" />}Create Request
                  </button>
                </form>
              </div>
            </div>
          )}
          {/* Requests List (Card or Table View) */}
          <div className={`w-full max-w-5xl mx-auto ${loading ? 'animate-pulse' : ''}`}>
            {loading ? (
              <div className="py-10 text-center">
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Loading requests...</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-10 text-center">
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>No uniform requests found.</p>
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRequests.map(request => (
                  <div key={request._id} className={`p-5 rounded-2xl shadow-lg transition-all duration-300 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden">
                        <Image src={request.employee.employeeImage} alt={request.employee.fullName} width={64} height={64} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{request.employee.fullName}</h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{request.employee.designation} - {request.employee.projectName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Status:</span>
                        <span className={`text-sm ${request.status === 'Approved' ? 'text-green-500' : request.status === 'Rejected' ? 'text-red-500' : 'text-yellow-500'}`}>{request.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Items:</span>
                        <div className="flex flex-wrap gap-2">
                          {request.requestedItems.map(item => (
                            <span key={item} className={`text-xs rounded-full py-1 px-3 ${theme === 'dark' ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(request._id, request.status === 'Approved' ? 'reject' : 'approve')}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none ${request.status === 'Approved'
                          ? theme === 'dark'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-red-500 text-white hover:bg-red-600'
                          : theme === 'dark'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-green-500 text-white hover:bg-green-600'}`}
                      >
                        {actionLoading === request._id + (request.status === 'Approved' ? 'reject' : 'approve') ? <FaSpinner className="animate-spin" /> : request.status === 'Approved' ? 'Reject' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setRequests(prev => prev.filter(req => req._id !== request._id))}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none ${theme === 'dark' ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        <FaTimesCircle /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className={`min-w-full divide-y divide-gray-200 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{/* Checkbox for bulk actions */}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Designation</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Requested Items</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRequests.map(request => (
                      <tr key={request._id} className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{/* Checkbox */}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.employee.employeeId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.employee.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.employee.designation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.employee.projectName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'Approved' ? 'bg-green-100 text-green-700' : request.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-wrap gap-2">
                            {request.requestedItems.map(item => (
                              <span key={item} className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${theme === 'dark' ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                                {item}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(request._id, request.status === 'Approved' ? 'reject' : 'approve')}
                              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none ${request.status === 'Approved'
                                ? theme === 'dark'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                                : theme === 'dark'
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-green-500 text-white hover:bg-green-600'}`}
                            >
                              {actionLoading === request._id + (request.status === 'Approved' ? 'reject' : 'approve') ? <FaSpinner className="animate-spin" /> : request.status === 'Approved' ? 'Reject' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRequests(prev => prev.filter(req => req._id !== request._id))}
                              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none ${theme === 'dark' ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                              <FaTimesCircle /> Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}