"use client";

import React, { useEffect, useState, useCallback } from "react";
import  ManagerDashboardLayout from '@/components/dashboard/ManagerDashboardLayout';
import { FaTshirt, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaPlus } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
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
  // Removed unused showInstructions state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // Removed unused viewMode state
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
  const [uniformOptions, setUniformOptions] = useState<UniformOption[]>([]);
  const [selectedUniforms, setSelectedUniforms] = useState<SelectedUniform[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [projectEmployees, setProjectEmployees] = useState<Array<{ employeeId: string; fullName: string; designation: string }>>([]);
  const [employeeImages, setEmployeeImages] = useState<{ [id: string]: string }>({});
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [formValues, setFormValues] = useState<{ [key: string]: { size: string; qty: number } }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: string | null }>({});

  // Reset modal state when opening
  const handleOpenModal = () => {
    setShowCreateModal(true);
    setNewRequest({ 
      employeeId: "", 
      qty: 1, 
      remarks: "",
      replacementType: 'New', // Always initialize with a value
      replacedEmployeeId: null
    });
    setSelectedUniforms([]);
    setFormValues({});
    setUniformOptions([]);
    setEmployeeDetails(null);
    setOptionsError(null);
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
  const [createLoading, setCreateLoading] = useState(false);
  // Pagination and filter state
  // Removed unused currentPage and rowsPerPage variables
  // 1. Add state for column visibility, sorting, and inline filters
  // Removed unused sortBy and sortDir states
  const [empIdFilter, setEmpIdFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [genderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Verified' | 'Rejected'>('All');

  // 2. Compute unique values for filters
  const uniqueDesignations = Array.from(new Set(requests.map(r => r.employee.designation).filter(Boolean)));
  const uniqueProjects = Array.from(new Set(requests.map(r => r.employee.projectName).filter(Boolean)));
  // Removed unused uniqueGenders variable
  const uniqueStatuses = Array.from(new Set(requests.map(r => r.status).filter(Boolean)));

  // 3. Filtered and sorted requests
  const filteredRequests = requests.filter(req =>
    (statusFilter === 'All' || req.status === statusFilter) &&
    (empIdFilter === '' || req.employee.employeeId.toLowerCase().includes(empIdFilter.toLowerCase())) &&
    (nameFilter === '' || req.employee.fullName.toLowerCase().includes(nameFilter.toLowerCase())) &&
    (designationFilter === '' || req.employee.designation === designationFilter) &&
    (projectFilter === '' || req.employee.projectName === projectFilter) &&
    (genderFilter === '' || req.employee.gender === genderFilter)
  );
  // Removed unused sortedRequests variable
  // const paginatedRequests = sortedRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  // const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));

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
  const handleAction = async (requestId: string, action: "verify" | "approve" | "reject") => {
    setError(null);
    setActionLoading(prev => ({ ...prev, [requestId]: action }));
    
    try {
      // Find the request to get the employee ID
      const request = requests.find(req => req._id === requestId);
      if (!request) {
        setError("Request not found");
        setToast({ type: "error", message: "Request not found" });
        setTimeout(() => setToast(null), 3500);
        return;
      }
      
      const endpoint = `https://cafm.zenapi.co.in/api/uniforms/${request.employee.employeeId}/${action}`;
      const remarks = action === 'approve' ? 'Approved by admin' : 
                     action === 'reject' ? 'Rejected by admin' : 
                     'Verified by admin';
      
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
      
      // Update status based on action
      let newStatus = '';
      switch (action) {
        case 'verify': newStatus = 'Verified'; break;
        case 'approve': newStatus = 'Approved'; break;
        case 'reject': newStatus = 'Rejected'; break;
      }
      
      setRequests(prev =>
        prev.map(req =>
          req._id === requestId
            ? { ...req, status: newStatus }
            : req
        )
      );
      setToast({ type: "success", message: `Uniform request ${action}d successfully.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} uniform request.`;
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Update handleCreateRequest to match backend requirements
const handleCreateRequest = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!newRequest.employeeId || selectedUniforms.length === 0 || 
      (newRequest.replacementType === 'Replacement' && !newRequest.replacedEmployeeId)) {
    setToast({ 
      type: "error", 
      message: "Please fill all required fields including replaced employee ID if replacement type is selected." 
    });
    setTimeout(() => setToast(null), 3500);
    return;
  }
  
  // Removed max-5 validation to allow larger requests

  setCreateLoading(true);
  
  // Add validation for replacement type
  if (newRequest.replacementType === 'Replacement' && !newRequest.replacedEmployeeId) {
    setToast({ 
      type: "error", 
      message: "Replaced employee ID is required when replacement type is 'Replacement'" 
    });
    setTimeout(() => setToast(null), 3500);
    setCreateLoading(false);
    return;
  }
  
  try {
    // Prepare uniform data according to backend structure
    const uniformType = selectedUniforms.map(u => u.type);
    const size: { [key: string]: string } = {};
    selectedUniforms.forEach(u => { 
      size[u.type] = u.size; 
    });
    
    const qty = selectedUniforms.reduce((acc, u) => acc + u.qty, 0);
    
    // Backend expects this exact structure
    const requestBody = {
      uniformType,
      size,
      qty,
      remarks: newRequest.remarks || '',
      replacementType: newRequest.replacementType,
      replacedEmployeeId: newRequest.replacementType === 'Replacement' ? newRequest.replacedEmployeeId : null,
      manpowerRemarks: newRequest.remarks || ''
    };

    const res = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${newRequest.employeeId}/request`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();
    
    if (!res.ok || data.success === false) {
      const errorMsg = data.message || "Failed to create uniform request.";
      setToast({ type: "error", message: errorMsg });
      setCreateLoading(false);
      setTimeout(() => setToast(null), 3500);
      return;
    }

    // Success - reset form and close modal
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
    
    // Refresh the list after creation
    await fetchRequests();
    
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
  }, [showCreateModal, newRequest.employeeId, newRequest.replacementType, fetchProjectEmployees]);


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

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Toast/Snackbar */}
        {toast && (
          <div className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
          </div>
        )}
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Projects</option>
                {uniqueProjects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {/* Designation Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Designations</option>
                {uniqueDesignations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {/* Status Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'All' | 'Approved' | 'Pending' | 'Verified' | 'Rejected')}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="All">All Status</option>
                {uniqueStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={handleOpenModal}
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
              >
                <FaPlus className="inline mr-1" /> Create Request
              </button>
            </div>
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
                          <option value="">Select an employee to replace...</option>
                          {projectEmployees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                              {emp.employeeId} - {emp.fullName} ({emp.designation})
                            </option>
                          ))}
                        </select>
                        {projectEmployees.length === 0 && (
                          <div className="mt-1 text-sm text-orange-500">
                            Loading employees from project: {employeeDetails?.projectName}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Select Uniform Items (Complete selection = 1 Set)</label>
                      
                      {/* Complete Set Indicator */}
                      {uniformOptions.length > 0 && (
                        <div className={`mb-3 p-3 rounded-lg border-2 ${
                          (new Set(selectedUniforms.map(u => u.type)).size) === uniformOptions.length 
                            ? 'bg-green-50 border-green-300 text-green-800' 
                            : 'bg-blue-50 border-blue-300 text-blue-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            {(new Set(selectedUniforms.map(u => u.type)).size) === uniformOptions.length ? (
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
                            {(new Set(selectedUniforms.map(u => u.type)).size)} of {uniformOptions.length} items selected
                            {(new Set(selectedUniforms.map(u => u.type)).size) === uniformOptions.length && (
                              <span className="ml-2 font-semibold text-green-700">= 1 Complete Set</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {optionsLoading ? (
                        <div className="text-blue-400">Loading options...</div>
                      ) : uniformOptions.length > 0 ? (
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
                                        value={formValues[option.type]?.qty || 1}
                                        className="w-16 border rounded px-1 py-0.5"
                                        id={`qty-${option.type}`}
                                        onChange={(e) => {
                                          const newQty = Number(e.target.value);
                                          setFormValues(prev => ({
                                            ...prev,
                                            [option.type]: {
                                              ...prev[option.type],
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
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                        onClick={() => {
                                          const currentFormValues = formValues[option.type];
                                          const selectedSize = currentFormValues?.size || sizesArray[0] || '';
                                          const qty = currentFormValues?.qty || 1;

                                          // Always add the item, allowing multiple selections per type
                                          setSelectedUniforms(prev => ([
                                            ...prev,
                                            {
                                              type: option.type,
                                              size: selectedSize,
                                              qty
                                            }
                                          ]));
                                          // Keep form values synced for convenience
                                          setFormValues(prev => ({
                                            ...prev,
                                            [option.type]: {
                                              size: selectedSize,
                                              qty
                                            }
                                          }));
                                        }}
                                        title={selectedUniforms.some(u => u.type === option.type) ? 'Item added (click to add another)' : 'Add to request'}
                                      >
                                        {selectedUniforms.some(u => u.type === option.type) ? '✓' : 'Add'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : optionsError ? (
                        <div className="text-red-500">{optionsError}</div>
                      ) : (
                        <div className="text-gray-500">No uniform options available for this employee.</div>
                      )}
                    </div>
                    {/* Selected Uniforms Table */}
                    {selectedUniforms.length > 0 && (
                      <div className="mb-2">
                        <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Selected Items</label>
                        <table className="min-w-full text-xs border rounded">
                          <thead>
                            <tr className={theme === 'dark' ? 'bg-gray-800' : 'bg-blue-100'}>
                              <th className="px-2 py-1">Type</th>
                              <th className="px-2 py-1">Size/Set</th>
                              <th className="px-2 py-1">Qty</th>
                              <th className="px-2 py-1"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUniforms.map((u, idx) => (
                              <tr key={u.type + u.size}>
                                <td className="px-2 py-1">{u.type}</td>
                                <td className="px-2 py-1">{u.size}</td>
                                <td className="px-2 py-1">{u.qty}</td>
                                <td className="px-2 py-1">
                                  <button type="button" className="text-red-500" onClick={() => setSelectedUniforms(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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
                    
                  </form>
                </div>

                <div className="p-8 border-t">
                  <button
                    type="submit"
                    form="createRequestForm"
                    disabled={createLoading || !newRequest.employeeId || selectedUniforms.length === 0}
                    className={`w-full py-2 rounded-xl font-bold shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400 ${theme === 'dark' ? 'bg-gradient-to-r from-green-800 to-green-900 text-white hover:from-green-900 hover:to-green-950' : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'}`}
                  >
                    {createLoading ? <FaSpinner className="animate-spin inline mr-2" /> : <FaPlus className="inline mr-2" />}
                    Create Request
                  </button>
                </div>
              </div>
            </div>
          )}
        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading uniform requests...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-xs table-fixed border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-1 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '3%' }}>#</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '6%' }}>Photo</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Employee ID</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Full Name</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Designation</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Project</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '6%' }}>Status</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Request Date</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '20%' }}>Uniform Types</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '4%' }}>Qty</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Remarks</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '11%' }}>Actions</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className={`px-1 py-1 sticky left-0 z-20 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={empIdFilter} 
                        onChange={e => setEmpIdFilter(e.target.value)} 
                        placeholder="Filter ID" 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={nameFilter} 
                        onChange={e => setNameFilter(e.target.value)} 
                        placeholder="Filter Name" 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={designationFilter} 
                        onChange={e => setDesignationFilter(e.target.value)} 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={projectFilter} 
                        onChange={e => setProjectFilter(e.target.value)} 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value as 'All' | 'Approved' | 'Pending' | 'Verified' | 'Rejected')} 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="All">All</option>
                        {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={12} className={`px-4 py-12 text-center border ${theme === "dark" ? "text-gray-400 border-blue-800" : "text-gray-500 border-blue-200"}`}>No uniform requests found</td>
                    </tr>
                  ) : filteredRequests.map((request, idx) => (
                    <tr key={request._id} className={`${theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"} even:bg-gray-50 dark:even:bg-gray-900`}>
                      <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        {employeeImages[request.employee.employeeId] ? (
                          <Image
                            src={employeeImages[request.employee.employeeId]}
                            alt={request.employee.fullName}
                            width={32}
                            height={32}
                            className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded border flex items-center justify-center text-xs ${theme === 'dark' ? 'border-blue-900 text-gray-400' : 'border-blue-200 text-gray-400'}`}>
                            No Image
                          </div>
                        )}
                      </td>
                      <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{request.employee.employeeId}</td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={request.employee.fullName}>{request.employee.fullName}</div></td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={request.employee.designation}>{request.employee.designation}</div></td>
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={request.employee.projectName}>{request.employee.projectName}</div></td>
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                          request.status === 'Approved' 
                            ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                            : request.status === 'Verified'
                            ? theme === 'dark' ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-700'
                            : request.status === 'Rejected'
                            ? theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                            : theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                        {request.requestDate ? new Date(request.requestDate).toLocaleDateString() : ''}
                      </td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="text-xs">
                          {request.requestedItems.map((item) => (
                            <div key={item} className="truncate" title={`${item}${request.sizes && request.sizes[item] ? ' (' + request.sizes[item] + ')' : ''}`}>
                              {item}{request.sizes && request.sizes[item] ? ' (' + request.sizes[item] + ')' : ''}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{request.qty || ''}</td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={request.remarks || ''}>{request.remarks || ''}</div></td>
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="flex gap-1 justify-center">
                          {/* Verify button - only show for Pending status */}
                          {request.status === 'Pending' && (
                            <button
                              onClick={() => handleAction(request._id, 'verify')}
                              disabled={actionLoading[request._id] === 'verify'}
                              title="Verify Request"
                              className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                                theme === 'dark' 
                                  ? 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-400' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400'
                              }`}
                            >
                              {actionLoading[request._id] === 'verify' ? <FaSpinner className="animate-spin" /> : 'Verify'}
                            </button>
                          )}
                          
                          {/* Approve and Reject buttons - only show for Verified status */}
                          {request.status === 'Verified' && (
                            <>
                              <button
                                onClick={() => handleAction(request._id, 'approve')}
                                disabled={actionLoading[request._id] === 'approve'}
                                title="Approve Request"
                                className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                                  theme === 'dark' 
                                    ? 'bg-green-700 text-white hover:bg-green-800 focus:ring-green-400' 
                                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-400'
                                }`}
                              >
                                {actionLoading[request._id] === 'approve' ? <FaSpinner className="animate-spin" /> : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleAction(request._id, 'reject')}
                                disabled={actionLoading[request._id] === 'reject'}
                                title="Reject Request"
                                className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                                  theme === 'dark' 
                                    ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-400' 
                                    : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400'
                                }`}
                              >
                                {actionLoading[request._id] === 'reject' ? <FaSpinner className="animate-spin" /> : 'Reject'}
                              </button>
                            </>
                          )}
                          
                          {/* Final status display - show for Approved or Rejected */}
                          {(request.status === 'Approved' || request.status === 'Rejected') && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              request.status === 'Approved' 
                                ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                                : theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                            }`}>
                              {request.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}