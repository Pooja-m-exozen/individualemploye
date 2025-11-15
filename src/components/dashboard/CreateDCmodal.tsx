"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FaStore, FaCheckCircle, FaInfoCircle, FaTimes, FaPlus, FaExclamationTriangle, FaBoxOpen, FaUpload, FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaEye } from "react-icons/fa";
import { showToast } from "@/components/Toast";

// TypeScript types from the original file
interface DCItem {
  employeeId: string;
  itemCode: string;
  name: string;
  price: string;
  remarks: string;
  itemId: string;
  quantity: number;
  size: string;
  designation?: string;
  uniformType?: string | string[];
  projectName?: string;
  approvalStatus?: string;
  issuedStatus?: string;
  requestDate?: string;
  individualEmployeeData?: {
    employeeId: string;
    fullName: string;
    designation: string;
    uniformType: string | string[];
    size: Record<string, string>;
    qty: number;
    projectName: string;
  };
  _id: string;
}

interface DC {
  _id: string;
  customer: string;
  projectName?: string;
  dcNumber: string;
  dcDate: string;
  remarks: string;
  items: DCItem[];
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
  }>;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface UniformApiResponse {
  success: boolean;
  message: string;
  uniforms: Array<{
    id: string;
    itemId: unknown;
    items: unknown;
    _id: string;
    employeeId: string;
    fullName: string;
    designation: string;
    gender: string;
    projectName: string;
    uniformType: string | string[];
    size: Record<string, string>;
    qty: number;
    setCount: number;
    uniformRequested: boolean;
    approvalStatus: string;
    issuedStatus: string;
    remarks: string;
    requestDate: string;
    type: string[];
    dcNumber?: string; // DC number if a DC has been created for this request
  }>;
}

interface InventoryItem {
  _id: string;
  itemCode: string;
  category: string;
  subCategory: string;
  name: string;
  sizes: string[];
  sizeInventory: Array<{
    size: string;
    quantity: number;
    unit: string;
    price: string;
    openingBalance: number;
    _id: string;
  }>;
  description: string;
  notes: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface CreateDCModalProps {
  onClose: () => void;
  theme: string;
  setDcData: React.Dispatch<React.SetStateAction<DC[]>>;
  dcData: DC[];
  refreshDCData: () => Promise<void>;
  dcType?: 'nrdc' | 'rdc'; // Updated to support DC types
}

export default function CreateDCModal({ onClose, theme, setDcData, dcData, refreshDCData, dcType = 'nrdc' }: CreateDCModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _refreshDCData = refreshDCData;
  // Prefilled for quick testing
  const [customer, setCustomer] = useState('');
  const [dcNumber, setDcNumber] = useState('');
  const [dcDate, setDcDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [address, setAddress] = useState('');
  const [projectList, setProjectList] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [uniformRequests, setUniformRequests] = useState<UniformApiResponse['uniforms']>([]);
  const [selectedRequests, setSelectedRequests] = useState<UniformApiResponse['uniforms']>([]);
  const [loading, setLoading] = useState(false);
  const [saveDCError, setSaveDCError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState<{[k: string]: boolean}>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, Record<string, string>>>({}); // { [requestId]: { [type]: size } }
  
  // File upload states
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // File upload helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FaFileImage className="text-green-500" />;
    if (fileType.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FaFileWord className="text-blue-500" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FaFileExcel className="text-green-600" />;
    return <FaFileImage className="text-gray-500" />;
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showToast({ message: `File ${file.name} is too large. Maximum size is 10MB.`, type: "error" });
        continue;
      }

      // Validate file type
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv/;
      const extname = allowedTypes.test(file.name.toLowerCase());
      if (!extname) {
        showToast({ message: `File ${file.name} is not a supported file type.`, type: "error" });
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      setAttachments(prev => [...prev, ...newFiles]);
      showToast({ message: `${newFiles.length} file(s) added successfully!`, type: "success" });
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    showToast({ message: "File removed successfully!", type: "success" });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  // Only match inventory item by name, not subCategory
  const findInventoryItemByType = (type: string) => {
    const typeLower = type.trim().toLowerCase();
    // Only match by name
    const exactMatches = inventoryItems.filter((item: InventoryItem) => {
      return item.name.toLowerCase() === typeLower;
    });
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }
    // Partial match by name only
    const partialMatches = inventoryItems.filter((item: InventoryItem) => {
      return item.name.toLowerCase().includes(typeLower) || typeLower.includes(item.name.toLowerCase());
    });
    return partialMatches[0];
  };



  // Stepper icons

  // Step validation
  const isStep1Valid = selectedProject !== '';
  const isStep2Valid = selectedRequests.length > 0;
  
  // Note: Size selection is now optional, so we don't need to validate all sizes are selected
  
  // Modified: Remove size validation requirement - only check basic DC fields
  const isStep3Valid = customer.trim() && dcNumber.trim() && dcDate.trim();

  useEffect(() => {
    const fetchUniformData = async () => {
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        const data: UniformApiResponse = await res.json();
        if (data.success) {
          const uniqueProjects = Array.from(new Set(data.uniforms.map(u => u.projectName)));
          console.log('Available projects from API:', uniqueProjects);
          // Filter out generic project names
          const validProjects = uniqueProjects.filter(project => 
            project && 
            project.trim() !== "" && 
            project !== "General" && 
            project !== "N/A" && 
            !project.toLowerCase().includes("general")
          );
          console.log('Filtered valid projects:', validProjects);
          setProjectList(validProjects);
          
          // Warn if no valid projects found
          if (validProjects.length === 0) {
            console.warn('No valid projects found. All projects seem to have generic names.');
          }
        }
      } catch {
        // setError("Failed to fetch projects");
      }
    };
    fetchUniformData();
  }, []);

  // Store all uniforms data for checking pending requests
  const [allUniformsData, setAllUniformsData] = useState<UniformApiResponse | null>(null);

  // Filter uniform requests when project is selected
  useEffect(() => {
    const fetchUniformRequests = async () => {
      setLoading(true);
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        const data: UniformApiResponse = await res.json();
        setAllUniformsData(data); // Store for checking pending requests
        
        // Debug: Log the entire API response structure
        console.log('=== RAW API RESPONSE ===');
        console.log('API Success:', data.success);
        console.log('Full API response:', JSON.stringify(data, null, 2));
        
        if (data.success && data.uniforms) {
          console.log('Total uniforms in response:', data.uniforms.length);
          console.log('Sample uniform request (first item):', data.uniforms[0]);
          
          // Check what fields are actually present
          if (data.uniforms.length > 0) {
            console.log('Available fields in uniform request:', Object.keys(data.uniforms[0]));
          }
          
          // PRIMARY FILTER: Only show employees that do NOT have a DC number
          // This is the main requirement - show only employees without DC numbers to generate DC
          const filteredRequests = data.uniforms.filter(req => {
            // PRIMARY CHECK: Must NOT have a DC number
            // Check if dcNumber exists and is a valid value (not null, undefined, empty, "N/A", "null", "undefined")
            const dcNumber = req.dcNumber ? String(req.dcNumber).trim() : '';
            const hasDCNumber = dcNumber !== '' && 
                              dcNumber.toLowerCase() !== 'n/a' && 
                              dcNumber !== 'null' && 
                              dcNumber !== 'undefined';
            
            // EXCLUDE if has DC number - this is the primary filter
            if (hasDCNumber) {
              console.log(`❌ Excluding: ${req.fullName} (${req.employeeId}) - Set Count ${req.setCount} - has dcNumber: "${dcNumber}"`);
              return false;
            }
            
            // Basic project and approval filters
            const projectMatch = req.projectName === selectedProject && 
                   req.projectName !== "General" &&
                   req.projectName !== "N/A" &&
                   !req.projectName.toLowerCase().includes("general");
            
            if (!projectMatch) return false;
            
            // Must be approved
            if (req.approvalStatus !== 'Approved') return false;
            
            // Check issuedStatus - exclude if already issued (secondary check)
            // Handle case-insensitive comparison and null/undefined values
            const issuedStatus = String(req.issuedStatus || '').trim();
            if (issuedStatus.toLowerCase() === 'issued') {
              console.log(`❌ Excluding: ${req.fullName} (${req.employeeId}) - Set Count ${req.setCount} - issuedStatus is "Issued"`);
              return false;
            }
            
            // Log what's being included for debugging
            console.log(`✅ Including: ${req.fullName} (${req.employeeId}) - Set Count ${req.setCount} - No DC Number, issuedStatus: "${issuedStatus}"`);
            
            // Return true if all filters pass (no DC number, approved, not issued, valid project)
            return true;
          });

          // Debug logging to understand the data structure
          console.log('=== FILTERING UNIFORM REQUESTS ===');
          console.log('Selected project:', selectedProject);
          
          // Log the raw API response for the specific employee to verify data
          const efms3184Requests = data.uniforms.filter(req => req.employeeId === 'EFMS3184' && req.projectName === selectedProject);
          if (efms3184Requests.length > 0) {
            console.log('🔍 EFMS3184 requests from API:', efms3184Requests.map(req => ({
              setCount: req.setCount,
              issuedStatus: req.issuedStatus,
              dcNumber: req.dcNumber || 'N/A',
              approvalStatus: req.approvalStatus,
              _id: req._id
            })));
          }
          
          const allProjectRequests = data.uniforms.filter(req => req.projectName === selectedProject);
          console.log('All requests for project:', allProjectRequests.length);
          
          // Log all requests with their statuses for debugging - including setCount and dcNumber
          console.log('All project requests with statuses:', allProjectRequests.map(req => {
            const hasDCNumber = req.dcNumber && req.dcNumber.trim() !== '' && req.dcNumber !== 'N/A';
            const willShow = req.projectName === selectedProject && 
                     req.approvalStatus === 'Approved' &&
                     req.issuedStatus !== 'Issued' &&
                     !hasDCNumber &&
                     req.projectName !== "General" &&
                     req.projectName !== "N/A" &&
                     !req.projectName.toLowerCase().includes("general");
            return {
              name: req.fullName,
              employeeId: req.employeeId,
              setCount: req.setCount,
              requestId: req._id,
              approvalStatus: req.approvalStatus,
              issuedStatus: req.issuedStatus,
              dcNumber: req.dcNumber || 'N/A',
              hasDCNumber: hasDCNumber,
              requestDate: req.requestDate,
              willShow: willShow,
              excludedReason: !willShow ? (
                req.approvalStatus !== 'Approved' ? 'Not Approved' :
                req.issuedStatus === 'Issued' ? 'Already Issued' :
                hasDCNumber ? `Has DC Number: ${req.dcNumber}` :
                'Other filter'
              ) : null
            };
          }));
          
          // Check which requests are already issued (by issuedStatus, not by employee)
          const issuedRequests = allProjectRequests.filter(req => req.issuedStatus === 'Issued');
          console.log('Already issued requests (filtered out):', issuedRequests.length);
          console.log('Issued request details:', issuedRequests.map(req => ({ 
            name: req.fullName,
            employeeId: req.employeeId,
            setCount: req.setCount,
            issuedStatus: req.issuedStatus,
            approvalStatus: req.approvalStatus,
            dcNumber: req.dcNumber || 'N/A'
          })));
          
          // Check which requests have dcNumber but issuedStatus is not "Issued" (backend issue)
          const requestsWithDCButNotIssued = allProjectRequests.filter(req => {
            const hasDCNumber = req.dcNumber && req.dcNumber.trim() !== '' && req.dcNumber !== 'N/A';
            return hasDCNumber && req.issuedStatus !== 'Issued';
          });
          if (requestsWithDCButNotIssued.length > 0) {
            console.warn('⚠️ Backend issue: Requests with DC Number but issuedStatus is not "Issued":', requestsWithDCButNotIssued.length);
            console.log('Requests with DC but not marked as Issued:', requestsWithDCButNotIssued.map(req => ({
              name: req.fullName,
              employeeId: req.employeeId,
              setCount: req.setCount,
              dcNumber: req.dcNumber,
              issuedStatus: req.issuedStatus,
              approvalStatus: req.approvalStatus
            })));
          }
          
          // Check which requests are pending approval
          const pendingRequests = allProjectRequests.filter(req => req.approvalStatus === 'Pending');
          console.log('Pending approval requests (filtered out):', pendingRequests.length);
          console.log('Pending request details:', pendingRequests.map(req => ({ 
            name: req.fullName,
            employeeId: req.employeeId,
            setCount: req.setCount,
            approvalStatus: req.approvalStatus,
            issuedStatus: req.issuedStatus
          })));
          
          // Filter based on issuedStatus only - each uniform request (setCount) is tracked separately
          // This allows Set 2 to show even if Set 1 has been issued
          const filteredByDC = allProjectRequests.filter(req => 
            req.projectName === selectedProject && 
            req.approvalStatus === 'Approved' &&
            req.issuedStatus !== 'Issued'
          );
          console.log('Filtered by issuedStatus check:', filteredByDC.length);
          console.log('Available requests (not issued):', filteredByDC.map(req => ({ 
            name: req.fullName, 
            employeeId: req.employeeId,
            setCount: req.setCount,
            issuedStatus: req.issuedStatus
          })));
          
          console.log('Final available requests:', filteredRequests.length);
          console.log('Filtered requests details:', filteredRequests.map(req => ({ 
            name: req.fullName, 
            employeeId: req.employeeId, 
            requestId: req._id,
            uniformTypes: req.uniformType,
            qty: req.qty,
            setCount: req.setCount,
            issuedStatus: req.issuedStatus,
            approvalStatus: req.approvalStatus,
            dcNumber: req.dcNumber || 'N/A'
          })));

          setUniformRequests(filteredRequests);
        }
      } catch {
        // setError("Failed to fetch uniform requests");
      } finally {
        setLoading(false);
      }
    };

    if (selectedProject) {
      fetchUniformRequests();
    }
  }, [selectedProject, dcData]);

  // Set customer to employee names when uniform requests are selected
  useEffect(() => {
    if (selectedRequests.length > 0) {
      const names = selectedRequests.map(req => req.fullName).join(", ");
      setCustomer(names);
    }
  }, [selectedRequests]);

  // Always enabled, always sends the required payload
  const handleCreateDC = async () => {
    if (selectedRequests.length === 0) {
      setSaveDCError("Please select at least one uniform request.");
      return;
    }

    // Validate project selection
    if (!selectedProject || selectedProject.trim() === "") {
      setSaveDCError("Please select a project first.");
      return;
    }

    // Ensure project name is not generic
    if (selectedProject === "General" || selectedProject === "N/A" || selectedProject.toLowerCase().includes("general")) {
      setSaveDCError("Please select a specific project, not a generic one.");
      return;
    }
    try {
      // Create items array from selected requests with size modification tracking
      const items = selectedRequests.flatMap(selectedRequest => {
        if (!Array.isArray(selectedRequest.uniformType)) return [];
        return selectedRequest.uniformType.map(type => {
          const inventoryItem = findInventoryItemByType(type);
          const originalSize = selectedRequest.size && selectedRequest.size[type] ? selectedRequest.size[type] : '';
          const selectedSize = selectedSizes[selectedRequest._id]?.[type] || originalSize || 'General'; // Default to 'General' if no size selected
          const isModified = selectedSize !== originalSize && originalSize !== '';
          
          // Create size data with modification tracking
          const sizeData = {
            current: selectedSize,
            original: originalSize,
            modified: isModified,
            modificationNote: isModified ? `Changed from ${originalSize} to ${selectedSize}` : null
          };
          
          return {
            id: selectedRequest._id,
            employeeId: selectedRequest.employeeId,
            itemCode: inventoryItem?.itemCode || "",
            name: type, // This is the uniform type (e.g., "Security blue shirt", "Light Blue Executive Shirt")
            size: selectedSize, // Use the selected size for the main size field
            sizeData: JSON.stringify(sizeData), // Store detailed size information
            quantity: selectedRequest.qty || 1,
            price: "", // Add price if available
            remarks: selectedRequest.remarks || (isModified ? `Size modified: ${originalSize} → ${selectedSize}` : "") || (selectedSize === 'General' ? 'Size: General (default)' : '')
          };
        });
      });

      // Create payload with modified sizes properly stored and employee details
      const payload = {
        customer: selectedProject, // Use actual project name as customer
        projectName: selectedProject, // Store project name in dedicated field
        dcNumber,
        dcDate,
        remarks,
        address,
        items: items.map(item => {
          // Find the original uniform request to get employee details
          const originalRequest = selectedRequests.find(req => req._id === item.id);
          
          // Find the inventory item to get the correct itemId
          const inventoryItem = findInventoryItemByType(item.name);
          
          return {
            itemId: inventoryItem?._id || item.id, // Use inventory item ID as required by API
            employeeId: item.employeeId,
            itemCode: item.itemCode,
            name: item.name,
            size: item.size, // This will be the modified size
            quantity: item.quantity,
            price: item.price,
            remarks: item.remarks,
            // Store employee details for PDF generation
            designation: originalRequest?.designation || "Employee",
            uniformType: item.name, // API expects string, not array
            // Store modification info in remarks if size was modified or default size used
            ...(item.sizeData && JSON.parse(item.sizeData).modified && {
              remarks: `${item.remarks || ''} [Modified from ${JSON.parse(item.sizeData).original} to ${item.size}]`
            }),
            ...(item.size === 'General' && !item.sizeData && {
              remarks: `${item.remarks || ''} [Default size: General]`
            }),
            // Store individual employee data for easy access
            individualEmployeeData: {
              employeeId: item.employeeId,
              fullName: originalRequest?.fullName || "Unknown",
              designation: originalRequest?.designation || "Employee",
              uniformType: originalRequest?.uniformType || [item.name],
              size: { [item.name]: item.size },
              qty: item.quantity,
              projectName: selectedProject
            }
          };
        })
      };

      // Log the payload for debugging
      console.log('DC Payload being sent:', payload);
      console.log('Selected Project:', selectedProject);
      console.log('Customer field:', payload.customer);
      console.log('Address field:', payload.address);
      console.log('Items count:', payload.items.length);
      console.log('Items details:', payload.items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        employeeId: item.employeeId,
        size: item.size,
        quantity: item.quantity
      })));

      // Validate that all items have valid itemId
      const invalidItems = payload.items.filter(item => !item.itemId);
      if (invalidItems.length > 0) {
        setSaveDCError(`Missing item IDs for: ${invalidItems.map(item => item.name).join(', ')}. Please ensure all uniform types match inventory items.`);
        return;
      }

      // Final validation - show user what will be sent
      if (payload.customer === "General" || payload.customer === "N/A" || !payload.customer.trim()) {
        setSaveDCError(`Invalid customer name: "${payload.customer}". Please select a valid project.`);
        return;
      }

      // Confirm with user what will be sent
      const confirmMessage = `DC will be created with:\nCustomer: ${payload.customer}\nAddress: ${payload.address}\nItems: ${payload.items.length}\n\nProceed?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      // Check if we have attachments to decide between JSON and FormData
      let res: Response;
      
      if (attachments.length > 0) {
        // Use FormData when we have file attachments
        const formData = new FormData();
        
        // Add DC data as individual fields
        formData.append('customer', payload.customer);
        formData.append('dcNumber', payload.dcNumber);
        formData.append('dcDate', payload.dcDate);
        formData.append('address', payload.address);
        formData.append('remarks', payload.remarks);
        
        // Add items as individual entries - the API expects an array
        payload.items.forEach((item, index) => {
          formData.append(`items[${index}][itemId]`, item.itemId);
          formData.append(`items[${index}][employeeId]`, item.employeeId);
          formData.append(`items[${index}][itemCode]`, item.itemCode);
          formData.append(`items[${index}][name]`, item.name);
          formData.append(`items[${index}][size]`, item.size);
          formData.append(`items[${index}][quantity]`, item.quantity.toString());
          formData.append(`items[${index}][price]`, item.price);
          formData.append(`items[${index}][remarks]`, item.remarks);
          formData.append(`items[${index}][designation]`, item.designation || '');
          formData.append(`items[${index}][uniformType]`, item.uniformType);
        });
        
        // Add attachments
        attachments.forEach(file => {
          formData.append('attachments', file);
        });

        // Create the DC with attachments using FormData
        res = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Use JSON when no file attachments
        res = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      // Log the response for debugging
      console.log('API Response Status:', res.status);
      console.log('API Response Data:', data);

      // Check both response status and success flag
      // Also check if data exists and has the expected structure
      if (res.ok && data && data.success === true) {
        // Now call the issue API to update the backend
        try {
          // Filter items to only include those with sufficient stock
          const validItems = items.filter(item => {
            const inventoryItem = findInventoryItemByType(item.name);
            if (!inventoryItem) {
              console.warn(`No inventory item found for: ${item.name}`);
              return false;
            }
            
            // Check if the requested size exists and has sufficient stock
            const sizeInventory = inventoryItem.sizeInventory.find(si => si.size === item.size);
            if (!sizeInventory) {
              console.warn(`Size ${item.size} not found in inventory for ${item.name}`);
              return false;
            }
            
            if (sizeInventory.quantity < 1) {
              console.warn(`Insufficient stock for ${item.name} (Size ${item.size}). Available: ${sizeInventory.quantity}`);
              return false;
            }
            
            return true;
          });

          const issuePayload = {
            issueTo: customer,
            department: selectedProject || "General",
            purpose: "Uniform Distribution",
            address: address || "N/A",
            items: validItems.map(item => {
              // Find the inventory item to get the correct item ID
              const inventoryItem = findInventoryItemByType(item.name);
              return {
                id: inventoryItem?._id || item.id, // Use inventory item ID if available, fallback to request ID
                quantity: 1, // Each item gets 1 piece (standard uniform distribution)
                size: item.size,
                employeeId: item.employeeId
              };
            })
          };

          console.log('Original items:', items);
          console.log('Valid items after stock check:', validItems);
          console.log('Issue API payload:', issuePayload);
          
          const issueRes = await fetch('https://inventory.zenapi.co.in/api/inventory/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issuePayload),
          });

          if (issueRes.ok) {
            const issueData = await issueRes.json();
            console.log('Issue API response:', issueData);
          } else {
            const errorData = await issueRes.json().catch(() => ({}));
            console.warn('Issue API failed:', issueRes.status, issueRes.statusText, errorData);
          }
        } catch (issueError) {
          console.error('Error calling issue API:', issueError);
          // Don't fail the DC creation if issue API fails
        }
        // Create enhanced DC data with size modification tracking
        const enhancedItems = items.map(item => {
          // Parse size data if it exists
          let sizeModificationData = null;
          try {
            if (item.sizeData) {
              sizeModificationData = JSON.parse(item.sizeData);
            }
          } catch (error) {
            console.error('Error parsing size data:', error);
          }
          
          return {
            itemId: item.id,
            employeeId: item.employeeId,
            itemCode: item.itemCode,
            name: item.name,
            size: item.size,
            sizeData: item.sizeData, // Include size modification data
            sizeModificationData: sizeModificationData, // Parsed size data for easy access
            quantity: item.quantity,
            price: item.price,
            remarks: item.remarks,
            _id: item.id,
          };
        });
        
        // Add the new DC to the list immediately
        setDcData(prev => [
          {
            _id: data.dcId,
            customer: payload.customer,
            dcNumber: payload.dcNumber,
            dcDate: payload.dcDate,
            remarks: payload.remarks,
            projectName: selectedProject,
            items: enhancedItems,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0,
          },
          ...prev,
        ]);
        
        // Also refresh the DC data to ensure consistency
        await refreshDCData();
        
        // Update uniform requests with DC number and set status to "Issued"
        try {
          console.log('Updating uniform requests with DC number:', payload.dcNumber);
          
          // Get unique employee IDs from selected requests
          const uniqueEmployeeIds = Array.from(new Set(selectedRequests.map(req => req.employeeId)));
          
          // Update each uniform request with DC number and issued status
          const updatePromises = selectedRequests.map(async (request) => {
            try {
              // Update the uniform request with DC number and issued status
              const updatePayload = {
                dcNumber: payload.dcNumber,
                issuedStatus: 'Issued'
              };
              
              console.log(`Updating uniform request for employee ${request.employeeId} with DC number: ${payload.dcNumber}`);
              
              const updateRes = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${request.employeeId}/update-dc`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  requestId: request._id,
                  dcNumber: payload.dcNumber,
                  issuedStatus: 'Issued'
                })
              });
              
              if (updateRes.ok) {
                const updateData = await updateRes.json();
                console.log(`Successfully updated uniform request for ${request.employeeId}:`, updateData);
                return { success: true, employeeId: request.employeeId };
              } else {
                const errorData = await updateRes.json().catch(() => ({}));
                console.warn(`Failed to update uniform request for ${request.employeeId}:`, updateRes.status, errorData);
                
                // Try alternative endpoint if the first one fails
                try {
                  const altRes = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${request.employeeId}/edit`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      dcNumber: payload.dcNumber,
                      issuedStatus: 'Issued'
                    })
                  });
                  
                  if (altRes.ok) {
                    const altData = await altRes.json();
                    console.log(`Successfully updated via alternative endpoint for ${request.employeeId}:`, altData);
                    return { success: true, employeeId: request.employeeId };
                  }
                } catch (altError) {
                  console.error(`Alternative update also failed for ${request.employeeId}:`, altError);
                }
                
                return { success: false, employeeId: request.employeeId };
              }
            } catch (error) {
              console.error(`Error updating uniform request for ${request.employeeId}:`, error);
              return { success: false, employeeId: request.employeeId, error };
            }
          });
          
          const updateResults = await Promise.all(updatePromises);
          const successful = updateResults.filter(r => r.success).length;
          const failed = updateResults.filter(r => !r.success).length;
          
          console.log(`Uniform request updates: ${successful} successful, ${failed} failed`);
          
          if (failed > 0) {
            console.warn(`Some uniform requests could not be updated. This may require manual update.`);
          }
        } catch (error) {
          console.error('Error updating uniform requests with DC number:', error);
          // Don't fail the DC creation if uniform request update fails
        }
        
        // Refresh uniform requests to get updated issuedStatus from backend
        // This ensures that requests with newly created DCs are marked as 'Issued'
        try {
          const uniformRes = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
          if (uniformRes.ok) {
            await uniformRes.json();
            // The uniform requests will now have updated issuedStatus
            // The useEffect will automatically filter them out on next render
            console.log('Refreshed uniform requests after DC creation');
          }
        } catch (error) {
          console.error('Error refreshing uniform requests:', error);
        }
        
        setSaveDCError(null);
        onClose();
      } else {
        // Handle different error scenarios
        if (!res.ok) {
          if (res.status === 400) {
            // Handle validation errors
            if (data.errors && Array.isArray(data.errors)) {
              const errorMessages = data.errors.map((error: { path: string; msg: string }) => 
                `${error.path}: ${error.msg}`
              ).join(', ');
              setSaveDCError(`Validation Error: ${errorMessages}`);
            } else if (data.message) {
              setSaveDCError(`Bad Request: ${data.message}`);
            } else {
              setSaveDCError('Bad Request: Invalid data provided. Please check your input and try again.');
            }
          } else if (res.status === 500) {
            setSaveDCError('Server Error: Please try again later or contact support.');
          } else {
            setSaveDCError(`Request failed with status ${res.status}: ${data.message || 'Unknown error'}`);
          }
        } else if (!data.success) {
          // API returned success status but with success: false
          setSaveDCError(data.message || 'Failed to create DC. Please try again.');
        } else {
          setSaveDCError(data.message || 'Failed to save Outward DC');
        }
      }
    } catch (err: unknown) {
      setSaveDCError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Fetch inventory items on mount
  useEffect(() => {
    fetch("https://inventory.zenapi.co.in/api/inventory/items")
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          setInventoryItems(data);
        } else if (data && data.items && Array.isArray(data.items)) {
          setInventoryItems(data.items);
        }
      })
      .catch(error => {
        console.error('Error fetching inventory items:', error);
      });
  }, []);

  // Enhanced size change handler without notifications
  const handleSizeChange = (requestId: string, type: string, size: string) => {
    setSelectedSizes((prev: typeof selectedSizes) => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [type]: size
      }
    }));
  };



  // Enhanced step validation with size change tracking

  // Accessibility: trap focus
  const modalRef = React.useRef<HTMLDivElement>(null);
  const announceRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const modal = modalRef.current;
    if (!modal) return;
    const firstFocusable = modal.querySelectorAll(focusableElements)[0] as HTMLElement;
    const focusable = modal.querySelectorAll(focusableElements);
    const lastFocusable = focusable[focusable.length - 1] as HTMLElement;
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    modal.addEventListener('keydown', handleTab);
    window.addEventListener('keydown', handleEsc);
    firstFocusable?.focus();
    return () => {
      modal.removeEventListener('keydown', handleTab);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Animation state
  const [show, setShow] = useState(false);

  // Animate modal open
  useEffect(() => { setShow(true); }, []);

  // Scroll to top on step change
  useEffect(() => {
    if (modalRef.current) modalRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Close modal directly without confirmation
  const handleRequestClose = () => {
    onClose();
  };

  // Success animation - only show if success is true AND no error
  const successAnimation = success && !saveDCError && (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className="rounded-full bg-green-100 p-6 mb-4">
        <FaCheckCircle className="w-16 h-16 text-green-600 animate-bounce" />
      </div>
      <div className="text-2xl font-bold text-green-700 mb-2">{dcType.toUpperCase()} Created!</div>
      <div className="text-gray-600 mb-6">
        Your {dcType.toUpperCase()} has been successfully created.
        {attachments.length > 0 && (
          <div className="text-sm mt-2 text-blue-600">
            📎 {attachments.length} file(s) attached successfully
          </div>
        )}
      </div>
      <button
        className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        onClick={() => { setSuccess(false); setStep(1); setSelectedProject(''); setSelectedRequests([]); setCustomer(''); setDcNumber(''); setRemarks(''); setAttachments([]); }}
      >Create Another</button>
      <button
        className="mt-4 underline text-blue-600 text-sm"
        onClick={onClose}
      >Close</button>
    </div>
  );

  // Save handler with loading and success
  const handleCreateDCWithUX = async () => {
    setTouched({ customer: true, dcNumber: true, dcDate: true });
    if (!isStep3Valid) return;
    
    // Duplicate DC number check
    const dcNumberTrimmed = dcNumber.trim().toLowerCase();
    const duplicate = dcData.some((dc: DC) => dc.dcNumber.trim().toLowerCase() === dcNumberTrimmed);
    if (duplicate) {
      showToast({ message: "DC Number already exists. Please use a unique DC Number.", type: "error" });
      return;
    }
    
    setSaving(true);
    setSaveDCError(null); // Clear any previous errors
    await handleCreateDC();
    setSaving(false);
    
    // Only show success if there's no error
    if (!saveDCError) {
      setSuccess(true);
      showToast({ 
        message: `${dcType.toUpperCase()} created successfully!`, 
        type: "success" 
      });
    } else {
      // Show error toast and don't show success
      showToast({ 
        message: saveDCError, 
        type: "error" 
      });
      // Ensure success state is false when there's an error
      setSuccess(false);
    }
  };

  // Auto-generate DC number
  function handleAutoGenerateDCNumber() {
    const random = Math.floor(100000 + Math.random() * 900000);
    setDcNumber(`DC${random}`);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md transition-all duration-500 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-modal="true"
      role="dialog"
      aria-label={`Create ${dcType.toUpperCase()} Modal`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose();
        }
      }}
    >
      <div
        ref={modalRef}
        // Reduced width and height
        className={`relative rounded-2xl shadow-2xl border-2 max-w-2xl w-full flex flex-col overflow-y-auto max-h-[80vh] transition-all duration-500 ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'} ${theme === "dark" ? "bg-gradient-to-br from-[#1a2332] via-[#181f2a] to-[#1a2332] border-blue-900/50" : "bg-gradient-to-br from-white via-gray-50 to-white border-blue-200"}`}
        tabIndex={-1}
      >
        {/* Enhanced Brand accent with animation */}
        <div className={`absolute left-0 top-0 w-full h-3 rounded-t-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-pulse`}></div>
        
        {/* Enhanced Modal Header */}
        <div className={`p-6 border-b sticky top-0 z-10 backdrop-blur-sm ${theme === "dark" ? "bg-[#181f2a]/90 border-blue-900/50" : "bg-white/90 border-blue-100"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image src="/v1/employee/exozen_logo1.png" alt="Brand Logo" width={64} height={36} className="w-12 h-7 object-contain bg-white rounded-lg shadow-lg mr-4" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-blue-900/50" : "bg-blue-100"}`}>
                  <FaBoxOpen className={`w-6 h-6 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`} />
                </div>
                <div>
                  {/* Reduced font size */}
                  <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Generate {dcType.toUpperCase()}</h2>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Create and manage delivery challans efficiently</p>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRequestClose();
              }}
              aria-label="Close modal"
              className={`p-3 rounded-full transition-all duration-200 text-xl focus:outline-none focus:ring-4 focus:ring-blue-500/50 ${theme === "dark" ? "hover:bg-red-900/50 text-gray-400 hover:text-red-300" : "hover:bg-red-100 text-gray-600 hover:text-red-600"}`}
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* ARIA live region for announcements */}
        <div ref={announceRef} className="sr-only" aria-live="polite"></div>
        {/* Modal Content */}
        <div className="p-4 md:p-5 flex flex-col gap-4 animate-fade-in">
          {saving && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-3xl">
              <div className={`p-8 rounded-2xl ${theme === "dark" ? "bg-gray-800" : "bg-white"} shadow-2xl`}>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  <div className="text-center">
                    <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Creating DC...</h3>
                    <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Please wait while we process your request</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {successAnimation}
          {!success && (
            <>
              {/* Step 1: Project Selection - Table Format */}
              {step === 1 && (
                <section className={`rounded-lg border shadow-lg p-6 transition-colors duration-300 flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#233e2e] via-blue-950 to-blue-900 border-blue-900" : "bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-100"}`}
                  aria-labelledby="step1-header">
                  <div className="flex items-center gap-2 mb-4">
                    <FaStore className={`w-5 h-5 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`} />
                    <span id="step1-header" className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-blue-900"}`}>Project Selection</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>
                      {projectList.length} available
                    </span>
                  </div>
                  
                  <div className={`overflow-auto rounded-lg border ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}>
                    <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                      <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                        <tr>
                          <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-8 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Select</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-80 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project Name</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                        {projectList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className={`px-4 py-8 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                              No valid projects available
                            </td>
                          </tr>
                        ) : projectList.map((project, idx) => (
                          <tr key={project} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                            <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                            <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                              <input
                                type="radio"
                                name="project"
                                checked={selectedProject === project}
                                onChange={() => {
                                  setSelectedProject(project);
                                  setSelectedRequests([]);
                                  setTouched(t => ({ ...t, selectedProject: true }));
                                }}
                                className={`w-4 h-4 border-2 focus:ring-2 focus:ring-offset-2 ${
                                  theme === "dark" 
                                    ? "bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500" 
                                    : "bg-white border-gray-300 text-blue-600 focus:ring-blue-500"
                                }`}
                              />
                            </td>
                            <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                              <div className="truncate" title={project}>{project}</div>
                            </td>
                            <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                              <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${
                                theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              }`}>
                                Available
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {touched.selectedProject && !isStep1Valid && (
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 text-sm">Please select a project to continue.</span>
                    </div>
                  )}
                  
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mt-2`}>
                    Only projects with specific names (not &quot;General&quot; or generic names) are shown. This project name will be used as the customer name in the generated DC.
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      disabled={!isStep1Valid}
                      onClick={() => setStep(2)}
                      className={`px-6 py-2 rounded-lg font-medium text-base transition-all duration-200
                        ${isStep1Valid
                          ? theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                      Continue to Employee Selection →
                    </button>
                  </div>
                </section>
              )}
              {/* Step 2: Employee Selection - Table Format */}
              {step === 2 && (
                <section className={`rounded-lg border shadow-lg p-6 transition-colors duration-300 flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#233e2e] via-green-950 to-green-900 border-green-900" : "bg-gradient-to-br from-green-50 via-white to-green-100 border-green-100"}`}
                  aria-labelledby="step2-header">
                  <div className="flex items-center gap-2 mb-4">
                    <FaCheckCircle className={`w-5 h-5 ${theme === "dark" ? "text-green-200" : "text-green-700"}`} />
                    <span id="step2-header" className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-green-900"}`}>Select Employees</span>
                    {uniformRequests.length > 0 && (
                      <span className={`text-xs px-2 py-1 rounded-full ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"}`}>
                        {uniformRequests.length} available
                      </span>
                    )}
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-blue-600">
                        <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                        Loading employees...
                      </div>
                    </div>
                  ) : uniformRequests.length === 0 ? (
                    <div className={`text-center py-8 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      {(() => {
                        // Check for pending requests that don't have DCs
                        const allProjectRequests = allUniformsData?.uniforms?.filter((req: { projectName: string; approvalStatus: string; issuedStatus: string }) => req.projectName === selectedProject) || [];
                        const pendingRequests = allProjectRequests.filter((req: { approvalStatus: string; issuedStatus: string }) => 
                          req.approvalStatus === 'Pending' && 
                          req.issuedStatus !== 'Issued'
                        );
                        const hasEmployeesWithDCs = dcData && dcData.length > 0 && dcData.some(dc => 
                          dc.items.some(item => item.employeeId)
                        );
                        
                        if (pendingRequests.length > 0) {
                          return (
                            <div className="space-y-2">
                              <div className="text-orange-600 font-semibold">
                                No approved uniform requests available for this project.
                              </div>
                              <div className="text-sm">
                                Found {pendingRequests.length} pending approval request(s) (Set Count: {pendingRequests.map((r: { setCount?: number; qty?: number }) => r.setCount || r.qty).join(', ')}). 
                                These requests need to be approved before creating a DC.
                              </div>
                            </div>
                          );
                        }
                        
                        if (hasEmployeesWithDCs) {
                          return (
                            <div className="space-y-2">
                              <div className="text-orange-600 font-semibold">
                                All employees for this project already have DCs created.
                              </div>
                              <div className="text-sm">
                                Select a different project or check existing DCs.
                              </div>
                            </div>
                          );
                        }
                        
                        return "No approved uniform requests found for this project.";
                      })()}
                    </div>
                  ) : (
                    <div className={`overflow-auto rounded-lg border ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}>
                      <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                        <thead className={theme === "dark" ? "bg-green-900 sticky top-0 z-10" : "bg-green-50 sticky top-0 z-10"}>
                          <tr>
                            <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-8 ${theme === "dark" ? "text-green-200 bg-green-900 border-green-800" : "text-green-700 bg-green-50 border-green-200"}`}>#</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-12 ${theme === "dark" ? "text-green-200 border-green-800" : "text-green-700 border-green-200"}`}>Select</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-green-200 border-green-800" : "text-green-700 border-green-200"}`}>Emp ID</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-green-200 border-green-800" : "text-green-700 border-green-200"}`}>Name</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-28 ${theme === "dark" ? "text-green-200 border-green-800" : "text-green-700 border-green-200"}`}>Designation</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-40 ${theme === "dark" ? "text-green-200 border-green-800" : "text-green-700 border-green-200"}`}>Uniform Type</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-16 ${theme === "dark" ? "text-green-200 border-green-800" : "text-green-700 border-green-200"}`}>Set Count</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-green-200 border-green-800" : "text-green-700 border-green-200"}`}>Project</th>
                          </tr>
                        </thead>
                        <tbody className={theme === "dark" ? "divide-y divide-green-900" : "divide-y divide-green-50"}>
                          {uniformRequests.map((request, idx) => (
                            <tr key={request._id} className={`${theme === "dark" ? "hover:bg-green-900 transition even:bg-gray-900" : "hover:bg-green-50 transition even:bg-gray-50"}`}>
                              <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-green-800' : 'bg-white text-gray-600 border-green-200'}`}>{idx + 1}</td>
                              <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-green-800" : "border-green-200"}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedRequests.some(req => req._id === request._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRequests(prev => [...prev, request]);
                                    } else {
                                      setSelectedRequests(prev => prev.filter(req => req._id !== request._id));
                                    }
                                    setTouched(t => ({ ...t, selectedRequests: true }));
                                  }}
                                  className={`w-4 h-4 rounded border-2 focus:ring-2 focus:ring-offset-2 ${
                                    theme === "dark" 
                                      ? "bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500" 
                                      : "bg-white border-gray-300 text-blue-600 focus:ring-blue-500"
                                  }`}
                                />
                              </td>
                              <td className={`px-2 py-1 font-semibold whitespace-nowrap border text-xs ${theme === "dark" ? "text-blue-200 border-green-800" : "text-blue-800 border-green-200"}`}>{request.employeeId}</td>
                              <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-green-800' : 'text-gray-700 border-green-200'}`}><div className="truncate" title={request.fullName}>{request.fullName}</div></td>
                              <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-blue-300 border-green-800' : 'text-blue-600 border-green-200'}`}><div className="truncate" title={request.designation}>{request.designation}</div></td>
                              <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-green-800' : 'text-gray-700 border-green-200'}`}><div className="truncate" title={Array.isArray(request.uniformType) ? request.uniformType.join(", ") : ""}>{Array.isArray(request.uniformType) ? request.uniformType.join(", ") : ""}</div></td>
                              <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-green-800" : "border-green-200"}`}>
                                <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${
                                  theme === 'dark' ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {request.setCount || request.qty}
                                </span>
                              </td>
                              <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-green-800' : 'text-gray-700 border-green-200'}`}><div className="truncate" title={request.projectName}>{request.projectName}</div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {touched.selectedRequests && !isStep2Valid && (
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 text-sm">Please select at least one employee to continue.</span>
                    </div>
                  )}
                  
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mt-2`}>
                    Select the employees whose approved uniform requests should be included in this delivery challan. All selected employees will be grouped under a single DC.
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`px-6 py-2 rounded-lg font-medium text-base transition-all duration-200
                        ${theme === "dark" ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!isStep2Valid}
                      onClick={() => setStep(3)}
                      className={`px-6 py-2 rounded-lg font-medium text-base transition-all duration-200
                        ${isStep2Valid
                          ? theme === "dark" ? "bg-green-700 text-white hover:bg-green-800" : "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                      Next
                    </button>
                  </div>
                </section>
              )}
              {/* Step 3: DC Details & Preview - Table Format */}
              {step === 3 && (
                <section className={`rounded-lg border shadow-lg p-6 transition-colors duration-300 flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#233e2e] via-indigo-950 to-indigo-900 border-indigo-900" : "bg-gradient-to-br from-indigo-50 via-white to-indigo-100 border-indigo-100"}`}
                  aria-labelledby="step3-header">
                  <div className="flex items-center gap-2 mb-4">
                    <FaInfoCircle className={`w-5 h-5 ${theme === "dark" ? "text-indigo-200" : "text-indigo-700"}`} />
                    <span id="step3-header" className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-indigo-900"}`}>DC Details & Size Selection</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${theme === "dark" ? "bg-indigo-900 text-indigo-200" : "bg-indigo-100 text-indigo-700"}`}>
                      {selectedRequests.length} employees
                    </span>
                  </div>
                  
                  {/* Size Selection Table */}
                  {selectedRequests.length > 0 && (
                    <div className={`overflow-auto rounded-lg border ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}>
                      <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                        <thead className={theme === "dark" ? "bg-indigo-900 sticky top-0 z-10" : "bg-indigo-50 sticky top-0 z-10"}>
                          <tr>
                            <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-8 ${theme === "dark" ? "text-indigo-200 bg-indigo-900 border-indigo-800" : "text-indigo-700 bg-indigo-50 border-indigo-200"}`}>#</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Employee</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Emp ID</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-40 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Uniform Type</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-28 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Original Size</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Select Size</th>
                            <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Status</th>
                          </tr>
                        </thead>
                        <tbody className={theme === "dark" ? "divide-y divide-indigo-900" : "divide-y divide-indigo-50"}>
                          {selectedRequests.flatMap((req, reqIdx) => 
                            Array.isArray(req.uniformType) ? req.uniformType.map((type, typeIdx) => {
                            const inventoryItem = findInventoryItemByType(type);
                            const originalSize = req.size && req.size[type] ? req.size[type] : '';
                            const selected = selectedSizes[req._id]?.[type] || originalSize;
                            const selectedSizeInventory = inventoryItem?.sizeInventory.find(si => si.size === selected);
                            const hasChanged = selected !== originalSize && originalSize !== '';
                            const rowIndex = reqIdx * (Array.isArray(req.uniformType) ? req.uniformType.length : 1) + typeIdx + 1;
                            
                            return (
                                <tr key={`${req._id}-${type}`} className={`${theme === "dark" ? "hover:bg-indigo-900 transition even:bg-gray-900" : "hover:bg-indigo-50 transition even:bg-gray-50"}`}>
                                  <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-indigo-800' : 'bg-white text-gray-600 border-indigo-200'}`}>{rowIndex}</td>
                                  <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>
                                    <div className="truncate" title={req.fullName}>{req.fullName}</div>
                                    <div className={`text-[10px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{req.designation}</div>
                                  </td>
                                  <td className={`px-2 py-1 font-semibold whitespace-nowrap border text-xs ${theme === "dark" ? "text-blue-200 border-indigo-800" : "text-blue-800 border-indigo-200"}`}>{req.employeeId}</td>
                                  <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>
                                    <div className="truncate" title={type}>{type}</div>
                                    {inventoryItem && (
                                      <div className={`text-[10px] ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>✓ Available</div>
                                    )}
                                  </td>
                                  <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>
                                    {originalSize ? (
                                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                                        {originalSize}
                                      </span>
                                    ) : (
                                      <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Not specified</span>
                                    )}
                                  </td>
                                  <td className={`px-2 py-1 border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                                    {inventoryItem ? (
                                      <select
                                        value={selected}
                                        onChange={e => handleSizeChange(req._id, type, e.target.value)}
                                        className={`w-full p-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 transition-all duration-200
                                          ${hasChanged 
                                            ? theme === "dark"
                                              ? "bg-yellow-900/20 border-yellow-600 text-yellow-100 focus:border-yellow-500"
                                              : "bg-yellow-50 border-yellow-300 text-yellow-800 focus:border-yellow-500"
                                            : theme === "dark"
                                              ? "bg-gray-600 border-gray-500 text-white focus:border-blue-400"
                                              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                                          }`}
                                      >
                                        <option value="">General (default)</option>
                                        {inventoryItem.sizes.map(size => {
                                          const sizeInfo = inventoryItem.sizeInventory.find(si => si.size === size);
                                          const availableQty = sizeInfo?.quantity || 0;
                                          const isOutOfStock = availableQty <= 0;
                                          const isOriginalSize = size === originalSize;
                                          return (
                                            <option 
                                              key={size} 
                                              value={size}
                                              disabled={isOutOfStock}
                                              className={isOutOfStock ? "text-gray-400" : ""}
                                            >
                                              {size} {isOriginalSize ? "(Original)" : ""} {isOutOfStock ? "(Out of stock)" : `(${availableQty})`}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    ) : (
                                      <span className={`text-[10px] ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>No inventory match</span>
                                    )}
                                  </td>
                                  <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                                    {hasChanged ? (
                                      <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>
                                        Modified
                                      </span>
                                    ) : selected && selectedSizeInventory ? (
                                      <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'}`}>
                                        Selected
                                      </span>
                                    ) : (
                                      <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                                        Default
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }) : []
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* DC Details Form - Table Format */}
                  <div className={`overflow-auto rounded-lg border ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}>
                    <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                      <thead className={theme === "dark" ? "bg-indigo-900 sticky top-0 z-10" : "bg-indigo-50 sticky top-0 z-10"}>
                        <tr>
                          <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-8 ${theme === "dark" ? "text-indigo-200 bg-indigo-900 border-indigo-800" : "text-indigo-700 bg-indigo-50 border-indigo-200"}`}>#</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Field</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-48 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Value</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-indigo-200 border-indigo-800" : "text-indigo-700 border-indigo-200"}`}>Required</th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "divide-y divide-indigo-900" : "divide-y divide-indigo-50"}>
                        <tr className={`${theme === "dark" ? "hover:bg-indigo-900 transition even:bg-gray-900" : "hover:bg-indigo-50 transition even:bg-gray-50"}`}>
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-indigo-800' : 'bg-white text-gray-600 border-indigo-200'}`}>1</td>
                          <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>Customer</td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <input type="text" value={customer} onChange={e => { setCustomer(e.target.value); setTouched(t => ({ ...t, customer: true })); }}
                              className={`w-full p-2 border rounded text-xs focus:ring-1 focus:ring-blue-500 transition-all duration-200
                                ${theme === "dark"
                                  ? "bg-gray-600 border-gray-500 text-white focus:border-blue-400"
                                  : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                                }`} />
                          </td>
                          <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`}>
                              Required
                            </span>
                          </td>
                        </tr>
                        <tr className={`${theme === "dark" ? "hover:bg-indigo-900 transition even:bg-gray-900" : "hover:bg-indigo-50 transition even:bg-gray-50"}`}>
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-indigo-800' : 'bg-white text-gray-600 border-indigo-200'}`}>2</td>
                          <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>DC Number</td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <div className="flex gap-1">
                              <input type="text" value={dcNumber} onChange={e => { setDcNumber(e.target.value); setTouched(t => ({ ...t, dcNumber: true })); }}
                                className={`flex-1 p-2 border rounded text-xs focus:ring-1 focus:ring-blue-500 transition-all duration-200
                                  ${theme === "dark"
                                    ? "bg-gray-600 border-gray-500 text-white focus:border-blue-400"
                                    : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                                  }`} />
                              <button type="button" onClick={handleAutoGenerateDCNumber}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 border
                                  ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}`}
                              >Auto</button>
                            </div>
                          </td>
                          <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`}>
                              Required
                            </span>
                          </td>
                        </tr>
                        <tr className={`${theme === "dark" ? "hover:bg-indigo-900 transition even:bg-gray-900" : "hover:bg-indigo-50 transition even:bg-gray-50"}`}>
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-indigo-800' : 'bg-white text-gray-600 border-indigo-200'}`}>3</td>
                          <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>DC Date</td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <input type="date" value={dcDate} onChange={e => { setDcDate(e.target.value); setTouched(t => ({ ...t, dcDate: true })); }}
                              className={`w-full p-2 border rounded text-xs focus:ring-1 focus:ring-blue-500 transition-all duration-200
                                ${theme === "dark"
                                  ? "bg-gray-600 border-gray-500 text-white focus:border-blue-400"
                                  : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                                }`} />
                          </td>
                          <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`}>
                              Required
                            </span>
                          </td>
                        </tr>
                        <tr className={`${theme === "dark" ? "hover:bg-indigo-900 transition even:bg-gray-900" : "hover:bg-indigo-50 transition even:bg-gray-50"}`}>
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-indigo-800' : 'bg-white text-gray-600 border-indigo-200'}`}>4</td>
                          <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>Remarks</td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                              className={`w-full p-2 border rounded text-xs focus:ring-1 focus:ring-blue-500 transition-all duration-200
                                ${theme === "dark"
                                  ? "bg-gray-600 border-gray-500 text-white focus:border-blue-400"
                                  : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                                }`} />
                          </td>
                          <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                              Optional
                            </span>
                          </td>
                        </tr>
                        <tr className={`${theme === "dark" ? "hover:bg-indigo-900 transition even:bg-gray-900" : "hover:bg-indigo-50 transition even:bg-gray-50"}`}>
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-900 text-gray-300 border-indigo-800' : 'bg-white text-gray-600 border-indigo-200'}`}>5</td>
                          <td className={`px-2 py-1 border text-xs ${theme === 'dark' ? 'text-gray-300 border-indigo-800' : 'text-gray-700 border-indigo-200'}`}>Address</td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                              className={`w-full p-2 border rounded text-xs focus:ring-1 focus:ring-blue-500 transition-all duration-200
                                ${theme === "dark"
                                  ? "bg-gray-600 border-gray-500 text-white focus:border-blue-400"
                                  : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                                }`} />
                          </td>
                          <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-indigo-800" : "border-indigo-200"}`}>
                            <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                              Optional
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* File Upload Section - Compact */}
                  <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                    <div className={`font-semibold text-sm mb-3 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
                      📎 Attach Files (Optional)
                    </div>
                    
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 text-center mb-3 transition-colors ${
                        theme === 'dark' 
                          ? 'border-purple-500 bg-gray-800 hover:bg-gray-700' 
                          : 'border-purple-300 bg-purple-50 hover:bg-purple-100'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <FaUpload className={`mx-auto mb-2 text-xl ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                      }`} />
                      <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Drag & drop files or click to upload
                      </p>
                      <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Images, PDFs, Word docs, Excel files (Max 10MB each)
                      </p>
                      
                      <div className="flex gap-2 justify-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className="hidden"
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleCameraInputChange}
                          className="hidden"
                        />
                        
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`px-3 py-1 rounded text-xs font-medium border transition flex items-center gap-1 ${
                            theme === 'dark'
                              ? 'bg-purple-700 text-white hover:bg-purple-800 border-purple-600'
                              : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-500'
                          }`}
                        >
                          <FaUpload />
                          Choose Files
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleCameraCapture}
                          className={`px-3 py-1 rounded text-xs font-medium border transition flex items-center gap-1 ${
                            theme === 'dark'
                              ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-600'
                              : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500'
                          }`}
                        >
                          <FaFileImage />
                          Camera
                        </button>
                      </div>
                    </div>

                    {/* Attached Files List */}
                    {attachments.length > 0 && (
                      <div className="space-y-1">
                        <div className={`font-medium text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                          Attached Files ({attachments.length})
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {attachments.map((file, index) => (
                            <div 
                              key={index}
                              className={`flex items-center justify-between p-2 rounded border ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600' 
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {getFileIcon(file.type)}
                                <div>
                                  <p className={`font-medium text-xs ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {file.name}
                                  </p>
                                  <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {file.type.startsWith('image/') && (
                                  <button
                                    type="button"
                                    onClick={() => window.open(URL.createObjectURL(file), '_blank')}
                                    className={`p-1 rounded transition ${
                                      theme === 'dark' 
                                        ? 'text-green-400 hover:bg-gray-600' 
                                        : 'text-green-600 hover:bg-gray-100'
                                    }`}
                                    title="Preview"
                                  >
                                    <FaEye className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className={`p-1 rounded transition ${
                                    theme === 'dark' 
                                      ? 'text-red-400 hover:bg-gray-600' 
                                      : 'text-red-600 hover:bg-gray-100'
                                  }`}
                                  title="Remove"
                                >
                                  <FaTimes className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Error Display */}
                  {saveDCError && (
                    <div className={`p-3 rounded-lg border flex items-center gap-2 ${theme === "dark" ? "bg-red-900 border-red-700 text-red-200" : "bg-red-100 border-red-200 text-red-700"}`}>
                      <FaTimes className="w-4 h-4" />
                      <span className="text-sm">{saveDCError}</span>
                    </div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={`px-6 py-2 rounded-lg font-medium text-base transition-all duration-200
                        ${theme === "dark" ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateDCWithUX}
                      disabled={saving || !isStep3Valid}
                      className={`px-6 py-2 rounded-lg font-medium text-base flex items-center gap-2 transition-all duration-200
                        ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}
                        ${(saving || !isStep3Valid) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {saving && <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>}
                      <FaPlus className="w-4 h-4" />
                      Generate DC
                    </button>
                  </div>
                  
                  {/* Help Text */}
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mt-2`}>
                    💡 Size selection is optional. If no size is selected, &quot;General&quot; will be used as default. All selected employees will be grouped under a single DC.
                  </div>
                </section>
              )}
            </>
          )}
          {/* Bottom close button for easier dismissal */}
          {!success && (
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={handleRequestClose}
                className={`px-6 py-2 rounded-lg font-medium border mt-2 transition-all duration-200
                  ${theme === "dark" ? "bg-gray-800 text-gray-300 border-blue-900 hover:bg-blue-900" : "bg-gray-100 text-blue-700 border-blue-200 hover:bg-blue-200"}`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}