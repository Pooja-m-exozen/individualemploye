"use client";

import React, { Suspense, useEffect, useState } from "react";
import TaskDashboardLayout from "@/components/dashboard/TaskDashboardLayout";
import { FaTshirt, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaInfoCircle, FaPlus } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
// import Select from "react-select";
import { useSearchParams, useRouter } from "next/navigation";

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

// Define available uniform items (if you want to keep them fixed, otherwise make this dynamic)
// const UNIFORM_ITEMS = ["Shirt", "Trousers", "Cap", "Jacket", "Shoes", "Belt"];

// Add types for uniform options API
interface UniformOption {
  type: string;
  sizes?: string[];
  set?: string[];
  sizeInventory?: { size: string; quantity: number; unit: string }[]; // Added for inventory info
}
interface EmployeeDetails {
  employeeId: string;
  fullName: string;
  designation: string;
  gender: string;
  projectName: string;
}

// Add UniformApiResponse interface
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

function UniformRequestsPage() {
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
  const [selectedUniforms, setSelectedUniforms] = useState<{
    type: string;
    size: string;
    qty: number;
  }[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [maxQuantity, setMaxQuantity] = useState<number>(5);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [employeeImages, setEmployeeImages] = useState<{ [id: string]: string }>({});
  // Add missing state variables
  const [uniformOptions, setUniformOptions] = useState<UniformOption[]>([]);
  const [projectEmployees, setProjectEmployees] = useState<Array<{
    employeeId: string;
    fullName: string;
    designation: string;
  }>>([]);
  
  // Add state for form values
  const [formValues, setFormValues] = useState<{ [key: string]: { size: string; qty: number } }>({});
  const searchParams = useSearchParams();
  const router = useRouter();

  // Reset modal state when opening
  const handleOpenModal = () => {
    setShowCreateModal(true);
    setNewRequest({ 
      employeeId: "", 
      qty: 1, 
      remarks: "",
      replacementType: 'New', // Always set to 'New' for consistency
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
  const fetchProjectEmployees = async (projectName: string) => {
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
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    const create = searchParams!.get("create");
    const employeeId = searchParams!.get("employeeId");
    if (create === "1") {
      setShowCreateModal(true);
      if (employeeId && !newRequest.employeeId) {
        setNewRequest(r => ({ ...r, employeeId }));
      }
    }
  }, [searchParams, newRequest.employeeId]);

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
          employeeImage: item.employeeImage || "", // Use image if available
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
      projectName: employeeDetails?.projectName || "",
      gender: employeeDetails?.gender || "",
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
        replacementType: 'New', // Always reset to 'New' for consistency
        replacedEmployeeId: null
      });
      setSelectedUniforms([]);
      setCreateLoading(false);
      setToast({ 
        type: "success", 
        message: `Uniform request created successfully! Set count: ${data.setCount || '1'}` 
      });
      setTimeout(() => setToast(null), 3500);
      // Refresh the requests list
      fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create uniform request.";
      setToast({ type: "error", message });
      setCreateLoading(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

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
            setMaxQuantity(uniformData.maxQuantity || 5);
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
            setMaxQuantity(5);
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
      setMaxQuantity(5);
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
  }, [requests, employeeImages]);

  return (
    <TaskDashboardLayout>
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
          {/* Tabs for Uniform Requests/View */}
          <div className="flex gap-2 mb-8 w-full max-w-5xl mx-auto">
            <button
              className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 transition-all duration-200 focus:outline-none ${
                theme === 'dark'
                  ? 'bg-gray-800 border-blue-400 text-blue-400'
                  : 'bg-white border-blue-600 text-blue-700'
              }`}
              style={{ borderBottomWidth: '3px' }}
            >
              Uniform Requests
            </button>
            <a
              href="/v1/employee/task/uniform-management/view"
              className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 transition-all duration-200 focus:outline-none ${
                theme === 'dark'
                  ? 'bg-gray-700 border-transparent text-gray-300 hover:text-blue-300'
                  : 'bg-gray-100 border-transparent text-gray-500 hover:text-blue-700'
              }`}
            >
              View Uniform Requests
            </a>
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
              <div className={`rounded-2xl shadow-2xl p-8 w-full max-w-4xl relative animate-fade-in ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                style={{ minHeight: '500px' }}>
                {toast && (
                  <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 z-50 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
                    style={{ minWidth: '250px', maxWidth: '90%' }}>
                    {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
                  </div>
                )}
                <button
                  className={`absolute top-3 right-4 text-2xl font-bold focus:outline-none ${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                  onClick={() => {
                    setShowCreateModal(false);
                    // Reset form state
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
                    // Remove query params for best UX
                    const params = new URLSearchParams(searchParams!.toString());
                    params.delete('create');
                    params.delete('employeeId');
                    router.replace(`/task/uniform-management/requests${params.toString() ? '?' + params.toString() : ''}`);
                  }}
                  title="Close"
                >×</button>
                <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}><FaTshirt /> Create Uniform Request</h2>
                
                <form onSubmit={handleCreateRequest} className="space-y-6">
                  {/* Employee Information Section */}
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
                    <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Employee Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Employee ID *</label>
                        <input
                          type="text"
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'}`}
                          placeholder="Enter employee ID..."
                          value={newRequest.employeeId}
                          onChange={e => setNewRequest(r => ({ ...r, employeeId: e.target.value }))}
                          required
                        />
                      </div>
                      {employeeDetails && (
                        <div className="space-y-2">
                          <div className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                            <strong>Name:</strong> {employeeDetails.fullName}
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                            <strong>Designation:</strong> {employeeDetails.designation}
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                            <strong>Project:</strong> {employeeDetails.projectName}
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                            <strong>Gender:</strong> {employeeDetails.gender}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replacement Type Selection */}
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
                    <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Request Type</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
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
                          <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
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
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                              No other employees found in this project. Please select a different project or contact HR.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uniform Selection Section */}
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
                    <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Uniform Selection</h3>
                    <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                      Maximum total quantity allowed: <strong>{maxQuantity}</strong>
                    </p>
                    
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Select Uniform Items (Complete selection = 1 Set)</label>
                      
                      {/* Complete Set Indicator */}
                      {uniformOptions.length > 0 && (
                        <div className={`mb-3 p-3 rounded-lg border-2 ${
                          selectedUniforms.length === uniformOptions.length 
                            ? 'bg-green-50 border-green-300 text-green-800' 
                            : 'bg-blue-50 border-blue-300 text-blue-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            {selectedUniforms.length === uniformOptions.length ? (
                              <>
                                <span className="text-green-600 text-lg">✓</span>
                                <span className="font-semibold">Complete Uniform Set Selected!</span>
                              </>
                            ) : (
                              <>
                                <span className="text-blue-600 text-lg">ℹ</span>
                                <span className="font-semibold">Select all items to complete 1 uniform set</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm mt-1">
                            {selectedUniforms.length} of {uniformOptions.length} items selected
                            {selectedUniforms.length === uniformOptions.length && (
                              <span className="ml-2 font-semibold text-green-700">= 1 Complete Set</span>
                              )}
                          </div>
                        </div>
                      )}
                      
                      {optionsLoading ? (
                        <div className="text-blue-400">Loading options...</div>
                      ) : optionsError ? (
                        <div className="text-red-500">{optionsError}</div>
                      ) : (
                        <div className="overflow-x-auto max-h-64 border rounded-lg mb-2">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className={theme === 'dark' ? 'bg-gray-800' : 'bg-blue-100'}>
                                <th className="px-2 py-1">Set Type</th>
                                <th className="px-2 py-1">Set Contents</th>
                                <th className="px-2 py-1">Request Qty</th>
                                <th className="px-2 py-1"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {uniformOptions.map(option => {
                                 // Get sizes array, handling both sizes and set properties
                                 const sizesArray = option.sizes || (option.set ? (Array.isArray(option.set) ? option.set : [option.set]) : []);
                                 
                                 return (
                                   <tr key={option.type}>
                                     <td className="px-2 py-1">{option.type}</td>
                                     <td className="px-2 py-1">
                                       <select
                                         className="w-20 border rounded px-1 py-0.5 text-xs"
                                         id={`size-${option.type}`}
                                         value={formValues[option.type]?.size || sizesArray[0] || ''}
                                         onChange={(e) => {
                                           const newSize = e.target.value;
                                           setFormValues(prev => ({
                                             ...prev,
                                             [option.type]: {
                                               ...prev[option.type],
                                               size: newSize,
                                               qty: prev[option.type]?.qty || 1
                                             }
                                           }));
                                           
                                           // Update selectedUniforms if this item is already selected
                                           if (selectedUniforms.some(u => u.type === option.type)) {
                                             setSelectedUniforms(prev => prev.map(u => 
                                               u.type === option.type 
                                                 ? { ...u, size: newSize }
                                                 : u
                                             ));
                                           }
                                         }}
                                       >
                                         {sizesArray.map((size: string) => (
                                           <option key={size} value={size}>{size}</option>
                                         ))}
                                       </select>
                                     </td>
                                     <td className="px-2 py-1">
                                       <input
                                         type="number"
                                         min={1}
                                         max={maxQuantity}
                                         value={formValues[option.type]?.qty || 1}
                                         className="w-16 border rounded px-1 py-0.5"
                                         id={`qty-${option.type}`}
                                         onChange={(e) => {
                                           const newQty = Number(e.target.value);
                                           setFormValues(prev => ({
                                             ...prev,
                                             [option.type]: {
                                               size: prev[option.type]?.size || sizesArray[0] || '',
                                               qty: newQty
                                             }
                                           }));
                                           
                                           // Update selectedUniforms if this item is already selected
                                           if (selectedUniforms.some(u => u.type === option.type)) {
                                             setSelectedUniforms(prev => prev.map(u => 
                                               u.type === option.type 
                                                 ? { ...u, qty: newQty }
                                                 : u
                                             ));
                                           }
                                         }}
                                       />
                                     </td>
                                     <td className="px-2 py-1">
                                       <button
                                         type="button"
                                         className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                           selectedUniforms.some(u => u.type === option.type)
                                             ? 'bg-green-500 text-white cursor-default'
                                             : 'bg-blue-500 text-white hover:bg-blue-600'
                                         }`}
                                         onClick={() => {
                                           const currentFormValues = formValues[option.type];
                                           const selectedSize = currentFormValues?.size || sizesArray[0] || '';
                                           const qty = currentFormValues?.qty || 1;
                                           
                                           // Check if this item type is already selected (regardless of size)
                                           const isAlreadySelected = selectedUniforms.some(u => u.type === option.type);
                                           
                                           if (isAlreadySelected) {
                                             // Remove the item if already selected
                                             setSelectedUniforms(prev => prev.filter(u => u.type !== option.type));
                                             // Also remove from formValues
                                             setFormValues(prev => {
                                               const newValues = { ...prev };
                                               delete newValues[option.type];
                                               return newValues;
                                             });
                                           } else {
                                             // Prevent exceeding maxQuantity
                                             const totalQty = selectedUniforms.reduce((acc, u) => acc + u.qty, 0) + qty;
                                             if (totalQty > maxQuantity) {
                                               setToast({ type: 'error', message: `Total quantity cannot exceed ${maxQuantity}` });
                                               setTimeout(() => setToast(null), 3500);
                                               return;
                                             }
                                             // Add the item
                                             setSelectedUniforms(prev => [
                                               ...prev,
                                               {
                                                 type: option.type,
                                                 size: selectedSize,
                                                 qty
                                               }
                                             ]);
                                             // Ensure formValues has the current values
                                             setFormValues(prev => ({
                                               ...prev,
                                               [option.type]: {
                                                 size: selectedSize,
                                                 qty
                                               }
                                             }));
                                           }
                                         }}
                                         title={
                                           selectedUniforms.some(u => u.type === option.type)
                                             ? 'Click to remove from request'
                                             : 'Add to request'
                                         }
                                       >
                                         {selectedUniforms.some(u => u.type === option.type)
                                           ? '✓'
                                           : 'Add'
                                         }
                                       </button>
                                     </td>
                                   </tr>
                                 );
                               })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Selected Uniforms */}
                    {selectedUniforms.length > 0 && (
                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Selected Items</label>
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className={theme === 'dark' ? 'bg-gray-700' : 'bg-blue-100'}>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Size/Set</th>
                                <th className="px-3 py-2 text-left">Quantity</th>
                                <th className="px-3 py-2 text-left">Total Qty</th>
                                <th className="px-3 py-2 text-left">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedUniforms.map((u, idx) => (
                                <tr key={u.type + u.size} className={theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                                  <td className="px-3 py-2 font-medium">{u.type}</td>
                                  <td className="px-3 py-2">{u.size}</td>
                                  <td className="px-3 py-2">{u.qty}</td>
                                  <td className="px-3 py-2 font-semibold">
                                    {selectedUniforms.reduce((acc, item) => 
                                      item.type === u.type ? acc + item.qty : acc, 0
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button 
                                      type="button" 
                                      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                                        theme === 'dark' 
                                          ? 'bg-red-600 text-white hover:bg-red-700' 
                                          : 'bg-red-500 text-white hover:bg-red-600'
                                      }`}
                                      onClick={() => setSelectedUniforms(prev => prev.filter((_, i) => i !== idx))}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className={theme === 'dark' ? 'bg-gray-700 font-semibold' : 'bg-blue-100 font-semibold'}>
                                <td colSpan={3} className="px-3 py-2 text-right">Total Quantity:</td>
                                <td className="px-3 py-2 font-bold">
                                  {selectedUniforms.reduce((acc, u) => acc + u.qty, 0)} / {maxQuantity}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remarks Section */}
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
                    <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Additional Information</h3>
                    <div>
                      <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Remarks</label>
                      <textarea
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'}`}
                        placeholder="Enter any additional remarks or special requirements..."
                        value={newRequest.remarks}
                        onChange={e => setNewRequest(r => ({ ...r, remarks: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        // Reset form state
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
                        const params = new URLSearchParams(searchParams!.toString());
                        params.delete('create');
                        params.delete('employeeId');
                        router.replace(`/task/uniform-management/requests${params.toString() ? '?' + params.toString() : ''}`);
                      }}
                      className={`px-6 py-3 rounded-xl font-semibold border transition-colors ${
                        theme === 'dark' 
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading || !newRequest.employeeId || selectedUniforms.length === 0}
                      className={`px-8 py-3 rounded-xl font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400 ${
                        theme === 'dark' 
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800' 
                          : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:from-green-700'
                      }`}
                    >
                      {createLoading ? (
                        <>
                          <FaSpinner className="animate-spin inline mr-2" />
                          Creating Request...
                        </>
                      ) : (
                        <>
                          <FaPlus className="inline mr-2" />
                          Create Request
                        </>
                      )}
                    </button>
                  </div>
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
                        <Image src={employeeImages[request.employee.employeeId] || '/file.svg'} alt={request.employee.fullName} width={64} height={64} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{request.employee.fullName}</h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{request.employee.designation} - {request.employee.projectName}</p>
                        {request.employee.gender && (
                          <p className={`text-xs ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Gender: {request.employee.gender}</p>
                        )}
                        {request.requestDate && (
                          <p className={`text-xs ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Requested: {new Date(request.requestDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Status:</span>
                        <span className={`text-sm ${request.status === 'Approved' ? 'text-green-500' : request.status === 'Rejected' ? 'text-red-500' : 'text-yellow-500'}`}>{request.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Items & Sizes:</span>
                        <div className="flex flex-wrap gap-2">
                          {request.requestedItems.map(item => (
                            <span key={item} className={`text-xs rounded-full py-1 px-3 ${theme === 'dark' ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                              {item}{request.sizes && request.sizes[item] ? ` (${request.sizes[item]})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                      {request.qty && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Quantity:</span>
                          <span className="text-sm">{request.qty}</span>
                        </div>
                      )}
                      {request.remarks && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Remarks:</span>
                          <span className="text-sm">{request.remarks}</span>
                        </div>
                      )}
                    </div>
                    {/* In the request list rendering (both card and table views), remove the approve and reject buttons and their handlers.
                    Only display the request status and information, not the action buttons. */}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className={`min-w-full divide-y divide-gray-200 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <thead className={theme === 'dark' ? 'bg-gray-700 sticky top-0 z-10' : 'bg-gray-50 sticky top-0 z-10'}>
                    <tr>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}></th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Employee ID</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Name</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Designation</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Project</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Gender</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Request Date</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Status</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Requested Items (Size)</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Qty</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Remarks</th>
                      <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white' : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedRequests.map(request => (
                      <tr key={request._id} className={theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 transition' : 'bg-white hover:bg-blue-50 transition'}>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm font-medium text-white' : 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'}></td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.employee.employeeId}</td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.employee.fullName}</td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.employee.designation}</td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.employee.projectName}</td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.employee.gender || ''}</td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.requestDate ? new Date(request.requestDate).toLocaleDateString() : ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'Approved' ? 'bg-green-100 text-green-700' : request.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{request.status}</span>
                        </td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>
                          <div className="flex flex-wrap gap-2">
                            {request.requestedItems.map(item => (
                              <span key={item} className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${theme === 'dark' ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                                {item}{request.sizes && request.sizes[item] ? ` (${request.sizes[item]})` : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.qty || ''}</td>
                        <td className={theme === 'dark' ? 'px-6 py-4 whitespace-nowrap text-sm text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'}>{request.remarks || ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {/* In the request list rendering (both card and table views), remove the approve and reject buttons and their handlers.
                          Only display the request status and information, not the action buttons. */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                <div className="flex justify-between items-center py-4 px-2">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all focus:outline-none ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >Previous</button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all focus:outline-none ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >Next</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </TaskDashboardLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UniformRequestsPage />
    </Suspense>
  );
}