"use client";

import React, { useEffect, useState, useCallback } from "react";
import  CoordinatorDashboardLayout from '@/components/dashboard/CoordinatorDashboardLayout';
import { FaTshirt, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaPlus, FaEdit, FaIdCard, FaTrash } from "react-icons/fa";
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
  verificationStatus?: string;
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
  verificationStatus?: string;
  uniformType: string[];
  qty?: number;
  remarks?: string;
  size?: { [key: string]: string };
  requestDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Map Uniform interfaces
interface Project {
  _id: string;
  projectName: string;
}

interface ProjectEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
}

interface UniformApiEmployee {
  projectName: string;
  employeeId: string;
  fullName: string;
  designation: string;
}

interface UniformOptionItem {
  type: string;
  sizes?: string[];
  set?: string[];
}

interface UniformOptions {
  employeeDetails: {
    fullName: string;
    employeeId: string;
    designation: string;
    projectName: string;
  };
  uniformOptions: UniformOptionItem[];
  maxQuantity: number;
}

interface Mapping {
  _id: string;
  project: string;
  designations: string[];
  employeeId?: string;
  payable: 'payable' | 'non-payable';
  uniformTypes: string[];
  mappingName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AvailableOptions {
  projects: string[];
  categories: string[];
  uniformTypes: Array<{
    name: string;
    category: string;
    subCategory: string;
    description: string;
    availableSizes: string[];
  }>;
  existingDesignations: string[];
}

interface MappingData {
  project: string;
  designations: string[];
  employeeId?: string;
  payable: 'payable' | 'non-payable';
  uniformTypes: string[];
  mappingName?: string;
  description?: string;
}

export default function UniformRequestsPage() {
  const { theme } = useTheme();
  
  // View toggle state
  const [activeView, setActiveView] = useState<'requests' | 'mapUniform'>('requests');
  
  // Requests state
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
  
  // Edit modal state
  const [editModal, setEditModal] = useState<{ open: boolean, request: UniformRequest | null }>({ open: false, request: null });
  const [editFormData, setEditFormData] = useState<{
    uniformType: string[];
    size: { [key: string]: string };
    qty: number;
    remarks: string;
  }>({
    uniformType: [],
    size: {},
    qty: 1,
    remarks: ''
  });
  const [editUniformOptions, setEditUniformOptions] = useState<UniformOption[]>([]);
  const [editOptionsLoading, setEditOptionsLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

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
  
  // Map Uniform state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState('');
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string, designationWiseCount?: Record<string, number> }[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions | null>(null);
  const [availableOptionsLoading, setAvailableOptionsLoading] = useState(false);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mapForm, setMapForm] = useState({ 
    project: '', 
    designations: [] as string[], 
    employeeId: '', 
    payable: 'non-payable' as 'payable' | 'non-payable',
    uniformTypes: [] as string[],
    mappingName: '',
    description: ''
  });
  const [mapError, setMapError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateMappingModal, setShowCreateMappingModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [editModalForm, setEditModalForm] = useState({
    project: '',
    designations: [] as string[],
    employeeId: '',
    payable: 'non-payable' as 'payable' | 'non-payable',
    uniformTypes: [] as string[],
    mappingName: '',
    description: ''
  });
  
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
  
  // Map Uniform filter state
  const [mapProjectFilter, setMapProjectFilter] = useState('');
  const [mapDesignationFilter, setMapDesignationFilter] = useState('');
  const [mapPayableFilter, setMapPayableFilter] = useState<'All' | 'payable' | 'non-payable'>('All');
  const [mapSearchFilter, setMapSearchFilter] = useState('');
  
  // Edit modal search state
  const [editDesignationSearch, setEditDesignationSearch] = useState('');
  const [editUniformTypeSearch, setEditUniformTypeSearch] = useState('');

  // 2. Compute unique values for filters
  const uniqueDesignations = Array.from(new Set(requests.map(r => r.employee.designation).filter(Boolean)));
  const uniqueProjects = Array.from(new Set(requests.map(r => r.employee.projectName).filter(Boolean)));
  // Removed unused uniqueGenders variable
  const uniqueStatuses = Array.from(new Set(requests.map(r => r.status).filter(Boolean)));
  
  // Map Uniform unique values for filters
  const uniqueMapProjects = Array.from(new Set(mappings.map(m => m.project).filter(Boolean)));
  const uniqueMapDesignations = Array.from(new Set(mappings.flatMap(m => m.designations).filter(Boolean)));
  
  // Edit modal filtered options
  const filteredEditDesignations = designationOptions.filter(designation =>
    designation.toLowerCase().includes(editDesignationSearch.toLowerCase())
  );
  const filteredEditUniformTypes = availableOptions?.uniformTypes?.filter(uniformType =>
    uniformType.name.toLowerCase().includes(editUniformTypeSearch.toLowerCase()) ||
    (uniformType.category && uniformType.category.toLowerCase().includes(editUniformTypeSearch.toLowerCase()))
  ) || [];

  // 3. Filtered and sorted requests
  const filteredRequests = requests.filter(req =>
    (statusFilter === 'All' || req.status === statusFilter) &&
    (empIdFilter === '' || req.employee.employeeId.toLowerCase().includes(empIdFilter.toLowerCase())) &&
    (nameFilter === '' || req.employee.fullName.toLowerCase().includes(nameFilter.toLowerCase())) &&
    (designationFilter === '' || req.employee.designation === designationFilter) &&
    (projectFilter === '' || req.employee.projectName === projectFilter) &&
    (genderFilter === '' || req.employee.gender === genderFilter)
  );
  
  // Map Uniform filtered mappings
  const filteredMappings = mappings.filter(mapping =>
    (mapProjectFilter === '' || mapping.project === mapProjectFilter) &&
    (mapDesignationFilter === '' || mapping.designations.includes(mapDesignationFilter)) &&
    (mapPayableFilter === 'All' || mapping.payable === mapPayableFilter) &&
    (mapSearchFilter === '' || 
      mapping.mappingName?.toLowerCase().includes(mapSearchFilter.toLowerCase()) ||
      mapping.project.toLowerCase().includes(mapSearchFilter.toLowerCase()) ||
      mapping.designations.some(d => d.toLowerCase().includes(mapSearchFilter.toLowerCase())) ||
      mapping.uniformTypes.some(t => t.toLowerCase().includes(mapSearchFilter.toLowerCase()))
    )
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
        verificationStatus: item.verificationStatus,
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

  // Map Uniform API Functions
  const fetchProjects = async () => {
    try {
      setProjectLoading(true);
      const response = await fetch('https://cafm.zenapi.co.in/api/project/projects');
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
      setProjectError('');
    } catch (error) {
      setProjectError('Failed to load projects');
      console.error('Error fetching projects:', error);
    } finally {
      setProjectLoading(false);
    }
  };

  const fetchAvailableOptions = async () => {
    try {
      setAvailableOptionsLoading(true);
      const response = await fetch('https://cafm.zenapi.co.in/api/uniforms/available-options');
      const data = await response.json();
      if (data.success) {
        setAvailableOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching available options:', error);
    } finally {
      setAvailableOptionsLoading(false);
    }
  };

  const fetchMappings = async () => {
    try {
      setMappingsLoading(true);
      const response = await fetch('https://cafm.zenapi.co.in/api/uniforms/uniform-mappings');
      const data = await response.json();
      if (data.success) {
        const activeMappings = data.data.filter((mapping: Mapping) => mapping.isActive !== false);
        setMappings(activeMappings);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setMappingsLoading(false);
    }
  };

  const createMapping = async (mappingData: MappingData) => {
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/uniforms/uniform-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappingData),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create mapping');
      }
    } catch (error) {
      throw error;
    }
  };

  const updateMapping = async (id: string, mappingData: MappingData) => {
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/uniforms/uniform-mappings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappingData),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update mapping');
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/uniforms/uniform-mappings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to delete mapping');
      }
    } catch (error) {
      throw error;
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

  // Edit modal functions
  const handleOpenEditModal = (request: UniformRequest) => {
    setEditModal({ open: true, request });
    // Initialize form data with current request data
    setEditFormData({
      uniformType: request.requestedItems || [],
      size: request.sizes || {},
      qty: request.qty || 1,
      remarks: request.remarks || ''
    });
  };

  const handleCloseEditModal = () => {
    setEditModal({ open: false, request: null });
    setEditFormData({
      uniformType: [],
      size: {},
      qty: 1,
      remarks: ''
    });
    setEditUniformOptions([]);
  };

  // Fetch uniform options for edit modal
  useEffect(() => {
    if (editModal.open && editModal.request) {
      fetchEditUniformOptions(editModal.request.employee.employeeId);
    }
  }, [editModal]);

  const fetchEditUniformOptions = async (employeeId: string) => {
    setEditOptionsLoading(true);
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${employeeId}/options`);
      const data = await res.json();
      if (data.success) {
        setEditUniformOptions(data.uniformOptions || []);
      } else {
        setEditUniformOptions([]);
      }
    } catch (error) {
      console.error('Error fetching uniform options:', error);
      setEditUniformOptions([]);
    } finally {
      setEditOptionsLoading(false);
    }
  };

  const handleEditUniformTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setEditFormData(prev => ({
        ...prev,
        uniformType: [...prev.uniformType, type],
        size: { ...prev.size, [type]: '' }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        uniformType: prev.uniformType.filter(t => t !== type),
        size: Object.fromEntries(
          Object.entries(prev.size).filter(([key]) => key !== type)
        )
      }));
    }
  };

  const handleEditSizeChange = (type: string, size: string) => {
    setEditFormData(prev => ({
      ...prev,
      size: { ...prev.size, [type]: size }
    }));
  };

  const handleEditSubmit = async () => {
    if (!editModal.request) return;
    
    setEditLoading(true);
    try {
      const requestBody = {
        uniformType: editFormData.uniformType,
        size: editFormData.size,
        qty: editFormData.qty,
        remarks: editFormData.remarks
      };

      const res = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${editModal.request.employee.employeeId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        // Update the local state
        setRequests(prev => 
          prev.map(req => 
            req._id === editModal.request!._id 
              ? { 
                  ...req, 
                  requestedItems: editFormData.uniformType,
                  sizes: editFormData.size,
                  qty: editFormData.qty,
                  remarks: editFormData.remarks
                }
              : req
          )
        );
        handleCloseEditModal();
        setToast({ type: "success", message: "Uniform request updated successfully!" });
        setTimeout(() => setToast(null), 3500);
      } else {
        setToast({ type: "error", message: data.message || "Failed to update uniform request" });
        setTimeout(() => setToast(null), 3500);
      }
    } catch (error) {
      console.error('Error updating uniform request:', error);
      setToast({ type: "error", message: "Failed to update uniform request" });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setEditLoading(false);
    }
  };

  // Map Uniform Handler Functions
  const handleMapAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapForm.project || mapForm.designations.length === 0 || mapForm.uniformTypes.length === 0) {
      setMapError('Please select project, at least one designation, and at least one uniform type.');
      return;
    }

    try {
      const mappingData = {
        project: mapForm.project,
        designations: mapForm.designations,
        employeeId: mapForm.employeeId || undefined,
        payable: mapForm.payable,
        uniformTypes: mapForm.uniformTypes,
        mappingName: mapForm.mappingName || `${mapForm.project} - ${mapForm.designations.join(', ')}`,
        description: mapForm.description
      };

      const newMapping = await createMapping(mappingData);
      setMappings(prev => [newMapping, ...prev]);
      setMapForm({ 
        project: '', 
        designations: [], 
        employeeId: '', 
        payable: 'non-payable',
        uniformTypes: [],
        mappingName: '',
        description: ''
      });
      setMapError('');
      setShowCreateMappingModal(false);
      setToast({ type: 'success', message: 'Mapping created successfully.' });
      setTimeout(() => setToast(null), 3500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create mapping';
      setMapError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const startEdit = (m: Mapping) => {
    setEditingMapping(m);
    setEditModalForm({
      project: m.project,
      designations: m.designations,
      employeeId: m.employeeId || '',
      payable: m.payable,
      uniformTypes: m.uniformTypes,
      mappingName: m.mappingName || '',
      description: m.description || ''
    });
    
    const selectedProject = projectList.find(p => p.projectName === m.project);
    if (selectedProject && selectedProject.designationWiseCount) {
      setDesignationOptions(Object.keys(selectedProject.designationWiseCount));
    } else {
      setDesignationOptions([]);
    }
    
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingMapping(null);
    setEditModalForm({ 
      project: '', 
      designations: [], 
      employeeId: '', 
      payable: 'non-payable',
      uniformTypes: [],
      mappingName: '',
      description: ''
    });
    // Reset search fields
    setEditDesignationSearch('');
    setEditUniformTypeSearch('');
  };

  const saveEdit = async () => {
    if (!editingMapping) return;
    
    try {
      const updatedMapping = await updateMapping(editingMapping._id, editModalForm);
      setMappings(prev => prev.map(m => m._id === editingMapping._id ? updatedMapping : m));
      setShowEditModal(false);
      setEditingMapping(null);
      setEditModalForm({ 
        project: '', 
        designations: [], 
        employeeId: '', 
        payable: 'non-payable',
        uniformTypes: [],
        mappingName: '',
        description: ''
      });
      setToast({ type: 'success', message: 'Mapping updated successfully.' });
      setTimeout(() => setToast(null), 3500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update mapping';
      setMapError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleMapDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      try {
        await deleteMapping(id);
        await fetchMappings();
        setToast({ type: 'success', message: 'Mapping deleted successfully.' });
        setTimeout(() => setToast(null), 3500);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete mapping';
        setMapError(errorMessage);
        setToast({ type: 'error', message: errorMessage });
        setTimeout(() => setToast(null), 3500);
      }
    }
  };

  const handleDesignationChange = (designation: string, checked: boolean) => {
    setMapForm(prev => ({
      ...prev,
      designations: checked 
        ? [...prev.designations, designation]
        : prev.designations.filter(d => d !== designation)
    }));
  };

  const handleUniformTypeChange = (uniformType: string, checked: boolean) => {
    setMapForm(prev => ({
      ...prev,
      uniformTypes: checked 
        ? [...prev.uniformTypes, uniformType]
        : prev.uniformTypes.filter(t => t !== uniformType)
    }));
  };


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

  // Map Uniform useEffect hooks
  useEffect(() => {
    if (activeView === 'mapUniform') {
      fetchProjects();
      fetchAvailableOptions();
      fetchMappings();
    }
  }, [activeView]);

  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/project/projects")
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        console.error("Failed to load projects");
      });
  }, []);

  useEffect(() => {
    const selectedProject = projectList.find(p => p.projectName === mapForm.project);
    if (selectedProject && selectedProject.designationWiseCount) {
      setDesignationOptions(Object.keys(selectedProject.designationWiseCount));
      setMapForm(prev => ({ ...prev, designations: [] }));
    } else {
      setDesignationOptions([]);
      setMapForm(prev => ({ ...prev, designations: [] }));
    }
  }, [mapForm.project, projectList]);

  useEffect(() => {
    if (showEditModal) {
      const selectedProject = projectList.find(p => p.projectName === editModalForm.project);
      if (selectedProject && selectedProject.designationWiseCount) {
        setDesignationOptions(Object.keys(selectedProject.designationWiseCount));
      } else {
        setDesignationOptions([]);
      }
    }
  }, [editModalForm.project, projectList, showEditModal]);



  return (
    <CoordinatorDashboardLayout>
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
        
        {/* Filters and Search with Radio Buttons */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-4 items-center w-full">
            {/* Radio Button Navigation */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="view"
                  value="requests"
                  checked={activeView === 'requests'}
                  onChange={(e) => setActiveView(e.target.value as 'requests' | 'mapUniform')}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaTshirt className="inline mr-2" />
                  Requests
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="view"
                  value="mapUniform"
                  checked={activeView === 'mapUniform'}
                  onChange={(e) => setActiveView(e.target.value as 'requests' | 'mapUniform')}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaIdCard className="inline mr-2" />
                  Map Uniform
                </span>
              </label>
            </div>
            
            {/* Filters and Search - Show for both views */}
            {activeView === 'requests' && (
              <div className="flex flex-row flex-wrap gap-2 items-center flex-1">
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
            )}
            
            {/* Filters and Search for Map Uniform view */}
            {activeView === 'mapUniform' && (
              <div className="flex flex-row flex-wrap gap-2 items-center flex-1">
                {/* Project Dropdown */}
                <div className="flex-1 min-w-[180px] max-w-xs">
                  <select
                    value={mapProjectFilter}
                    onChange={e => setMapProjectFilter(e.target.value)}
                    className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">All Projects</option>
                    {uniqueMapProjects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                {/* Designation Dropdown */}
                <div className="relative w-44 min-w-[130px]">
                  <select
                    value={mapDesignationFilter}
                    onChange={e => setMapDesignationFilter(e.target.value)}
                    className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">All Designations</option>
                    {uniqueMapDesignations.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {/* Payable Status Dropdown */}
                <div className="relative w-44 min-w-[130px]">
                  <select
                    value={mapPayableFilter}
                    onChange={e => setMapPayableFilter(e.target.value as 'All' | 'payable' | 'non-payable')}
                    className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="All">All Payable</option>
                    <option value="payable">Payable</option>
                    <option value="non-payable">Non-Payable</option>
                  </select>
                </div>
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                  <input
                    type="text"
                    placeholder="Search mappings..."
                    value={mapSearchFilter}
                    onChange={e => setMapSearchFilter(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button 
                    onClick={() => setShowCreateMappingModal(true)}
                    className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                  >
                    <FaPlus className="inline mr-1" /> Add Mapping
                  </button>
                </div>
              </div>
            )}
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
        
        {/* Main Content - Requests View */}
        {activeView === 'requests' && (
        <>
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
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Status</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Request Date</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '20%' }}>Uniform Types</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '4%' }}>Qty</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Remarks</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '8%' }}>Actions</th>
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
                          {/* Edit button - show for all statuses except final ones */}
                          {request.status !== 'Approved' && request.status !== 'Rejected' && (
                            <button
                              onClick={() => handleOpenEditModal(request)}
                              title="Edit Request"
                              className={`px-2 py-1 rounded font-semibold text-xs shadow transition focus:outline-none focus:ring-2 ${
                                theme === 'dark' 
                                  ? 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-400' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400'
                              }`}
                            >
                              <FaEdit />
                            </button>
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

        {/* Edit Modal */}
        {editModal.open && editModal.request && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`rounded-2xl shadow-2xl w-full max-w-3xl relative animate-fade-in ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}
              style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="p-8 border-b">
                <button
                  className={`absolute top-3 right-4 text-2xl font-bold focus:outline-none ${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                  onClick={handleCloseEditModal}
                  title="Close"
                >×</button>
                <h2 className={`text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                  <FaEdit /> Edit Uniform Request
                </h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {editModal.request.employee.fullName} ({editModal.request.employee.employeeId})
                </p>
              </div>
              
              <div className="overflow-y-auto flex-1 p-8">
                <div className="space-y-5">
                  {/* Uniform Types Selection */}
                  <div>
                    <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                      Select Uniform Types
                    </label>
                    {editOptionsLoading ? (
                      <div className="text-blue-400 flex items-center gap-2">
                        <FaSpinner className="animate-spin" />
                        Loading uniform options...
                      </div>
                    ) : editUniformOptions.length > 0 ? (
                      <div className={`overflow-x-auto max-h-64 border rounded-lg mb-2 ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className={theme === 'dark' ? 'bg-gray-800' : 'bg-blue-100'}>
                              <th className="px-2 py-1">Uniform Type</th>
                              <th className="px-2 py-1">Available Sizes</th>
                              <th className="px-2 py-1">Select</th>
                              <th className="px-2 py-1">Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editUniformOptions.map(option => {
                              const sizesArray = option.sizes || (option.set ? (Array.isArray(option.set) ? option.set : [option.set]) : []);
                              const isSelected = editFormData.uniformType.includes(option.type);
                              
                              return (
                                <tr key={option.type}>
                                  <td className="px-2 py-1">{option.type}</td>
                                  <td className="px-2 py-1">
                                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {sizesArray.join(', ')}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleEditUniformTypeChange(option.type, e.target.checked)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    {isSelected && (
                                      <select
                                        className={`w-20 border rounded px-1 py-0.5 text-xs ${
                                          theme === 'dark' 
                                            ? 'bg-gray-800 border-blue-900 text-white' 
                                            : 'border-gray-300'
                                        }`}
                                        value={editFormData.size[option.type] || ''}
                                        onChange={(e) => handleEditSizeChange(option.type, e.target.value)}
                                      >
                                        <option value="">Select Size</option>
                                        {sizesArray.map((size: string) => (
                                          <option key={size} value={size}>{size}</option>
                                        ))}
                                      </select>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No uniform options available for this employee.
                      </div>
                    )}
                  </div>

                  {/* Selected Uniforms Summary */}
                  {editFormData.uniformType.length > 0 && (
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                        Selected Items
                      </label>
                      <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
                        {editFormData.uniformType.map((type, index) => (
                          <div key={type} className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {index + 1}. {type} {editFormData.size[type] && `(${editFormData.size[type]})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.qty}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'
                      }`}
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                      Remarks
                    </label>
                    <textarea
                      value={editFormData.remarks}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      rows={3}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'border-blue-200'
                      }`}
                      placeholder="Enter any additional remarks..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t">
                <button
                  onClick={handleEditSubmit}
                  disabled={editLoading || editFormData.uniformType.length === 0}
                  className={`w-full py-2 rounded-xl font-bold shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-blue-800 to-blue-900 text-white hover:from-blue-900 hover:to-blue-950' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  {editLoading ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-2" />
                      Updating Request...
                    </>
                  ) : (
                    <>
                      <FaEdit className="inline mr-2" />
                      Update Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
        
        {/* Main Content - Map Uniform View */}
        {activeView === 'mapUniform' && (
        <>
        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {mappingsLoading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading mappings...</div>
            ) : filteredMappings.length === 0 ? (
              <div className="py-12 text-center text-gray-500 font-semibold">No mappings found matching your filters.</div>
            ) : (
              <>
              <table className="w-full text-xs table-fixed border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-1 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '3%' }}>#</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '15%' }}>Project</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '25%' }}>Designations</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '25%' }}>Uniform Types</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Payable</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '12%' }}>Mapping Name</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Actions</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className={`px-1 py-1 sticky left-0 z-20 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={mapProjectFilter} 
                        onChange={e => setMapProjectFilter(e.target.value)} 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueMapProjects.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={mapDesignationFilter} 
                        onChange={e => setMapDesignationFilter(e.target.value)} 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueMapDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={mapPayableFilter} 
                        onChange={e => setMapPayableFilter(e.target.value as 'All' | 'payable' | 'non-payable')} 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="All">All</option>
                        <option value="payable">Payable</option>
                        <option value="non-payable">Non-Payable</option>
                      </select>
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={mapSearchFilter} 
                        onChange={e => setMapSearchFilter(e.target.value)} 
                        placeholder="Search..." 
                        className={`w-full border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {filteredMappings.map((m, idx) => (
                    <tr key={m._id} className={`${theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"} even:bg-gray-50 dark:even:bg-gray-900`}>
                      <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                      <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>
                        <div className="truncate" title={m.project}>{m.project}</div>
                      </td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="text-xs">
                          {m.designations.map((designation, index) => (
                            <div key={designation} className="truncate" title={designation}>
                              {index + 1}. {designation}
                            </div>
                          ))}
                          {m.employeeId && (
                            <div className="text-xs text-gray-500 mt-1">Employee: {m.employeeId}</div>
                          )}
                        </div>
                      </td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="text-xs">
                          {m.uniformTypes.map((type, index) => (
                            <div key={type} className="truncate" title={type}>
                              {index + 1}. {type}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                          m.payable === 'payable' 
                            ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                            : theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                        }`}>
                          {m.payable === 'payable' ? 'Payable' : 'Non-Payable'}
                        </span>
                      </td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="truncate" title={m.mappingName || ''}>{m.mappingName || ''}</div>
                      </td>
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => startEdit(m)}
                            title="Edit mapping"
                            className={`px-2 py-1 rounded font-semibold text-xs shadow transition focus:outline-none focus:ring-2 ${
                              theme === 'dark' 
                                ? 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-400' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400'
                            }`}
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleMapDelete(m._id)}
                            title="Delete mapping"
                            className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 font-semibold text-xs shadow transition focus:outline-none focus:ring-2 focus:ring-red-400"
                          >
                            <FaTrash />
                          </button>
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
        </>
        )}
        
        {/* Create Mapping Modal */}
        {showCreateMappingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                    <FaPlus /> Add Uniform Mapping
                  </h2>
                  <button
                    onClick={() => setShowCreateMappingModal(false)}
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form id="createMappingForm" onSubmit={handleMapAdd} className="space-y-6">
                  {/* Basic Information Table */}
                  <div className={`overflow-auto rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <table className="w-full text-sm">
                      <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Field</th>
                          <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Project *</td>
                          <td className="px-4 py-3">
                            <select
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-200 border-gray-600 focus:ring-blue-800' : 'bg-white text-blue-900 border-gray-300 focus:ring-blue-400'}`}
                              value={mapForm.project}
                              onChange={e => {
                                setMapForm(f => ({ ...f, project: e.target.value, designations: [], employeeId: '' }));
                                setSelectedEmployeeId('');
                              }}
                              required
                            >
                              <option value="">{projectLoading ? 'Loading projects...' : 'Select project...'}</option>
                              {projects.map((p: Project) => <option key={p._id} value={p.projectName}>{p.projectName}</option>)}
                            </select>
                            {projectError && <div className="text-red-500 text-xs mt-1">{projectError}</div>}
                          </td>
                        </tr>
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Payable Status</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="payable"
                                  checked={mapForm.payable === 'payable'}
                                  onChange={() => setMapForm(f => ({ ...f, payable: 'payable' }))}
                                  className="accent-green-600"
                                />
                                <span className={`font-semibold ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>Payable</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="payable"
                                  checked={mapForm.payable === 'non-payable'}
                                  onChange={() => setMapForm(f => ({ ...f, payable: 'non-payable' }))}
                                  className="accent-red-600"
                                />
                                <span className={`font-semibold ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Non-Payable</span>
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Mapping Name</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-200 border-gray-600 focus:ring-blue-800' : 'bg-white text-blue-900 border-gray-300 focus:ring-blue-400'}`}
                              value={mapForm.mappingName}
                              onChange={e => setMapForm(f => ({ ...f, mappingName: e.target.value }))}
                              placeholder="Auto-generated if empty"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</td>
                          <td className="px-4 py-3">
                            <textarea
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-200 border-gray-600 focus:ring-blue-800' : 'bg-white text-blue-900 border-gray-300 focus:ring-blue-400'}`}
                              value={mapForm.description}
                              onChange={e => setMapForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Optional description"
                              rows={2}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Designations Selection Table */}
                  <div className={`overflow-auto rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Designations *</h3>
                    </div>
                    <div className="p-4">
                      {!mapForm.project ? (
                        <div className={`border rounded-lg p-4 text-center ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          Select project first...
                        </div>
                      ) : designationOptions.length === 0 ? (
                        <div className={`border rounded-lg p-4 text-center ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          No designations available for this project
                        </div>
                      ) : (
                        <div className={`border rounded-lg ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                          <table className="w-full text-sm">
                            <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                              <tr>
                                <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select</th>
                                <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Designation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {designationOptions.map(designation => (
                                <tr key={designation}>
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={mapForm.designations.includes(designation)}
                                      onChange={(e) => handleDesignationChange(designation, e.target.checked)}
                                      className="accent-blue-600 w-4 h-4"
                                    />
                                  </td>
                                  <td className={`px-3 py-2 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>{designation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {mapForm.designations.length > 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                            Selected: {mapForm.designations.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uniform Types Selection Table */}
                  <div className={`overflow-auto rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Uniform Types *</h3>
                    </div>
                    <div className="p-4">
                      <div className={`border rounded-lg ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <table className="w-full text-sm">
                          <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                            <tr>
                              <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select</th>
                              <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Uniform Type</th>
                              <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Category</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {availableOptionsLoading ? (
                              <tr>
                                <td colSpan={3} className={`px-3 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Loading uniform types...
                                </td>
                              </tr>
                            ) : availableOptions?.uniformTypes && availableOptions.uniformTypes.length > 0 ? (
                              availableOptions.uniformTypes.map(uniformType => (
                                <tr key={uniformType.name}>
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={mapForm.uniformTypes.includes(uniformType.name)}
                                      onChange={(e) => handleUniformTypeChange(uniformType.name, e.target.checked)}
                                      className="accent-blue-600 w-4 h-4"
                                    />
                                  </td>
                                  <td className={`px-3 py-2 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>{uniformType.name}</td>
                                  <td className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{uniformType.category || '-'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className={`px-3 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  No uniform types available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {mapForm.uniformTypes.length > 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                            Selected: {mapForm.uniformTypes.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {mapError && (
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                        {mapError}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateMappingModal(false)}
                    className={`px-6 py-3 rounded-xl font-semibold transition ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="createMappingForm"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition"
                  >
                    Add Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Mapping Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                    <FaEdit /> Edit Mapping
                  </h2>
                  <button
                    onClick={cancelEdit}
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form id="editMappingForm" onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-6">
                  {/* Basic Information Table */}
                  <div className={`overflow-auto rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <table className="w-full text-sm">
                      <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Field</th>
                          <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Project *</td>
                          <td className="px-4 py-3">
                            <select
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-200 border-gray-600 focus:ring-blue-800' : 'bg-white text-blue-900 border-gray-300 focus:ring-blue-400'}`}
                              value={editModalForm.project}
                              onChange={e => setEditModalForm(f => ({ ...f, project: e.target.value, designations: [] }))}
                              required
                            >
                              <option value="">Select project...</option>
                              {projects.map((p: Project) => <option key={p._id} value={p.projectName}>{p.projectName}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Payable Status</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="editPayable"
                                  checked={editModalForm.payable === 'payable'}
                                  onChange={() => setEditModalForm(f => ({ ...f, payable: 'payable' }))}
                                  className="accent-green-600"
                                />
                                <span className={`font-semibold ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>Payable</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="editPayable"
                                  checked={editModalForm.payable === 'non-payable'}
                                  onChange={() => setEditModalForm(f => ({ ...f, payable: 'non-payable' }))}
                                  className="accent-red-600"
                                />
                                <span className={`font-semibold ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Non-Payable</span>
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Mapping Name</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-200 border-gray-600 focus:ring-blue-800' : 'bg-white text-blue-900 border-gray-300 focus:ring-blue-400'}`}
                              value={editModalForm.mappingName}
                              onChange={e => setEditModalForm(f => ({ ...f, mappingName: e.target.value }))}
                              placeholder="Auto-generated if empty"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</td>
                          <td className="px-4 py-3">
                            <textarea
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-200 border-gray-600 focus:ring-blue-800' : 'bg-white text-blue-900 border-gray-300 focus:ring-blue-400'}`}
                              value={editModalForm.description}
                              onChange={e => setEditModalForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Optional description"
                              rows={2}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Designations Selection Table */}
                  <div className={`overflow-auto rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Designations *</h3>
                        {designationOptions.length > 5 && (
                          <div className="relative w-64">
                            <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                            <input
                              type="text"
                              placeholder="Search designations..."
                              value={editDesignationSearch}
                              onChange={e => setEditDesignationSearch(e.target.value)}
                              className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-black"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      {!editModalForm.project ? (
                        <div className={`border rounded-lg p-4 text-center ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          Select project first...
                        </div>
                      ) : designationOptions.length === 0 ? (
                        <div className={`border rounded-lg p-4 text-center ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          No designations available for this project
                        </div>
                      ) : (
                        <div className={`border rounded-lg ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                          <table className="w-full text-sm">
                            <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                              <tr>
                                <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select</th>
                                <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Designation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredEditDesignations.length === 0 ? (
                                <tr>
                                  <td colSpan={2} className={`px-3 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    No designations found matching &quot;{editDesignationSearch}&quot;
                                  </td>
                                </tr>
                              ) : (
                                filteredEditDesignations.map(designation => (
                                  <tr key={designation}>
                                    <td className="px-3 py-2">
                                      <input
                                        type="checkbox"
                                        checked={editModalForm.designations.includes(designation)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setEditModalForm(prev => ({ ...prev, designations: [...prev.designations, designation] }));
                                          } else {
                                            setEditModalForm(prev => ({ ...prev, designations: prev.designations.filter(d => d !== designation) }));
                                          }
                                        }}
                                        className="accent-blue-600 w-4 h-4"
                                      />
                                    </td>
                                    <td className={`px-3 py-2 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>{designation}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {editModalForm.designations.length > 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                            Selected: {editModalForm.designations.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uniform Types Selection Table */}
                  <div className={`overflow-auto rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Uniform Types *</h3>
                        {availableOptions?.uniformTypes && availableOptions.uniformTypes.length > 5 && (
                          <div className="relative w-64">
                            <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                            <input
                              type="text"
                              placeholder="Search uniform types..."
                              value={editUniformTypeSearch}
                              onChange={e => setEditUniformTypeSearch(e.target.value)}
                              className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-black"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className={`border rounded-lg ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <table className="w-full text-sm">
                          <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                            <tr>
                              <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select</th>
                              <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Uniform Type</th>
                              <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Category</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredEditUniformTypes.length === 0 ? (
                              <tr>
                                <td colSpan={3} className={`px-3 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {editUniformTypeSearch ? `No uniform types found matching "${editUniformTypeSearch}"` : 'No uniform types available'}
                                </td>
                              </tr>
                            ) : (
                              filteredEditUniformTypes.map(uniformType => (
                                <tr key={uniformType.name}>
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={editModalForm.uniformTypes.includes(uniformType.name)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditModalForm(prev => ({ ...prev, uniformTypes: [...prev.uniformTypes, uniformType.name] }));
                                        } else {
                                          setEditModalForm(prev => ({ ...prev, uniformTypes: prev.uniformTypes.filter(t => t !== uniformType.name) }));
                                        }
                                      }}
                                      className="accent-blue-600 w-4 h-4"
                                    />
                                  </td>
                                  <td className={`px-3 py-2 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>{uniformType.name}</td>
                                  <td className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{uniformType.category || '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {editModalForm.uniformTypes.length > 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                            Selected: {editModalForm.uniformTypes.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {mapError && (
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                        {mapError}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className={`px-6 py-3 rounded-xl font-semibold transition ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="editMappingForm"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </CoordinatorDashboardLayout>
  );
}