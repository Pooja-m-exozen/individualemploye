"use client";

import React, { useEffect, useState, useCallback } from "react";
import ManagerOpsLayout from '@/components/dashboard/ManagerOpsLayout';
import { FaTshirt, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaInfoCircle, FaPlus } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
// import Select from "react-select";

interface UniformRequest {
  _id: string;
  employee: {
    employeeId: string;
    fullName: string;
    designation: string;
    employeeImage: string;
    projectName: string;
    gender?: string;
  };
  status: string;
  requestedItems: string[];
  qty?: number;
  remarks?: string;
  sizes?: { [key: string]: string };
  requestDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Add types for uniform options API
interface UniformOption {
  type: string;
  sizes?: string[];
  set?: string;
  sizeInventory?: { size: string; quantity: number; unit: string }[]; // Added for inventory info
}
interface EmployeeDetails {
  employeeId: string;
  fullName: string;
  designation: string;
  gender: string;
  projectName: string;
}

// Add type for selected uniforms
interface SelectedUniform {
  type: string;
  size: string;
  qty: number;
}
// Add type for API mapping
interface UniformApiResponse {
  _id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  employeeImage?: string;
  projectName: string;
  gender?: string;
  approvalStatus: string;
  uniformType: string[];
  qty?: number;
  remarks?: string;
  size?: { [key: string]: string };
  requestDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function UniformRequestsPage() {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<UniformRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequest, setNewRequest] = useState<{
    employeeId: string;
    qty: number;
    remarks: string;
    replacementType: 'New' | 'Replacement';
    replacedEmployeeId: string | null;
  }>({ 
    employeeId: "", 
    qty: 1, 
    remarks: "",
    replacementType: 'New', // Always initialize with a value
    replacedEmployeeId: null
  });
  const [createLoading, setCreateLoading] = useState(false);
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending'>('All');
  const [selectedUniforms, setSelectedUniforms] = useState<SelectedUniform[]>([]);
  const [uniformOptions, setUniformOptions] = useState<UniformOption[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [employeeImages, setEmployeeImages] = useState<{ [id: string]: string }>({});
  const [projectEmployees, setProjectEmployees] = useState<Array<{
    employeeId: string;
    fullName: string;
    designation: string;
  }>>([]);
  
  // Add state for form values
  const [formValues, setFormValues] = useState<{ [key: string]: { size: string; qty: number } }>({});
  const searchParams = useSearchParams();

  // Reset modal state when opening
  const handleOpenModal = () => {
    setShowCreateModal(true);
    setNewRequest({ 
      employeeId: "", 
      qty: 1, 
      remarks: "",
      replacementType: 'New',
      replacedEmployeeId: null
    });
    setSelectedUniforms([]);
    setFormValues({});
    setUniformOptions([]);
    setEmployeeDetails(null);
    setOptionsError(null);
    setOptionsLoading(false);
    setProjectEmployees([]);
  };

  // Fetch project employees when replacement type is selected
  const fetchProjectEmployees = useCallback(async (projectName: string) => {
    try {
      // Fetch all KYC records and filter by project
      const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const data = await res.json();
      if (data.kycForms) {
        // Filter employees by project and exclude the current employee
        const projectEmployees = data.kycForms
          .filter((kyc: { personalDetails?: { projectName?: string; employeeId?: string } }) => 
            kyc.personalDetails?.projectName === projectName && 
            kyc.personalDetails?.employeeId !== newRequest.employeeId
          )
          .map((kyc: { personalDetails: { employeeId: string; fullName: string; designation: string } }) => ({
            employeeId: kyc.personalDetails.employeeId,
            fullName: kyc.personalDetails.fullName,
            designation: kyc.personalDetails.designation
          }));
        setProjectEmployees(projectEmployees);
      } else {
        setProjectEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching project employees:', error);
      setProjectEmployees([]);
    }
  }, [newRequest.employeeId]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to fetch uniform requests.");
        setLoading(false);
        return;
      }
      // Map API data to your UniformRequest interface
      const mapped = data.uniforms.map((item: UniformApiResponse) => ({
        _id: item._id,
        employee: {
          employeeId: item.employeeId,
          fullName: item.fullName,
          designation: item.designation,
          employeeImage: "", // If you have an image, use it here
          projectName: item.projectName,
          gender: item.gender,
        },
        status: item.approvalStatus,
        requestedItems: item.uniformType,
        qty: item.qty,
        remarks: item.remarks,
        sizes: item.size,
        requestDate: item.requestDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      setRequests(mapped);
      setLoading(false);
    } catch {
      setError("Failed to fetch uniform requests.");
      setLoading(false);
    }
  };

  // Update handleAction to use the new API endpoint and improve table UI/UX
  const handleAction = async (employeeId: string, action: "approve" | "reject") => {
    setError(null);
    try {
      const endpoint = `https://cafm.zenapi.co.in/api/uniforms/${employeeId}/${action}`;
      const remarks = action === 'approve' ? 'Approved by admin' : 'Rejected by admin';
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        const message = data.message || `Failed to ${action} uniform request.`;
        setError(message);
        setToast({ type: "error", message });
        setTimeout(() => setToast(null), 3500);
        return;
      }
      // Only update status, do not remove
      setRequests(prev =>
        prev.map(req =>
          req._id === employeeId
            ? { ...req, status: action === 'approve' ? 'Approved' : 'Rejected' }
            : req
        )
      );
      setToast({ type: "success", message: `Uniform request ${action}d successfully.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} uniform request.`;
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Update handleCreateRequest to use uniformItems
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.employeeId || selectedUniforms.length === 0) {
      setToast({ type: "error", message: "Please fill all required fields and add at least one uniform item." });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    // Add validation for replacement type
    if (newRequest.replacementType === 'Replacement' && !newRequest.replacedEmployeeId) {
      setToast({ 
        type: "error", 
        message: "Replaced employee ID is required when replacement type is 'Replacement'" 
      });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    setCreateLoading(true);
    const uniformType = selectedUniforms.map(u => u.type);
    const size: { [key: string]: string } = {};
    selectedUniforms.forEach(u => { size[u.type] = u.size; });
    const qty = selectedUniforms.reduce((acc, u) => acc + u.qty, 0);
    
    // Enhanced API structure like manager version
    const body = {
      uniformType,
      size,
      qty,
      remarks: newRequest.remarks,
      designation: employeeDetails?.designation || "",
      replacementType: newRequest.replacementType,
      replacedEmployeeId: newRequest.replacementType === 'Replacement' ? newRequest.replacedEmployeeId : null,
      manpowerRemarks: newRequest.remarks || ''
    };
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${newRequest.employeeId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        const errorMsg = data.message || "Failed to create uniform request.";
        setToast({ type: "error", message: errorMsg });
        setCreateLoading(false);
        setTimeout(() => setToast(null), 3500);
        return;
      }
      setShowCreateModal(false);
      setNewRequest({ 
        employeeId: "", 
        qty: 1, 
        remarks: "",
        replacementType: 'New',
        replacedEmployeeId: null
      });
      setSelectedUniforms([]);
      setCreateLoading(false);
      setToast({ 
        type: "success", 
        message: `Uniform request created successfully! Set count: ${data.setCount || '1'}` 
      });
      setTimeout(() => setToast(null), 3500);
      // Refresh the list after creation
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create uniform request.";
      setToast({ type: "error", message });
      setCreateLoading(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Fetch inventory items when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setOptionsLoading(true);
      setOptionsError(null);
      fetch("https://inventory.zenapi.co.in/api/inventory/items")
        .then(res => res.json())
        .then(data => {
          setUniformOptions(Array.isArray(data) ? data : []);
          setEmployeeDetails(null); // No longer fetching designation here
        })
        .catch(() => {
          setUniformOptions([]);
          setEmployeeDetails(null);
          setOptionsError('Failed to fetch inventory options.');
        });
    }
  }, [showCreateModal]);

  // Fetch employee designation when employeeId changes
  useEffect(() => {
    if (showCreateModal && newRequest.employeeId) {
      fetch(`https://cafm.zenapi.co.in/api/kyc/${newRequest.employeeId}`)
        .then(res => res.json())
        .then(data => {
          if (data.kycData && data.kycData.personalDetails && data.kycData.personalDetails.designation) {
            setEmployeeDetails(data.kycData.personalDetails);
          } else {
            setEmployeeDetails(null);
          }
        })
        .catch(() => setEmployeeDetails(null));
    }
  }, [showCreateModal, newRequest.employeeId]);

  // Fetch uniform options when employeeId changes and modal is open
  useEffect(() => {
    if (showCreateModal && newRequest.employeeId) {
      setOptionsLoading(true);
      setOptionsError(null);
      console.log('Fetching uniform options for:', newRequest.employeeId);
      
      // Fetch both uniform options and inventory data
      Promise.all([
        fetch(`https://cafm.zenapi.co.in/api/uniforms/${newRequest.employeeId}/options`),
        fetch("https://inventory.zenapi.co.in/api/inventory/items")
      ])
        .then(responses => Promise.all(responses.map(res => res.json())))
        .then(([uniformData, inventoryData]) => {
          console.log('Uniform options API response:', uniformData);
          console.log('Inventory API response:', inventoryData);
          
          if (uniformData.success) {
            let uniformOptions = uniformData.uniformOptions || [];
            setEmployeeDetails(uniformData.employeeDetails || null);
            setOptionsError(null);
            
            // If replacement type is selected, fetch project employees
            if (newRequest.replacementType === 'Replacement' && uniformData.employeeDetails?.projectName) {
              fetchProjectEmployees(uniformData.employeeDetails.projectName);
            }
            
            // Merge inventory data with uniform options
            if (Array.isArray(inventoryData)) {
              uniformOptions = uniformOptions.map((option: UniformOption) => {
                // Find matching inventory item by type/name
                const inventoryItem = inventoryData.find(inv => 
                  inv.name === option.type || 
                  inv.type === option.type ||
                  inv.itemCode?.includes(option.type.toUpperCase())
                );
                
                if (inventoryItem && inventoryItem.sizeInventory) {
                  return {
                    ...option,
                    sizeInventory: inventoryItem.sizeInventory,
                    // Also update sizes array to include all available sizes from inventory
                    sizes: inventoryItem.sizes || option.sizes
                  };
                }
                return option;
              });
            }
            
            setUniformOptions(uniformOptions);
          } else {
            setUniformOptions([]);
            setEmployeeDetails(null);
            setOptionsError(uniformData.message || 'No options available');
          }
          setOptionsLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching uniform options:', error);
          setUniformOptions([]);
          setEmployeeDetails(null);
          setOptionsError('Failed to fetch uniform options.');
          setOptionsLoading(false);
        });
    } else if (!showCreateModal) {
      setUniformOptions([]);
      setEmployeeDetails(null);
      setOptionsError(null);
      setProjectEmployees([]);
      setSelectedUniforms([]);
      setFormValues({});
    }
  }, [showCreateModal, newRequest.employeeId, newRequest.replacementType]);

  // Filtered requests by search and status
  const filteredRequests = requests.filter(req =>
    (statusFilter === 'All' || req.status === statusFilter) &&
    (req.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
      req.employee.employeeId.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination logic for table view
  const totalRows = filteredRequests.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Reset to page 1 if filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Debug: Monitor selectedUniforms changes
  useEffect(() => {
    console.log('selectedUniforms state changed:', selectedUniforms);
    console.log('selectedUniforms.length:', selectedUniforms.length);
  }, [selectedUniforms]);

  // Fetch employee images for requests
  useEffect(() => {
    requests.forEach(req => {
      const empId = req.employee?.employeeId;
      if (empId && !employeeImages[empId]) {
        fetch(`https://cafm.zenapi.co.in/api/kyc/${empId}`)
          .then(res => res.json())
          .then(data => {
            if (data.kycData?.personalDetails?.employeeImage) {
              setEmployeeImages(prev => ({
                ...prev,
                [empId]: data.kycData.personalDetails.employeeImage
              }));
            }
          });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  useEffect(() => {
    const create = searchParams?.get("create");
    const employeeId = searchParams?.get("employeeId");
    if (create === "1") {
      setShowCreateModal(true);
      if (employeeId && !newRequest.employeeId) {
        setNewRequest(r => ({ 
          ...r, 
          employeeId,
          replacementType: 'New',
          replacedEmployeeId: null
        }));
      }
    }
  }, [searchParams, newRequest.employeeId]);

  return (
    <ManagerOpsLayout>
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
              onClick={handleOpenModal}
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
          {/* View Toggle, Filter, and Search Bar */}
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
            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <label className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Status:</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'All' | 'Approved' | 'Pending')}
                className={`rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'}`}
              >
                <option value="All">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
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
              <div className={`rounded-2xl shadow-2xl w-full max-w-3xl relative animate-fade-in ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                {toast && (
                  <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 z-50 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
                    style={{ minWidth: '250px', maxWidth: '90%' }}>
                    {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
                  </div>
                )}
                <div className="p-8 border-b">
                  <button
                    className={`absolute top-3 right-4 text-2xl font-bold focus:outline-none ${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    onClick={() => setShowCreateModal(false)}
                    title="Close"
                  >×</button>
                  <h2 className={`text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                    <FaTshirt /> Create Uniform Request
                  </h2>
                </div>
                
                <div className="overflow-y-auto flex-1 p-8">
                  <form id="createRequestForm" onSubmit={handleCreateRequest} className="space-y-5">
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
                      {employeeDetails && (
                        <div className="mt-1 text-sm text-blue-500">
                          Name: {employeeDetails.fullName} | Designation: {employeeDetails.designation} | Project: {employeeDetails.projectName} | Gender: {employeeDetails.gender}
                        </div>
                      )}
                    </div>

                    {/* Replacement Type Selection */}
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                        Replacement Type *
                      </label>
                      <select
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'
                        }`}
                        value={newRequest.replacementType}
                        onChange={e => {
                          const newType = e.target.value as 'New' | 'Replacement';
                          setNewRequest(r => ({ ...r, replacementType: newType, replacedEmployeeId: null }));
                          
                          // If replacement is selected and we have employee details, fetch project employees
                          if (newType === 'Replacement' && employeeDetails?.projectName) {
                            fetchProjectEmployees(employeeDetails.projectName);
                          } else {
                            setProjectEmployees([]);
                          }
                        }}
                        required
                      >
                        <option value="New">New Employee</option>
                        <option value="Replacement">Replacement</option>
                      </select>
                    </div>

                    {/* Show replaced employee field if replacement type is selected */}
                    {newRequest.replacementType === 'Replacement' && (
                      <div>
                        <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                          Select Replaced Employee *
                        </label>
                        <select
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'
                          }`}
                          value={newRequest.replacedEmployeeId || ''}
                          onChange={e => setNewRequest(r => ({ ...r, replacedEmployeeId: e.target.value }))}
                          required
                        >
                          <option value="">Select an employee to replace</option>
                          {projectEmployees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                              {emp.employeeId} - {emp.fullName} ({emp.designation})
                            </option>
                          ))}
                        </select>
                        {projectEmployees.length === 0 && (
                          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`