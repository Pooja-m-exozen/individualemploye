"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import ManagerDashboardLayout  from "@/components/dashboard/ManagerDashboardLayout";
import CreateDCModal from "@/components/dashboard/CreateDCmodal";
import { FaSearch, FaUpload, FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaTimes, FaDownload, FaEye, FaBoxOpen, FaUsers, FaTshirt, FaFileAlt, FaUserPlus } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';



// TypeScript types for API response
interface DCItemAPI {
  _id: string;
  customer: string;
  dcNumber: string;
  dcDate: string;
  address: string;
  remarks: string;
  issueId?: string;
  issue?: string;
  items: Array<{
    itemId: string;
    quantity: number;
    size: string;
    employeeId?: string;
    uniformType?: string;
    totalQuantity?: number;
    remainingQuantity?: number;
    employeeMappings?: Array<{
      employeeId: string;
      quantity: number;
      mappedAt: string;
      _id: string;
    }>;
    _id: string;
  }>;
  attachments: unknown[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  // RDC properties
  isRetrievable?: boolean;
  retrievalStatus?: string;
  retrievalDeadline?: string;
  // Bulk issue properties
  isBulkIssue?: boolean;
  sourceType?: string;
}

interface InventoryItem {
  itemId: string | { _id: string; name: string };
  quantity: number;
  size?: string;
  employeeId?: string;
  uniformType?: string | string[];
  totalQuantity?: number;
  remainingQuantity?: number;
  employeeMappings?: Array<{
    employeeId: string;
    quantity: number;
    mappedAt: string;
    _id: string;
  }>;
  _id?: string;
  name?: string;
  itemCode?: string;
  category?: string;
  subCategory?: string;
  sizes?: string[];
  sizeInventory?: Array<{
    size: string;
    quantity: number;
    unit: string;
    price: string;
    openingBalance: number;
    _id: string;
  }>;
}

interface UniformItem {
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

interface SerialNumberEntry {
  itemCode: string;
  serialNumber: string;
}

interface DCItemOriginal {
  employeeId: string;
  itemCode: string;
  name: string;
  price: string;
  remarks: string;
  itemId: string;
  quantity: number;
  size: string;
  sizeData?: string; // Store size modification data as JSON string
  sizeModificationData?: { // Parsed size modification data
    current: string;
    original: string;
    modified: boolean;
    modificationNote?: string;
  };
  designation?: string; // Add designation field
  uniformType?: string | string[]; // Store uniform types (can be string or array)
  projectName?: string; // Store project name
  approvalStatus?: string; // Store approval status
  requestDate?: string; // Store request date
  individualEmployeeData?: { // Store individual employee data
    employeeId: string;
    fullName: string;
    designation: string;
    uniformType: string | string[];
    size: Record<string, string>;
    qty: number;
    projectName: string;
  };
  // New properties for employee mappings
  totalQuantity?: number;
  remainingQuantity?: number;
  employeeMappings?: Array<{
    employeeId: string;
    quantity: number;
    mappedAt: string;
    _id: string;
  }>;
  retrievableQuantity?: number; // Add retrievable quantity for RDC - Updated
  retrievalStatus?: string; // Add retrieval status for RDC items - Updated
  serialNumbers?: SerialNumberEntry[]; // Add serial numbers for ASS-prefixed assets
  _id: string;
}

// interface UniformRequestData {
//   employeeId: string;
//   fullName: string;
//   designation: string;
//   projectName: string;
//   uniformType: string[];
//   size: Record<string, string>;
//   qty: number;
//   remarks?: string;
// }

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  dcNumber?: string; // Associate file with specific DC
  file?: File; // Store the actual file for upload
  isUploaded?: boolean; // Track upload status
  uploadProgress?: number; // Track upload progress
}

interface DC {
  _id: string;
  customer: string;
  projectName?: string; // Add project name field
  dcNumber: string;
  dcDate: string;
  remarks: string;
  address?: string; // Add address field
  items: DCItemOriginal[];
  uploadedFiles?: UploadedFile[]; // Add uploaded files array
  createdAt: string;
  updatedAt: string;
  __v: number;
  retrievalStatus?: string; // Add retrieval status for RDC
  isRetrievable?: boolean; // Add retrievable flag for RDC
  retrievalDeadline?: string; // Add retrieval deadline for RDC - Updated
  isBulkIssue?: boolean; // Add bulk issue flag
  sourceType?: string; // Add source type for bulk issues
}

interface ApiResponse {
  dcs: DC[];
}

// Additional interfaces for bulk issue functionality

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  department: string;
}

interface Project {
  _id: string;
  projectName: string;
  address: string;
  totalManpower: number;
  designationWiseCount: Record<string, number>;
  updatedDate: string;
}

interface BulkIssueItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  size: string;
  quantity: number;
  employeeId: string;
  employeeName: string;
  remarks?: string;
}

interface BulkIssueRequest {
  issueTo: string;
  department: string;
  purpose: string;
  address: string;
  issueDate: string;
  items: BulkIssueItem[];
}

interface UniformMapping {
  _id: string;
  project: string;
  designations: string[];
  uniformTypes: string[];
  payable: 'payable' | 'non-payable';
  isActive: boolean;
}

interface EmployeeMapping {
  itemId: string;
  employeeId: string;
  quantity: number;
  size: string;
  uniformType: string;
}

interface ItemEmployeeMapping {
  itemId: string;
  itemName: string;
  size: string;
  totalQuantity: number;
  selectedEmployees: Array<{
    employeeId: string;
    employeeName: string;
    quantity: number;
  }>;
  remainingQuantity: number;
}

interface OutwardDC {
  _id: string;
  customer?: string;
  dcNumber: string;
  dcDate: string;
  address: string;
  remarks: string;
  items: DCItemOriginal[];
  createdAt: string;
  updatedAt: string;
}

interface Issue {
  _id: string;
  issueTo: string;
  department: string;
  purpose: string;
  issueDate: string;
  address?: string;
  items: Array<{
    _id: string;
    itemId: {
      _id: string;
      itemCode: string;
      category: string;
      subCategory: string;
      name: string;
    };
    quantity: number;
    size?: string;
    employeeId?: string;
    name?: string;
    itemCode?: string;
    price?: string;
    remarks?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  __v: number;
  outwardDC?: OutwardDC;
  dcNumber?: string;
}

// TypeScript interface for Bulk Issue DC API response
interface BulkIssueDC {
  _id: string;
  customer: string;
  dcNumber: string;
  dcDate: string;
  address: string;
  remarks: string;
  items: Array<{
    itemId: string;
    totalQuantity: number;
    size: string;
    uniformType: string;
    employeeMappings: Array<{
      employeeId: string;
      quantity: number;
      mappedAt: string;
      _id: string;
    }>;
    remainingQuantity: number;
    employeeId: string | null;
    quantity: number;
    _id: string;
  }>;
  attachments: unknown[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  isBulkIssue: boolean;
  sourceType: string;
  isRetrievable?: boolean;
  retrievalStatus?: string;
}

interface BulkIssueDCResponse {
  success: boolean;
  bulkIssueDCs: BulkIssueDC[];
  totalCount: number;
  filters: Record<string, unknown>;
}

// Add new interface for preview data
// interface DCPreviewData {
//   dcNumber: string;
//   dcDate: string;
//   customer: string;
//   address: string;
//   remarks: string;
//   items: Array<{
//     itemCode: string;
//     name: string;
//     size: string;
//     quantity: number;
//     employeeId: string;
//   }>;
// }

// Helper function to fetch employee details from KYC API
async function fetchEmployeeDetailsFromKYC(employeeId: string): Promise<{fullName: string, designation: string} | null> {
  try {
    const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
    
    if (!res.ok) {
      console.error(`KYC API Error: ${res.status} ${res.statusText}`);
      return null;
    }
    
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("KYC API returned non-JSON response:", contentType);
      return null;
    }
    
    const data = await res.json();
    if (data.message && data.kycForms) {
      console.log("ðŸ” Searching for employee in KYC:", employeeId);
      console.log("ðŸ” Available KYC forms:", data.kycForms.length);
     
      // Find employee by employeeId
      const employee = data.kycForms.find((kyc: { personalDetails?: { employeeId: string; fullName: string; designation: string } }) => 
        kyc.personalDetails && kyc.personalDetails.employeeId === employeeId
      );
      
      if (employee) {
        console.log("ðŸ” Found employee in KYC:", employee.personalDetails);
        return {
          fullName: employee.personalDetails.fullName,
          designation: employee.personalDetails.designation
        };
      }
     
      console.log("ðŸ” No KYC data found for employee:", employeeId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching employee details from KYC:", error);
  }
  return null;
}

// Helper function to fetch uniform request for a customer - removed as no longer needed
// async function fetchUniformRequestForCustomer(employeeId: string, fullName: string): Promise<UniformRequestData | null> {
//   // API call removed as requested
//   console.log("ðŸ” Uniform request API call removed for:", { employeeId, fullName });
//   return null;
// }

export default function StoreDCPage() {
  const { theme } = useTheme();
  
  // Add CSS animation for toast
  const toastStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
  `;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkIssue, setShowBulkIssue] = useState(false);
  const [showDCCreationModal, setShowDCCreationModal] = useState(false);
  const [showEmployeeMappingModal, setShowEmployeeMappingModal] = useState(false);
  const [showDCPreviewModal, setShowDCPreviewModal] = useState(false);
  const [selectedDCPreview, setSelectedDCPreview] = useState<Issue | null>(null);
  
  // Employee mapping state
  const [selectedIssueForMapping, setSelectedIssueForMapping] = useState<Issue | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [employeeMappings, setEmployeeMappings] = useState<EmployeeMapping[]>([]);
  const [isUpdatingMappings, setIsUpdatingMappings] = useState(false);
  
  // New checkbox-based mapping state
  const [itemEmployeeMappings, setItemEmployeeMappings] = useState<ItemEmployeeMapping[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [dcData, setDcData] = useState<DC[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track employee IDs that already have requests generated
  const [employeesWithRequests, setEmployeesWithRequests] = useState<Set<string>>(new Set());
  
  // Bulk issue state variables
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uniformMappings, setUniformMappings] = useState<UniformMapping[]>([]);
  
  // State for bulk issue DCs
  const [bulkIssueDCs, setBulkIssueDCs] = useState<BulkIssueDC[]>([]);
  const [bulkIssueDCsLoading, setBulkIssueDCsLoading] = useState(false);
  const [bulkIssueDCsError, setBulkIssueDCsError] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<'nrdc' | 'bulk-issue' | 'rdc'>('nrdc');
  const [dcType, setDcType] = useState<'nrdc' | 'rdc'>('nrdc');
  
  // RDC (Retrievable DC) state variables
  const [rdcData, setRdcData] = useState<DC[]>([]);
  const [rdcLoading, setRdcLoading] = useState(false);
  const [showRdcModal, setShowRdcModal] = useState(false);
  const [rdcCreationData, setRdcCreationData] = useState({
    issueTo: "",
    department: "",
    purpose: "",
    address: "",
    issueDate: new Date().toISOString().split('T')[0],
    deadlineDate: "",
    items: []
  });
  const [isCreatingRdc, setIsCreatingRdc] = useState(false);
  const [selectedRdcProject, setSelectedRdcProject] = useState<Project | null>(null);
  const [selectedRdcItems, setSelectedRdcItems] = useState<Array<{itemId: string, itemName: string, quantity: number, size?: string, itemCode?: string, serialNumbers?: SerialNumberEntry[]}>>([]);
  const [availableItems, setAvailableItems] = useState<UniformItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<BulkIssueItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
  const [selectedUniforms, setSelectedUniforms] = useState<Array<{name: string, quantity: number, size: string}>>([]);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  // Filter items based on search term
  const filteredItems = availableItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const [bulkIssueData, setBulkIssueData] = useState<BulkIssueRequest>({
    issueTo: "",
    department: "",
    purpose: "",
    address: "",
    issueDate: new Date().toISOString().split('T')[0],
    items: []
  });
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIssueForView, setSelectedIssueForView] = useState<Issue | null>(null);
  const [dcCreationData, setDcCreationData] = useState({
    dcNumber: "",
    dcDate: new Date().toISOString().split('T')[0],
    address: "",
    remarks: ""
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isCreatingDC, setIsCreatingDC] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDC, setSelectedDC] = useState<DC | null>(null);
  // Removed unused uniformReq state
  const [employeeDetails, setEmployeeDetails] = useState<Record<string, {fullName: string, designation: string}>>({});
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [allPdfLoading, setAllPdfLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [savingFiles, setSavingFiles] = useState(false);
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setToast(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Create a preview URL
        const previewUrl = URL.createObjectURL(file);
        
        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          url: previewUrl,
          uploadedAt: new Date().toISOString(),
          dcNumber: selectedDC?.dcNumber, // Keep dcNumber for display purposes
          file: file,
          isUploaded: false,
          uploadProgress: 0
        };

        newFiles.push(uploadedFile);
      }

      setPendingFiles(prev => [...prev, ...newFiles]);
      setToast(`${newFiles.length} file(s) added to upload queue!`);
      
    } catch (error) {
      console.error('Error adding files:', error);
      setToast('Error adding files. Please try again.');
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

  // Function to ensure DC has address field before upload
  const ensureDCHasAddress = async (dcId: string): Promise<boolean> => {
    try {
      // First, fetch the current DC to check if it has an address
      const dcResponse = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${dcId}`);
      if (!dcResponse.ok) {
        console.error('Failed to fetch DC:', dcResponse.status);
        return false;
      }
      
      const dcData = await dcResponse.json();
      
      // Check if DC has address field and it's not empty
      if (!dcData.address || dcData.address.trim() === '') {
        console.log('DC missing address, updating with default address...');
        
        // Update the DC with all existing data plus the address field
        const updateResponse = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${dcId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer: dcData.customer,
            dcNumber: dcData.dcNumber,
            dcDate: dcData.dcDate,
            remarks: dcData.remarks || '',
            address: 'Address not provided',
            items: dcData.items
          }),
        });
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Failed to update DC address:', updateResponse.status, errorText);
          console.error('DC data being sent:', {
            customer: dcData.customer,
            dcNumber: dcData.dcNumber,
            dcDate: dcData.dcDate,
            remarks: dcData.remarks || '',
            address: 'Address not provided',
            items: dcData.items
          });
          return false;
        }
        
        const updatedData = await updateResponse.json();
        console.log('DC address updated successfully:', updatedData);
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring DC has address:', error);
      return false;
    }
  };

  const uploadFileToServer = async (file: UploadedFile, dcId: string): Promise<boolean> => {
    try {
      if (!file.file) return false;

      // Ensure DC has address field before uploading
      const addressEnsured = await ensureDCHasAddress(dcId);
      if (!addressEnsured) {
        console.error('Failed to ensure DC has address field');
        return false;
      }

      const formData = new FormData();
      formData.append('attachments', file.file);

      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${dcId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      return false;
    }
  };

  const saveFilesToDC = async () => {
    if (!selectedDC || pendingFiles.length === 0) return;

    setSavingFiles(true);
    const dcId = selectedDC._id;
    const successfulUploads: UploadedFile[] = [];
    const failedUploads: UploadedFile[] = [];

    try {
      for (const file of pendingFiles) {
        const success = await uploadFileToServer(file, dcId);
        if (success) {
          successfulUploads.push({ ...file, isUploaded: true });
        } else {
          failedUploads.push(file);
        }
      }

      if (successfulUploads.length > 0) {
        setUploadedFiles(prev => [...prev, ...successfulUploads]);
        setToast(`${successfulUploads.length} file(s) uploaded successfully!`);
      }

      if (failedUploads.length > 0) {
        setToast(`${failedUploads.length} file(s) failed to upload. Please try again.`);
      }

      setPendingFiles([]);
      
      // Refresh DC attachments
      await fetchDCAttachments(dcId);
      
    } catch (error) {
      console.error('Error saving files:', error);
      setToast('Error saving files. Please try again.');
    } finally {
      setSavingFiles(false);
    }
  };

  const fetchDCAttachments = useCallback(async (dcId: string) => {
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${dcId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        console.log('Attachments API response:', data);
        
        // Handle different response structures
        let attachments = [];
        if (Array.isArray(data)) {
          // Direct array response
          attachments = data;
        } else if (data.attachments && Array.isArray(data.attachments)) {
          // Response with attachments property
          attachments = data.attachments;
        } else if (data.success && data.attachments && Array.isArray(data.attachments)) {
          // Response with success flag and attachments
          attachments = data.attachments;
        } else {
          console.warn('Unexpected attachments response structure:', data);
          return;
        }
        
        // Update the uploaded files with server data
        const serverFiles: UploadedFile[] = attachments.map((att: { id?: string; _id?: string; filename?: string; name?: string; size?: number; mimetype?: string; type?: string; uploadedAt?: string; createdAt?: string }) => ({
          id: att.id || att._id,
          name: att.filename || att.name,
          size: att.size || 0,
          type: att.mimetype || att.type || 'application/octet-stream',
          url: `https://inventory.zenapi.co.in/api/inventory/outward-dc/files/${att.filename || att.name}`,
          uploadedAt: att.uploadedAt || att.createdAt,
          dcNumber: selectedDC?.dcNumber,
          isUploaded: true
        }));
        
        setUploadedFiles(prev => {
          const filtered = prev.filter(f => f.dcNumber !== selectedDC?.dcNumber);
          return [...filtered, ...serverFiles];
        });
      } else {
        console.warn('Failed to fetch attachments:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching DC attachments:', error);
    }
  }, [selectedDC?.dcNumber]);

  const deleteAttachment = async (attachmentId: string, dcId: string) => {
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${dcId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Delete response:', data);
        setUploadedFiles(prev => prev.filter(f => f.id !== attachmentId));
        setToast('File deleted successfully!');
      } else {
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setToast('Error deleting file. Please try again.');
    }
  };

  const handleFileDelete = async (fileId: string) => {
    const fileToDelete = uploadedFiles.find(f => f.id === fileId);
    if (fileToDelete && selectedDC) {
      if (fileToDelete.isUploaded) {
        // Delete from server
        await deleteAttachment(fileId, selectedDC._id);
      } else {
        // Remove from pending files
        setPendingFiles(prev => prev.filter(f => f.id !== fileId));
        setToast('File removed from upload queue!');
      }
      
      // Clean up preview URL
      if (fileToDelete.url.startsWith('blob:')) {
        URL.revokeObjectURL(fileToDelete.url);
      }
    }
  };

  const removePendingFile = (fileId: string) => {
    setPendingFiles(prev => {
      const fileToDelete = prev.find(f => f.id === fileId);
      if (fileToDelete && fileToDelete.url.startsWith('blob:')) {
        URL.revokeObjectURL(fileToDelete.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleFileDownload = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Helper function to get project name from uniform requests
  const getProjectNameFromUniformRequests = useCallback(async (customer: string): Promise<string> => {
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      if (!res.ok) return extractProjectName();
     
      const data = await res.json();
      if (data.success) {
        // First try to find by employeeGroups (new API structure)
        if (data.employeeGroups) {
          const customerNames = customer.split(',').map(name => name.trim());
          for (const customerName of customerNames) {
            const matchingGroup = data.employeeGroups.find((group: { fullName: string; projectName?: string }) =>
              group.fullName === customerName ||
              customerName.includes(group.fullName) ||
              group.fullName.includes(customerName)
            );
            if (matchingGroup && matchingGroup.projectName &&
                matchingGroup.projectName !== "General" &&
                matchingGroup.projectName !== "N/A") {
              console.log(`Found project name from employeeGroups: ${matchingGroup.projectName} for ${customerName}`);
              return matchingGroup.projectName;
            }
          }
        }
       
        // Fallback to old API structure
        if (data.uniforms) {
          const customerNames = customer.split(',').map(name => name.trim());
          for (const customerName of customerNames) {
            const matchingRequest = data.uniforms.find((u: { fullName: string; projectName?: string }) =>
              u.fullName === customerName ||
              customerName.includes(u.fullName) ||
              u.fullName.includes(customerName)
            );
            if (matchingRequest && matchingRequest.projectName &&
                matchingRequest.projectName !== "General" &&
                matchingRequest.projectName !== "N/A") {
              console.log(`Found project name from uniforms: ${matchingRequest.projectName} for ${customerName}`);
              return matchingRequest.projectName;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching project name from uniform requests:", error);
    }
   
    // Try to extract project name from customer name if it contains project info
    // This is a fallback only when API data is not available
    // The actual project name should come from the API response
   
    return extractProjectName();
  }, []);

  // Helper function to get project name with proper fallback logic
  const getProjectName = (dc: DC) => {
    // First check if DC has projectName directly
    if (dc.projectName && dc.projectName !== "N/A" && dc.projectName !== "General") return dc.projectName;
   
    // Check if any item has projectName
    if (dc.items && dc.items.length > 0) {
      for (const item of dc.items) {
        // Check individualEmployeeData first (highest priority)
        if (item.individualEmployeeData && item.individualEmployeeData.projectName &&
            item.individualEmployeeData.projectName !== "General") {
          return item.individualEmployeeData.projectName;
        }
        // Check item's projectName
        if (item.projectName && item.projectName !== "N/A" && item.projectName !== "General") {
          return item.projectName;
        }
      }
    }
   
    // If no project name found, return customer name directly
    return dc.customer || "";
  };



  useEffect(() => {
    const fetchDCs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc");
       
        // Check if response is ok
        if (!res.ok) {
          throw new Error(`Failed to fetch DCs: ${res.status} ${res.statusText}`);
        }
       
        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("API returned non-JSON response");
        }
       
        const data: ApiResponse = await res.json();
       
        // Log the data structure for debugging
        console.log("Fetched DC data:", data);
       
        // Process the actual API response structure with project names
        const processedDCs = await Promise.all(data.dcs.map(async (dc) => {
          // Prioritize the stored project name from the API response
          let actualProjectName = dc.projectName;
         
          // If no project name stored or it's generic, try to get it from uniform requests as fallback
          if (!actualProjectName || actualProjectName === "N/A" || actualProjectName === "General") {
            actualProjectName = await getProjectNameFromUniformRequests(dc.customer);
          }
         
          // If still no valid project name, try to extract from customer name as last resort
          if (!actualProjectName || actualProjectName === "N/A" || actualProjectName === "General") {
            // Extract project name from customer name if it contains project information
            if (dc.customer && dc.customer.toLowerCase().includes('skootr')) {
              actualProjectName = "SKOOTR GLOBAL PRIVATE LIMITED - Math Co";
            } else if (dc.customer && dc.customer.toLowerCase().includes('math co')) {
              actualProjectName = "SKOOTR GLOBAL PRIVATE LIMITED - Math Co";
            }
          }
         
                  // Try to get project name from uniform requests API for better accuracy
        try {
          const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.employeeGroups) {
              // Look for employees that match this DC's customer names
              const customerNames = dc.customer.split(',').map(name => name.trim().toLowerCase());
              const matchingEmployee = data.employeeGroups.find((group: { fullName: string; projectName?: string }) =>
                customerNames.some(customerName =>
                  customerName.includes(group.fullName.toLowerCase()) ||
                  group.fullName.toLowerCase().includes(customerName)
                )
              );
             
              if (matchingEmployee && matchingEmployee.projectName &&
                  matchingEmployee.projectName !== "General" &&
                  matchingEmployee.projectName !== "N/A") {
                actualProjectName = matchingEmployee.projectName;
                console.log(`Found better project name from employee groups: ${actualProjectName}`);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching projectName from uniform requests:", error);
        }
         
          return {
            ...dc,
            // Use the best available project name
            projectName: actualProjectName || dc.customer,
            // Process items to match our expected structure
            items: dc.items.map(item => ({
              ...item,
              // Use stored employee data if available, otherwise extract from customer name
              employeeId: item.employeeId || extractEmployeeId(dc.customer),
              name: item.name, // Keep the original item name (uniform type)
              designation: item.designation || "Employee", // Use stored designation if available
              // Use the size from API response (this is the modified/selected size)
              size: item.size || "",
              quantity: item.quantity || 1,
              // Use stored individualEmployeeData if available, otherwise create from available info
              individualEmployeeData: item.individualEmployeeData || {
                employeeId: item.employeeId || extractEmployeeId(dc.customer),
                fullName: extractEmployeeName(dc.customer), // Extract from customer name
                designation: item.designation || "Employee",
                uniformType: item.uniformType || [item.name], // Use stored uniform type if available
                size: { [item.name]: item.size }, // Create size object
                qty: item.quantity || 1,
                projectName: actualProjectName || dc.customer
              }
            }))
          };
        }));
       
        setDcData(processedDCs);
      } catch (err: unknown) {
        console.error("Error fetching DCs:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error occurred while fetching DCs");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDCs();
  }, [getProjectNameFromUniformRequests]);

  // Fetch bulk issue data on component mount
  useEffect(() => {
    const fetchBulkIssueData = async () => {
      try {
        const inventoryRes = await fetch("https://inventory.zenapi.co.in/api/inventory/items");
        const inventoryData = await inventoryRes.json();
        
        const employeesRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const employeesData = await employeesRes.json();
        
        const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
        const projectsData = await projectsRes.json();

        const mappingsRes = await fetch("https://cafm.zenapi.co.in/api/uniforms/uniform-mappings");
        const mappingsData = await mappingsRes.json();
        
        if (inventoryData && Array.isArray(inventoryData)) {
          setInventoryItems(inventoryData);
        }
        
        if (employeesData && employeesData.kycForms) {
          // Handle the correct API structure: {kycForms: [...]}
          const employeeList = employeesData.kycForms.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
            employeeId: kyc.personalDetails?.employeeId || "",
            fullName: kyc.personalDetails?.fullName || "",
            designation: kyc.personalDetails?.designation || "",
            projectName: kyc.personalDetails?.projectName || "",
            department: kyc.personalDetails?.department || ""
          })).filter((emp: Employee) => emp.employeeId && emp.fullName);
          
          setEmployees(employeeList);
          console.log('Initial employee data loaded from kycForms:', employeeList.length);
        } else if (employeesData && employeesData.kycData) {
          const employeeList = employeesData.kycData.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
            employeeId: kyc.personalDetails?.employeeId || "",
            fullName: kyc.personalDetails?.fullName || "",
            designation: kyc.personalDetails?.designation || "",
            projectName: kyc.personalDetails?.projectName || "",
            department: kyc.personalDetails?.department || ""
          })).filter((emp: Employee) => emp.employeeId && emp.fullName);
          
          setEmployees(employeeList);
        } else if (employeesData && Array.isArray(employeesData)) {
          const employeeList = employeesData.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
            employeeId: kyc.personalDetails?.employeeId || "",
            fullName: kyc.personalDetails?.fullName || "",
            designation: kyc.personalDetails?.designation || "",
            projectName: kyc.personalDetails?.projectName || "",
            department: kyc.personalDetails?.department || ""
          })).filter((emp: Employee) => emp.employeeId && emp.fullName);
          
          setEmployees(employeeList);
        } else if (employeesRes.ok === false) {
          console.warn("Employee API failed, proceeding without employee data");
          setEmployees([]);
        }

        if (projectsData && Array.isArray(projectsData)) {
          console.log('Projects loaded:', projectsData);
          setProjects(projectsData);
        }

        if (mappingsData && mappingsData.success) {
          const activeMappings = mappingsData.data.filter((m: UniformMapping) => m.isActive !== false);
          console.log('Uniform mappings loaded:', activeMappings);
          setUniformMappings(activeMappings);
        }
      } catch (err) {
        console.error("Error fetching bulk issue data:", err);
      }
    };
    
    fetchBulkIssueData();
  }, []);


  // Function to fetch DC data for issues
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchDCDetailsForIssues = async (issues: Issue[]): Promise<Issue[]> => {
    try {
      // Try to fetch all DCs first
      const allDCsResponse = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc');
      
      if (allDCsResponse.ok) {
        const allDCsData = await allDCsResponse.json();
        
        let allDCs = [];
        if (allDCsData.success && Array.isArray(allDCsData.data)) {
          allDCs = allDCsData.data;
        } else if (Array.isArray(allDCsData)) {
          allDCs = allDCsData;
        } else if (allDCsData.dcs && Array.isArray(allDCsData.dcs)) {
          allDCs = allDCsData.dcs;
        }
        
        console.log('Found', allDCs.length, 'DCs total');
        
        // Match DCs with issues by multiple criteria (Manager-style logic)
        const updatedIssues = issues.map(issue => {
          const matchingDC = allDCs.find((dc: DCItemAPI) => {
            // Try multiple matching criteria
            const customerMatch = dc.customer === issue.issueTo;
            const remarksMatch = dc.remarks?.includes(issue._id);
            const issueIdMatch = dc.issueId === issue._id || dc.issue === issue._id;
            // Additional matching: check if DC was created from this issue
            const createdFromIssue = dc.remarks?.includes(`Generated from Issue ${issue._id}`) || 
                                   dc.remarks?.includes(issue._id) ||
                                   dc.customer === issue.issueTo;
            
            return customerMatch || remarksMatch || issueIdMatch || createdFromIssue;
          });
          
          // Only exclude if it's clearly an RDC (starts with RDC prefix)
          const isRDC = matchingDC && matchingDC.dcNumber.startsWith('RDC');
          
          // If it's an RDC, don't include this issue in bulk issues
          if (isRDC) {
            console.log(`Excluding issue ${issue._id} from bulk issues - has RDC: ${matchingDC.dcNumber}`);
            return null; // This will be filtered out
          }
          
          if (matchingDC) {
            return { ...issue, outwardDC: matchingDC };
          }
          
          return issue;
        });
        
        // Filter out null values (issues with RDCs that were excluded)
        const filteredIssues = updatedIssues.filter(issue => issue !== null);
        
        console.log(`Final bulk issues: ${filteredIssues.length} (excluded ${updatedIssues.length - filteredIssues.length} issues with RDCs)`);
        
        return filteredIssues;
      } else {
        console.error('Failed to fetch DCs:', allDCsResponse.status, allDCsResponse.statusText);
        return issues;
      }
    } catch (error) {
      console.error('Error fetching DC details for issues:', error);
      return issues;
    }
  };

  // Helper function to extract project name from customer and remarks
  const extractProjectName = (): string => {
    // Try to extract project name from remarks first
    // if (remarks && remarks.includes("Operations")) {
    //   return "Operations";
    // }
    // if (remarks && remarks.includes("Security")) {
    //   return "Security";
    // }
    // if (remarks && remarks.includes("Arvind Belair")) {
    //   return "Arvind Belair";
    // }
    // // Check if customer name contains project information
    // if (customer && customer.includes("Arvind Belair")) {
    //   return "Arvind Belair";
    // }
    // Default project name - return empty string to fall back to customer name
    return "";
  };

  // Helper function to extract employee ID from customer name (fallback only)
  const extractEmployeeId = (customer: string): string => {
    // This is now only used as a fallback when API data is not available
    return customer.split(',')[0]?.trim() || "EMP001";
  };

  // Helper function to extract employee name from customer (fallback only)
  const extractEmployeeName = (customer: string): string => {
    // This is now only used as a fallback when API data is not available
    return customer.split(',')[0]?.trim() || customer;
  };






  // Function to fetch employee IDs that already have requests generated
  const fetchEmployeesWithExistingRequests = async (): Promise<Set<string>> => {
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      if (!response.ok) {
        console.error('Failed to fetch uniform requests');
        return new Set();
      }
      
      interface UniformRequestItem {
        employeeId?: string;
      }
      
      interface EmployeeGroup {
        employeeId?: string;
      }
      
      const data = await response.json();
      const employeeIdsWithRequests = new Set<string>();
      
      // Handle different API response structures
      if (data.success && data.uniforms) {
        data.uniforms.forEach((request: UniformRequestItem) => {
          if (request.employeeId) {
            employeeIdsWithRequests.add(request.employeeId);
          }
        });
      } else if (data.success && data.employeeGroups) {
        data.employeeGroups.forEach((group: EmployeeGroup) => {
          if (group.employeeId) {
            employeeIdsWithRequests.add(group.employeeId);
          }
        });
      } else if (Array.isArray(data)) {
        data.forEach((request: UniformRequestItem) => {
          if (request.employeeId) {
            employeeIdsWithRequests.add(request.employeeId);
          }
        });
      }
      
      console.log('Found employees with existing requests:', employeeIdsWithRequests.size);
      return employeeIdsWithRequests;
    } catch (error) {
      console.error('Error fetching employees with existing requests:', error);
      return new Set();
    }
  };

  // Function to fetch employees for specific project and designation
  const fetchEmployeesForMapping = async (projectName: string, designation?: string) => {
      // setEmployeesLoading(true);
    try {
      console.log('Fetching employees for project:', projectName, 'designation:', designation);
      console.log('Total employees available:', employees.length);
      console.log('Sample employee data:', employees.slice(0, 3));
      
      // Fetch employees with existing requests
      const employeesWithExistingRequests = await fetchEmployeesWithExistingRequests();
      setEmployeesWithRequests(employeesWithExistingRequests);
      
      let employeesToFilter = employees;
      
      // If no employees loaded locally, try to fetch fresh data
      if (employees.length === 0) {
        console.log('No employees loaded locally, fetching fresh data...');
        try {
          const employeesRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
          const employeesData = await employeesRes.json();
          
          if (employeesData && employeesData.kycForms) {
            // Handle the correct API structure: {kycForms: [...]}
            const employeeList = employeesData.kycForms.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
              employeeId: kyc.personalDetails?.employeeId || "",
              fullName: kyc.personalDetails?.fullName || "",
              designation: kyc.personalDetails?.designation || "",
              projectName: kyc.personalDetails?.projectName || "",
              department: kyc.personalDetails?.department || ""
            })).filter((emp: Employee) => emp.employeeId && emp.fullName);
            
            employeesToFilter = employeeList;
            setEmployees(employeeList); // Update the global employees state
            console.log('Fresh employee data loaded from kycForms:', employeeList.length);
            console.log('Sample employees:', employeeList.slice(0, 5));
          } else if (employeesData && employeesData.kycData) {
            const employeeList = employeesData.kycData.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
              employeeId: kyc.personalDetails?.employeeId || "",
              fullName: kyc.personalDetails?.fullName || "",
              designation: kyc.personalDetails?.designation || "",
              projectName: kyc.personalDetails?.projectName || "",
              department: kyc.personalDetails?.department || ""
            })).filter((emp: Employee) => emp.employeeId && emp.fullName);
            
            employeesToFilter = employeeList;
            setEmployees(employeeList); // Update the global employees state
            console.log('Fresh employee data loaded from kycData:', employeeList.length);
          } else if (employeesData && Array.isArray(employeesData)) {
            // Handle direct array response
            const employeeList = employeesData.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
              employeeId: kyc.personalDetails?.employeeId || "",
              fullName: kyc.personalDetails?.fullName || "",
              designation: kyc.personalDetails?.designation || "",
              projectName: kyc.personalDetails?.projectName || "",
              department: kyc.personalDetails?.department || ""
            })).filter((emp: Employee) => emp.employeeId && emp.fullName);
            
            employeesToFilter = employeeList;
            setEmployees(employeeList); // Update the global employees state
            console.log('Fresh employee data loaded (array format):', employeeList.length);
          }
        } catch (fetchError) {
          console.error('Error fetching fresh employee data:', fetchError);
        }
      }
      
      // Filter employees based on project and optionally designation
      // Try both exact match and partial match for project name
      const filteredEmployees = employeesToFilter.filter(emp => {
        // Normalize project names for better matching
        const normalizedProjectName = projectName?.trim().toLowerCase() || '';
        const normalizedEmpProject = emp.projectName?.trim().toLowerCase() || '';
        
        const projectMatch = emp.projectName === projectName || 
                           normalizedEmpProject === normalizedProjectName ||
                           normalizedEmpProject.includes(normalizedProjectName) ||
                           normalizedProjectName.includes(normalizedEmpProject);
        const designationMatch = !designation || emp.designation === designation;
        
        // Exclude employees who already have requests generated
        const hasExistingRequest = employeesWithExistingRequests.has(emp.employeeId);
        
        console.log(`Employee ${emp.employeeId}: projectName="${emp.projectName}" (normalized: "${normalizedEmpProject}"), searchProject="${projectName}" (normalized: "${normalizedProjectName}"), matches=${projectMatch}, designation="${emp.designation}", designationMatch=${designationMatch}, hasExistingRequest=${hasExistingRequest}`);
        
        return projectMatch && designationMatch && !hasExistingRequest;
      });
      
      console.log('Filtered employees:', filteredEmployees);
      console.log('Available project names in employees:', [...new Set(employeesToFilter.map(emp => emp.projectName))]);
      
      setAvailableEmployees(filteredEmployees);
      
      if (filteredEmployees.length === 0) {
        console.log('No employees found. Available projects:', [...new Set(employeesToFilter.map(emp => emp.projectName))]);
        setToast(`No employees found for "${projectName}". Available projects: ${[...new Set(employeesToFilter.map(emp => emp.projectName))].slice(0, 3).join(', ')}`);
      } else {
        setToast(`Found ${filteredEmployees.length} employees for ${projectName}`);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setToast(`Error fetching employees for mapping`);
    } finally {
      // setEmployeesLoading(false);
    }
  };

  // Function to initialize item-employee mappings
  const initializeItemEmployeeMappings = (items: InventoryItem[]) => {
    const mappings: ItemEmployeeMapping[] = items.map((item, index) => {
      const baseItemId = typeof item.itemId === 'string' ? item.itemId : item.itemId?._id || item._id || `item_${index}`;
      const itemName = Array.isArray(item.uniformType) ? item.uniformType.join(', ') : (item.uniformType || (typeof item.itemId === 'object' ? item.itemId?.name : '') || item.name || 'N/A');
      const size = item.size || 'N/A';
      
      // Create unique itemId that includes base item ID, size, and index to ensure uniqueness
      const itemId = `${baseItemId}_${size}_${index}`;
      
      return {
        itemId,
        itemName,
        size,
        totalQuantity: item.totalQuantity || item.quantity || 1,
        selectedEmployees: [],
        remainingQuantity: item.remainingQuantity !== undefined ? item.remainingQuantity : (item.totalQuantity || item.quantity || 1)
      };
    });
    
    setItemEmployeeMappings(mappings);
  };

  // Function to toggle employee selection for an item
  const toggleEmployeeSelection = (itemId: string, employee: Employee, isSelected: boolean) => {
    setItemEmployeeMappings(prev => prev.map(itemMapping => {
      if (itemMapping.itemId === itemId) {
        if (isSelected) {
          // Add employee if not already selected
          const existingEmployee = itemMapping.selectedEmployees.find(emp => emp.employeeId === employee.employeeId);
          if (!existingEmployee) {
            const newEmployee = {
              employeeId: employee.employeeId,
              employeeName: employee.fullName,
              quantity: 1 // Default quantity per employee
            };
            
            const updatedSelectedEmployees = [...itemMapping.selectedEmployees, newEmployee];
            const totalSelectedQuantity = updatedSelectedEmployees.reduce((sum, emp) => sum + emp.quantity, 0);
            
            return {
              ...itemMapping,
              selectedEmployees: updatedSelectedEmployees,
              remainingQuantity: itemMapping.totalQuantity - totalSelectedQuantity
            };
          }
        } else {
          // Remove employee
          const updatedSelectedEmployees = itemMapping.selectedEmployees.filter(emp => emp.employeeId !== employee.employeeId);
          const totalSelectedQuantity = updatedSelectedEmployees.reduce((sum, emp) => sum + emp.quantity, 0);
          
          return {
            ...itemMapping,
            selectedEmployees: updatedSelectedEmployees,
            remainingQuantity: itemMapping.totalQuantity - totalSelectedQuantity
          };
        }
      }
      return itemMapping;
    }));
  };

  // Function to update quantity for a specific employee
  const updateEmployeeQuantity = (itemId: string, employeeId: string, newQuantity: number) => {
    setItemEmployeeMappings(prev => prev.map(itemMapping => {
      if (itemMapping.itemId === itemId) {
        const updatedSelectedEmployees = itemMapping.selectedEmployees.map(emp => {
          if (emp.employeeId === employeeId) {
            return { ...emp, quantity: Math.max(1, newQuantity) };
          }
          return emp;
        });
        
        const totalSelectedQuantity = updatedSelectedEmployees.reduce((sum, emp) => sum + emp.quantity, 0);
        
        return {
          ...itemMapping,
          selectedEmployees: updatedSelectedEmployees,
          remainingQuantity: itemMapping.totalQuantity - totalSelectedQuantity
        };
      }
      return itemMapping;
    }));
  };

  // Function to convert checkbox mappings to API format
  const convertMappingsToAPIFormat = (): EmployeeMapping[] => {
    const apiMappings: EmployeeMapping[] = [];
    
    itemEmployeeMappings.forEach(itemMapping => {
      itemMapping.selectedEmployees.forEach(employee => {
        // Extract the original itemId from the combined itemId (remove size and index suffix)
        const originalItemId = itemMapping.itemId.split('_')[0];
        
        // Find the original item to get uniformType
        const originalItem = (selectedIssueForMapping?.outwardDC?.items || selectedIssueForMapping?.items || [])
          .find((item: InventoryItem, index: number) => {
            const baseItemId = typeof item.itemId === 'string' ? item.itemId : item.itemId?._id || item._id || `item_${index}`;
            return baseItemId === originalItemId;
          });
        
        if (originalItem) {
          const item = originalItem as DCItemOriginal;
          apiMappings.push({
            itemId: originalItemId, // Use original itemId for API
            employeeId: employee.employeeId,
            quantity: employee.quantity,
            size: itemMapping.size,
            uniformType: (() => {
              const uniformType = (item as DCItemOriginal).uniformType;
              if (Array.isArray(uniformType)) {
                return uniformType.join(', ');
              }
              return uniformType || (item as DCItemOriginal).name || 'N/A';
            })()
          });
        }
      });
    });
    
    return apiMappings;
  };

  // Function to handle employee mapping button click
  const handleMapEmployees = async (issue: Issue) => {
    setSelectedIssueForMapping(issue);
    
    // Check if DC exists for this issue (either outwardDC object or dcNumber)
    if (issue.outwardDC) {
      // DC exists with full object, fetch employees and show mapping modal
      await fetchEmployeesForMapping(issue.department);
      // Initialize checkbox mappings
      const items = issue.outwardDC?.items || issue.items || [];
      initializeItemEmployeeMappings(items);
      setShowEmployeeMappingModal(true);
    } else if (issue.dcNumber) {
      // DC exists but we don't have the full DC object, fetch it by DC number
      console.log('DC number exists, fetching DC details by DC number:', issue.dcNumber);
      try {
        // Fetch all DCs and find the one with matching DC number
        const response = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc');
        if (response.ok) {
          const result = await response.json();
          let allDCs = [];
          if (result.success && Array.isArray(result.data)) {
            allDCs = result.data;
          } else if (Array.isArray(result)) {
            allDCs = result;
          } else if (result.dcs && Array.isArray(result.dcs)) {
            allDCs = result.dcs;
          }
          
          // Find DC with matching DC number
          const matchingDC = allDCs.find((dc: DCItemAPI) => dc.dcNumber === issue.dcNumber);
          
          if (matchingDC) {
            console.log('Found DC by number:', matchingDC);
            // Update the issue with the full DC object
            const updatedIssue = { ...issue, outwardDC: matchingDC };
            setSelectedIssueForMapping(updatedIssue);
            await fetchEmployeesForMapping(issue.department);
            // Initialize checkbox mappings
            const items = matchingDC?.items || issue.items || [];
            initializeItemEmployeeMappings(items);
            setShowEmployeeMappingModal(true);
          } else {
            setToast(`DC ${issue.dcNumber} exists but could not find details in system. Please contact support.`);
          }
        } else {
          setToast(`Failed to fetch DC details. Please try again.`);
        }
      } catch (error) {
        console.error('Error fetching DC by number:', error);
        setToast(`Error fetching DC details. Please try again.`);
      }
    } else {
      // No DC exists, show error
      setToast("No DC found for this issue. Please create DC first.");
    }
  };

  // Function to remove employee mapping
  const removeEmployeeMapping = (itemId: string) => {
    setEmployeeMappings((prev: EmployeeMapping[]) => prev.filter(m => m.itemId !== itemId));
    setToast("Employee mapping removed");
  };

  // Function to update DC with employee mappings
  const updateDCWithEmployeeMappings = async () => {
    if (!selectedIssueForMapping?.outwardDC) {
      setToast("No DC selected for mapping");
      return;
    }

    // Convert checkbox mappings to API format
    const apiMappings = convertMappingsToAPIFormat();
    
    if (apiMappings.length === 0) {
      setToast("Please select at least one employee for mapping");
      return;
    }

    setIsUpdatingMappings(true);
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${selectedIssueForMapping.outwardDC._id}/update-employee-mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeMappings: apiMappings }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Employee Mapping Update Response:', result);
        
        if (result.success) {
          setToast("Employee mappings updated successfully!");
          
          // Close modal and reset state
          setShowEmployeeMappingModal(false);
          setItemEmployeeMappings([]);
          setEmployeeMappings([]);
          setSelectedIssueForMapping(null);
          
          // Refresh DC data to show updated mappings
          await refreshDCData();
          
          // Also refresh the issues data to update the UI
          await refreshIssues();
          
        } else {
          setToast(result.message || "Failed to update employee mappings");
        }
      } else {
        const errorData = await response.json();
        console.error('Employee Mapping Update Error:', errorData);
        setToast(errorData.message || "Failed to update employee mappings");
      }
    } catch (error) {
      console.error("Error updating employee mappings:", error);
      setToast("Error updating employee mappings. Please try again.");
    } finally {
      setIsUpdatingMappings(false);
    }
  };

  // Function to refresh DC data
  const refreshDCData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc");
     
      if (!res.ok) {
        throw new Error(`Failed to fetch DCs: ${res.status} ${res.statusText}`);
      }
     
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API returned non-JSON response");
      }
     
      const data: ApiResponse = await res.json();
     
      // Process the actual API response structure with project names
      const processedDCs = await Promise.all(data.dcs.map(async (dc) => {
        // Prioritize the stored project name from the API response
        let actualProjectName = dc.projectName;
       
        // If no project name stored or it's generic, try to get it from uniform requests as fallback
        if (!actualProjectName || actualProjectName === "N/A" || actualProjectName === "General") {
          actualProjectName = await getProjectNameFromUniformRequests(dc.customer);
        }
       
        // If still no valid project name, try to extract from customer name as last resort
        if (!actualProjectName || actualProjectName === "N/A" || actualProjectName === "General") {
          // Extract project name from customer name if it contains project information
          if (dc.customer && dc.customer.toLowerCase().includes('skootr')) {
            actualProjectName = "SKOOTR GLOBAL PRIVATE LIMITED - Math Co";
          } else if (dc.customer && dc.customer.toLowerCase().includes('math co')) {
            actualProjectName = "SKOOTR GLOBAL PRIVATE LIMITED - Math Co";
          }
        }
       
        // Try to get project name from uniform requests API for better accuracy
        try {
          const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.employeeGroups) {
              // Look for employees that match this DC's customer names
              const customerNames = dc.customer.split(',').map(name => name.trim().toLowerCase());
              const matchingEmployee = data.employeeGroups.find((group: { fullName: string; projectName?: string }) =>
                customerNames.some(customerName =>
                  customerName.includes(group.fullName.toLowerCase()) ||
                  group.fullName.toLowerCase().includes(customerName)
                )
              );
             
              if (matchingEmployee && matchingEmployee.projectName &&
                  matchingEmployee.projectName !== "General" &&
                  matchingEmployee.projectName !== "N/A") {
                actualProjectName = matchingEmployee.projectName;
                console.log(`Found better project name from employee groups: ${actualProjectName}`);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching project name from uniform requests:", error);
        }
       
        return {
          ...dc,
          // Use the best available project name
          projectName: actualProjectName || dc.customer,
          // Process items to match our expected structure
          items: dc.items.map(item => ({
            ...item,
            // Use stored employee data if available, otherwise extract from customer name
            employeeId: item.employeeId || extractEmployeeId(dc.customer),
            name: item.name, // Keep the original item name (uniform type)
            designation: item.designation || "Employee", // Use stored designation if available
            // Use the size from API response (this is the modified/selected size)
            size: item.size || "",
            quantity: item.quantity ?? 1,
            // Use stored individualEmployeeData if available, otherwise create from available info
            individualEmployeeData: item.individualEmployeeData || {
              employeeId: item.employeeId || extractEmployeeId(dc.customer),
              fullName: extractEmployeeName(dc.customer),
              designation: item.designation || "Employee",
              uniformType: item.uniformType || [item.name], // Use stored uniform type if available
              size: { [item.name]: item.size }, // Create size object
              qty: item.quantity ?? 1,
              projectName: actualProjectName || dc.customer
            }
          }))
        };
      }));
     
      setDcData(processedDCs);
    } catch (err: unknown) {
      console.error("Error refreshing DCs:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred while refreshing DCs");
      }
    } finally {
      setLoading(false);
    }
  }, [getProjectNameFromUniformRequests]);

  useEffect(() => {
    async function fetchEmployeeData() {
      if (selectedDC) {
        console.log("ðŸ” Fetching employee data for DC:", selectedDC.dcNumber);
        console.log("ðŸ” DC items:", selectedDC.items);
       
        // Get unique employee IDs from DC items
        const uniqueEmployeeIds = [...new Set(selectedDC.items.map(item => item.employeeId).filter(Boolean))];
        console.log("ðŸ” Unique employee IDs:", uniqueEmployeeIds);
       
        // Fetch employee details for each unique employee ID
        const employeeDetailsMap: Record<string, {fullName: string, designation: string}> = {};
        
        for (const employeeId of uniqueEmployeeIds) {
          if (employeeId) {
            console.log(`ðŸ” Fetching KYC data for employee: ${employeeId}`);
            const details = await fetchEmployeeDetailsFromKYC(employeeId);
            if (details) {
              console.log(`âœ… Found KYC data for ${employeeId}:`, details);
              employeeDetailsMap[employeeId] = details;
            } else {
              console.log(`âŒ No KYC data found for ${employeeId}`);
            }
          }
        }
       
        console.log("ðŸ” Fetched employee details:", employeeDetailsMap);
        setEmployeeDetails(employeeDetailsMap);
        
        // Fetch DC attachments
        await fetchDCAttachments(selectedDC._id);
       
        // Removed uniform request fetching as it's no longer needed
      } else {
        setEmployeeDetails({});
      }
    }
    fetchEmployeeData();
  }, [selectedDC, fetchDCAttachments]);

  // Fetch RDCs when RDC view is active
  useEffect(() => {
    if (activeView === 'rdc') {
      fetchRDCs();
    }
  }, [activeView]);

  // Fetch bulk issue DCs when bulk-issue view is active
  useEffect(() => {
    if (activeView === 'bulk-issue') {
      fetchBulkIssueDCs();
    }
  }, [activeView]);


  // Map API data to table structure
  const mappedDC = dcData.map(dc => ({
    ...dc,
    dcNumber: dc.dcNumber,
    date: dc.dcDate ? dc.dcDate.split("T")[0] : "",
    projectName: getProjectName(dc),
    status: "Issued", // API does not provide status, default to Issued
  }));

  const statusOptions = Array.from(new Set(mappedDC.map(dc => dc.status)));

  const filteredDC = mappedDC.filter(dc => {
    // Filter out bulk DCs - exclude DCs that were created from bulk issues
    // Check multiple criteria to identify bulk issue DCs
    const isBulkDC = dc.remarks && (
      dc.remarks.includes('Generated from Issue') ||
      dc.remarks.includes('Generated from Bulk Issue') ||
      dc.remarks.includes('Bulk Issue')
    );
    
    // Also check if DC has bulk issue properties
    const hasBulkIssueFlag = dc.isBulkIssue === true;
    const hasBulkIssueSourceType = dc.sourceType && (
      dc.sourceType.toLowerCase().includes('bulk') ||
      dc.sourceType.toLowerCase().includes('issue')
    );
    
    // Exclude if any of these conditions are true
    if (isBulkDC || hasBulkIssueFlag || hasBulkIssueSourceType) {
      console.log('Excluding bulk issue DC:', dc.dcNumber, {
        isBulkDC,
        hasBulkIssueFlag,
        hasBulkIssueSourceType,
        remarks: dc.remarks,
        isBulkIssue: dc.isBulkIssue,
        sourceType: dc.sourceType
      });
      return false;
    }
    
    const matchesStatus = statusFilter ? dc.status === statusFilter : true;
    const matchesSearch = search ? (
      (dc.dcNumber && dc.dcNumber.toLowerCase().includes(search.toLowerCase())) ||
      (dc.projectName && dc.projectName.toLowerCase().includes(search.toLowerCase())) ||
      (dc.customer && dc.customer.toLowerCase().includes(search.toLowerCase()))
    ) : true;
    return matchesStatus && matchesSearch;
  });

  // Download DC as PDF (exact match to image format)
  // This function generates a PDF with the following improvements:
  // 1. Fetches customer address from project API to avoid showing "N/A"
  // 2. Avoids duplication of customer name in the "To" section
  // 3. Shows customer address when available, falls back to customer name
  // 4. Handles long customer names by truncating if necessary
  // 5. Uses DC-specific items while fetching employee details from uniforms API
  // 6. Automatically switches to landscape orientation for better visibility when many columns
  const handleDownloadDC = async (dc: DC) => {
    try {
      setPdfLoading(dc.dcNumber);
     
      // Log the DC data for debugging
      console.log("Generating PDF for DC:", dc);
      console.log("DC items:", dc.items);
     
      // Fetch employee data from KYC API to get proper employee information
      console.log("Fetching employee data from KYC API for DC:", dc.dcNumber);
      
      // Get unique employee IDs from DC items
      const uniqueEmployeeIds = [...new Set(dc.items.map(item => item.employeeId).filter(Boolean))];
      console.log("Unique employee IDs from DC:", uniqueEmployeeIds);
      
      // Fetch employee details for each unique employee ID
      const employeeDetailsMap: Record<string, {fullName: string, designation: string}> = {};
      
      for (const employeeId of uniqueEmployeeIds) {
        if (employeeId) {
          console.log(`ðŸ” Fetching KYC data for employee: ${employeeId}`);
          const details = await fetchEmployeeDetailsFromKYC(employeeId);
          if (details) {
            console.log(`âœ… Found KYC data for ${employeeId}:`, details);
            employeeDetailsMap[employeeId] = details;
          } else {
            console.log(`âŒ No KYC data found for ${employeeId}`);
          }
        }
      }
      
      console.log("Fetched employee details for PDF:", employeeDetailsMap);
      
      // Fetch uniform requests data to get setCount information
      let uniformRequestsData: {
        success: boolean;
        employeeGroups?: Array<{
          employeeId: string;
          fullName: string;
          requests: Array<{
            setCount: number;
            uniformType: string[];
            size: Record<string, string>;
            qty: number;
            approvalStatus: string;
            requestDate: string;
          }>;
        }>;
        uniforms?: Array<{
          employeeId: string;
          uniformType: string | string[];
          setCount?: number;
        }>;
      } | null = null;
      try {
        const uniformRes = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        if (uniformRes.ok) {
          uniformRequestsData = await uniformRes.json();
          console.log("Fetched uniform requests data for setCount:", uniformRequestsData);
        }
      } catch (error) {
        console.error("Error fetching uniform requests for setCount:", error);
      }
      
      // Create employee data array ONLY from DC items (not all project employees)
      const employeeData: Array<{
        employeeId: string;
        fullName: string;
        designation: string;
        uniformType: string[];
        size: Record<string, string>;
        projectName: string;
        items: DCItemOriginal[];
        totalSetCount: number; // Add total set count for this employee
      }> = [];
      
      // Group DC items by employeeId - ONLY employees in this specific DC
      // Keep all items separate to handle multiple items with same type but different sizes
      const employeeGroups = dc.items.reduce((groups: Record<string, DCItemOriginal[]>, item) => {
        const empId = item.employeeId || 'Unknown';
        if (!groups[empId]) {
          groups[empId] = [];
        }
        // Add each item separately to handle different sizes for same uniform type
        groups[empId].push(item);
        return groups;
      }, {});
      
      console.log("DC Employee Groups (only employees in this DC):", Object.keys(employeeGroups));
      
      // Helper function to calculate total set count for an employee
      const calculateTotalSetCount = (employeeId: string): number => {
        if (!uniformRequestsData || !uniformRequestsData.success) {
          return 1; // Default to 1 if no data available
        }
        
        let totalSetCount = 0;
        
        // Check if the API response has employeeGroups structure
        if (uniformRequestsData.employeeGroups) {
          const employeeGroup = uniformRequestsData.employeeGroups.find((group) => 
            group.employeeId === employeeId || group.fullName?.toLowerCase().includes(employeeId.toLowerCase())
          );
          
          if (employeeGroup && employeeGroup.requests && Array.isArray(employeeGroup.requests)) {
            totalSetCount = employeeGroup.requests.reduce((sum: number, request) => {
              return sum + (request.setCount || 1);
            }, 0);
            console.log(`Found setCount for ${employeeId} from employeeGroups:`, totalSetCount);
          }
        }
        
        // Fallback to uniforms array if employeeGroups not found
        if (totalSetCount === 0 && uniformRequestsData.uniforms) {
          const employeeRequests = uniformRequestsData.uniforms.filter((req) => 
            req.employeeId === employeeId
          );
          
          if (employeeRequests.length > 0) {
            // For the old API structure, we need to calculate based on uniform types
            // Each complete set of uniform types counts as 1 set
            const uniqueRequests = new Set<string>();
            employeeRequests.forEach((req) => {
              const uniformTypes = Array.isArray(req.uniformType) ? req.uniformType : [req.uniformType];
              const key = uniformTypes.sort().join(',');
              uniqueRequests.add(key);
            });
            totalSetCount = uniqueRequests.size;
            console.log(`Calculated setCount for ${employeeId} from uniforms array:`, totalSetCount);
          }
        }
        
        return totalSetCount > 0 ? totalSetCount : 1; // Default to 1 if no data found
      };
      
      // Create employee data ONLY from employees in this DC
      Object.entries(employeeGroups).forEach(([employeeId, items]) => {
        const kycDetails = employeeDetailsMap[employeeId];
        const uniformTypes: string[] = [];
        const sizeMap: Record<string, string> = {};
        
        // Calculate total set count for this employee
        const totalSetCount = calculateTotalSetCount(employeeId);
        
        // Process each item to extract uniform types and sizes
        // Create a map to handle uniform types with their specific sizes
        const uniformTypeSizeMap: Record<string, string> = {};
        
        // Process items in order to map uniform types to sizes correctly
        items.forEach((item, itemIndex) => {
          const itemUniformType = item.uniformType || item.name;
          if (itemUniformType) {
            if (typeof itemUniformType === 'string') {
              // Check if the uniform type contains multiple items separated by comma
              if (itemUniformType.includes(',')) {
                // Split by comma and add each part as separate uniform type
                const parts = itemUniformType.split(',').map(part => part.trim()).filter(part => part);
                
                // Map based on the order:
                // First item: parts[0] = "Commercial HK Pant" gets size 28
                // Second item: parts[1] = "HK Commercial Shirt" gets size 36
                if (itemIndex === 0) {
                  // First item: map the first uniform type to this size
                  if (parts[0] && !uniformTypes.includes(parts[0])) {
                    uniformTypes.push(parts[0]);
                    uniformTypeSizeMap[parts[0]] = item.size || 'N/A';
                  }
                } else if (itemIndex === 1) {
                  // Second item: map the second uniform type to this size
                  if (parts[1] && !uniformTypes.includes(parts[1])) {
                    uniformTypes.push(parts[1]);
                    uniformTypeSizeMap[parts[1]] = item.size || 'N/A';
                  }
                }
              } else {
                if (!uniformTypes.includes(itemUniformType)) {
                  uniformTypes.push(itemUniformType);
                }
                // Map uniform type to its specific size
                uniformTypeSizeMap[itemUniformType] = item.size || 'N/A';
              }
            } else if (Array.isArray(itemUniformType)) {
              itemUniformType.forEach(type => {
                if (typeof type === 'string' && type.trim()) {
                  if (type.includes(',')) {
                    // Split by comma and add each part as separate uniform type
                    const parts = type.split(',').map(part => part.trim()).filter(part => part);
                    parts.forEach(part => {
                      if (!uniformTypes.includes(part)) {
                        uniformTypes.push(part);
                      }
                      // Map each uniform type to its specific size
                      uniformTypeSizeMap[part] = item.size || 'N/A';
                    });
                  } else {
                    if (!uniformTypes.includes(type)) {
                      uniformTypes.push(type);
                    }
                    // Map uniform type to its specific size
                    uniformTypeSizeMap[type] = item.size || 'N/A';
                  }
                }
              });
            }
          }
        });
        
        // Create size map with specific sizes for each uniform type
        uniformTypes.forEach(uniformType => {
          if (uniformTypeSizeMap[uniformType]) {
            sizeMap[uniformType] = uniformTypeSizeMap[uniformType];
          }
        });
        
        // Handle bulk employee IDs differently
        let displayName = 'Employee Not Found';
        let displayDesignation = 'Employee';
        
        if (employeeId.startsWith('BULK_')) {
          // For bulk issues, use a more descriptive name
          displayName = 'Bulk Issue Employee';
          displayDesignation = 'Bulk Issue';
        } else if (kycDetails) {
          displayName = kycDetails.fullName;
          displayDesignation = kycDetails.designation;
        }
        
        employeeData.push({
          employeeId: employeeId,
          fullName: displayName,
          designation: displayDesignation,
          uniformType: uniformTypes,
          size: sizeMap,
          projectName: dc.projectName || dc.customer,
          items: items,
          totalSetCount: totalSetCount
        });
        
        console.log(`Added employee to PDF: ${employeeId} - ${displayName} (${displayDesignation})`);
        console.log(`Uniform types for ${employeeId}:`, uniformTypes);
        console.log(`Size map for ${employeeId}:`, sizeMap);
        console.log(`Total set count for ${employeeId}:`, totalSetCount);
      });
      
      console.log("Created employee data for PDF:", employeeData);
     
      console.log("Final employee data for PDF:", employeeData);
     
      // Get all unique uniform types ONLY from the specific DC items
      const allUniformTypes = new Set<string>();
      
      // Add uniform types ONLY from DC items (not from all project employees)
      dc.items.forEach(item => {
        // Handle uniformType (can be string or string array)
        if (item.uniformType) {
          if (typeof item.uniformType === 'string') {
            const uniformType = String(item.uniformType).trim();
            if (uniformType) {
              // Check if the uniform type contains multiple items separated by comma
              if (uniformType.includes(',')) {
                // Split by comma and add each part as separate uniform type
                const parts = uniformType.split(',').map(part => part.trim()).filter(part => part);
                parts.forEach(part => allUniformTypes.add(part));
              } else {
                allUniformTypes.add(uniformType);
              }
            }
          } else if (Array.isArray(item.uniformType)) {
            item.uniformType.forEach((type: string) => {
              if (typeof type === 'string' && type.trim()) {
                // Check if the uniform type contains multiple items separated by comma
                if (type.includes(',')) {
                  // Split by comma and add each part as separate uniform type
                  const parts = type.split(',').map(part => part.trim()).filter(part => part);
                  parts.forEach(part => allUniformTypes.add(part));
                } else {
                  allUniformTypes.add(type.trim());
                }
              }
            });
          }
        } else if (item.name && typeof item.name === 'string') {
          const itemName = String(item.name).trim();
          if (itemName) {
            // Check if the item name contains multiple items separated by comma
            if (itemName.includes(',')) {
              // Split by comma and add each part as separate uniform type
              const parts = itemName.split(',').map(part => part.trim()).filter(part => part);
              parts.forEach(part => allUniformTypes.add(part));
            } else {
              allUniformTypes.add(itemName);
            }
          }
        }
      });
     
      // If no uniform types found, use a default
      if (allUniformTypes.size === 0) {
        allUniformTypes.add("Uniform");
      }
     
      const uniformTypesArray = Array.from(allUniformTypes);
      console.log("Uniform types for PDF:", uniformTypesArray);
     
      // Determine PDF orientation based on number of columns for better visibility
      const totalColumnsForOrientation = 5 + uniformTypesArray.length + 2; // Base columns + uniform types + Amount + Emp Sign
      const useLandscape = totalColumnsForOrientation > 12; // Switch to landscape if more than 12 columns
      
      console.log(`Total columns: ${totalColumnsForOrientation}, Using landscape: ${useLandscape}`);
     
      // Create PDF with appropriate orientation
      const doc = new jsPDF(useLandscape ? 'landscape' : 'portrait', 'mm', 'a4');
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable = undefined;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 15; // Starting position

      // Company Name & Address
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED", pageWidth / 2, y, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", pageWidth / 2, y + 8, { align: "center" });

      // Document Title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Non-Returnable Delivery Challan", pageWidth / 2, y + 16, { align: "center" });

      // Outer border
      doc.setDrawColor(180);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

      y += 25;

      // NRDC No and Date row
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`NRDC No: ${dc.dcNumber}`, 12, y);
      doc.text(`Date: ${dc.dcDate ? dc.dcDate.split("T")[0] : ""}`, pageWidth - 80, y);

      y += 8;

      // From/To boxes
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("From:", 15, y + 3);
      doc.text("To:", pageWidth / 2 + 2, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      const fromBoxWidth = pageWidth / 2 - 25;
      const toBoxWidth = pageWidth / 2 - 25;
      const boxHeight = 20;
      
      doc.rect(15, y + 5, fromBoxWidth, boxHeight);
      doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED\n25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", 17, y + 8, { maxWidth: fromBoxWidth - 2 });
      doc.rect(pageWidth / 2 + 2, y + 5, toBoxWidth, boxHeight);
     
      // Use the actual project name from the created DC, not extracted from other sources
      const projectName = dc.projectName || dc.customer;
      console.log("Project name for PDF (from DC):", projectName);
     
      // If project name is still generic, try to get it from the first item's individualEmployeeData
      let finalProjectName = projectName;
      if (dc.items && dc.items.length > 0 && dc.items[0].individualEmployeeData?.projectName) {
        finalProjectName = dc.items[0].individualEmployeeData.projectName;
        console.log("Using project name from individualEmployeeData:", finalProjectName);
      }
     
      // Ensure we don't use "N/A" as project name
      if (!finalProjectName || finalProjectName === "N/A" || finalProjectName === "General") {
        finalProjectName = dc.customer || "Project Details";
      }
     
      // Fetch customer address from project API
      let customerAddress = "";
      try {
        const projectRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          // Try to find project by customer name with better matching logic
          const customerNames = dc.customer.split(',').map(name => name.trim());
          let matchingProject = null;
         
          // First try exact match
          matchingProject = projectData.find((p: { projectName: string; address?: string }) =>
            customerNames.some(customerName => customerName === p.projectName)
          );
         
          // If no exact match, try partial match
          if (!matchingProject) {
            matchingProject = projectData.find((p: { projectName: string; address?: string }) =>
              customerNames.some(customerName =>
                customerName.toLowerCase().includes(p.projectName.toLowerCase()) ||
                p.projectName.toLowerCase().includes(customerName.toLowerCase())
              )
            );
          }
         
          if (matchingProject && matchingProject.address) {
            customerAddress = matchingProject.address;
            console.log(`Found address for customer ${dc.customer}: ${customerAddress}`);
          }
        }
      } catch (error) {
        console.error("Error fetching customer address:", error);
      }
     
      // Create the "To" text with project name and address (avoid duplication)
      let toText = `${finalProjectName}`;
     
      // Add customer address if found, otherwise add customer name as fallback
      if (customerAddress && customerAddress.trim() !== "" && customerAddress !== "N/A" && customerAddress !== "Address not available") {
        toText += `\n${customerAddress}`;
      } else if (dc.customer && dc.customer.trim() !== "N/A" && dc.customer.trim() !== "") {
        // Only add customer name if it's different from the project name to avoid duplication
        if (finalProjectName !== dc.customer) {
          // Handle long customer names by truncating if necessary
          const customerName = dc.customer.length > 50 ? dc.customer.substring(0, 50) + "..." : dc.customer;
          toText += `\n${customerName}`;
        }
      }
     
      // If still no address, try to use a default address for known projects
      if (finalProjectName.toLowerCase().includes('skootr')) {
        toText += `\n213, Rainmakers Workspace, Mahatma Gandhi Road, Ramanashree Arcade, Bengaluru, 560001, Karnataka, INDIA`;
      }
     
      // Log the final "To" text for debugging
      console.log("Final 'To' text for PDF:", toText);
     
      // Try to get better project information after we fetch employee data
      doc.text(toText, pageWidth / 2 + (useLandscape ? 7 : 4), y + 8, { maxWidth: toBoxWidth - 2 });

      y += useLandscape ? 35 : 30;

          // Create table headers with uniform types
      const tableHeaders = ["SI No", "Emp ID", "Names", "DESIGNATION", "No of Set", ...uniformTypesArray, "Amount", "Emp Sign"];
     
      // Create table body using employee data
      const tableBody: (string | number)[][] = [];
     
      employeeData.forEach((employee, index) => {
        // Use the calculated total set count for this employee
        const noOfSet = employee.totalSetCount || 1;
       
        // Create row with sizes for each uniform type
        const row = [
          index + 1, // SI No
          employee.employeeId.startsWith('BULK_') ? 'BULK' : employee.employeeId, // Show 'BULK' for bulk employee IDs
          employee.fullName,   // Use actual full name from KYC
          employee.designation, // Use actual designation from KYC
          noOfSet,
          // Add size values for each uniform type
          ...uniformTypesArray.map((uniformType: string) => {
            // Check if this employee has this uniform type in their items
            const matchingItem = employee.items.find((item: DCItemOriginal) => {
              const itemType = item.uniformType || item.name;
              if (typeof itemType === 'string') {
                return itemType.trim() === uniformType.trim();
              } else if (Array.isArray(itemType)) {
                return itemType.some(type => type && type.trim() === uniformType.trim());
              }
              return false;
            });
            
            if (matchingItem) {
              console.log(`Found matching item for ${uniformType}:`, matchingItem);
              return matchingItem.size || "N/A";
            }
            
            // Fallback: check if employee has this uniform type in their uniformType array
            if (employee.uniformType?.some((type: string) => {
              if (!type || typeof type !== 'string') return false;
              return type.trim() === uniformType.trim() ||
                     type.trim().toLowerCase() === uniformType.trim().toLowerCase();
            })) {
              // Get size from employee data
              if (employee.size && employee.size[uniformType]) {
                return employee.size[uniformType];
              }
              // Try to find size by trimmed comparison
              const matchingType = employee.uniformType.find((type: string) => {
                if (!type || typeof type !== 'string') return false;
                return type.trim() === uniformType.trim() ||
                       type.trim().toLowerCase() === uniformType.trim().toLowerCase();
              });
              if (matchingType && employee.size && employee.size[matchingType]) {
                return employee.size[matchingType];
              }
            }
            return "N/A";
          }),
          "N/A", // Amount field
          "" // Employee signature field
        ];
       
        console.log(`Created row for employee ${employee.employeeId}:`, row);
        tableBody.push(row);
      });
     
      // Validate that we have a valid table body
      if (tableBody.length === 0) {
        console.error("No valid employee rows created for PDF table");
        throw new Error("No valid employee data available for PDF generation");
      }
     
      console.log(`Table body for employees:`, tableBody);
     
      // Calculate optimal column widths based on orientation for better visibility
      const baseColumns = 5; // SI No, Emp ID, Names, DESIGNATION, No of Set
      const uniformColumns = uniformTypesArray.length;
      const totalColumnsForWidth = baseColumns + uniformColumns + 2; // +2 for Amount and Emp Sign
      
      // Adjust margins and widths based on orientation
      const margin = useLandscape ? 20 : 15;
      const availableWidth = pageWidth - (margin * 2);
      
      // Calculate column widths - landscape allows more space per column
      const maxColumnWidth = useLandscape ? 
        Math.min(availableWidth / totalColumnsForWidth, 35) : // Landscape: more space per column
        Math.min(availableWidth / totalColumnsForWidth, 25);  // Portrait: compact columns
     
      const columnWidths: Record<string, { cellWidth: number }> = {
        '0': { cellWidth: Math.min(useLandscape ? 15 : 12, maxColumnWidth) }, // SI No
        '1': { cellWidth: Math.min(useLandscape ? 25 : 20, maxColumnWidth) }, // Emp ID
        '2': { cellWidth: Math.min(useLandscape ? 45 : 35, maxColumnWidth * 1.5) }, // Names - wider
        '3': { cellWidth: Math.min(useLandscape ? 35 : 25, maxColumnWidth) }, // DESIGNATION
        '4': { cellWidth: Math.min(useLandscape ? 20 : 15, maxColumnWidth) }, // No of Set
        // Dynamic uniform type columns - landscape allows more space
        ...uniformTypesArray.reduce((acc: Record<string, { cellWidth: number }>, _: string, index: number) => {
          acc[String(baseColumns + index)] = { 
            cellWidth: Math.min(useLandscape ? 35 : 25, maxColumnWidth) 
          };
          return acc;
        }, {} as Record<string, { cellWidth: number }>),
        [String(baseColumns + uniformColumns)]: { cellWidth: Math.min(useLandscape ? 20 : 15, maxColumnWidth) }, // Amount
        [String(baseColumns + uniformColumns + 1)]: { cellWidth: Math.min(useLandscape ? 25 : 20, maxColumnWidth) } // Emp Sign
      };
     
      // Table styling - keeping original format but with orientation-aware sizing
      autoTable(doc, {
        startY: y,
        head: [tableHeaders],
        body: tableBody,
        theme: "grid",
        headStyles: { 
          fillColor: [230, 230, 230], 
          textColor: 20, 
          fontStyle: 'bold', 
          fontSize: 8
        },
        styles: { 
          fontSize: 7, 
          cellPadding: 2, 
          textColor: 20
        },
        margin: { left: margin, right: margin, top: 2, bottom: 2 },
        tableWidth: availableWidth,
        columnStyles: columnWidths,
        // Prevent overflow with proper text handling
        // Remove page break logic to ensure single page
      });

          // Get Y after table
      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;

      // Terms & Conditions - compact for single page
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery", 12, finalY + 13);
      doc.text("2. Goods are delivered after careful checking", 12, finalY + 25);

      // Instruction on Handling Company Assets and Disclaimer
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Instruction on Handling Company Assets and Disclaimer", 12, finalY + 40);
      doc.setFont("helvetica", "normal");
      
      const instructionText = "All employees are instructed to handle company assets, equipment, and materials with the utmost care, diligence, and responsibility. It is the duty of every employee to ensure that all company property is used solely for official purposes and maintained in good working condition. Any loss, damage, or misuse of company property resulting from negligence, carelessness, or unauthorized use will make the concerned individual liable for recovery of the cost of such damages, as assessed and determined by the management. Employees are also required to promptly report any malfunction, loss, or damage of assets to their immediate supervisor.";
      const instructionLines = doc.splitTextToSize(instructionText, 180);
      doc.text(instructionLines, 12, finalY + 48);
      
      // Contact Information - placed after instruction text and before disclaimer
      const contactY = finalY + 48 + (instructionLines.length * 4.5);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("1. Office contact Number: Manager - 6366750572 and Babu - 7975532669", 12, contactY);
      doc.text("2. Site contact Name : _____________ number _____________", 12, contactY + 6);
      
      doc.setFont("helvetica", "bold");
      const disclaimerY = contactY + 14;
      doc.text("Disclaimer:", 12, disclaimerY);
      doc.setFont("helvetica", "normal");
      
      const disclaimerText = "The company reserves the right to recover the cost of repair, replacement, or loss arising from negligent or unauthorized use of company assets. Disciplinary action may also be initiated in cases of willful misconduct, negligence, or failure to comply with asset handling procedures.";
      const disclaimerLines = doc.splitTextToSize(disclaimerText, 180);
      doc.text(disclaimerLines, 12, disclaimerY + 6);

      // Signature lines - compact for single page
      const sigY = disclaimerY + 6 + (disclaimerLines.length * 6) + 10; // Dynamic spacing based on text height
      doc.setDrawColor(120);
      doc.line(20, sigY, 60, sigY);
      doc.text("Initiated by", 30, sigY + 3);
      doc.line(pageWidth / 2 - 20, sigY, pageWidth / 2 + 20, sigY);
      doc.text("Received by", pageWidth / 2 - 8, sigY + 3);
      doc.line(pageWidth - 60, sigY, pageWidth - 20, sigY);
      doc.text("Issued by", pageWidth - 50, sigY + 3);

    doc.save(`NRDC_${dc.dcNumber}.pdf`);
    setToast(`DC ${dc.dcNumber} PDF generated successfully!`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setToast("Error generating PDF. Please try again.");
    } finally {
      setPdfLoading(null);
    }
  };

  // Download RDC as PDF (simple format matching the image)
  const handleDownloadRDCPDF = async (rdc: DC) => {
    try {
      setPdfLoading(rdc.dcNumber);
      
      // Log the RDC data for debugging
      console.log("Generating PDF for RDC:", rdc);
      console.log("RDC items:", rdc.items);
      
      // Create PDF with A4 portrait orientation
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 15; // Starting position

      // Company Name & Address
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED", pageWidth / 2, y, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", pageWidth / 2, y + 8, { align: "center" });

      // Document Title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Returnable Delivery Challan", pageWidth / 2, y + 16, { align: "center" });

      // Outer border
      doc.setDrawColor(180);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

      y += 25;

      // RDC No and Date row
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`RDC No: ${rdc.dcNumber}`, 12, y);
      doc.text(`Date: ${rdc.dcDate ? rdc.dcDate.split("T")[0] : ""}`, pageWidth - 80, y);

      y += 8;

      // From/To boxes
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("From:", 15, y + 3);
      doc.text("To:", pageWidth / 2 + 2, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      const fromBoxWidth = pageWidth / 2 - 25;
      const toBoxWidth = pageWidth / 2 - 25;
      const boxHeight = 35; // Increased height to accommodate multiple lines
      
      doc.rect(15, y + 5, fromBoxWidth, boxHeight);
      doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED\n25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", 17, y + 8, { maxWidth: fromBoxWidth - 2 });
      doc.rect(pageWidth / 2 + 2, y + 5, toBoxWidth, boxHeight);
     
      // Get receiver name (customer)
      const receiverName = rdc.customer || "";
      
      // Get project name from various sources
      let projectName = "";
      if (rdc.projectName) {
        projectName = rdc.projectName;
      } else if (rdc.items && rdc.items.length > 0 && rdc.items[0].individualEmployeeData?.projectName) {
        projectName = rdc.items[0].individualEmployeeData.projectName;
      } else if (rdc.items && rdc.items.length > 0 && rdc.items[0].projectName) {
        projectName = rdc.items[0].projectName;
      }
      
      // Try to fetch project name from projects API based on address if not found
      if (!projectName && rdc.address) {
        try {
          const projectRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
          if (projectRes.ok) {
            const projectData = await projectRes.json();
            if (projectData && Array.isArray(projectData)) {
              const matchingProject = projectData.find((p: Project) => 
                p.address && rdc.address && (
                  rdc.address.toLowerCase().includes(p.address.toLowerCase()) ||
                  p.address.toLowerCase().includes(rdc.address.toLowerCase())
                )
              );
              if (matchingProject) {
                projectName = matchingProject.projectName;
              }
            }
          }
        } catch (error) {
          console.error("Error fetching project name:", error);
        }
      }
      
      console.log("Receiver name for RDC PDF:", receiverName);
      console.log("Project name for RDC PDF:", projectName);
     
      // Fetch customer address from project API
      let customerAddress = "";
      try {
        const projectRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          console.log("Available projects for address matching:", projectData);
          
          let matchingProject = null;
          
          // First try to match by projectName (most accurate)
          if (projectName && projectName !== "N/A" && projectName !== "Project Details") {
            matchingProject = projectData.find((p: { projectName: string; address?: string }) =>
              p.projectName.toLowerCase().trim() === projectName.toLowerCase().trim()
            );
            console.log(`Trying to match by projectName "${projectName}":`, matchingProject);
          }
          
          // If no match by project name, try by customer name
          if (!matchingProject && rdc.customer) {
            const customerNames = rdc.customer.split(',').map(name => name.trim());
            
            // First try exact match
            matchingProject = projectData.find((p: { projectName: string; address?: string }) =>
              customerNames.some(customerName => 
                customerName.toLowerCase().trim() === p.projectName.toLowerCase().trim()
              )
            );
            console.log(`Trying exact match by customer names:`, customerNames, matchingProject);
            
            // If no exact match, try partial match
            if (!matchingProject) {
              matchingProject = projectData.find((p: { projectName: string; address?: string }) =>
                customerNames.some(customerName =>
                  customerName.toLowerCase().includes(p.projectName.toLowerCase()) ||
                  p.projectName.toLowerCase().includes(customerName.toLowerCase())
                )
              );
              console.log(`Trying partial match by customer names:`, customerNames, matchingProject);
            }
          }
          
          // If still no match, try to find by any project that contains keywords from the customer name
          if (!matchingProject && rdc.customer) {
            const customerKeywords = rdc.customer.toLowerCase().split(/[,\s]+/).filter(word => word.length > 2);
            matchingProject = projectData.find((p: { projectName: string; address?: string }) =>
              customerKeywords.some(keyword =>
                p.projectName.toLowerCase().includes(keyword)
              )
            );
            console.log(`Trying keyword match by customer keywords:`, customerKeywords, matchingProject);
          }
          
          if (matchingProject && matchingProject.address) {
            customerAddress = matchingProject.address;
            console.log(`✅ Found address for project "${matchingProject.projectName}": ${customerAddress}`);
          } else {
            console.log(`❌ No matching project found for customer: ${rdc.customer}, projectName: ${projectName}`);
          }
        }
      } catch (error) {
        console.error("Error fetching customer address:", error);
      }
     
      // Create the "To" text with receiver name, project name, and address
      let toText = receiverName;
      
      // Add project name if available and different from receiver name
      if (projectName && projectName.trim() !== "" && projectName !== receiverName && projectName !== "N/A") {
        toText += `\nProject Name: ${projectName}`;
      }
     
      // Add customer address if found
      if (customerAddress && customerAddress.trim() !== "" && customerAddress !== "N/A" && customerAddress !== "Address not available") {
        // Remove "M/s." or "M/s" from the address
        const cleanedAddress = customerAddress.replace(/^M\/s\.?\s*/i, '').trim();
        
        // Format the address properly - split long addresses into multiple lines
        const addressLines = cleanedAddress.split(',').map(line => line.trim()).filter(line => line && !line.match(/^M\/s\.?$/i));
        
        if (addressLines.length > 1) {
          // Combine pin code, state, and country on one line
          const formattedLines: string[] = [];
          let i = 0;
          
          while (i < addressLines.length) {
            const currentLine = addressLines[i];
            // Check if current line is a pin code (all digits)
            const isPinCode = /^\d+$/.test(currentLine);
            
            if (isPinCode && i + 2 < addressLines.length) {
              // Combine pin code, state, and country
              const state = addressLines[i + 1];
              const country = addressLines[i + 2];
              formattedLines.push(`${currentLine}, ${state}, ${country}`);
              i += 3;
            } else if (isPinCode && i + 1 < addressLines.length) {
              // Combine pin code and state
              const state = addressLines[i + 1];
              formattedLines.push(`${currentLine}, ${state}`);
              i += 2;
            } else {
              formattedLines.push(currentLine);
              i++;
            }
          }
          
          toText += `\n${formattedLines.join('\n')}`;
        } else {
          toText += `\n${cleanedAddress}`;
        }
        console.log(`✅ Using fetched address: ${customerAddress}`);
      } else {
        console.log(`❌ No valid address found, customerAddress: "${customerAddress}"`);
        
        // If still no address, try to use a default address for known projects
        if (projectName && projectName.toLowerCase().includes('skootr')) {
          toText += `\n213, Rainmakers Workspace, Mahatma Gandhi Road\nRamanashree Arcade, Bengaluru, 560001\nKarnataka, INDIA`;
          console.log(`Using default Skootr address`);
        } else if (projectName && projectName.toLowerCase().includes('exozen')) {
          toText += `\n25/1, 4th Floor, SKIP House\nMuseum Road, Near Brigade Tower\nBangalore - 560025, Karnataka`;
          console.log(`Using default Exozen address`);
        } else if (projectName && projectName.toLowerCase().includes('testing')) {
          toText += `\n25/1, 4th Floor, Skip House\nMuseum Road, Near Brigade Tower\nBangalore - 560025, Karnataka`;
          console.log(`Using default Testing address`);
        }
      }
     
      // Log the final "To" text for debugging
      console.log("Final 'To' text for RDC PDF:", toText);
     
      // Write the "To" text to PDF with same alignment as "From" address
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      // Use same approach as "From" - doc.text with maxWidth for automatic wrapping and alignment
      doc.text(toText, pageWidth / 2 + 4, y + 8, { maxWidth: toBoxWidth - 2 });

      y += 30;

      // Create table headers - simple format like the image
      const tableHeaders = ["SI No", "Item Name", "Size", "Quantity", "Amount"];
     
      // Create table body using RDC items directly
      const tableBody: (string | number)[][] = [];
     
      let siNoCounter = 1; // Counter for SI No. that increments for each row
      
      rdc.items.forEach((item) => {
        // Create one row per item with total quantity (aggregated)
        const itemName = item.uniformType || item.name || "N/A";
        
        // Calculate total quantity - use serial numbers count if available, otherwise use item quantity
        const quantity = item.serialNumbers && item.serialNumbers.length > 0 
          ? item.serialNumbers.length 
          : (item.quantity || 0);
        
        const row: (string | number)[] = [
          siNoCounter++, // SI No - increment for each unique item
          Array.isArray(itemName) ? itemName.join(", ") : String(itemName), // Item Name - handle arrays
          item.size || "N/A", // Size
          quantity, // Total quantity for this item
          "N/A" // Amount field
        ];
       
        console.log(`Created RDC item row ${siNoCounter - 1}:`, row);
        tableBody.push(row);
      });
     
      // Validate that we have a valid table body
      if (tableBody.length === 0) {
        console.error("No valid RDC items found for PDF table");
        throw new Error("No valid RDC items available for PDF generation");
      }
     
      console.log(`Table body for RDC items:`, tableBody);
     
      // Calculate optimal column widths for simple 5-column format
      const totalColumnsForWidth = 5; // SI No, Item Name, Size, Quantity, Amount
      
      // Adjust margins and widths
      const margin = 15;
      const availableWidth = pageWidth - (margin * 2);
      
      // Calculate column widths
      const maxColumnWidth = Math.min(availableWidth / totalColumnsForWidth, 30);
     
      const columnWidths: Record<string, { cellWidth: number }> = {
        '0': { cellWidth: Math.min(20, maxColumnWidth) }, // SI No
        '1': { cellWidth: Math.min(60, maxColumnWidth * 2) }, // Item Name - wider
        '2': { cellWidth: Math.min(30, maxColumnWidth) }, // Size
        '3': { cellWidth: Math.min(25, maxColumnWidth) }, // Quantity
        '4': { cellWidth: Math.min(25, maxColumnWidth) } // Amount
      };
     
      // Table styling - simple format
      autoTable(doc, {
        startY: y,
        head: [tableHeaders],
        body: tableBody,
        theme: "grid",
        headStyles: { 
          fillColor: [230, 230, 230], 
          textColor: 20, 
          fontStyle: 'bold', 
          fontSize: 9,
          halign: 'center'
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 3, 
          textColor: 20,
          halign: 'left'
        },
        columnStyles: {
          ...columnWidths,
          0: { ...columnWidths['0'], halign: 'center' }, // SI No - centered
          1: { ...columnWidths['1'], halign: 'left' }, // Item Name - left aligned
          2: { ...columnWidths['2'], halign: 'left' }, // Size - left aligned
          3: { ...columnWidths['3'], halign: 'center' }, // Quantity - centered
          4: { ...columnWidths['4'], halign: 'center' } // Amount - centered
        },
        margin: { left: margin, right: margin, top: 2, bottom: 2 },
        tableWidth: availableWidth,
      });

      // Get Y after table
      let finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;

      // Add Serial Numbers section if any item has serial numbers
      const itemsWithSerialNumbers = rdc.items.filter(item => item.serialNumbers && item.serialNumbers.length > 0);
      if (itemsWithSerialNumbers.length > 0) {
        finalY += 5;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Serial Number Details:", 12, finalY);
        finalY += 5;
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        itemsWithSerialNumbers.forEach((item) => {
          const itemName = Array.isArray(item.uniformType) 
            ? item.uniformType.join(", ") 
            : String(item.uniformType || item.name || "N/A");
          
          doc.setFont("helvetica", "bold");
          doc.text(`${itemName} (${item.size || "N/A"}):`, 12, finalY);
          finalY += 4;
          
          doc.setFont("helvetica", "normal");
          item.serialNumbers?.forEach((serial, idx) => {
            const serialText = `${idx + 1}. Item Code: ${serial.itemCode || "N/A"} | Serial No: ${serial.serialNumber || "N/A"}`;
            doc.text(serialText, 15, finalY);
            finalY += 4;
          });
          finalY += 2;
        });
      }

      // Terms & Conditions - compact for single page
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery", 12, finalY + 13);
      doc.text("2. Goods are delivered after careful checking", 12, finalY + 25);
      doc.text("3. This is a Returnable Delivery Challan (RDC)", 12, finalY + 37);
      if (rdc.retrievalDeadline) {
        doc.text(`4. Items must be returned by: ${rdc.retrievalDeadline.split('T')[0]}`, 12, finalY + 49);
      }

      // Instruction on Handling Company Assets and Disclaimer
      const disclaimerStartY = finalY + (rdc.retrievalDeadline ? 62 : 52);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Instruction on Handling Company Assets and Disclaimer", 12, disclaimerStartY);
      doc.setFont("helvetica", "normal");
      
      const instructionText = "All employees are instructed to handle company assets, equipment, and materials with the utmost care, diligence, and responsibility. It is the duty of every employee to ensure that all company property is used solely for official purposes and maintained in good working condition. Any loss, damage, or misuse of company property resulting from negligence, carelessness, or unauthorized use will make the concerned individual liable for recovery of the cost of such damages, as assessed and determined by the management. Employees are also required to promptly report any malfunction, loss, or damage of assets to their immediate supervisor.";
      const instructionLines = doc.splitTextToSize(instructionText, 180);
      doc.text(instructionLines, 12, disclaimerStartY + 8);
      
      // Contact Information - placed after instruction text and before disclaimer
      const contactY = disclaimerStartY + 8 + (instructionLines.length * 4.5);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("1. Office contact Number: Manager - 6366750572 and Babu - 7975532669", 12, contactY);
      doc.text("2. Site contact Name : -------- number --------", 12, contactY + 6);
      
      doc.setFont("helvetica", "bold");
      const disclaimerTitleY = contactY + 14;
      doc.text("Disclaimer:", 12, disclaimerTitleY);
      doc.setFont("helvetica", "normal");
      
      const disclaimerText = "The company reserves the right to recover the cost of repair, replacement, or loss arising from negligent or unauthorized use of company assets. Disciplinary action may also be initiated in cases of willful misconduct, negligence, or failure to comply with asset handling procedures.";
      const disclaimerLines = doc.splitTextToSize(disclaimerText, 180);
      doc.text(disclaimerLines, 12, disclaimerTitleY + 6);

      // Signature lines - compact for single page
      const sigY = disclaimerTitleY + 6 + (disclaimerLines.length * 6) + 10; // Dynamic spacing based on text height
      doc.setDrawColor(120);
      doc.line(20, sigY, 60, sigY);
      doc.text("Initiated by", 30, sigY + 3);
      doc.line(pageWidth / 2 - 20, sigY, pageWidth / 2 + 20, sigY);
      doc.text("Received by", pageWidth / 2 - 8, sigY + 3);
      doc.line(pageWidth - 60, sigY, pageWidth - 20, sigY);
      doc.text("Issued by", pageWidth - 50, sigY + 3);

    doc.save(`RDC_${rdc.dcNumber}.pdf`);
    setToast(`RDC ${rdc.dcNumber} PDF generated successfully!`);
    } catch (error) {
      console.error("Error generating RDC PDF:", error);
      setToast("Error generating RDC PDF. Please try again.");
    } finally {
      setPdfLoading(null);
    }
  };

  // Download all DCs as summary PDF (styled, with logo and table)
  const handleDownloadAllDCs = async () => {
    try {
      setAllPdfLoading(true);
     
      // Create PDF with A4 landscape orientation for more space
      const doc = new jsPDF('landscape', 'mm', 'a4');
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable = undefined;

    const pageWidth = doc.internal.pageSize.getWidth();
    // const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // Company Name & Address
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", pageWidth / 2, y + 8, { align: "center" });

    y += 25;

    // Table Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Non-Returnable Delivery Challan Summary", pageWidth / 2, y, { align: "center" });

    y += 12;

    // Table - Only required columns: Sl.No, Customer, NRDC Number, Quantity, Size
    autoTable(doc, {
      startY: y,
      head: [["Sl.No", "Customer", "NRDC Number", "Quantity", "Size"]],
      body: dcData.map((dc, idx) => [
        idx + 1,
        dc.customer.length > 50 ? dc.customer.substring(0, 50) + "..." : dc.customer, // Increased to 50 for full data
        dc.dcNumber,
        dc.items.map(item => item.quantity).join(", "),
        dc.items.map(item => typeof item.size === 'string' ? item.size.substring(0, 40) + "..." : JSON.stringify(item.size).substring(0, 40) + "...").join(", ") // Increased to 40 for full data
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 10 }, // Increased font size
      styles: { fontSize: 9, cellPadding: 4, textColor: 20 }, // Increased font size and padding
      margin: { left: 10, right: 10, top: 2, bottom: 2 }, // Minimal margins
      tableWidth: pageWidth - 20, // Use full page width
      columnStyles: {
        '0': { cellWidth: 20 }, // Sl.No - increased for full data
        '1': { cellWidth: 80 }, // Customer - increased for full data
        '2': { cellWidth: 40 }, // NRDC Number - increased for full data
        '3': { cellWidth: 30 }, // Quantity - increased for full data
        '4': { cellWidth: 80 }  // Size - increased for full data
      },
      // Remove page break logic to ensure single page
    });

    // Get Y after table
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 40;

    // Terms & Conditions
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions", 14, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery.", 14, finalY + 20);
    doc.text("2. Goods are delivered after careful checking.", 14, finalY + 32);

    // Instruction on Handling Company Assets and Disclaimer
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Instruction on Handling Company Assets and Disclaimer", 14, finalY + 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    const instructionText = "All employees are instructed to handle company assets, equipment, and materials with the utmost care, diligence, and responsibility. It is the duty of every employee to ensure that all company property is used solely for official purposes and maintained in good working condition. Any loss, damage, or misuse of company property resulting from negligence, carelessness, or unauthorized use will make the concerned individual liable for recovery of the cost of such damages, as assessed and determined by the management. Employees are also required to promptly report any malfunction, loss, or damage of assets to their immediate supervisor.";
    const instructionLines = doc.splitTextToSize(instructionText, 270);
    doc.text(instructionLines, 14, finalY + 55);
    
    // Contact Information - placed after instruction text and before disclaimer
    const contactY = finalY + 55 + (instructionLines.length * 4.5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("1. Office contact Number: Manager - 6366750572 and Babu - 7975532669", 14, contactY);
    doc.text("2. Site contact Name : -------- number --------", 14, contactY + 7);
    
    doc.setFont("helvetica", "bold");
    const disclaimerY = contactY + 15;
    doc.text("Disclaimer:", 14, disclaimerY);
    doc.setFont("helvetica", "normal");
    
    const disclaimerText = "The company reserves the right to recover the cost of repair, replacement, or loss arising from negligent or unauthorized use of company assets. Disciplinary action may also be initiated in cases of willful misconduct, negligence, or failure to comply with asset handling procedures.";
    const disclaimerLines = doc.splitTextToSize(disclaimerText, 270);
    doc.text(disclaimerLines, 14, disclaimerY + 5);

    // Footer - calculate position dynamically
    const footerY = disclaimerY + 5 + (disclaimerLines.length * 5) + 10;
    doc.setFontSize(10);
    doc.text("Initiated by", 14, footerY);
    doc.text("Received by", 80, footerY);
    doc.text("Issued by", 150, footerY);

    doc.save("All_DCs_Summary.pdf");
    setToast("All DCs Summary PDF generated successfully!");
    } catch (error) {
      console.error("Error generating All DCs PDF:", error);
      setToast("Error generating PDF. Please try again.");
    } finally {
      setAllPdfLoading(false);
    }
  };

  // Bulk Issue Functions
  const handleProjectChange = (projectName: string) => {
    const project = projects.find(p => p.projectName === projectName);
    console.log('Selected project:', project);
    console.log('Project designationWiseCount:', project?.designationWiseCount);
    setSelectedProject(project || null);
    setSelectedDesignations([]);
    setSelectedUniforms([]);
    setSelectedItems([]);
    
    // Update bulkIssueData with project information
    setBulkIssueData(prev => ({
      ...prev,
      department: projectName,
      address: project?.address || prev.address
    }));
  };

  const handleDesignationChange = (designation: string, checked: boolean) => {
    if (checked) {
      setSelectedDesignations(prev => [...prev, designation]);
    } else {
      setSelectedDesignations(prev => prev.filter(d => d !== designation));
      setSelectedUniforms([]);
      setSelectedItems([]);
    }
  };

  const getAvailableDesignations = () => {
    if (!selectedProject) return [];
    
    // Get designations from project's designationWiseCount
    if (selectedProject.designationWiseCount) {
      const designations = Object.keys(selectedProject.designationWiseCount);
      console.log('Available designations from project:', designations);
      return designations;
    }
    
    // Fallback to uniform mappings if designationWiseCount is not available
    const mapping = uniformMappings.find(m => m.project === selectedProject.projectName);
    const designations = mapping ? mapping.designations : [];
    console.log('Available designations from mapping:', designations);
    return designations;
  };


  // Helper function to get uniforms for a specific designation
  const getUniformsForDesignation = (designation: string): InventoryItem[] => {
    if (!selectedProject) {
      console.log(`❌ No project selected for designation: ${designation}`);
      return [];
    }
    
    console.log(`🔍 Getting uniforms for designation: ${designation} in project: ${selectedProject.projectName}`);
    console.log(`📋 Total mappings available: ${uniformMappings.length}`);
    console.log(`📦 Total inventory items available: ${inventoryItems.length}`);
    
    // Use same logic as above for consistency
    let mappings = uniformMappings.filter(m => 
      m.project === selectedProject.projectName && 
      m.designations.includes(designation)
    );
    
    console.log(`🔍 Exact project match found ${mappings.length} mapping(s) for ${designation}`);
    
    if (mappings.length === 0) {
      console.log(`🔍 No exact match, trying partial matching...`);
      mappings = uniformMappings.filter(m => 
        (m.project.toLowerCase().includes(selectedProject.projectName.toLowerCase()) ||
         selectedProject.projectName.toLowerCase().includes(m.project.toLowerCase())) &&
        m.designations.includes(designation)
      );
      console.log(`🔍 Partial match found ${mappings.length} mapping(s) for ${designation}`);
    }
    
    console.log(`🔍 Final mappings for ${designation}:`, mappings);
    
    const uniforms: InventoryItem[] = [];
    const addedUniformIds = new Set<string>();
    
    mappings.forEach(mapping => {
      console.log(`👕 Processing mapping for ${designation}:`, mapping.uniformTypes);
      mapping.uniformTypes.forEach(uniformType => {
        const inventoryItem = inventoryItems.find(item => item.name === uniformType);
        console.log(`🔍 Looking for "${uniformType}" in inventory:`, inventoryItem ? 'Found' : 'Not found');
        if (inventoryItem && inventoryItem._id && !addedUniformIds.has(inventoryItem._id)) {
          uniforms.push(inventoryItem);
          addedUniformIds.add(inventoryItem._id);
          console.log(`✅ Added uniform: ${inventoryItem.name || 'Unknown'} for designation: ${designation}`);
        } else if (inventoryItem) {
          console.log(`⚠️ Uniform already added: ${inventoryItem.name}`);
        }
      });
    });
    
    console.log(`📊 Final result for ${designation}: ${uniforms.length} uniforms found:`, uniforms.map(u => u.name));
    return uniforms;
  };

  const handleUniformSelection = (uniformName: string, size: string, quantity: number) => {
    const existingIndex = selectedUniforms.findIndex(u => u.name === uniformName && u.size === size);
    if (existingIndex >= 0) {
      const updated = [...selectedUniforms];
      updated[existingIndex].quantity = quantity;
      setSelectedUniforms(updated);
    } else {
      setSelectedUniforms(prev => [...prev, { name: uniformName, size, quantity }]);
    }
  };

  const createBulkIssueEntries = (uniforms: Array<{name: string, quantity: number, size: string}>, project: Project, designations: string[]) => {
    const entries: BulkIssueItem[] = [];
    
    const relevantEmployees = employees.filter(emp => 
      emp.projectName === project.projectName && 
      designations.includes(emp.designation)
    );

    // Always create bulk entries (one per item/size combination)
    uniforms.forEach(uniform => {
      const inventoryItem = inventoryItems.find(item => item.name === uniform.name);
      if (inventoryItem) {
        entries.push({
          itemId: inventoryItem._id || '',
          itemName: inventoryItem.name || '',
          itemCode: inventoryItem.itemCode || '',
          size: uniform.size,
          quantity: uniform.quantity, // Keep original quantity as single bulk entry
          employeeId: `BULK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          employeeName: `Bulk Issue - ${designations.join(', ')}`,
          remarks: `Bulk issue for ${designations.join(', ')} - ${project.projectName} | Project Address: ${project.address || 'N/A'} | Total Manpower: ${project.totalManpower} | Affected Employees: ${relevantEmployees.length}`
        });
      }
    });
    
    console.log('Created bulk issue entries:', entries);
    console.log('Project details used:', project);
    console.log('Designations used:', designations);
    console.log('Relevant employees found:', relevantEmployees.length);
    
    return entries;
  };

  const showDCPopupForUniforms = () => {
    if (selectedUniforms.length === 0) {
      setToast("Please select at least one uniform with quantity");
      return;
    }

    if (!selectedProject || selectedDesignations.length === 0) {
      setToast("Please select both project and at least one designation");
      return;
    }

    try {
      const newEntries = createBulkIssueEntries(selectedUniforms, selectedProject, selectedDesignations);
      
      if (newEntries.length === 0) {
        setToast("No valid entries could be created. Please check your selections.");
        return;
      }
      
      setSelectedItems(prev => [...prev, ...newEntries]);
      setToast(`Added ${newEntries.length} items to bulk issue for ${selectedProject.projectName} - ${selectedDesignations.join(', ')}`);
      setSelectedUniforms([]);
      
      // Show summary of what was added
      const summary: Record<string, { totalQty: number; sizes: Set<string> }> = {};
      newEntries.forEach(item => {
        if (!summary[item.itemName]) {
          summary[item.itemName] = { totalQty: 0, sizes: new Set() };
        }
        summary[item.itemName].totalQty += item.quantity;
        summary[item.itemName].sizes.add(item.size);
      });
      
      const summaryText = Object.entries(summary)
        .map(([itemName, details]) => 
          `${itemName}: ${details.totalQty} pieces (sizes: ${Array.from(details.sizes).join(', ')})`
        )
        .join('\n');
      
      console.log('Bulk Issue Summary:', summaryText);
      
    } catch (error) {
      console.error("Error processing uniforms:", error);
      setToast("Error processing uniforms. Please try again.");
    }
  };

  // Handle DC download
  const handleDCDownload = async (issue: Issue) => {
    let dc = issue.outwardDC;
    
    // If we don't have the DC object but have dcNumber, fetch it
    if (!dc && issue.dcNumber) {
      try {
        // Fetch all DCs and find the one with matching DC number
        const response = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc');
        if (response.ok) {
          const result = await response.json();
          let allDCs = [];
          if (result.success && Array.isArray(result.data)) {
            allDCs = result.data;
          } else if (Array.isArray(result)) {
            allDCs = result;
          } else if (result.dcs && Array.isArray(result.dcs)) {
            allDCs = result.dcs;
          }
          
          // Find DC with matching DC number
          const matchingDC = allDCs.find((dcItem: DCItemAPI) => dcItem.dcNumber === issue.dcNumber);
          if (matchingDC) {
            dc = matchingDC;
          }
        }
      } catch (error) {
        console.error('Error fetching DC by number:', error);
      }
    }
    
    if (!dc) {
      setToast("No DC found for this issue");
      return;
    }
    
    // Generate and download DC PDF
    await handleDownloadDC(dc as DC);
  };

  // Handle downloading issue (generate PDF from issue data)
  const handleDownloadIssue = async (issue: Issue) => {
    try {
      setPdfLoading(issue._id);
      
      // Fetch employee details for the mapped employees if DC exists
      const employeeDetailsMap: Record<string, {fullName: string, designation: string}> = {};
      if (issue.outwardDC) {
        const uniqueEmployeeIds = [...new Set(
          issue.outwardDC.items.flatMap(item => 
            ('employeeMappings' in item && item.employeeMappings) ? item.employeeMappings.map((mapping: { employeeId: string }) => mapping.employeeId) : []
          )
        )].filter(Boolean);
        
        if (uniqueEmployeeIds.length > 0) {
          for (const employeeId of uniqueEmployeeIds) {
            try {
              const details = await fetchEmployeeDetailsFromKYC(employeeId);
              if (details) {
                employeeDetailsMap[employeeId] = details;
              }
            } catch (error) {
              console.error(`Error fetching details for employee ${employeeId}:`, error);
            }
          }
        }
      }
      
      const doc = new jsPDF('portrait', 'mm', 'a4');
      
      // Add page border
      doc.setDrawColor(0, 0, 0); // Black border
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277); // Full page border with margins (portrait)
      
      // Add company header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka', 105, 28, { align: 'center' });
      
      // Add title with DC number
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text(`Delivery Challan - ${issue.dcNumber || issue._id}`, 105, 40, { align: 'center' });
      
      // Add separator line
      doc.setDrawColor(0, 0, 0); // Black line
      doc.setLineWidth(0.5);
      doc.line(20, 45, 190, 45);
      
      // Add DC number and date below separator
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('DC Number:', 20, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(issue.dcNumber || issue._id, 20, 62);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 150, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(issue.issueDate).toISOString().split('T')[0], 150, 62);
      
      // Add From/To sections with horizontal lines
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('From:', 20, 75);
      
      // Add horizontal line directly below From label
      doc.setDrawColor(0, 0, 0); // Black line
      doc.setLineWidth(0.1);
      doc.line(20, 78, 70, 78);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      // Split long company name into multiple lines with proper wrapping
      doc.text('EXOZEN FACILITY MANAGEMENT', 20, 85);
      doc.text('SERVICES PRIVATE LIMITED', 20, 92);
      doc.text('25/1, 4th Floor, SKIP House, Museum Road,', 20, 99);
      doc.text('Near Brigade Tower, Bangalore - 560025,', 20, 106);
      doc.text('Karnataka', 20, 113);
      
      doc.setFont('helvetica', 'bold');
      doc.text('To:', 100, 75);
      
      // Add horizontal line directly below To label
      doc.line(100, 78, 160, 78);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text(issue.issueTo, 100, 85);
      doc.text(issue.department, 100, 92);
      doc.text(`Generated from Issue ${issue._id}`, 100, 99);
      
      // Add items table with Delivery Challan format
      const tableData = issue.items.map((item, index) => {
        // If DC exists, get employee ID from employeeMappings, otherwise use item.employeeId
        let employeeId = item.employeeId;
        if (issue.outwardDC) {
          const dcItem = issue.outwardDC.items.find(dcItem => 
            dcItem.itemId === item.itemId?._id || dcItem.uniformType === item.itemId?.name
          );
          if (dcItem?.employeeMappings && dcItem.employeeMappings.length > 0) {
            employeeId = dcItem.employeeMappings[0].employeeId;
          }
        }
        
        const employeeDetail = employeeId && employeeDetailsMap[employeeId] 
          ? employeeDetailsMap[employeeId] 
          : null;
        
        return [
        index + 1,
          employeeId || 'N/A', // Emp ID
          employeeDetail?.fullName || 'N/A', // Names
          employeeDetail?.designation || 'N/A', // Designation
        item.itemId?.name || item.name || 'N/A',
        item.size || 'N/A',
        item.quantity,
        'N/A', // Amount
        '' // Emp Sign
        ];
      });
      
      autoTable(doc, {
        startY: 125,
        head: [['SI No', 'Emp ID', 'Names', 'Designation', 'Item Name', 'Size', 'Quantity', 'Amount', 'Emp Sign']],
        body: tableData,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          halign: 'center',
          textColor: [0, 0, 0], // Black text
          lineColor: [0, 0, 0], // Black borders
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [240, 240, 240], // Light grey background
          textColor: [0, 0, 0], // Black text
          fontStyle: 'bold',
          halign: 'center',
          lineColor: [0, 0, 0], // Black borders
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { halign: 'center' }, // SI No
          1: { halign: 'center' }, // Emp ID
          2: { halign: 'left' },   // Names
          3: { halign: 'center' }, // Designation
          4: { halign: 'left' },   // Item Name
          5: { halign: 'center' }, // Size
          6: { halign: 'center' }, // Quantity
          7: { halign: 'center' }, // Amount
          8: { halign: 'center' }, // Emp Sign
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255], // White background
        },
        margin: { left: 20, right: 20 },
        theme: 'grid',
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.1,
      });
      
      // Add terms and conditions
      const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 200;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('Notes/Conditions:', 20, finalY + 10);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('1. Complaints will be entertained if the goods are received within 24hrs of delivery', 20, finalY + 20);
      doc.text('2. Goods are delivered after careful checking', 20, finalY + 32);
      doc.text('3. This is a Bulk Issue Challan', 20, finalY + 44);
      doc.text('4. All items are issued as per company policy', 20, finalY + 56);
      
      // Instruction on Handling Company Assets and Disclaimer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('Instruction on Handling Company Assets and Disclaimer', 20, finalY + 72);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      
      const instructionText = 'All employees are instructed to handle company assets, equipment, and materials with the utmost care, diligence, and responsibility. It is the duty of every employee to ensure that all company property is used solely for official purposes and maintained in good working condition. Any loss, damage, or misuse of company property resulting from negligence, carelessness, or unauthorized use will make the concerned individual liable for recovery of the cost of such damages, as assessed and determined by the management. Employees are also required to promptly report any malfunction, loss, or damage of assets to their immediate supervisor.';
      const instructionLines = doc.splitTextToSize(instructionText, 170);
      doc.text(instructionLines, 20, finalY + 82);
      
      // Contact Information - placed after instruction text and before disclaimer
      const contactY = finalY + 82 + (instructionLines.length * 4.5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('1. Office contact Number: Manager - 6366750572 and Babu - 7975532669', 20, contactY);
      doc.text('2. Site contact Name : -------- number --------', 20, contactY + 6);
      
      doc.setFont('helvetica', 'bold');
      const disclaimerY = contactY + 14;
      doc.text('Disclaimer:', 20, disclaimerY);
      doc.setFont('helvetica', 'normal');
      
      const disclaimerText = 'The company reserves the right to recover the cost of repair, replacement, or loss arising from negligent or unauthorized use of company assets. Disciplinary action may also be initiated in cases of willful misconduct, negligence, or failure to comply with asset handling procedures.';
      const disclaimerLines = doc.splitTextToSize(disclaimerText, 170);
      doc.text(disclaimerLines, 20, disclaimerY + 6);
      
      // Add signature lines - calculate position dynamically
      const signatureY = disclaimerY + 6 + (disclaimerLines.length * 6) + 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      doc.text('Initiated by: _________________', 20, signatureY);
      doc.text('Received by: _________________', 90, signatureY);
      doc.text('Issued by: _________________', 150, signatureY);
      
      // Save the PDF
      doc.save(`Delivery_Challan_${issue.issueTo}_${new Date(issue.issueDate).toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating issue PDF:', error);
      setToast('Error generating PDF. Please try again.');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to update uniform requests with DC number and status
  const updateUniformRequestsWithDC = async (dcNumber: string, employeeIds: string[]): Promise<void> => {
    if (!dcNumber || employeeIds.length === 0) {
      console.log('Skipping uniform request update: missing DC number or employee IDs');
      return;
    }

    try {
      console.log('Updating uniform requests with DC number:', dcNumber, 'for employees:', employeeIds);
      
      // Get unique employee IDs
      const uniqueEmployeeIds = Array.from(new Set(employeeIds.filter(id => id)));
      
      if (uniqueEmployeeIds.length === 0) {
        console.log('No valid employee IDs to update');
        return;
      }

      // Fetch all uniform requests to find matching ones
      const uniformRes = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      if (!uniformRes.ok) {
        console.error('Failed to fetch uniform requests');
        return;
      }

      const uniformData = await uniformRes.json();
      let allUniformRequests: any[] = [];

      // Handle different API response structures
      if (uniformData.success && uniformData.uniforms) {
        allUniformRequests = uniformData.uniforms;
      } else if (Array.isArray(uniformData)) {
        allUniformRequests = uniformData;
      } else if (uniformData.success && uniformData.employeeGroups) {
        // Flatten employee groups - check both requests and uniforms arrays
        allUniformRequests = uniformData.employeeGroups.flatMap((group: any) => {
          const requests = group.requests || [];
          const uniforms = group.uniforms || [];
          return [...requests, ...uniforms];
        });
      }

      // Filter uniform requests for the employee IDs we need to update
      // Also check if DC number already exists but status is not "Issued"
      const requestsToUpdate = allUniformRequests.filter((request: any) => {
        if (!request.employeeId || !uniqueEmployeeIds.includes(request.employeeId)) {
          return false;
        }
        
        // If DC number exists but status is not "Issued", we should update it
        const hasDCNumber = request.dcNumber && 
                           request.dcNumber.trim() !== '' && 
                           request.dcNumber.toLowerCase() !== 'n/a' &&
                           request.dcNumber !== 'null' &&
                           request.dcNumber !== 'undefined';
        
        const isNotIssued = !request.issuedStatus || 
                           request.issuedStatus.toLowerCase() !== 'issued';
        
        // Update if: no DC number yet, OR has DC number but status is not Issued
        return !hasDCNumber || (hasDCNumber && isNotIssued);
      });

      console.log(`Found ${requestsToUpdate.length} uniform requests to update`);

      // Update each uniform request with DC number and issued status
      const updatePromises = requestsToUpdate.map(async (request: any) => {
        try {
          // Use existing DC number if available, otherwise use the new one
          const finalDCNumber = (request.dcNumber && 
                                request.dcNumber.trim() !== '' && 
                                request.dcNumber.toLowerCase() !== 'n/a' &&
                                request.dcNumber !== 'null' &&
                                request.dcNumber !== 'undefined') 
                                ? request.dcNumber 
                                : dcNumber;
          
          console.log(`Updating uniform request for employee ${request.employeeId} with DC number: ${finalDCNumber}`);
          
          const updateRes = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${request.employeeId}/update-dc`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requestId: request._id,
              dcNumber: finalDCNumber,
              issuedStatus: 'Issued',
              issuedDate: new Date().toISOString().split('T')[0] // Add issued date
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
                  dcNumber: finalDCNumber,
                  issuedStatus: 'Issued',
                  issuedDate: new Date().toISOString().split('T')[0] // Add issued date
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
  };

  const createIssueFromBulkItems = async () => {
    if (!bulkIssueData.issueTo || !bulkIssueData.purpose || selectedItems.length === 0) {
      setToast("Please fill all required fields and select items");
      return;
    }

    setIsCreatingIssue(true);
    try {
      const issueData = {
        issueTo: bulkIssueData.issueTo,
        department: bulkIssueData.department,
        purpose: bulkIssueData.purpose,
        address: bulkIssueData.address,
        issueDate: bulkIssueData.issueDate,
        items: selectedItems.map(item => ({
          id: item.itemId,
          quantity: item.quantity,
          size: item.size,
          employeeId: item.employeeId
        }))
      };

      console.log('Creating issue with payload:', issueData);
      console.log('Total quantity calculation:', issueData.items.reduce((sum, item) => sum + item.quantity, 0));
      console.log('Number of items:', issueData.items.length);

      const response = await fetch("https://inventory.zenapi.co.in/api/inventory/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(issueData),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Bulk issue creation response:', responseData);
        setToast("Bulk issue created successfully!");
        
        // Check if the response contains the created issue ID
        if (responseData.success && responseData.issueId) {
          const issueId = responseData.issueId;
          console.log('Created issue ID from response:', issueId);
          
          // Automatically create DC for the newly created issue
          try {
            console.log('Auto-creating DC for newly created issue:', issueId);
            
            // Generate DC number (13 characters like DC1759738190393)
            const generateDCNumber = () => {
              const timestamp = Date.now();
              return `DC${timestamp}`;
            };
            
            const dcCreationData = {
              dcNumber: generateDCNumber(),
              customer: bulkIssueData.issueTo,
              dcDate: bulkIssueData.issueDate,
              address: selectedProject?.projectName || bulkIssueData.address,
              remarks: "Generated from Bulk Issue",
              department: bulkIssueData.department
            };
            
            console.log('DC creation data:', dcCreationData);
            
            // Create DC directly using the API
            const dcResponse = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/from-issue/${issueId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dcCreationData),
            });
            
            if (dcResponse.ok) {
              const dcResult = await dcResponse.json();
              console.log('DC creation response:', dcResult);
              if (dcResult.success) {
                const createdDC = dcResult.dc || dcResult.data;
                const dcNumber = createdDC?.dcNumber || dcCreationData.dcNumber;
                
                // Check if this is an RDC (Retrievable DC) - skip uniform request update for RDCs
                const isRDC = createdDC?.isRetrievable === true || 
                             (dcNumber && dcNumber.toUpperCase().startsWith('RDC'));
                
                // Only update uniform requests for NRDC (Non-Retrievable DC)
                if (!isRDC) {
                  // Extract employee IDs - prefer from DC items (employeeMappings) if available, otherwise from issue items
                  let employeeIds: string[] = [];
                  
                  if (createdDC?.items && Array.isArray(createdDC.items)) {
                    // Extract from DC employee mappings (more accurate)
                    employeeIds = createdDC.items.flatMap((item: any) => {
                      if (item.employeeMappings && Array.isArray(item.employeeMappings)) {
                        return item.employeeMappings.map((mapping: any) => mapping.employeeId);
                      }
                      return item.employeeId ? [item.employeeId] : [];
                    }).filter((id: any): id is string => Boolean(id));
                  }
                  
                  // Fallback to issue items if no employee IDs found in DC
                  if (employeeIds.length === 0) {
                    employeeIds = issueData.items
                      .map(item => item.employeeId)
                      .filter((id): id is string => Boolean(id));
                  }
                  
                  // Update uniform requests with DC number and status (only for NRDC)
                  if (dcNumber && employeeIds.length > 0) {
                    await updateUniformRequestsWithDC(dcNumber, employeeIds);
                  }
                } else {
                  console.log('Skipping uniform request update for RDC:', dcNumber);
                }
                
                setToast("Bulk issue and DC created successfully!");
              } else {
                setToast("Bulk issue created, but DC creation failed. Please create DC manually.");
              }
            } else {
              console.error('DC creation failed:', await dcResponse.text());
              setToast("Bulk issue created, but DC creation failed. Please create DC manually.");
            }
          } catch (dcError) {
            console.error('Error creating DC:', dcError);
            setToast("Bulk issue created, but DC creation failed. Please create DC manually.");
          }
        }
        
        // Refresh issues list
        const fetchIssues = async () => {
          try {
            const response = await fetch("https://inventory.zenapi.co.in/api/inventory/issue");
            await response.json();
            
            // Issues updated successfully
          } catch (err) {
            console.error("Error refreshing issues:", err);
          }
        };
        
        await fetchIssues();
        
        setShowBulkIssue(false);
        setBulkIssueData({
          issueTo: "",
          department: "",
          purpose: "",
          address: "",
          issueDate: new Date().toISOString().split('T')[0],
          items: []
        });
        setSelectedItems([]);
        setSelectedProject(null);
        setSelectedDesignations([]);
        setSelectedUniforms([]);
      } else {
        const errorData = await response.text();
        setToast(`Error creating issue: ${errorData}`);
      }
    } catch (error) {
      console.error("Error creating issue:", error);
      setToast("Error creating issue. Please try again.");
    } finally {
      setIsCreatingIssue(false);
    }
  };

  // DC Creation from Issues Functions
  const handleViewIssue = async (issue: Issue) => {
    setSelectedIssueForView(issue);
    setShowViewModal(true);
    
    // Fetch employee details for the mapped employees if DC exists
    if (issue.outwardDC) {
      const uniqueEmployeeIds = [...new Set(
        issue.outwardDC.items.flatMap(item => 
          ('employeeMappings' in item && item.employeeMappings) ? item.employeeMappings.map((mapping: { employeeId: string }) => mapping.employeeId) : []
        )
      )].filter(Boolean);
      
      if (uniqueEmployeeIds.length > 0) {
        const employeeDetailsMap: Record<string, {fullName: string, designation: string}> = {};
        
        for (const employeeId of uniqueEmployeeIds) {
          try {
            const details = await fetchEmployeeDetailsFromKYC(employeeId);
            if (details) {
              employeeDetailsMap[employeeId] = details;
            }
          } catch (error) {
            console.error(`Error fetching details for employee ${employeeId}:`, error);
          }
        }
        
        setEmployeeDetails(prev => ({ ...prev, ...employeeDetailsMap }));
      }
    }
  };




  const refreshIssues = async () => {
    try {
      const response = await fetch("https://inventory.zenapi.co.in/api/inventory/issue");
      await response.json();
      
      // Issues refreshed successfully
    } catch (err) {
      console.error("Error refreshing issues:", err);
    }
  };

  // RDC (Retrievable DC) API functions
  const fetchRDCs = async () => {
    setRdcLoading(true);
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/retrievable/list?t=${Date.now()}`);
      const data = await response.json();
      
      console.log("RDC API Response:", data);
      
      if (data && data.success && Array.isArray(data.retrievableDCs)) {
        setRdcData(data.retrievableDCs);
      } else if (Array.isArray(data)) {
        setRdcData(data);
      } else {
        setRdcData([]);
      }
    } catch (error) {
      console.error("Error fetching RDCs:", error);
      setRdcData([]);
    } finally {
      setRdcLoading(false);
    }
  };

  // Function to fetch bulk issue DCs
  const fetchBulkIssueDCs = async () => {
    setBulkIssueDCsLoading(true);
    setBulkIssueDCsError(null);
    try {
      const response = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc/bulk-issue/list");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bulk issue DCs: ${response.status} ${response.statusText}`);
      }
      
      const data: BulkIssueDCResponse = await response.json();
      console.log("Bulk Issue DCs API response:", data);
      
      if (data && data.success && Array.isArray(data.bulkIssueDCs)) {
        setBulkIssueDCs(data.bulkIssueDCs);
        console.log(`Loaded ${data.bulkIssueDCs.length} bulk issue DCs`);
      } else {
        console.warn("Unexpected bulk issue DCs data format:", data);
        setBulkIssueDCs([]);
      }
    } catch (err) {
      console.error("Error fetching bulk issue DCs:", err);
      setBulkIssueDCsError("Failed to fetch bulk issue DCs");
      setBulkIssueDCs([]);
    } finally {
      setBulkIssueDCsLoading(false);
    }
  };

  // Function to convert BulkIssueDC to Issue format for actions
  const convertBulkIssueDCToIssue = (bulkIssueDC: BulkIssueDC): Issue => {
    const convertedItems: Issue['items'] = bulkIssueDC.items.map(item => {
      const employeeId: string | undefined = item.employeeId ?? undefined;
      return {
        _id: item._id,
        itemId: {
          _id: item.itemId,
          itemCode: "",
          category: "",
          subCategory: "",
          name: item.uniformType
        },
        quantity: item.quantity,
        size: item.size,
        employeeId: employeeId,
        name: item.uniformType,
        itemCode: "",
        price: "",
        remarks: ""
      };
    });

    const convertedOutwardDCItems: DCItemOriginal[] = bulkIssueDC.items.map(item => {
      const employeeId: string = item.employeeId ?? "";
      return {
        _id: item._id,
        itemId: item.itemId,
        quantity: item.quantity,
        size: item.size,
        employeeId: employeeId,
        uniformType: item.uniformType,
        totalQuantity: item.totalQuantity,
        remainingQuantity: item.remainingQuantity,
        employeeMappings: item.employeeMappings,
        itemCode: "",
        name: item.uniformType,
        price: "",
        remarks: ""
      };
    });

    return {
      _id: bulkIssueDC._id,
      issueTo: bulkIssueDC.customer,
      department: bulkIssueDC.address, // Using address as department
      purpose: bulkIssueDC.remarks || "Generated from Issue",
      issueDate: bulkIssueDC.dcDate,
      address: bulkIssueDC.address,
      items: convertedItems,
      createdAt: bulkIssueDC.createdAt,
      updatedAt: bulkIssueDC.updatedAt,
      __v: bulkIssueDC.__v,
      outwardDC: {
        _id: bulkIssueDC._id,
        customer: bulkIssueDC.customer,
        dcNumber: bulkIssueDC.dcNumber,
        dcDate: bulkIssueDC.dcDate,
        address: bulkIssueDC.address,
        remarks: bulkIssueDC.remarks,
        items: convertedOutwardDCItems,
        createdAt: bulkIssueDC.createdAt,
        updatedAt: bulkIssueDC.updatedAt
      },
      dcNumber: bulkIssueDC.dcNumber
    };
  };

  // RDC Helper Functions (simplified - no designation mapping) - Updated

  // Generate Asset Issuance Form PDF (can be called after creation or from action button)
  const generateAssetIssuanceForm = async (rdc: DC, rdcCreationData?: { issueTo: string; department: string; address: string; issueDate: string }) => {
    try {
      setPdfLoading(`asset_${rdc.dcNumber}`);
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 15;

      // Header - Company Name with styled EXOZEN (exactly matching the image)
      // EXO in black, ZEN in orange, with FACILITY MANAGEMENT SERVICES PVT LTD to the right
      doc.setFontSize(22); // Increased size for EXOZEN
      doc.setFont("helvetica", "bold");
      
      // EXO in black
      doc.setTextColor(0, 0, 0); // Black for EXO
      doc.text("EXO", 20, y);
      
      // ZEN in vibrant orange (no space between EXO and ZEN)
      doc.setTextColor(230, 81, 0); // Vibrant orange for ZEN (#E65100)
      const exoWidth = doc.getTextWidth("EXO");
      doc.text("ZEN", 20 + exoWidth, y); // No gap between EXO and ZEN
      
      // FACILITY MANAGEMENT SERVICES PVT LTD in black (same line, with proper space to prevent overlap)
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal"); // Regular weight, not bold
      doc.setTextColor(0, 0, 0); // Black matching EXO
      const zenWidth = doc.getTextWidth("ZEN");
      const exozenEndX = 20 + exoWidth + zenWidth;
      doc.text("FACILITY MANAGEMENT SERVICES PVT LTD", exozenEndX + 10, y); // More space to move F away from N

      // Reset text color to black for rest of document
      doc.setTextColor(0, 0, 0);

      y += 12;

      // Horizontal line above the title (dark gray, thin)
      doc.setDrawColor(100, 100, 100); // Dark gray line
      doc.setLineWidth(0.5);
      doc.line(20, y, pageWidth - 20, y);

      y += 5;

      // Document Title
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("ASSET ISSUANCE FORM / CONSENT FORM", pageWidth / 2, y, { align: "center" });

      y += 5;

      // Employee Details Section
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Employee Details", 20, y);

      y += 4;

      // Get project name from various sources
      let projectName = "";
      if (rdc.projectName) {
        projectName = rdc.projectName;
      } else if (rdcCreationData?.department) {
        // Check if department field contains the project name
        projectName = rdcCreationData.department;
      } else if (rdc.items && rdc.items.length > 0 && rdc.items[0].individualEmployeeData?.projectName) {
        projectName = rdc.items[0].individualEmployeeData.projectName;
      } else if (rdc.items && rdc.items.length > 0 && rdc.items[0].projectName) {
        projectName = rdc.items[0].projectName;
      } else {
        // Try to fetch project name from projects API based on address
        try {
          const address = rdcCreationData?.address || rdc.address || "";
          if (address) {
            const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
            const projectsData = await projectsRes.json();
            if (projectsData && Array.isArray(projectsData)) {
              const matchingProject = projectsData.find((p: Project) => 
                p.address && address.toLowerCase().includes(p.address.toLowerCase()) ||
                p.address && p.address.toLowerCase().includes(address.toLowerCase())
              );
              if (matchingProject) {
                projectName = matchingProject.projectName;
              }
            }
          }
        } catch (error) {
          console.error("Error fetching project name:", error);
        }
        // If still no project name found, don't use customer as fallback
        if (!projectName) {
          projectName = "";
        }
      }

      // Employee Details Table
      const employeeTableData = [
        [
          "Receiver Name",
          rdcCreationData?.issueTo || rdc.customer || "",
          "Date of Issue:",
          rdc.dcDate ? rdc.dcDate.split("T")[0] : new Date().toISOString().split("T")[0]
        ],
        [
          "Project Name",
          projectName,
          "Department / Site",
          rdcCreationData?.department || rdcCreationData?.address || rdc.address || ""
        ],
        [
          "Designation",
          "",
          "",
          ""
        ],
        [
          "Contact Number",
          "",
          "",
          ""
        ]
      ];

      autoTable(doc, {
        startY: y,
        head: [],
        body: employeeTableData,
        theme: "grid",
        styles: {
          cellPadding: 1,
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
          fontSize: 7,
          minCellHeight: 5
        },
        margin: { left: 20, right: 20 },
        tableWidth: pageWidth - 40,
        columnStyles: {
          0: { 
            cellWidth: (pageWidth - 40) * 0.25, 
            halign: 'left',
            fontStyle: 'bold',
            cellPadding: 1
          }, // Label column 1
          1: { 
            cellWidth: (pageWidth - 40) * 0.25, 
            halign: 'left',
            cellPadding: 1
          }, // Input column 1
          2: { 
            cellWidth: (pageWidth - 40) * 0.25, 
            halign: 'left',
            fontStyle: 'bold',
            cellPadding: 1
          }, // Label column 2
          3: { 
            cellWidth: (pageWidth - 40) * 0.25, 
            halign: 'left',
            cellPadding: 1
          }  // Input column 2
        }
      });

      const employeeTableEndY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 20;
      y = employeeTableEndY + 4;

      // Asset Details Section
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Asset Details", 20, y);

      y += 4;

      // Asset Details Table
      const tableHeaders = ["SL No.", "Asset Description", "Asset Code / Serial No.", "Quantity", "Condition at Issue (New/Used)", "Remarks"];
      const tableBody: (string | number)[][] = [];

      // Fetch inventory items to get item codes if needed
      let inventoryItemsList: UniformItem[] = [];
      try {
        const invRes = await fetch("https://inventory.zenapi.co.in/api/inventory/items");
        const invData = await invRes.json();
        if (invData && Array.isArray(invData)) {
          inventoryItemsList = invData;
        }
      } catch (error) {
        console.error("Error fetching inventory items:", error);
      }

      let slNoCounter = 1; // Counter for SL No. that increments for each row
      
      rdc.items.forEach((item) => {
        const assetDescription = Array.isArray(item.uniformType) 
          ? item.uniformType.join(", ") 
          : String(item.uniformType || item.name || "N/A");
        
        // Prioritize itemCode from the item itself
        let baseAssetCode = item.itemCode || "";
        
        // If itemCode is not available, try to find it from inventory items
        if (!baseAssetCode) {
          const inventoryItem = inventoryItemsList.find(invItem => 
            invItem._id === item.itemId
          );
          if (inventoryItem?.itemCode) {
            baseAssetCode = inventoryItem.itemCode;
          } else {
            baseAssetCode = "N/A";
          }
        }
        
        // If item has serial numbers, create a row for each serial number
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          item.serialNumbers.forEach((serial) => {
            // Use the itemCode from serial entry, fallback to base assetCode
            const itemCode = serial.itemCode || baseAssetCode;
            // Format: "ASS-WA-WAL/123" (itemCode/serialNumber)
            const serialInfo = serial.serialNumber 
              ? `${itemCode}/${serial.serialNumber}`
              : itemCode;
            tableBody.push([
              slNoCounter++, // Increment SL No. for each row
              assetDescription,
              serialInfo,
              1, // Quantity is 1 per serial number
              "New",
              item.remarks || ""
            ]);
          });
        } else {
          // No serial numbers, use original format
          tableBody.push([
            slNoCounter++,
            assetDescription,
            baseAssetCode,
            item.quantity || 0,
            "New",
            item.remarks || ""
          ]);
        }
      });

      autoTable(doc, {
        startY: y,
        head: [tableHeaders],
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: 20,
          fontStyle: 'bold',
          fontSize: 7
        },
        styles: {
          fontSize: 6,
          cellPadding: 1,
          textColor: 20,
          minCellHeight: 4
        },
        margin: { left: 20, right: 20 },
        columnStyles: {
          0: { cellWidth: 15, cellPadding: 1 }, // SL No
          1: { cellWidth: 50, cellPadding: 1 }, // Asset Description
          2: { cellWidth: 40, cellPadding: 1 }, // Asset Code
          3: { cellWidth: 20, cellPadding: 1 }, // Quantity
          4: { cellWidth: 35, cellPadding: 1 }, // Condition
          5: { cellWidth: 30, cellPadding: 1 }  // Remarks
        }
      });

      const tableEndY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;
      y = tableEndY + 5;

      // Instruction on Handling Company Assets and Disclaimer Section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("<> Instruction on Handling Company Assets and Disclaimer <>", pageWidth / 2, y, { align: "center" });

      y += 5;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const instructionText1 = "All employees are instructed to handle company assets, equipment, and materials with the utmost care, diligence, and responsibility. It is the duty of every employee to ensure that all company property is used solely for official purposes and maintained in good working condition.";
      const instructionLines1 = doc.splitTextToSize(instructionText1, pageWidth - 40);
      doc.text(instructionLines1, 20, y);

      y += instructionLines1.length * 3.5 + 2;

      const instructionText2 = "Any loss, damage, or misuse of company property resulting from negligence, carelessness, or unauthorized use will make the concerned individual liable for recovery of the cost of such damages, as assessed and determined by the management. Employees are also required to promptly report any malfunction, loss, or damage of assets to their immediate supervisor.";
      const instructionLines2 = doc.splitTextToSize(instructionText2, pageWidth - 40);
      doc.text(instructionLines2, 20, y);

      y += instructionLines2.length * 3.5 + 3;

      // Disclaimer
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("* <> Disclaimer <>", pageWidth / 2, y, { align: "center" });

      y += 4;

      doc.setFont("helvetica", "normal");
      const disclaimerText = "The company reserves the right to recover the cost of repair, replacement, or loss arising from negligent or unauthorized use of company assets. Disciplinary action may also be initiated in cases of willful misconduct, negligence, or failure to comply with asset handling procedures.";
      const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 40);
      doc.text(disclaimerLines, 20, y);

      y += disclaimerLines.length * 3.5 + 5;

      // Employee Acknowledgement Section
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Employee Acknowledgement", 20, y);

      y += 5;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const ackText1 = "I hereby acknowledge the receipt of the above-listed company assets and confirm that they are in good working condition at the time of issue.";
      const ackLines1 = doc.splitTextToSize(ackText1, pageWidth - 40);
      doc.text(ackLines1, 20, y);

      y += ackLines1.length * 3.5 + 2;

      const ackText2 = "I understand that I am responsible for the safekeeping and proper use of these assets and that any loss, damage, or misuse due to negligence or unauthorized use will make me liable for recovery of the cost as determined by the management.";
      const ackLines2 = doc.splitTextToSize(ackText2, pageWidth - 40);
      doc.text(ackLines2, 20, y);

      y += ackLines2.length * 3.5 + 2;

      const ackText3 = "I further agree to return all assets in good condition upon completion of my employment or upon request by the company.";
      const ackLines3 = doc.splitTextToSize(ackText3, pageWidth - 40);
      doc.text(ackLines3, 20, y);

      y += ackLines3.length * 3.5 + 5;

      // Signature lines
      doc.setFontSize(8);
      doc.text("Employee Signature:", 20, y);
      doc.line(20, y + 2, 90, y + 2);

      doc.text("Date: _____ / _____ / _____", 110, y);
      doc.line(110, y + 2, pageWidth - 20, y + 2);

      y += 10;

      // Issued By Section
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Issued By (Authorized Person)", 20, y);

      y += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Name:", 20, y);
      doc.line(20, y + 2, 90, y + 2);

      doc.text("Designation:", 110, y);
      doc.line(110, y + 2, pageWidth - 20, y + 2);

      y += 6;

      doc.text("Signature:", 20, y);
      doc.line(20, y + 2, 90, y + 2);

      doc.text("Date: _____ / _____ / _____", 110, y);
      doc.line(110, y + 2, pageWidth - 20, y + 2);

      // Footer on last page - add footer if there's space
      if (y < pageHeight - 30) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("25/1, 4th Floor, Skip House, Museum Road, Near Brigade Tower, Bangalore-560025, Karnataka, India", pageWidth / 2, pageHeight - 20, { align: "center" });
        doc.text("Web: www.exozenfms.com | Tel No: +91 8041651888", pageWidth / 2, pageHeight - 15, { align: "center" });
        doc.text("GST NO: 29AAGCE9585M1ZN", pageWidth / 2, pageHeight - 10, { align: "center" });
      } else {
        // Add footer on new page if no space
        doc.addPage();
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("25/1, 4th Floor, Skip House, Museum Road, Near Brigade Tower, Bangalore-560025, Karnataka, India", pageWidth / 2, pageHeight - 20, { align: "center" });
        doc.text("Web: www.exozenfms.com | Tel No: +91 8041651888", pageWidth / 2, pageHeight - 15, { align: "center" });
        doc.text("GST NO: 29AAGCE9585M1ZN", pageWidth / 2, pageHeight - 10, { align: "center" });
      }

      doc.save(`Asset_Issuance_Form_${rdc.dcNumber}.pdf`);
      setToast(`Asset Issuance Form generated successfully for ${rdc.dcNumber}!`);
    } catch (error) {
      console.error("Error generating Asset Issuance Form:", error);
      setToast("Error generating Asset Issuance Form. Please try again.");
    } finally {
      setPdfLoading(null);
    }
  };

  const handleRdcProjectChange = async (projectName: string) => {
    const project = projects.find(p => p.projectName === projectName);
    setSelectedRdcProject(project || null);
    setRdcCreationData(prev => ({ 
      ...prev, 
      department: projectName,
      address: project?.address || "" // Auto-fill address from project
    }));
    setSelectedRdcItems([]);
    
    // Fetch items for the selected project
    if (project) {
      await fetchItemsForProject(project._id);
    }
  };

  const fetchItemsForProject = async (projectId: string) => {
    setItemsLoading(true);
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/items?projectId=${projectId}`);
      const data = await response.json();
      
      if (data && data.success && Array.isArray(data.data)) {
        setAvailableItems(data.data);
      } else if (Array.isArray(data)) {
        setAvailableItems(data);
      } else {
        setAvailableItems([]);
      }
    } catch (error) {
      console.error("Error fetching items for project:", error);
      setAvailableItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleRdcItemSelection = (itemId: string, itemName: string, quantity: number, size?: string, itemCode?: string) => {
    setSelectedRdcItems(prev => {
      const filtered = prev.filter(item => !(item.itemId === itemId && item.size === size));
      if (quantity > 0) {
        // Find the item to get its itemCode if not provided
        const inventoryItem = availableItems.find(item => item._id === itemId);
        const finalItemCode = itemCode || inventoryItem?.itemCode || '';
        
        // Check if this item already exists to preserve existing serial numbers
        const existingItem = prev.find(item => item.itemId === itemId && item.size === size);
        let serialNumbers: SerialNumberEntry[] = [];
        
        if (finalItemCode && finalItemCode.toUpperCase().startsWith('ASS')) {
          // If item exists and has serial numbers, preserve them and add/remove as needed
          if (existingItem && existingItem.serialNumbers) {
            serialNumbers = [...existingItem.serialNumbers];
            // If quantity increased, add new empty entries
            if (quantity > serialNumbers.length) {
              for (let i = serialNumbers.length; i < quantity; i++) {
                serialNumbers.push({ itemCode: finalItemCode, serialNumber: '' });
              }
            }
            // If quantity decreased, remove excess entries
            else if (quantity < serialNumbers.length) {
              serialNumbers = serialNumbers.slice(0, quantity);
            }
            // Update itemCode for all entries if it changed
            if (serialNumbers.length > 0 && serialNumbers[0].itemCode !== finalItemCode) {
              serialNumbers = serialNumbers.map(s => ({ ...s, itemCode: finalItemCode }));
            }
          } else {
            // New item, initialize serial numbers array
            for (let i = 0; i < quantity; i++) {
              serialNumbers.push({ itemCode: finalItemCode, serialNumber: '' });
            }
          }
        }
        
        return [...filtered, { itemId, itemName, quantity, size, itemCode: finalItemCode, serialNumbers }];
      }
      return filtered;
    });
  };

  const updateSerialNumber = (itemId: string, size: string | undefined, index: number, field: 'itemCode' | 'serialNumber', value: string) => {
    setSelectedRdcItems(prev => prev.map(item => {
      if (item.itemId === itemId && item.size === size && item.serialNumbers) {
        const updatedSerialNumbers = [...item.serialNumbers];
        if (updatedSerialNumbers[index]) {
          updatedSerialNumbers[index] = {
            ...updatedSerialNumbers[index],
            [field]: value
          };
        }
        return { ...item, serialNumbers: updatedSerialNumbers };
      }
      return item;
    }));
  };

  const createRDCFromIssue = async () => {
    if (!rdcCreationData.issueTo || !rdcCreationData.department || !rdcCreationData.purpose) {
      setToast("Please fill in all required fields");
      return;
    }

    if (selectedRdcItems.length === 0) {
      setToast("Please select at least one item");
      return;
    }

    setIsCreatingRdc(true);
    try {
      // Step 1: Create Issue
      const issueData = {
        issueTo: rdcCreationData.issueTo,
        department: rdcCreationData.department,
        purpose: rdcCreationData.purpose,
        address: rdcCreationData.address,
        issueDate: rdcCreationData.issueDate,
        items: selectedRdcItems.map(item => ({
          id: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          size: item.size || "",
          uniformType: item.itemName
        }))
      };

      const issueResponse = await fetch("https://inventory.zenapi.co.in/api/inventory/issue", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });

      const issueResult = await issueResponse.json();
      
      if (!issueResult.success) {
        setToast(issueResult.message || "Error creating issue");
        return;
      }

      // Step 2: Create RDC from Issue
      const rdcData = {
        customer: rdcCreationData.issueTo,
        dcNumber: `RDC${Date.now()}`,
        dcDate: new Date().toISOString().split('T')[0],
        address: rdcCreationData.address,
        remarks: `Generated from Issue ${issueResult.issueId} - Retrievable DC`,
        items: selectedRdcItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          size: item.size || "",
          uniformType: item.itemName,
          retrievableQuantity: item.quantity,
          retrievalStatus: 'available',
          serialNumbers: item.serialNumbers || []
        })),
        attachments: [],
        isRetrievable: true,
        retrievalStatus: 'available',
        retrievalDeadline: rdcCreationData.deadlineDate || null
      };

      console.log("RDC Payload:", rdcData);

      const rdcResponse = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc/retrievable", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rdcData),
      });

      const rdcResult = await rdcResponse.json();
      
      console.log("RDC API Response:", rdcResult);
      
      if (rdcResult.success) {
        setToast(`RDC created successfully! RDC Number: ${rdcResult.dcNumber || rdcResult.retrievableDCId}`);
        
        // Generate Asset Issuance Form PDF after RDC creation
        const rdcForPDF: DC = {
          _id: rdcResult.retrievableDCId || rdcResult._id || '',
          customer: rdcCreationData.issueTo,
          dcNumber: rdcResult.dcNumber || `RDC${Date.now()}`,
          dcDate: rdcCreationData.issueDate,
          address: rdcCreationData.address,
          remarks: rdcCreationData.purpose,
          items: selectedRdcItems.map(item => {
            // Find the item code from availableItems
            const inventoryItem = availableItems.find(invItem => invItem._id === item.itemId);
            return {
              _id: item.itemId,
              employeeId: '',
              itemId: item.itemId,
              quantity: item.quantity,
              size: item.size || '',
              uniformType: item.itemName,
              itemCode: inventoryItem?.itemCode || item.itemCode || '',
              name: item.itemName,
              price: '',
              remarks: '',
              serialNumbers: item.serialNumbers || []
            };
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0,
          isRetrievable: true,
          retrievalStatus: 'available',
          retrievalDeadline: rdcCreationData.deadlineDate || undefined
        };
        
        // Generate Asset Issuance Form PDF
        await generateAssetIssuanceForm(rdcForPDF, rdcCreationData);
        
        setShowRdcModal(false);
        setRdcCreationData({
          issueTo: "",
          department: "",
          purpose: "",
          address: "",
          issueDate: new Date().toISOString().split('T')[0],
          deadlineDate: "",
          items: []
        });
        setSelectedRdcProject(null);
        setSelectedRdcItems([]);
        setAvailableItems([]);
        await fetchRDCs();
      } else {
        console.error("RDC Creation Error:", rdcResult);
        setToast(rdcResult.message || "Error creating RDC");
      }
    } catch (error) {
      console.error("Error creating RDC:", error);
      setToast("Error creating RDC. Please try again.");
    } finally {
      setIsCreatingRdc(false);
    }
  };

  return (
    <>
      <style>{toastStyles}</style>
      {toast && (
        <div className="fixed top-6 right-6 z-[100] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-lg font-bold">&times;</button>
        </div>
      )}
      <ManagerDashboardLayout>
        <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
            : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
        }`}>
          {/* Filters and Search */}
          <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
            <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
              {/* Project Filter */}
              <div className="flex-1 min-w-[180px] max-w-xs">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-blue-900 text-white"
                      : "bg-white border-gray-200 text-black"
                  }`}
                >
                  <option value="">All Status</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              {/* View Toggle Radio Buttons */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="nrdc-view"
                    name="view-toggle"
                    value="nrdc"
                    checked={activeView === 'nrdc'}
                    onChange={(e) => setActiveView(e.target.value as 'nrdc' | 'bulk-issue' | 'rdc')}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="nrdc-view" className={`text-sm font-medium cursor-pointer ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    NRDC
                  </label>
                </div>
                <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="rdc-view"
                  name="view-toggle"
                  value="rdc"
                  checked={activeView === 'rdc'}
                  onChange={(e) => {
                    setActiveView(e.target.value as 'nrdc' | 'bulk-issue' | 'rdc');
                    if (e.target.value === 'rdc') {
                      fetchRDCs();
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                />
                  <label htmlFor="rdc-view" className={`text-sm font-medium cursor-pointer ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    RDC
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="bulk-issue-view"
                    name="view-toggle"
                    value="bulk-issue"
                    checked={activeView === 'bulk-issue'}
                    onChange={(e) => setActiveView(e.target.value as 'nrdc' | 'bulk-issue' | 'rdc')}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="bulk-issue-view" className={`text-sm font-medium cursor-pointer ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Bulk Issue
                  </label>
                </div>
              </div>
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder={activeView === 'nrdc' ? "Search NRDC number, project name, or customer..." : activeView === 'rdc' ? "Search RDC number, project name, or customer..." : "Search issue date, project name, or customer..."}
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
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                  onClick={() => {
                    setDcType('nrdc');
                    setShowCreate(true);
                  }}
                >
                  Create NRDC
                </button>
            <button
              className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
              onClick={() => setShowRdcModal(true)}
            >
              Create RDC
            </button>
                <button
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-green-700 text-white hover:bg-green-800 border-green-900' : 'bg-green-600 text-white hover:bg-green-700 border-green-200'}`}
                  onClick={() => setShowBulkIssue(true)}
                >
                  Bulk Issue
                </button>
              <button
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'bg-white border-blue-200 text-blue-700'}`}
                onClick={handleDownloadAllDCs}
                disabled={allPdfLoading}
              >
                  {allPdfLoading ? "Generating..." : "Export All"}
              </button>
            </div>
            </div>
          </div>

          {/* NRDC Table */}
          {activeView === 'nrdc' && (
            <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
              <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
                {loading ? (
                  <div className="py-12 text-center text-lg font-semibold">Loading NRDC records...</div>
                ) : error ? (
                  <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
                ) : (
                  <>
                  <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                    <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                      <tr>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>NRDC Number</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project Name</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-28 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Customer</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                      </tr>
                    </thead>
                  <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                    {filteredDC.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No DC records found</td>
                      </tr>
                    ) : filteredDC.map((dc, idx) => (
                      <tr key={idx} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                        <td className={`px-2 py-0.5 sticky left-0 z-10 font-mono text-xs border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                        <td className={`px-2 py-0.5 font-semibold whitespace-nowrap border text-xs ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{dc.dcNumber}</td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <div className="whitespace-nowrap" title={dc.dcDate ? dc.dcDate.split('T')[0] : ''}>
                            {dc.dcDate ? dc.dcDate.split('T')[0] : ''}
                          </div>
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}>
                          <div className="truncate" title={getProjectName(dc)}>{getProjectName(dc)}</div>
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <div className="truncate max-w-[120px]" title={dc.customer}>{dc.customer}</div>
                        </td>
                        <td className={`px-2 py-0.5 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${
                            dc.status === 'Issued' 
                              ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              : theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {dc.status || "N/A"}
                          </span>
                        </td>
                        <td className={`px-2 py-0.5 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => setSelectedDC(dc)}
                              className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                theme === "dark" 
                                  ? "bg-white text-blue-600 border-blue-600 hover:bg-blue-50" 
                                  : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
                              }`}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDownloadDC(dc)}
                              disabled={pdfLoading === dc.dcNumber}
                              className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                theme === "dark" 
                                  ? "bg-white text-green-600 border-green-600 hover:bg-green-50" 
                                  : "bg-white text-green-600 border-green-600 hover:bg-green-50"
                              }`}
                            >
                              {pdfLoading === dc.dcNumber ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                              ) : (
                                <>
                                  <FaDownload className="inline mr-1 text-xs" />
                                  Download
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDC(dc);
                                setShowUploadModal(true);
                              }}
                              className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                theme === "dark" 
                                  ? "bg-white text-blue-600 border-blue-600 hover:bg-blue-50" 
                                  : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
                              }`}
                            >
                              <FaUpload className="inline mr-1 text-xs" />
                              Files
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
          )}

          {/* RDC Table */}
          {activeView === 'rdc' && (
            <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
              <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
                {rdcLoading ? (
                  <div className="py-12 text-center text-lg font-semibold">Loading RDC records...</div>
                ) : rdcData.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${theme === "dark" ? "bg-blue-800" : "bg-blue-100"}`}>
                      <FaBoxOpen className={`w-8 h-8 ${theme === "dark" ? "text-blue-200" : "text-blue-600"}`} />
                    </div>
                    <h4 className={`mt-4 text-lg font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                      No RDC Records Found
                    </h4>
                    <p className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Create your first Returnable DC to get started.
                    </p>
                  </div>
                ) : (
                  <>
                  <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                    <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                      <tr>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>RDC Number</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-28 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Customer</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Address</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Deadline</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Items</th>
                        <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                      </tr>
                    </thead>
                  <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                    {rdcData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No RDC records found</td>
                      </tr>
                    ) : rdcData.map((rdc, idx) => (
                      <tr key={idx} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                        <td className={`px-2 py-0.5 sticky left-0 z-10 font-mono text-xs border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                        <td className={`px-2 py-0.5 font-semibold whitespace-nowrap border text-xs ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{rdc.dcNumber}</td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <div className="whitespace-nowrap" title={rdc.dcDate ? rdc.dcDate.split('T')[0] : ''}>
                            {rdc.dcDate ? rdc.dcDate.split('T')[0] : ''}
                          </div>
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}>
                          <div className="truncate" title={rdc.customer}>{rdc.customer}</div>
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <div className="truncate max-w-xs" title={rdc.address || 'N/A'}>{rdc.address || 'N/A'}</div>
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            rdc.retrievalStatus === 'available' 
                              ? 'bg-green-100 text-green-800' 
                              : rdc.retrievalStatus === 'retrieved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {rdc.retrievalStatus || 'Available'}
                          </span>
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <div className="whitespace-nowrap" title={rdc.retrievalDeadline ? rdc.retrievalDeadline.split('T')[0] : 'N/A'}>
                            {rdc.retrievalDeadline ? rdc.retrievalDeadline.split('T')[0] : 'N/A'}
                          </div>
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          {rdc.items ? rdc.items.length : 0} items
                        </td>
                        <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedDC(rdc)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                theme === 'dark' 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                              title="View Details"
                            >
                              <FaEye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDownloadRDCPDF(rdc)}
                              disabled={pdfLoading === rdc.dcNumber}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                theme === 'dark' 
                                  ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400' 
                                  : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300'
                              }`}
                              title="Download RDC PDF"
                            >
                              {pdfLoading === rdc.dcNumber ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              ) : (
                                <FaDownload className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => generateAssetIssuanceForm(rdc)}
                              disabled={pdfLoading === `asset_${rdc.dcNumber}`}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                theme === 'dark' 
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-400' 
                                  : 'bg-purple-500 hover:bg-purple-600 text-white disabled:bg-purple-300'
                              }`}
                              title="Download Asset Consent Form"
                            >
                              {pdfLoading === `asset_${rdc.dcNumber}` ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              ) : (
                                <FaFileAlt className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDC(rdc);
                                setShowUploadModal(true);
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                theme === 'dark' 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                              title="Upload Files"
                            >
                              <FaUpload className="w-3 h-3" />
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
          )}

          {/* Bulk Issues Table */}
          {activeView === 'bulk-issue' && (
            <div className={`px-3 md:px-4 pb-4`}>
              <div className={`rounded-lg border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
                <div className={`p-4 border-b ${theme === "dark" ? "border-blue-900" : "border-blue-100"}`}>
                  <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                    <FaBoxOpen className="inline mr-2" />
                    Bulk Issues ({bulkIssueDCs.length})
                  </h3>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Manage bulk issues and create DCs from them
                  </p>
                </div>
              
              {bulkIssueDCsLoading ? (
                <div className="py-12 text-center text-lg font-semibold">Loading bulk issue DCs...</div>
              ) : bulkIssueDCsError ? (
                <div className="py-12 text-center text-red-500 font-semibold">{bulkIssueDCsError}</div>
              ) : bulkIssueDCs.length === 0 ? (
                <div className="py-12 text-center text-gray-500 font-semibold">No bulk issue DCs found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                    <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                      <tr>
                      <th className={`px-2 py-0.5 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                      <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                      <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project Name</th>
                      <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Customer</th>
                      <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                      <th className={`px-2 py-0.5 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                      {bulkIssueDCs.map((bulkIssueDC, idx) => {
                        const issue = convertBulkIssueDCToIssue(bulkIssueDC);
                        const hasEmployeeMappings = bulkIssueDC.items.some(item => item.employeeMappings && item.employeeMappings.length > 0);
                        const isFullyMapped = bulkIssueDC.items.every(item => 
                          item.employeeMappings && item.employeeMappings.length > 0 && 
                          item.employeeMappings.reduce((sum, mapping) => sum + mapping.quantity, 0) >= item.quantity
                        );
                        
                        return (
                        <tr key={`${bulkIssueDC._id}-${bulkIssueDC.dcNumber}-${bulkIssueDC.items?.[0]?.remainingQuantity || 'unknown'}`} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                          <td className={`px-2 py-0.5 sticky left-0 z-10 font-mono text-xs border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                          <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                            <div className="whitespace-nowrap" title={new Date(bulkIssueDC.dcDate).toISOString().split('T')[0]}>
                              {new Date(bulkIssueDC.dcDate).toISOString().split('T')[0]}
                            </div>
                          </td>
                          <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}>
                            <div className="truncate" title={bulkIssueDC.address}>{bulkIssueDC.address}</div>
                          </td>
                          <td className={`px-2 py-0.5 border text-xs ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                            <div className="truncate max-w-[120px]" title={bulkIssueDC.customer}>{bulkIssueDC.customer}</div>
                          </td>
                          <td className={`px-2 py-0.5 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            <span className={`inline-block text-[10px] font-semibold px-1 py-0.5 rounded-full ${
                              bulkIssueDC.isRetrievable === false && bulkIssueDC.retrievalStatus === 'available'
                                ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                                : theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {bulkIssueDC.isRetrievable === false && bulkIssueDC.retrievalStatus === 'available' ? 'Issued' : 'Pending'}
                            </span>
                          </td>
                          <td className={`px-2 py-0.5 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={() => handleViewIssue(issue)}
                                className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                  theme === "dark" 
                                    ? "bg-white text-blue-600 border-blue-600 hover:bg-blue-50" 
                                    : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  if (hasEmployeeMappings) {
                                    if (!isFullyMapped) {
                                      handleMapEmployees(issue);
                                    }
                                  } else {
                                    handleMapEmployees(issue);
                                  }
                                }}
                                disabled={hasEmployeeMappings && isFullyMapped}
                                className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                  hasEmployeeMappings
                                    ? isFullyMapped
                                      ? theme === "dark" 
                                        ? "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed" 
                                        : "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed"
                                      : theme === "dark" 
                                        ? "bg-white text-blue-600 border-blue-600 hover:bg-blue-50" 
                                        : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
                                    : theme === "dark" 
                                      ? "bg-white text-blue-600 border-blue-600 hover:bg-blue-50" 
                                      : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                {hasEmployeeMappings 
                                  ? isFullyMapped 
                                    ? "✓ Mapped" 
                                    : "Map Employees"
                                  : "Map Employees"
                                }
                              </button>
                              <button
                                onClick={() => handleDownloadIssue(issue)}
                                className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                  theme === "dark" 
                                    ? "bg-white text-blue-600 border-blue-600 hover:bg-blue-50" 
                                    : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                {pdfLoading === issue._id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                ) : (
                                  <>
                                    <FaDownload className="inline mr-1 text-xs" />
                                    Download Issue
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
        
        {/* Employee Mapping Modal */}
        {showEmployeeMappingModal && selectedIssueForMapping && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                onClick={() => {
                  setShowEmployeeMappingModal(false);
                  setSelectedIssueForMapping(null);
                  setEmployeeMappings([]);
                }}
              >
                <FaTimes className="w-6 h-6" />
              </button>
              
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                <FaUserPlus className="w-6 h-6" />
                Employee Mapping for DC: {selectedIssueForMapping.outwardDC?.dcNumber || selectedIssueForMapping.dcNumber}
              </h2>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* DC Information */}
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                  <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                    DC Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Customer: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForMapping.outwardDC?.customer || selectedIssueForMapping.issueTo}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>DC Number: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForMapping.outwardDC?.dcNumber || selectedIssueForMapping.dcNumber}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Address: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForMapping.outwardDC?.address || selectedIssueForMapping.department}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Total Items: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForMapping.outwardDC?.items?.length || selectedIssueForMapping.items.length}</span>
                    </div>
                  </div>
                </div>


                {/* Items to Map with Checkbox System */}
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <h3 className={`font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    Items to Map ({itemEmployeeMappings.length} items)
                  </h3>
                  
                  <div className="space-y-4">
                    {itemEmployeeMappings.map((itemMapping) => (
                      <div key={itemMapping.itemId} className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"}`}>
                        {/* Item Header */}
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h4 className={`font-medium ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {itemMapping.itemName}
                            </h4>
                            <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Size: {itemMapping.size} | Total Quantity: {itemMapping.totalQuantity}
                            </p>
                          </div>
                          <div className={`text-sm px-2 py-1 rounded ${
                            itemMapping.remainingQuantity === 0 
                              ? theme === "dark" ? "bg-green-800 text-green-200" : "bg-green-100 text-green-800"
                              : theme === "dark" ? "bg-yellow-800 text-yellow-200" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            Remaining: {itemMapping.remainingQuantity}
                          </div>
                        </div>

                        {/* Employee Selection - Excel-like Table */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                          <h5 className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                            Select Employees:
                          </h5>
                              {employeesWithRequests.size > 0 && (
                                <p className={`text-xs mt-1 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                                  {employeesWithRequests.size} employee(s) with existing requests filtered out
                                </p>
                              )}
                              {employeeSearchTerm && (
                                <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                  {availableEmployees.filter(employee => {
                                    const searchLower = employeeSearchTerm.toLowerCase();
                                    return (
                                      employee.fullName.toLowerCase().includes(searchLower) ||
                                      employee.employeeId.toLowerCase().includes(searchLower) ||
                                      employee.designation.toLowerCase().includes(searchLower)
                                    );
                                  }).length} employee(s) found
                                </p>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search by Employee ID, Name, or Designation..."
                                value={employeeSearchTerm}
                                onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                className={`w-64 px-3 py-1.5 text-sm rounded-md border ${
                                  theme === "dark" 
                                    ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400" 
                                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                              />
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                <svg className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className={`min-w-full border-collapse ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
                              <thead>
                                <tr className={`${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                  <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border ${theme === "dark" ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}>
                                    Select
                                  </th>
                                  <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border ${theme === "dark" ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}>
                                    Employee ID
                                  </th>
                                  <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border ${theme === "dark" ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}>
                                    Name
                                  </th>
                                  <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border ${theme === "dark" ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}>
                                    Designation
                                  </th>
                                  <th className={`px-3 py-2 text-center text-xs font-medium uppercase tracking-wider border ${theme === "dark" ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}>
                                    Quantity
                                  </th>
                                </tr>
                              </thead>
                              <tbody className={`${theme === "dark" ? "divide-y divide-gray-600" : "divide-y divide-gray-200"}`}>
                                {availableEmployees
                                  .filter(employee => {
                                    if (!employeeSearchTerm) return true;
                                    const searchLower = employeeSearchTerm.toLowerCase();
                                    return (
                                      employee.fullName.toLowerCase().includes(searchLower) ||
                                      employee.employeeId.toLowerCase().includes(searchLower) ||
                                      employee.designation.toLowerCase().includes(searchLower)
                                    );
                                  })
                                  .map((employee) => {
                              const isSelected = itemMapping.selectedEmployees.some(emp => emp.employeeId === employee.employeeId);
                              const selectedEmployee = itemMapping.selectedEmployees.find(emp => emp.employeeId === employee.employeeId);
                                  
                              
                              return (
                                    <tr 
                                      key={`${itemMapping.itemId}_${employee.employeeId}`} 
                                      className={`cursor-pointer transition-colors ${
                                        isSelected 
                                          ? theme === "dark" 
                                            ? "bg-blue-900 hover:bg-blue-800" 
                                            : "bg-blue-50 hover:bg-blue-100"
                                          : theme === "dark" 
                                            ? "hover:bg-gray-700" 
                                            : "hover:bg-gray-50"
                                      }`}
                                      onClick={() => toggleEmployeeSelection(itemMapping.itemId, employee, !isSelected)}
                                    >
                                      <td className={`px-3 py-2 border ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            toggleEmployeeSelection(itemMapping.itemId, employee, e.target.checked);
                                          }}
                                    disabled={!isSelected && itemMapping.remainingQuantity <= 0}
                                          className={`w-4 h-4 rounded border-2 ${
                                            theme === "dark" 
                                              ? "border-gray-500 bg-gray-700 text-blue-500" 
                                              : "border-gray-300 bg-white text-blue-600"
                                          } focus:ring-2 focus:ring-blue-500`}
                                        />
                                      </td>
                                      <td className={`px-3 py-2 text-sm border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-900"}`}>
                                        {employee.employeeId}
                                      </td>
                                      <td className={`px-3 py-2 text-sm border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-900"}`}>
                                      {employee.fullName}
                                      </td>
                                      <td className={`px-3 py-2 text-sm border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-900"}`}>
                                        {employee.designation}
                                      </td>
                                      <td className={`px-3 py-2 text-center border ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
                                        {isSelected && selectedEmployee ? (
                                          <div className="flex items-center justify-center space-x-1">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateEmployeeQuantity(itemMapping.itemId, employee.employeeId, Math.max(1, selectedEmployee.quantity - 1));
                                              }}
                                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                theme === "dark" 
                                                  ? "bg-gray-600 text-gray-200 hover:bg-gray-500" 
                                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                              }`}
                                            >
                                              -
                                            </button>
                                      <input
                                        type="number"
                                        min="1"
                                        max={itemMapping.remainingQuantity + selectedEmployee.quantity}
                                        value={selectedEmployee.quantity}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                updateEmployeeQuantity(itemMapping.itemId, employee.employeeId, parseInt(e.target.value) || 1);
                                              }}
                                        className={`w-12 px-1 py-0.5 text-xs text-center rounded border ${
                                          theme === "dark" ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                                        }`}
                                      />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateEmployeeQuantity(itemMapping.itemId, employee.employeeId, Math.min(itemMapping.remainingQuantity, selectedEmployee.quantity + 1));
                                              }}
                                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                theme === "dark" 
                                                  ? "bg-gray-600 text-gray-200 hover:bg-gray-500" 
                                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                              }`}
                                            >
                                              +
                                            </button>
                                    </div>
                                        ) : (
                                          <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                            -
                                          </span>
                                  )}
                                      </td>
                                    </tr>
                              );
                            })}
                                {availableEmployees.filter(employee => {
                                  if (!employeeSearchTerm) return true;
                                  const searchLower = employeeSearchTerm.toLowerCase();
                                  return (
                                    employee.fullName.toLowerCase().includes(searchLower) ||
                                    employee.employeeId.toLowerCase().includes(searchLower) ||
                                    employee.designation.toLowerCase().includes(searchLower)
                                  );
                                }).length === 0 && (
                                  <tr>
                                    <td colSpan={5} className={`px-3 py-8 text-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                      {employeeSearchTerm ? `No employees found matching "${employeeSearchTerm}"` : "No employees available"}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Selected Employees Summary */}
                        {itemMapping.selectedEmployees.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                            <h6 className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                              Selected Employees:
                            </h6>
                            <div className="space-y-1">
                              {itemMapping.selectedEmployees.map((employee) => (
                                <div key={employee.employeeId} className={`flex justify-between items-center px-2 py-1 rounded ${
                                  theme === "dark" ? "bg-gray-600" : "bg-gray-100"
                                }`}>
                                  <span className={`text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                    {employee.employeeName} ({employee.employeeId})
                                  </span>
                                  <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                    Qty: {employee.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employee Mappings */}
                {employeeMappings.length > 0 && (
                  <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-950 border-green-800" : "bg-green-50 border-green-200"}`}>
                    <h3 className={`font-semibold mb-4 ${theme === "dark" ? "text-green-200" : "text-green-800"}`}>
                      Employee Mappings ({employeeMappings.length} mappings)
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className={`min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                        <thead className={theme === "dark" ? "bg-gray-700" : "bg-gray-100"}>
                          <tr>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Employee ID
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Item
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Size
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Quantity
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-800" : "divide-gray-200 bg-white"}`}>
                          {employeeMappings.map((mapping: EmployeeMapping, index: number) => (
                            <tr key={index} className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                              <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {mapping.employeeId}
                              </td>
                              <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {mapping.uniformType}
                              </td>
                              <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {mapping.size}
                              </td>
                              <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {mapping.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => removeEmployeeMapping(mapping.itemId as string)}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    theme === "dark" 
                                      ? "bg-red-800 text-red-200 hover:bg-red-700" 
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6">
                <button
                  onClick={() => {
                    setShowEmployeeMappingModal(false);
                    setSelectedIssueForMapping(null);
                    setEmployeeMappings([]);
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={updateDCWithEmployeeMappings}
                  disabled={!itemEmployeeMappings.some(item => item.selectedEmployees.length > 0) || isUpdatingMappings}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    itemEmployeeMappings.some(item => item.selectedEmployees.length > 0) && !isUpdatingMappings
                      ? theme === "dark"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isUpdatingMappings ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating Mappings...
                    </>
                  ) : (
                    <>
                      <FaUserPlus className="w-4 h-4" />
                      Update Employee Mappings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          )}
      </ManagerDashboardLayout>
      
      {/* Create DC Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <CreateDCModal
            onClose={() => setShowCreate(false)}
            theme={theme}
            setDcData={setDcData}
            dcData={dcData}
            refreshDCData={refreshDCData}
            dcType={dcType}
          />
        </div>
      )}

      {/* Bulk Issue Modal */}
      {showBulkIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
              onClick={() => {
                setShowBulkIssue(false);
                setSelectedProject(null);
                setSelectedDesignations([]);
                setSelectedUniforms([]);
                setSelectedItems([]);
                setBulkIssueData({
                  issueTo: "",
                  department: "",
                  purpose: "",
                  address: "",
                  issueDate: new Date().toISOString().split('T')[0],
                  items: []
                });
              }}
            >
              <FaTimes className="w-6 h-6" />
            </button>
            
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
              <FaBoxOpen className="w-6 h-6" />
              Create Bulk Issue
            </h2>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Issue To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bulkIssueData.issueTo}
                    onChange={e => setBulkIssueData(prev => ({ ...prev, issueTo: e.target.value }))}
                    placeholder="Department or recipient name"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bulkIssueData.department}
                    onChange={e => handleProjectChange(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project._id} value={project.projectName}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject && (
                  <div>
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                      Designations <span className="text-red-500">*</span>
                    </label>
                    <div className={`p-3 border rounded-lg ${theme === "dark" ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}>
                      <p className={`text-sm mb-3 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                        Select one or more designations:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {getAvailableDesignations().map(designation => (
                          <label key={designation} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedDesignations.includes(designation)}
                              onChange={(e) => handleDesignationChange(designation, e.target.checked)}
                              className={`w-4 h-4 rounded border-2 focus:ring-2 focus:ring-offset-0 transition-colors ${
                                theme === "dark"
                                  ? "bg-gray-700 border-gray-500 text-blue-400 focus:ring-blue-900"
                                  : "bg-white border-gray-300 text-blue-600 focus:ring-blue-500"
                              }`}
                            />
                            <span className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                              {designation}
                            </span>
                          </label>
                        ))}
                      </div>
                      {selectedDesignations.length > 0 && (
                        <p className={`text-xs mt-2 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                          Selected: {selectedDesignations.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bulkIssueData.purpose}
                    onChange={e => setBulkIssueData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Purpose of issue"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={bulkIssueData.issueDate}
                    onChange={e => setBulkIssueData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                  Address
                </label>
                <textarea
                  value={bulkIssueData.address}
                  onChange={e => setBulkIssueData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Delivery address"
                  rows={3}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  }`}
                />
              </div>

              {selectedProject && (
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                  <h3 className={`font-semibold mb-3 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                    <FaUsers className="w-4 h-4" />
                    Project Information (This will be used in DC)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                        Total Manpower:
                      </span>
                      <span className={`ml-2 text-lg font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                        {selectedProject.totalManpower}
                      </span>
                    </div>
                    
                    <div>
                      <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                        Project Address:
                      </span>
                      <span className={`ml-2 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        {selectedProject.address}
                      </span>
                    </div>
                  </div>

                  {selectedProject.designationWiseCount && Object.keys(selectedProject.designationWiseCount).length > 0 && (
                    <div className="mt-4">
                      <h4 className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                        Designation-wise Distribution:
                      </h4>
                      <div className="overflow-x-auto">
                        <table className={`min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                          <thead className={theme === "dark" ? "bg-gray-800" : "bg-gray-50"}>
                            <tr>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                                Designation
                              </th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                                Count
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-800" : "divide-gray-200 bg-white"}`}>
                            {Object.entries(selectedProject.designationWiseCount).map(([designation, count]) => (
                              <tr key={designation} className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                                <td className={`px-3 py-2 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                  {designation}
                                </td>
                                <td className={`px-3 py-2 text-sm font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                                  {count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedProject && selectedDesignations.length > 0 && (
                <div className="space-y-6">

                  {/* Separate sections for each designation */}
                  {selectedDesignations.map((designation, index) => {
                    const designationUniforms = getUniformsForDesignation(designation);
                    
                    console.log(`🎯 Rendering section for ${designation}:`, {
                      designation,
                      uniformsCount: designationUniforms.length,
                      uniforms: designationUniforms.map(u => u.name)
                    });
                    
                    return (
                      <div key={designation} className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-950 border-green-800" : "bg-green-50 border-green-200"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`font-semibold flex items-center gap-2 ${theme === "dark" ? "text-green-200" : "text-green-800"}`}>
                            <FaTshirt className="w-4 h-4" />
                            Section {index + 1}: Available Uniforms for {designation}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              theme === "dark" ? "bg-blue-800 text-blue-200" : "bg-blue-100 text-blue-800"
                            }`}>
                              {designationUniforms.length} uniforms
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              designationUniforms.length > 0 
                                ? (theme === "dark" ? "bg-green-800 text-green-200" : "bg-green-100 text-green-800")
                                : (theme === "dark" ? "bg-red-800 text-red-200" : "bg-red-100 text-red-800")
                            }`}>
                              {designationUniforms.length > 0 ? "HAS UNIFORMS" : "NO UNIFORMS"}
                            </span>
                          </div>
                        </div>
                        
                        
                        {designationUniforms.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className={`min-w-full border-collapse ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
                              <thead>
                                <tr className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                                  <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-green-200 border-gray-600" : "text-green-700 border-gray-300"}`}>
                                    Item Name
                                  </th>
                                  <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-green-200 border-gray-600" : "text-green-700 border-gray-300"}`}>
                                    Category
                                  </th>
                                  <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-green-200 border-gray-600" : "text-green-700 border-gray-300"}`}>
                                    Size
                                  </th>
                                  <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-green-200 border-gray-600" : "text-green-700 border-gray-300"}`}>
                                    Stock
                                  </th>
                                  <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-green-200 border-gray-600" : "text-green-700 border-gray-300"}`}>
                                    Quantity
                                  </th>
                                  <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-green-200 border-gray-600" : "text-green-700 border-gray-300"}`}>
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className={theme === "dark" ? "divide-y divide-gray-600" : "divide-y divide-gray-200"}>
                                {designationUniforms.map((uniform) => 
                                  uniform.sizes?.map((size: string, sizeIndex: number) => {
                                    const availableQty = uniform.sizeInventory?.find((si: { size: string; quantity: number }) => si.size === size)?.quantity || 0;
                                    const selectedUniform = selectedUniforms.find(u => u.name === uniform.name && u.size === size);
                                    const currentQty = selectedUniform?.quantity || 0;
                                    
                                    return (
                                      <tr key={`${uniform._id}-${size}`} className={`${theme === "dark" ? "hover:bg-gray-700 transition even:bg-gray-800" : "hover:bg-gray-50 transition even:bg-gray-25"}`}>
                                        {sizeIndex === 0 && (
                                          <td 
                                            rowSpan={uniform.sizes?.length || 1}
                                            className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'} align-top`}
                                          >
                                            <div>
                                              <div className="font-semibold">{uniform.name}</div>
                                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {uniform.subCategory}
                                              </div>
                                            </div>
                                          </td>
                                        )}
                                        {sizeIndex === 0 && (
                                          <td 
                                            rowSpan={uniform.sizes?.length || 1}
                                            className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'} align-top`}
                                          >
                                            {uniform.category}
                                          </td>
                                        )}
                                        <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                                          <div className="text-center font-medium">{size}</div>
                                        </td>
                                        <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                                          <div className="text-center">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                              theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                                            }`}>
                                              {availableQty}
                                            </span>
                                          </div>
                                        </td>
                                        <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              min="0"
                                              max={availableQty}
                                              value={currentQty}
                                              onChange={(e) => handleUniformSelection(uniform.name || '', size, parseInt(e.target.value) || 0)}
                                              className={`w-16 px-2 py-1 text-xs border rounded focus:ring-2 focus:border-transparent ${
                                                theme === "dark"
                                                  ? "bg-gray-600 border-gray-500 text-gray-100 focus:ring-green-900"
                                                  : "bg-white border-gray-300 text-gray-900 focus:ring-green-500"
                                              }`}
                                              placeholder="0"
                                            />
                                            <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                              /{availableQty}
                                            </span>
                                          </div>
                                        </td>
                                        <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                                          <div className="text-center">
                                            {currentQty > 0 && (
                                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                                theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"
                                              }`}>
                                                Selected
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className={`text-center py-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            No uniforms mapped for {designation} in {selectedProject.projectName}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add to Bulk Issue Button */}
                  {selectedUniforms.length > 0 && (
                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={showDCPopupForUniforms}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                          theme === "dark"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        <FaBoxOpen className="w-4 h-4" />
                        Add to Bulk Issue ({selectedUniforms.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedItems.length > 0 && (
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                  <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                    Items to Issue ({selectedItems.length})
                  </h3>
                  
                  {selectedProject && (
                    <div className={`mb-4 p-3 rounded-lg ${theme === "dark" ? "bg-blue-900" : "bg-blue-100"}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Project: </span>
                          <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedProject.projectName}</span>
                        </div>
                        <div>
                          <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Address: </span>
                          <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedProject.address || "N/A"}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Designations: </span>
                        <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedDesignations.join(', ')}</span>
                      </div>
                      <div className="mt-2">
                        <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Total Items: </span>
                        <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedItems.length} types</span>
                        <span className={`ml-4 font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Total Quantity: </span>
                        <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} pieces</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className={`min-w-full border-collapse ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
                      <thead>
                        <tr className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-gray-600" : "text-blue-700 border-gray-300"}`}>
                            Item Name
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-gray-600" : "text-blue-700 border-gray-300"}`}>
                            Code
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-gray-600" : "text-blue-700 border-gray-300"}`}>
                            Size
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-gray-600" : "text-blue-700 border-gray-300"}`}>
                            Quantity
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-gray-600" : "text-blue-700 border-gray-300"}`}>
                            Designation
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-gray-600" : "text-blue-700 border-gray-300"}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "divide-y divide-gray-600" : "divide-y divide-gray-200"}>
                        {selectedItems.map((item, index) => (
                          <tr key={index} className={`${theme === "dark" ? "hover:bg-gray-700 transition even:bg-gray-800" : "hover:bg-gray-50 transition even:bg-gray-25"}`}>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="font-semibold">{item.itemName}</div>
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              {item.itemCode}
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="text-center font-medium">{item.size}</div>
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="text-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"
                                }`}>
                                  {item.quantity}
                                </span>
                              </div>
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="text-xs">{selectedDesignations.join(', ')}</div>
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="text-center">
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    theme === "dark" 
                                      ? "bg-red-800 text-red-200 hover:bg-red-700" 
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                 </div>
               )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowBulkIssue(false);
                    setSelectedProject(null);
                    setSelectedDesignations([]);
                    setSelectedUniforms([]);
                    setSelectedItems([]);
                    setBulkIssueData({
                      issueTo: "",
                      department: "",
                      purpose: "",
                      address: "",
                      issueDate: new Date().toISOString().split('T')[0],
                      items: []
                    });
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={createIssueFromBulkItems}
                  disabled={selectedItems.length === 0 || isCreatingIssue}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    selectedItems.length > 0 && !isCreatingIssue
                      ? theme === "dark"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isCreatingIssue ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Issue...
                    </>
                  ) : (
                    <>
                      <FaBoxOpen className="w-4 h-4" />
                      Create Issue from Bulk Items
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DC Creation Modal */}
      {showDCCreationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-6xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
              onClick={() => setShowDCCreationModal(false)}
            >
              <FaTimes className="w-6 h-6" />
            </button>
            
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
              <FaFileAlt className="w-6 h-6" />
              Preview Bulk Issue Items
            </h2>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Items Preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className={`p-4 ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                    Selected Items ({selectedItems.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                      <tr>
                        <th className={`px-4 py-2 text-left text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                          Employee
                        </th>
                        <th className={`px-4 py-2 text-left text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                          Item
                        </th>
                        <th className={`px-4 py-2 text-left text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                          Size
                        </th>
                        <th className={`px-4 py-2 text-left text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                          Quantity
                        </th>
                        <th className={`px-4 py-2 text-left text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, index) => (
                        <tr key={index} className={`border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <td className={`px-4 py-2 text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                            {item.employeeName} ({item.employeeId})
                          </td>
                          <td className={`px-4 py-2 text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                            {item.itemName}
                          </td>
                          <td className={`px-4 py-2 text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                            {item.size}
                          </td>
                          <td className={`px-4 py-2 text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                            {item.quantity}
                          </td>
                          <td className={`px-4 py-2 text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className={`px-2 py-1 rounded text-xs transition-colors ${
                                theme === "dark"
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-red-500 text-white hover:bg-red-600"
                              }`}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => setShowDCCreationModal(false)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={createIssueFromBulkItems}
                  disabled={isCreatingIssue}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    theme === "dark"
                      ? "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  }`}
                >
                  {isCreatingIssue ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Creating Issue...
                    </>
                  ) : (
                    <>
                      <FaBoxOpen className="w-4 h-4" />
                      Create Issue
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DC Creation Modal */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
              onClick={() => setShowDCCreationModal(false)}
            >
              <FaTimes className="w-6 h-6" />
            </button>
            
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
              <FaFileAlt className="w-6 h-6" />
              Create DC from Issue
            </h2>

            <div className="space-y-6">
              {/* Issue Info */}
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                  Issue Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Issue To:</strong> </div>
                  <div><strong>Project:</strong> </div>
                  <div><strong>Purpose:</strong> </div>
                  <div><strong>Items:</strong> </div>
                </div>
              </div>

              {/* DC Creation Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    DC Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter DC number"
                    value={dcCreationData.dcNumber}
                    onChange={(e) => setDcCreationData(prev => ({ ...prev, dcNumber: e.target.value }))}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    DC Date
                  </label>
                  <input
                    type="date"
                    value={dcCreationData.dcDate}
                    onChange={(e) => setDcCreationData(prev => ({ ...prev, dcDate: e.target.value }))}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Delivery address"
                  rows={3}
                  value={dcCreationData.address}
                  onChange={(e) => setDcCreationData(prev => ({ ...prev, address: e.target.value }))}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                  Remarks
                </label>
                <textarea
                  placeholder="Additional remarks"
                  rows={2}
                  value={dcCreationData.remarks}
                  onChange={(e) => setDcCreationData(prev => ({ ...prev, remarks: e.target.value }))}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => setShowDCCreationModal(false)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {}}
                  disabled={isCreatingDC || !dcCreationData.dcNumber || !dcCreationData.address}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    theme === "dark"
                      ? "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  }`}
                >
                  {isCreatingDC ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Creating DC...
                    </>
                  ) : (
                    <>
                      <FaFileAlt className="w-4 h-4" />
                      Create DC
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue View Modal */}
      {showViewModal && selectedIssueForView && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-3xl w-full p-6 relative transition-colors duration-300 overflow-y-auto max-h-[80vh] ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
              onClick={() => setShowViewModal(false)}
            >
              <FaTimes className="w-6 h-6" />
            </button>
            
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
              <FaBoxOpen className="w-6 h-6" />
              Issue Details
            </h2>

            <div className="space-y-6">
              {/* Issue Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Issue To
                  </label>
                  <div className={`p-3 border rounded-lg ${theme === "dark" ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-300 text-gray-900"}`}>
                    {selectedIssueForView.issueTo}
                  </div>
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Project
                  </label>
                  <div className={`p-3 border rounded-lg ${theme === "dark" ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-300 text-gray-900"}`}>
                    {selectedIssueForView.department}
                  </div>
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Purpose
                  </label>
                  <div className={`p-3 border rounded-lg ${theme === "dark" ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-300 text-gray-900"}`}>
                    {selectedIssueForView.purpose}
                  </div>
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Issue Date
                  </label>
                  <div className={`p-3 border rounded-lg ${theme === "dark" ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-300 text-gray-900"}`}>
                    {new Date(selectedIssueForView.issueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                  Items ({selectedIssueForView.items.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className={`w-full text-sm border-collapse ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                    <thead>
                      <tr className={`${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                        <th className={`px-3 py-2 text-left font-semibold border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>
                          Item Name
                        </th>
                        <th className={`px-3 py-2 text-center font-semibold border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>
                          Size
                        </th>
                        <th className={`px-3 py-2 text-center font-semibold border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>
                          Quantity
                        </th>
                        <th className={`px-3 py-2 text-left font-semibold border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>
                          Employee ID
                        </th>
                        <th className={`px-3 py-2 text-left font-semibold border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>
                          Employee Name
                        </th>
                        <th className={`px-3 py-2 text-left font-semibold border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>
                          Designation
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedIssueForView.items.map((item, index) => (
                        <tr key={index} className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} ${index % 2 === 0 ? (theme === "dark" ? "bg-gray-800" : "bg-white") : (theme === "dark" ? "bg-gray-800/50" : "bg-gray-50")}`}>
                          <td className={`px-3 py-2 border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-800"}`}>
                            {item.itemId?.name || item.name || 'N/A'}
                          </td>
                          <td className={`px-3 py-2 text-center border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-800"}`}>
                            {item.size || 'N/A'}
                          </td>
                          <td className={`px-3 py-2 text-center border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-800"}`}>
                            {item.quantity}
                          </td>
                          <td className={`px-3 py-2 border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-800"}`}>
                            {(() => {
                              // If DC exists, get employee ID from employeeMappings, otherwise use item.employeeId
                              if (selectedIssueForView?.outwardDC) {
                                const dcItem = selectedIssueForView.outwardDC.items.find(dcItem => 
                                  dcItem.itemId === item.itemId?._id || dcItem.uniformType === item.itemId?.name
                                );
                                if (dcItem?.employeeMappings && dcItem.employeeMappings.length > 0) {
                                  return dcItem.employeeMappings[0].employeeId;
                                }
                              }
                              return item.employeeId || 'N/A';
                            })()}
                          </td>
                          <td className={`px-3 py-2 border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-800"}`}>
                            {(() => {
                              // If DC exists, get employee ID from employeeMappings, otherwise use item.employeeId
                              let employeeId = item.employeeId;
                              if (selectedIssueForView?.outwardDC) {
                                const dcItem = selectedIssueForView.outwardDC.items.find(dcItem => 
                                  dcItem.itemId === item.itemId?._id || dcItem.uniformType === item.itemId?.name
                                );
                                if (dcItem?.employeeMappings && dcItem.employeeMappings.length > 0) {
                                  employeeId = dcItem.employeeMappings[0].employeeId;
                                }
                              }
                              return employeeId && employeeDetails[employeeId] 
                                ? employeeDetails[employeeId].fullName 
                                : 'N/A';
                            })()}
                          </td>
                          <td className={`px-3 py-2 border ${theme === "dark" ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-800"}`}>
                            {(() => {
                              // If DC exists, get employee ID from employeeMappings, otherwise use item.employeeId
                              let employeeId = item.employeeId;
                              if (selectedIssueForView?.outwardDC) {
                                const dcItem = selectedIssueForView.outwardDC.items.find(dcItem => 
                                  dcItem.itemId === item.itemId?._id || dcItem.uniformType === item.itemId?.name
                                );
                                if (dcItem?.employeeMappings && dcItem.employeeMappings.length > 0) {
                                  employeeId = dcItem.employeeMappings[0].employeeId;
                                }
                              }
                              return employeeId && employeeDetails[employeeId] 
                                ? employeeDetails[employeeId].designation 
                                : 'N/A';
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DC Status */}
              {selectedIssueForView.outwardDC && (
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200"}`}>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-green-200" : "text-green-800"}`}>
                    DC Created
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>DC Number:</strong> {selectedIssueForView.outwardDC.dcNumber}</div>
                    <div><strong>DC Date:</strong> {new Date(selectedIssueForView.outwardDC.dcDate).toLocaleDateString()}</div>
                    <div><strong>Address:</strong> {selectedIssueForView.outwardDC.address}</div>
                    <div><strong>Items:</strong> {selectedIssueForView.items.length} (Original Issue Items)</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-xl shadow-xl p-4 w-full max-w-3xl relative overflow-y-auto max-h-[80vh] ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            <button 
              className={`absolute top-2 right-2 text-2xl font-bold ${
                theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'
              }`} 
              onClick={() => {
                setShowUploadModal(false);
                setSelectedDC(null);
              }}
            >
              &times;
            </button>
            
            <h2 className="text-2xl font-bold mb-4 text-center">
              {selectedDC ? `Upload Files for DC: ${selectedDC.dcNumber}` : 'Upload Files'}
            </h2>

            {/* Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center mb-6 transition-colors ${
                theme === 'dark' 
                  ? 'border-blue-500 bg-gray-800 hover:bg-gray-700' 
                  : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e)}
            >
              <FaUpload className={`mx-auto mb-3 text-3xl ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
              }`} />
              <p className={`text-base mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Drag & drop files here or choose upload method
              </p>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Supports images, PDFs, Word docs, Excel files (Max 10MB each)
              </p>
              
              <div className="flex gap-3 justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
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
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-2 rounded-lg font-semibold border transition flex items-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500'
                  }`}
                >
                  <FaUpload />
                  Choose Files
                </button>
                
                <button
                  onClick={handleCameraCapture}
                  className={`px-4 py-2 rounded-lg font-semibold border transition flex items-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500'
                  }`}
                >
                  <FaFileImage />
                  Take Photo
                </button>
              </div>
            </div>

            {/* Pending Files Queue */}
            {pendingFiles.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Files Ready to Upload ({pendingFiles.length})</h3>
                  <button
                    onClick={saveFilesToDC}
                    disabled={savingFiles || !selectedDC}
                    className={`px-4 py-2 rounded-lg font-semibold border transition flex items-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-green-700 text-white hover:bg-green-800 border-green-600'
                        : 'bg-green-600 text-white hover:bg-green-700 border-green-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {savingFiles ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaUpload />
                        Save Files
                      </>
                    )}
                  </button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {pendingFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-yellow-900/20 border-yellow-700' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                            {file.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatFileSize(file.size)} • Ready to upload
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {file.type.startsWith('image/') && (
                          <button
                            onClick={() => window.open(file.url, '_blank')}
                            className={`p-2 rounded-lg transition ${
                              theme === 'dark' 
                                ? 'text-green-400 hover:bg-gray-700' 
                                : 'text-green-600 hover:bg-gray-100'
                            }`}
                            title="Preview"
                          >
                            <FaEye />
                          </button>
                        )}
                        <button
                          onClick={() => removePendingFile(file.id)}
                          className={`p-2 rounded-lg transition ${
                            theme === 'dark' 
                              ? 'text-red-400 hover:bg-gray-700' 
                              : 'text-red-600 hover:bg-gray-100'
                          }`}
                          title="Remove"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.filter(file => selectedDC ? file.dcNumber === selectedDC.dcNumber : !file.dcNumber).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Uploaded Files</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadedFiles
                    .filter(file => selectedDC ? file.dcNumber === selectedDC.dcNumber : !file.dcNumber)
                    .map((file) => (
                    <div 
                      key={file.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-800 border-gray-700' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                            {file.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                            {file.isUploaded && <span className="text-green-500 ml-2">✓ Uploaded</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFileDownload(file)}
                          className={`p-2 rounded-lg transition ${
                            theme === 'dark' 
                              ? 'text-blue-400 hover:bg-gray-700' 
                              : 'text-blue-600 hover:bg-gray-100'
                          }`}
                          title="Download"
                        >
                          <FaDownload />
                        </button>
                        {file.type.startsWith('image/') && (
                          <button
                            onClick={() => window.open(file.url, '_blank')}
                            className={`p-2 rounded-lg transition ${
                              theme === 'dark' 
                                ? 'text-green-400 hover:bg-gray-700' 
                                : 'text-green-600 hover:bg-gray-100'
                            }`}
                            title="Preview"
                          >
                            <FaEye />
                          </button>
                        )}
                        <button
                          onClick={() => handleFileDelete(file.id)}
                          className={`p-2 rounded-lg transition ${
                            theme === 'dark' 
                              ? 'text-red-400 hover:bg-gray-700' 
                              : 'text-red-600 hover:bg-gray-100'
                          }`}
                          title="Delete"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Global Files (when no specific DC selected) */}
            {!selectedDC && uploadedFiles.filter(file => !file.dcNumber).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Global Files</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadedFiles
                    .filter(file => !file.dcNumber)
                    .map((file) => (
                    <div 
                      key={file.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-800 border-gray-700' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                            {file.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFileDownload(file)}
                          className={`p-2 rounded-lg transition ${
                            theme === 'dark' 
                              ? 'text-blue-400 hover:bg-gray-700' 
                              : 'text-blue-600 hover:bg-gray-100'
                          }`}
                          title="Download"
                        >
                          <FaDownload />
                        </button>
                        {file.type.startsWith('image/') && (
                          <button
                            onClick={() => window.open(file.url, '_blank')}
                            className={`p-2 rounded-lg transition ${
                              theme === 'dark' 
                                ? 'text-green-400 hover:bg-gray-700' 
                                : 'text-green-600 hover:bg-gray-100'
                            }`}
                            title="Preview"
                          >
                            <FaEye />
                          </button>
                        )}
                        <button
                          onClick={() => handleFileDelete(file.id)}
                          className={`p-2 rounded-lg transition ${
                            theme === 'dark' 
                              ? 'text-red-400 hover:bg-gray-700' 
                              : 'text-red-600 hover:bg-gray-100'
                          }`}
                          title="Delete"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* DC Details Modal */}
      {selectedDC && !showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-4 w-full max-w-4xl relative overflow-y-auto max-h-[80vh]">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold" onClick={() => setSelectedDC(null)}>&times;</button>
              <h2 className="text-2xl font-bold mb-4 text-center">Delivery Challan Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><b>DC Number:</b> {selectedDC?.dcNumber}</div>
                  <div><b>Date:</b> {selectedDC?.dcDate ? selectedDC?.dcDate.split('T')[0] : ''}</div>
                  <div><b>Project:</b> {selectedDC ? getProjectName(selectedDC!) : 'N/A'}</div>
                  <div><b>Status:</b> Issued</div>
                  <div><b>Customer:</b> {selectedDC?.customer}</div>
                  <div><b>Total Items:</b> {selectedDC?.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</div>
                </div>

                {/* Employee Details */}
                <div>
                  <h3 className="font-semibold mb-3">Employee Details</h3>
                  <div className="space-y-3">
                    {(() => {
                      // Group DC items by employeeId
                      const employeeGroups = selectedDC?.items.reduce((groups: Record<string, DCItemOriginal[]>, item) => {
                        const empId = item.employeeId || 'Unknown';
                        if (!groups[empId]) {
                          groups[empId] = [];
                        }
                        groups[empId].push(item);
                        return groups;
                      }, {}) || {};

                      return Object.entries(employeeGroups).map(([employeeId, items], groupIndex) => {
                        const empDetails = employeeDetails[employeeId];
                        return (
                          <div key={groupIndex} className="border rounded-lg p-3">
                            <div className="font-semibold mb-2">Employee: {employeeId}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div><b>Name:</b> {empDetails?.fullName || 'Not found in KYC'}</div>
                              <div><b>Designation:</b> {empDetails?.designation || 'Not found in KYC'}</div>
                            </div>
                            <div className="text-sm">
                              <b>Items:</b>
                              <div className="mt-2 overflow-x-auto">
                                <table className={`w-full text-xs border-collapse ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                                  <thead>
                                    <tr className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                      <th className={`px-2 py-1 text-left border ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>Item Name</th>
                                      <th className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>Size</th>
                                      <th className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, itemIndex) => (
                                      <tr key={itemIndex} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                          {item.name || item.uniformType}
                                        </td>
                                        <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                          {item.size}
                                        </td>
                                        <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                          ₹{item.price || '0'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Uploaded Files for this DC */}
                {uploadedFiles.filter(file => file.dcNumber === selectedDC.dcNumber).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Attached Files ({uploadedFiles.filter(file => file.dcNumber === selectedDC.dcNumber).length})</h3>
                    <div className="space-y-2">
                      {uploadedFiles
                        .filter(file => file.dcNumber === selectedDC.dcNumber)
                        .map((file) => (
                        <div 
                          key={file.id} 
                          className={`flex items-center justify-between p-2 rounded border ${
                            theme === 'dark' 
                              ? 'bg-gray-800 border-gray-700' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.type)}
                            <span className="text-sm">{file.name}</span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              ({formatFileSize(file.size)})
                            </span>
                            {file.isUploaded && <span className="text-green-500 text-xs">✓</span>}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleFileDownload(file)}
                              className={`p-1 rounded transition ${
                                theme === 'dark' 
                                  ? 'text-blue-400 hover:bg-gray-700' 
                                  : 'text-blue-600 hover:bg-gray-100'
                              }`}
                              title="Download"
                            >
                              <FaDownload />
                            </button>
                            {file.type.startsWith('image/') && (
                              <button
                                onClick={() => window.open(file.url, '_blank')}
                                className={`p-1 rounded transition ${
                                  theme === 'dark' 
                                    ? 'text-green-400 hover:bg-gray-700' 
                                    : 'text-green-600 hover:bg-gray-100'
                                }`}
                                title="Preview"
                              >
                                <FaEye />
                              </button>
                            )}
                            <button
                              onClick={() => handleFileDelete(file.id)}
                              className={`p-1 rounded transition ${
                                theme === 'dark' 
                                  ? 'text-red-400 hover:bg-gray-700' 
                                  : 'text-red-600 hover:bg-gray-100'
                              }`}
                              title="Delete"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {selectedDC?.remarks && (
                  <div className="border rounded-lg p-3">
                    <span className="font-semibold">Remarks:</span> {selectedDC?.remarks}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DC Preview Modal */}
        {showDCPreviewModal && selectedDCPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                onClick={() => {
                  setShowDCPreviewModal(false);
                  setSelectedDCPreview(null);
                }}
              >
                <FaTimes className="w-6 h-6" />
              </button>
              
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                <FaFileAlt className="w-6 h-6" />
                DC Preview - {selectedDCPreview.outwardDC?.dcNumber || selectedDCPreview.dcNumber}
              </h2>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* DC Information */}
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                  <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                    DC Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>DC Number: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedDCPreview.outwardDC?.dcNumber || selectedDCPreview.dcNumber}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Date: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedDCPreview.outwardDC?.dcDate ? new Date(selectedDCPreview.outwardDC.dcDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Customer: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedDCPreview.outwardDC?.customer || selectedDCPreview.issueTo}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Address: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedDCPreview.outwardDC?.address || selectedDCPreview.department}</span>
                    </div>
                  </div>
                </div>

                {/* Items Preview */}
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <h3 className={`font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    Items Preview ({selectedDCPreview.outwardDC?.items?.length || selectedDCPreview.items.length} items)
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className={`min-w-full border-collapse ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
                      <thead>
                        <tr className={`${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            Sl No
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            Emp ID
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            Names
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            Designation
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            No of Set
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            Item Name
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            Size
                          </th>
                          <th className={`px-3 py-2 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-300"}`}>
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "divide-y divide-gray-600" : "divide-y divide-gray-200"}>
                        {(selectedDCPreview.outwardDC?.items || selectedDCPreview.items).map((item, index) => (
                          <tr key={index} className={`${theme === "dark" ? "hover:bg-gray-700 transition even:bg-gray-800" : "hover:bg-gray-50 transition even:bg-gray-25"}`}>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              {index + 1}
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              {(() => {
                                // If DC exists, get employee ID from employeeMappings, otherwise use item.employeeId
                                if ('employeeMappings' in item && item.employeeMappings && item.employeeMappings.length > 0) {
                                  return item.employeeMappings[0].employeeId;
                                }
                                return item.employeeId || 'N/A';
                              })()}
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              {(() => {
                                let employeeId = item.employeeId;
                                if ('employeeMappings' in item && item.employeeMappings && item.employeeMappings.length > 0) {
                                  employeeId = item.employeeMappings[0].employeeId;
                                }
                                return employeeId ? (employeeDetails[employeeId]?.fullName || 'N/A') : 'N/A';
                              })()}
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              {(() => {
                                let employeeId = item.employeeId;
                                if ('employeeMappings' in item && item.employeeMappings && item.employeeMappings.length > 0) {
                                  employeeId = item.employeeMappings[0].employeeId;
                                }
                                return employeeId ? (employeeDetails[employeeId]?.designation || 'N/A') : 'N/A';
                              })()}
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="text-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                                }`}>
                                  {item.employeeId ? (() => {
                                    const items = selectedDCPreview.outwardDC?.items || selectedDCPreview.items;
                                    const employeeItems = items.filter((i: InventoryItem) => i.employeeId === item.employeeId);
                                    return employeeItems.length > 0 ? employeeItems.length : 'N/A';
                                  })() : 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              {(item as DCItemOriginal).uniformType || (typeof item.itemId === 'object' ? item.itemId?.name : item.itemId) || 'N/A'}
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="text-center">{item.size || 'N/A'}</div>
                            </td>
                            <td className={`px-3 py-2 border text-xs ${theme === 'dark' ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>
                              <div className="text-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"
                                }`}>
                                  {item.quantity || 'N/A'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6">
                <button
                  onClick={() => {
                    setShowDCPreviewModal(false);
                    setSelectedDCPreview(null);
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Close
                </button>
                <button
                  onClick={() => selectedDCPreview && handleDCDownload(selectedDCPreview)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    theme === "dark"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  <FaDownload className="w-4 h-4" />
                  Download DC
                </button>
              </div>
            </div>
          </div>
        )}

      {/* RDC Creation Modal */}
      {showRdcModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
              onClick={() => {
                setShowRdcModal(false);
                setSelectedRdcProject(null);
                setSelectedRdcItems([]);
                setAvailableItems([]);
                setSearchTerm("");
                setRdcCreationData({
                  issueTo: "",
                  department: "",
                  purpose: "",
                  address: "",
                  issueDate: new Date().toISOString().split('T')[0],
                  deadlineDate: "",
                  items: []
                });
              }}
            >
              <FaTimes className="w-6 h-6" />
            </button>
            
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
              <FaBoxOpen className="w-6 h-6" />
              Create Returnable DC (RDC)
            </h2>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Issue To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rdcCreationData.issueTo}
                    onChange={e => setRdcCreationData(prev => ({ ...prev, issueTo: e.target.value }))}
                    placeholder="Department or recipient name"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={rdcCreationData.department}
                    onChange={e => handleRdcProjectChange(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project._id} value={project.projectName}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rdcCreationData.purpose}
                    onChange={e => setRdcCreationData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Purpose of issue"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={rdcCreationData.issueDate}
                    onChange={e => setRdcCreationData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Retrieval Deadline
                  </label>
                  <input
                    type="date"
                    value={rdcCreationData.deadlineDate}
                    onChange={e => setRdcCreationData(prev => ({ ...prev, deadlineDate: e.target.value }))}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                  Address
                </label>
                <textarea
                  value={rdcCreationData.address}
                  onChange={e => setRdcCreationData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Delivery address"
                  rows={3}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  }`}
                />
              </div>

              {selectedRdcProject && (
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                      <FaBoxOpen className="w-4 h-4" />
                      Available Items for {selectedRdcProject.projectName}
                    </h3>
                    
                    {/* Search Bar */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search items..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-64 px-3 py-2 pl-8 border rounded-lg text-sm focus:ring-2 focus:border-transparent transition-all duration-200 ${
                            theme === "dark"
                              ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                              : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                          }`}
                        />
                        <FaSearch className={`absolute left-2.5 top-2.5 w-3 h-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                      </div>
                    </div>
                  </div>
                  
                  {itemsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Loading items...
                      </p>
                    </div>
                  ) : filteredItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className={`${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`${theme === "dark" ? "bg-gray-800" : "bg-white"} divide-y divide-gray-200`}>
                          {filteredItems.map((item: UniformItem) => 
                            item.sizes.map((size: string) => {
                              const availableQty = item.sizeInventory?.find((si: { size: string; quantity: number }) => si.size === size)?.quantity || 0;
                              const selectedItem = selectedRdcItems.find(i => i.itemId === item._id && i.size === size);
                              const currentQty = selectedItem?.quantity || 0;
                              
                              return (
                                <tr key={`${item._id}-${size}`} className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                                  <td className="px-3 py-3 whitespace-nowrap">
                                    <div>
                                      <div className={`text-sm font-medium ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                        {item.name}
                                      </div>
                                      <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                        {item.itemCode}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 whitespace-nowrap">
                                    <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                      {item.category}
                                    </div>
                                    <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                      {item.subCategory}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      theme === "dark" ? "bg-blue-800 text-blue-200" : "bg-blue-100 text-blue-800"
                                    }`}>
                                      {size}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 whitespace-nowrap">
                                    <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                      {availableQty}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max={availableQty}
                                        value={currentQty}
                                        onChange={(e) => handleRdcItemSelection(item._id, item.name, parseInt(e.target.value) || 0, size, item.itemCode)}
                                        className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:border-transparent ${
                                          theme === "dark"
                                            ? "bg-gray-600 border-gray-500 text-gray-100 focus:ring-blue-900"
                                            : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                                        }`}
                                        placeholder="0"
                                      />
                                      <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                        / {availableQty}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                                    {currentQty > 0 && (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        theme === "dark" ? "bg-green-800 text-green-200" : "bg-green-100 text-green-800"
                                      }`}>
                                        Selected: {currentQty}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      <FaBoxOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No items available for the selected project</p>
                    </div>
                  )}
                </div>
              )}

              {/* Serial Number Input Section for ASS-prefixed items */}
              {selectedRdcItems.some(item => item.itemCode && item.itemCode.toUpperCase().startsWith('ASS') && item.quantity > 0) && (
                <div className={`mt-6 p-4 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    Serial Number & Item Code Details
                  </h3>
                  <div className="space-y-4">
                    {selectedRdcItems
                      .filter(item => item.itemCode && item.itemCode.toUpperCase().startsWith('ASS') && item.quantity > 0)
                      .map((item, itemIndex) => (
                        <div key={`${item.itemId}-${item.size}-${itemIndex}`} className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-white"}`}>
                          <div className={`font-semibold mb-3 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                            {item.itemName} {item.size && `- Size: ${item.size}`} (Qty: {item.quantity})
                          </div>
                          <div className="space-y-2">
                            {item.serialNumbers && item.serialNumbers.map((serial, serialIndex) => (
                              <div key={serialIndex} className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`block text-xs mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Item {serialIndex + 1} - Item Code
                                  </label>
                                  <input
                                    type="text"
                                    value={serial.itemCode}
                                    onChange={(e) => updateSerialNumber(item.itemId, item.size, serialIndex, 'itemCode', e.target.value)}
                                    className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:border-transparent ${
                                      theme === "dark"
                                        ? "bg-gray-600 border-gray-500 text-gray-100 focus:ring-blue-900"
                                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                                    }`}
                                    placeholder="Enter item code"
                                  />
                                </div>
                                <div>
                                  <label className={`block text-xs mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Item {serialIndex + 1} - Serial Number
                                  </label>
                                  <input
                                    type="text"
                                    value={serial.serialNumber}
                                    onChange={(e) => updateSerialNumber(item.itemId, item.size, serialIndex, 'serialNumber', e.target.value)}
                                    className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:border-transparent ${
                                      theme === "dark"
                                        ? "bg-gray-600 border-gray-500 text-gray-100 focus:ring-blue-900"
                                        : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                                    }`}
                                    placeholder="Enter serial number"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6">
                <button
                  onClick={() => {
                    setShowRdcModal(false);
                    setSelectedRdcProject(null);
                    setSelectedRdcItems([]);
                    setAvailableItems([]);
                    setSearchTerm("");
                    setRdcCreationData({
                      issueTo: "",
                      department: "",
                      purpose: "",
                      address: "",
                      issueDate: new Date().toISOString().split('T')[0],
                      deadlineDate: "",
                      items: []
                    });
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={createRDCFromIssue}
                  disabled={isCreatingRdc || selectedRdcItems.length === 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    theme === "dark" 
                      ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400" 
                      : "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300"
                  }`}
                >
                  {isCreatingRdc ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating RDC...
                    </>
                  ) : (
                    <>
                      <FaBoxOpen className="w-4 h-4" />
                      Create RDC
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}