"use client";
import React, { useState, useEffect, useMemo } from "react";
import CoordinatorDashboardLayout from "@/components/dashboard/CoordinatorDashboardLayout";
import { FaStore, FaBoxOpen, FaSearch,FaPlus, FaTimes, FaExclamationTriangle, FaDownload, FaUsers, FaTshirt, FaCalendarAlt, FaFileAlt, FaUserPlus, FaEye } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { showToast } from "@/components/Toast";

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

interface DCItem {
  itemId: string;
  quantity: number;
  size: string;
  employeeId: string | null;
  uniformType: string;
  // New properties for employee mappings
  totalQuantity?: number;
  remainingQuantity?: number;
  employeeMappings?: Array<{
    employeeId: string;
    quantity: number;
    mappedAt: string;
    _id: string;
  }>;
}

interface EmployeeMapping {
  itemId: string;
  employeeId: string;
  quantity: number;
  size: string;
  uniformType: string;
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

interface OutwardDC {
  _id: string;
  customer?: string;
  dcNumber: string;
  dcDate: string;
  address: string;
  remarks: string;
  items: DCItem[];
  createdAt: string;
  updatedAt: string;
}

interface DCAPIResponse {
  _id: string;
  customer?: string;
  dcNumber: string;
  dcDate: string;
  address: string;
  remarks: string;
  items: DCItem[];
  createdAt: string;
  updatedAt: string;
  issueId?: string;
  issue?: string;
}

interface KYCData {
  personalDetails?: {
    employeeId?: string;
    fullName?: string;
    designation?: string;
    projectName?: string;
    department?: string;
  };
}


interface Issue {
  _id: string;
  issueTo: string;
  department: string;
  purpose: string;
  issueDate: string;
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
  dcNumber?: string; // DC number from API response
}

export default function BulkIssuePage() {
  const { theme } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDCCreationModal, setShowDCCreationModal] = useState(false);
  const [showEmployeeMappingModal, setShowEmployeeMappingModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of items per page

  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        height: 12px;
        width: 12px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: ${theme === 'dark' ? '#374151' : '#f3f4f6'};
        border-radius: 6px;
        margin: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: ${theme === 'dark' ? '#6b7280' : '#9ca3af'};
        border-radius: 6px;
        border: 2px solid ${theme === 'dark' ? '#374151' : '#f3f4f6'};
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
      }
      .custom-scrollbar::-webkit-scrollbar-corner {
        background: ${theme === 'dark' ? '#374151' : '#f3f4f6'};
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [theme]);
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uniformMappings, setUniformMappings] = useState<UniformMapping[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<BulkIssueItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
  const [selectedUniforms, setSelectedUniforms] = useState<Array<{name: string, quantity: number, size: string}>>([]);

  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
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

  // New state for DC creation
  const [selectedIssueForDC, setSelectedIssueForDC] = useState<Issue | null>(null);
  const [dcCreationData, setDcCreationData] = useState({
    dcNumber: "",
    dcDate: new Date().toISOString().split('T')[0],
    address: "",
    remarks: ""
  });
  const [isCreatingDC, setIsCreatingDC] = useState(false);
  const [createdDC, setCreatedDC] = useState<OutwardDC | null>(null);
  const [employeeMappings, setEmployeeMappings] = useState<EmployeeMapping[]>([]);
  const [isUpdatingMappings, setIsUpdatingMappings] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // State for bulk issue DCs
  const [bulkIssueDCs, setBulkIssueDCs] = useState<BulkIssueDC[]>([]);
  const [bulkIssueDCsLoading, setBulkIssueDCsLoading] = useState(false);
  const [bulkIssueDCsError, setBulkIssueDCsError] = useState<string | null>(null);

  // Fetch inventory items, employees, and projects on component mount
  useEffect(() => {
    const fetchData = async () => {
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
          console.log('📦 Loaded inventory items:', inventoryData.length, 'items');
          console.log('📦 Sample inventory items:', inventoryData.slice(0, 3).map(item => ({ name: item.name, category: item.category })));
          setInventoryItems(inventoryData);
        } else {
          console.log('❌ No inventory data:', inventoryData);
        }
        
        if (employeesData && employeesData.kycData) {
          const employeeList = employeesData.kycData.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
            employeeId: kyc.personalDetails?.employeeId || "",
            fullName: kyc.personalDetails?.fullName || "",
            designation: kyc.personalDetails?.designation || "",
            projectName: kyc.personalDetails?.projectName || "",
            department: kyc.personalDetails?.department || ""
          })).filter((emp: Employee) => emp.employeeId && emp.fullName);
          
          setEmployees(employeeList);
        } else if (employeesData && Array.isArray(employeesData)) {
          // Handle direct array response
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
          setProjects(projectsData);
        }

        if (mappingsData && mappingsData.success) {
          const activeMappings = mappingsData.data.filter((m: UniformMapping) => m.isActive !== false);
          console.log('📋 Loaded uniform mappings:', activeMappings);
          setUniformMappings(activeMappings);
        } else {
          console.log('❌ No uniform mappings data:', mappingsData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    
    fetchData();
  }, []);

  // Fetch issues
  useEffect(() => {
    const fetchIssues = async () => {
      setIssuesLoading(true);
      try {
        const response = await fetch("https://inventory.zenapi.co.in/api/inventory/issue");
        const data = await response.json();
        
        console.log("Raw API response:", data);
        console.log("Response type:", typeof data);
        console.log("Is array:", Array.isArray(data));
        
        let issues: Issue[] = [];
        if (data && data.success && Array.isArray(data.data)) {
          console.log("Using data.data (success format)");
          issues = data.data;
        } else if (Array.isArray(data)) {
          console.log("Using data directly (array format)");
          issues = data;
        } else {
          console.warn("Unexpected issue data format:", data);
          issues = [];
        }

        // Fetch DC details for each issue
        console.log("Fetching DC details for issues...");
        const issuesWithDC = await fetchDCDetailsForIssues(issues);
        setIssues(issuesWithDC);

      } catch (err) {
        console.error("Error fetching issues:", err);
        setIssuesError("Failed to fetch issues");
      } finally {
        setIssuesLoading(false);
      }
    };

    fetchIssues();
  }, []);

  // Fetch bulk issue DCs
  useEffect(() => {
    fetchBulkIssueDCs();
  }, []);



  // Function to fetch DC data for issues
  const fetchDCDetailsForIssues = async (issues: Issue[]): Promise<Issue[]> => {
    console.log('Starting to fetch DC details for', issues.length, 'issues');
    
    try {
      // Try to fetch all DCs first
      console.log('Fetching all DCs...');
      const allDCsResponse = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc');
      
      if (allDCsResponse.ok) {
        const allDCsData = await allDCsResponse.json();
        console.log('All DCs response:', allDCsData);
        
        let allDCs = [];
        if (allDCsData.success && Array.isArray(allDCsData.data)) {
          allDCs = allDCsData.data;
        } else if (Array.isArray(allDCsData)) {
          allDCs = allDCsData;
        }
        
        console.log('Found', allDCs.length, 'DCs total');
        
        // Match DCs with issues by multiple criteria
        const updatedIssues = issues.map(issue => {
          const matchingDC = allDCs.find((dc: DCAPIResponse) => {
            // Try multiple matching criteria
            const customerMatch = dc.customer === issue.issueTo;
            const remarksMatch = dc.remarks?.includes(issue._id);
            const issueIdMatch = dc.issueId === issue._id || dc.issue === issue._id;
            // Additional matching: check if DC was created from this issue
            const createdFromIssue = dc.remarks?.includes(`Generated from Issue ${issue._id}`) || 
                                   dc.remarks?.includes(issue._id) ||
                                   dc.customer === issue.issueTo;
            
            console.log(`Checking DC ${dc.dcNumber || dc._id} for issue ${issue._id}:`, {
              customerMatch,
              remarksMatch,
              issueIdMatch,
              createdFromIssue,
              dcCustomer: dc.customer,
              issueTo: issue.issueTo,
              dcRemarks: dc.remarks,
              dcIssueId: dc.issueId || dc.issue
            });
            
            return customerMatch || remarksMatch || issueIdMatch || createdFromIssue;
          });
          
          if (matchingDC) {
            console.log(`✅ Found matching DC for issue ${issue._id} (${issue.issueTo}):`, matchingDC.dcNumber || matchingDC._id);
            return { ...issue, outwardDC: matchingDC };
          } else {
            console.log(`❌ No DC found for issue ${issue._id} (${issue.issueTo})`);
          }
          
          return issue;
        });
        
        const issuesWithDC = updatedIssues.filter(issue => issue.outwardDC);
        console.log(`DC matching completed: ${issuesWithDC.length}/${issues.length} issues have DCs`);
        
        return updatedIssues;
      } else {
        console.error('Failed to fetch DCs:', allDCsResponse.status, allDCsResponse.statusText);
      }
    } catch (error) {
      console.error('Error fetching DCs:', error);
    }
    
    // Return original issues if DC fetching fails
    console.log('Returning original issues without DC data');
    return issues;
  };

  // Refresh issues
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isDCFullyMapped = (issue: Issue): boolean => {
    if (!issue.outwardDC) return false;
    
    return issue.outwardDC.items.every(item => {
      // Check if remainingQuantity is 0 (most reliable indicator)
      if (item.remainingQuantity !== undefined) {
        return item.remainingQuantity === 0;
      }
      
      // Fallback: Check if item has employeeMappings and all quantity is mapped
      if (item.employeeMappings && item.employeeMappings.length > 0) {
        const totalMappedQuantity = item.employeeMappings.reduce((sum: number, mapping: { quantity: number }) => sum + mapping.quantity, 0);
        return totalMappedQuantity >= (item.totalQuantity || item.quantity || 1);
      }
      return false;
    });
  };

  const refreshIssues = async () => {
    setIssuesLoading(true);
    try {
      const response = await fetch("https://inventory.zenapi.co.in/api/inventory/issue");
      const data = await response.json();
      
      console.log("Refresh - Raw API response:", data);
      
      let issues: Issue[] = [];
      if (data && data.success && Array.isArray(data.data)) {
        console.log("Refresh - Using data.data (success format)");
        issues = data.data;
      } else if (Array.isArray(data)) {
        console.log("Refresh - Using data directly (array format)");
        issues = data;
      } else {
        console.warn("Refresh - Unexpected issue data format:", data);
        issues = [];
      }

      // Fetch DC details for each issue
      console.log("Fetching DC details for issues...");
      const issuesWithDC = await fetchDCDetailsForIssues(issues);
      setIssues(issuesWithDC);
      
      setIssuesError(null);
    } catch (err) {
      console.error("Error refreshing issues:", err);
      setIssuesError("Failed to refresh issues");
    } finally {
      setIssuesLoading(false);
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

  // Handle viewing issue details
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleViewIssue = (issue: Issue) => {
    setSelectedIssueForView(issue);
    setShowViewModal(true);
  };

  // Handle downloading DC
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownloadDC = async (issue: Issue) => {
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
          const matchingDC = allDCs.find((dcItem: DCAPIResponse) => dcItem.dcNumber === issue.dcNumber);
          if (matchingDC) {
            dc = matchingDC;
          }
        }
      } catch (error) {
        console.error('Error fetching DC by number:', error);
      }
    }
    
    if (!dc) {
      showToast({ message: "No DC found for this issue", type: "error" });
      return;
    }
    
    // Group items by employee to calculate set count
    const employeeGroups: Record<string, DCItem[]> = {};
    dc.items.forEach(item => {
      if (item.employeeId) {
        if (!employeeGroups[item.employeeId]) {
          employeeGroups[item.employeeId] = [];
        }
        employeeGroups[item.employeeId].push(item);
      }
    });

    // Calculate set count for each employee
    const employeeSetCounts: Record<string, number> = {};
    Object.keys(employeeGroups).forEach(employeeId => {
      const items = employeeGroups[employeeId];
      // Calculate set count based on uniform types (each unique combination = 1 set)
      const uniformTypes = [...new Set(items.map(item => item.uniformType))];
      employeeSetCounts[employeeId] = uniformTypes.length;
    });

    // Fetch employee details for display
    const employeeDetails: Record<string, { fullName: string; designation: string }> = {};
    try {
      const employeesRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const employeesData = await employeesRes.json();
      
      if (employeesData && employeesData.kycData) {
        employeesData.kycData.forEach((kyc: KYCData) => {
          if (kyc.personalDetails?.employeeId) {
            employeeDetails[kyc.personalDetails.employeeId] = {
              fullName: kyc.personalDetails.fullName || '',
              designation: kyc.personalDetails.designation || ''
            };
          }
        });
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
    // Create HTML content for the delivery challan
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Delivery Challan - ${dc.dcNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: white;
            color: black;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .company-address {
            font-size: 14px;
            margin-bottom: 10px;
          }
          .document-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .document-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-weight: bold;
            font-size: 14px;
          }
          .info-value {
            font-size: 14px;
            margin-top: 5px;
          }
          .sender-recipient {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .from-to {
            flex: 1;
            margin: 0 20px;
          }
          .from-to h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
          }
          .from-to p {
            margin: 5px 0;
            font-size: 14px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border: 2px solid #333;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #333;
            padding: 6px 8px;
            text-align: center;
            font-size: 11px;
            font-family: Arial, sans-serif;
          }
          .items-table th {
            background-color: #f8f8f8;
            font-weight: bold;
            text-align: center;
            font-size: 11px;
          }
          .items-table .item-name {
            text-align: left;
            font-weight: normal;
          }
          .items-table td {
            text-align: left;
          }
          .items-table td:nth-child(1),
          .items-table td:nth-child(2),
          .items-table td:nth-child(5),
          .items-table td:nth-child(6),
          .items-table td:nth-child(7),
          .items-table td:nth-child(8),
          .items-table td:nth-child(9),
          .items-table td:nth-child(10),
          .items-table td:nth-child(11),
          .items-table td:nth-child(12) {
            text-align: center;
          }
          .notes {
            margin-bottom: 30px;
          }
          .notes h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
          }
          .notes ol {
            margin: 0;
            padding-left: 20px;
          }
          .notes li {
            margin-bottom: 5px;
            font-size: 14px;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
          }
          .signature-box {
            text-align: center;
            flex: 1;
            margin: 0 20px;
          }
          .signature-line {
            border-bottom: 1px solid #333;
            height: 30px;
            margin-top: 5px;
          }
          .signature-label {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED</div>
          <div class="company-address">25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka</div>
          <div class="document-title">Non-Returnable Delivery Challan</div>
        </div>
        
        <div class="document-info">
          <div class="info-item">
            <span class="info-label">NRDC No:</span>
            <span class="info-value">${dc.dcNumber}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date:</span>
            <span class="info-value">${new Date(dc.dcDate).toISOString().split('T')[0]}</span>
          </div>
        </div>
        
        <div class="sender-recipient">
          <div class="from-to">
            <h3>From:</h3>
            <p>EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED</p>
            <p>25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka</p>
          </div>
          <div class="from-to">
            <h3>To:</h3>
            <p>${dc.customer || issue.issueTo}</p>
            <p>${dc.address || issue.department}</p>
            <p>${dc.remarks || issue.purpose || 'Uniform Issue'}</p>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>SI No</th>
              <th>Emp ID</th>
              <th>Names</th>
              <th>DESIGNATION</th>
              <th>No of Set</th>
              <th>Commercial HK Pant</th>
              <th>Yellow</th>
              <th>HK Ladies pant</th>
              <th>Green</th>
              <th>Ladies Shoes</th>
              <th>Amount</th>
              <th>Emp Sign</th>
            </tr>
          </thead>
          <tbody>
            ${dc.items.map((item, index) => {
              const empDetails = employeeDetails[item.employeeId || ''] || { fullName: 'N/A', designation: 'N/A' };
              const setCount = employeeSetCounts[item.employeeId || ''] || 1;
              
              // Map uniform types to the new column structure
              const getUniformData = (uniformType: string, size: string) => {
                const typeLower = uniformType?.toLowerCase() || '';
                
                if (typeLower.includes('commercial') && typeLower.includes('pant')) {
                  return { commercialPant: size || 'N/A', yellow: 'N/A', ladiesPant: 'N/A', green: 'N/A', ladiesShoes: 'N/A' };
                } else if (typeLower.includes('yellow')) {
                  return { commercialPant: 'N/A', yellow: size || 'N/A', ladiesPant: 'N/A', green: 'N/A', ladiesShoes: 'N/A' };
                } else if (typeLower.includes('ladies') && typeLower.includes('pant')) {
                  return { commercialPant: 'N/A', yellow: 'N/A', ladiesPant: size || 'N/A', green: 'N/A', ladiesShoes: 'N/A' };
                } else if (typeLower.includes('green')) {
                  return { commercialPant: 'N/A', yellow: 'N/A', ladiesPant: 'N/A', green: size || 'N/A', ladiesShoes: 'N/A' };
                } else if (typeLower.includes('ladies') && typeLower.includes('shoe')) {
                  return { commercialPant: 'N/A', yellow: 'N/A', ladiesPant: 'N/A', green: 'N/A', ladiesShoes: size || 'N/A' };
                } else {
                  // Default mapping for other uniform types
                  return { commercialPant: 'N/A', yellow: 'N/A', ladiesPant: 'N/A', green: 'N/A', ladiesShoes: 'N/A' };
                }
              };
              
              const uniformData = getUniformData(item.uniformType || '', item.size || '');
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.employeeId || 'N/A'}</td>
                  <td class="item-name">${empDetails.fullName}</td>
                  <td>${empDetails.designation}</td>
                  <td>${setCount}</td>
                  <td>${uniformData.commercialPant}</td>
                  <td>${uniformData.yellow}</td>
                  <td>${uniformData.ladiesPant}</td>
                  <td>${uniformData.green}</td>
                  <td>${uniformData.ladiesShoes}</td>
                  <td>N/A</td>
                  <td></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="notes">
          <h3>Terms and Conditions:</h3>
          <ol>
            <li>Complaints will be entertained if the goods are received within 24hrs of delivery</li>
            <li>Goods are delivered after careful checking</li>
          </ol>
        </div>
        
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-label">Initiated by</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Received by</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Issued by</div>
            <div class="signature-line"></div>
          </div>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f0f0f0;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print/Save as PDF
          </button>
          <p style="margin-top: 10px; font-size: 14px; color: #666;">
            Click the button above to print or save as PDF. You can also use Ctrl+P (Cmd+P on Mac) to print.
          </p>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Delivery_Challan_${dc.dcNumber}_${new Date(dc.dcDate).toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({ 
      message: `Delivery Challan ${dc.dcNumber} downloaded successfully! You can print it or save as PDF.`, 
      type: "success" 
    });
  };

  // Handle downloading issue (legacy function for issues without DC)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownloadIssue = () => {
    showToast({ 
      message: `Issue download not available. Please create DC first.`, 
      type: "info" 
    });
  };

  // Handle project selection
  const handleProjectChange = (projectName: string) => {
    const project = projects.find(p => p.projectName === projectName);
    console.log('🏢 Project selected:', projectName, 'Project object:', project);
    console.log('🏢 Available projects:', projects.map(p => p.projectName));
    
    if (!project) {
      console.error('❌ No project found for name:', projectName);
      showToast({ message: "Project not found. Please try selecting again.", type: "error" });
      return;
    }
    
    if (!project.projectName || project.projectName.trim() === "") {
      console.error('❌ Project has no name:', project);
      showToast({ message: "Selected project has no name. Please select a different project.", type: "error" });
      return;
    }
    
    setSelectedProject(project);
    setSelectedDesignations([]);
    setSelectedUniforms([]);
    setBulkIssueData(prev => ({ 
      ...prev, 
      department: projectName,
      address: project?.address || ""
    }));
    
    console.log('✅ Project set successfully:', project);
    console.log('🏢 Project designations:', project.designationWiseCount ? Object.keys(project.designationWiseCount) : 'None');
  };

  // Handle designation selection
  const handleDesignationChange = (designation: string, checked: boolean) => {
    console.log(`🎯 Designation change: ${designation} - ${checked ? 'checked' : 'unchecked'}`);
    
    if (checked) {
      setSelectedDesignations(prev => {
        const newDesignations = [...prev, designation];
        console.log(`✅ Added designation. New list:`, newDesignations);
        return newDesignations;
      });
    } else {
      setSelectedDesignations(prev => {
        const newDesignations = prev.filter(d => d !== designation);
        console.log(`❌ Removed designation. New list:`, newDesignations);
        return newDesignations;
      });
      // Only clear uniforms when removing a designation, not when adding
      setSelectedUniforms([]);
    }
  };

  // Get available designations for selected project
  const getAvailableDesignations = () => {
    if (!selectedProject) return [];
    return selectedProject.designationWiseCount ? Object.keys(selectedProject.designationWiseCount) : [];
  };

  // Get available uniforms for selected project and designations using useMemo for performance
  const availableUniforms = useMemo(() => {
    if (!selectedProject || selectedDesignations.length === 0) return [];
    
    console.log('🔍 Getting uniforms for:', {
      project: selectedProject.projectName,
      designations: selectedDesignations,
      totalMappings: uniformMappings.length,
      totalInventoryItems: inventoryItems.length
    });
    
    // Debug: Show ALL uniform mappings first
    console.log('📋 ALL UNIFORM MAPPINGS:', uniformMappings);
    
    const uniforms: InventoryItem[] = [];
    const addedUniformIds = new Set<string>(); // Track added uniforms to avoid duplicates
    
    // Process each selected designation
    selectedDesignations.forEach(designation => {
      console.log(`📋 Processing designation: ${designation}`);
      
      // Debug: Show all mappings for this project
      const projectMappings = uniformMappings.filter(m => m.project === selectedProject.projectName);
      console.log(`🏢 All mappings for project "${selectedProject.projectName}":`, projectMappings);
      
      // Debug: Show all mappings that contain this designation (regardless of project)
      const designationMappings = uniformMappings.filter(m => m.designations.includes(designation));
      console.log(`🎯 All mappings containing "${designation}" (any project):`, designationMappings);
      
      // Find ALL mappings that contain this designation for this project
      // Try exact match first
      let mappings = uniformMappings.filter(m => 
        m.project === selectedProject.projectName && 
        m.designations.includes(designation)
      );
      
      // If no exact match, try partial matching
      if (mappings.length === 0) {
        console.log(`🔍 No exact project match, trying partial matching...`);
        mappings = uniformMappings.filter(m => 
          (m.project.toLowerCase().includes(selectedProject.projectName.toLowerCase()) ||
           selectedProject.projectName.toLowerCase().includes(m.project.toLowerCase())) &&
          m.designations.includes(designation)
        );
        console.log(`🔍 Found ${mappings.length} mapping(s) with partial project match:`, mappings);
      }
      
      console.log(`🔍 Found ${mappings.length} mapping(s) for ${designation} in project "${selectedProject.projectName}":`, mappings);
      
      // Process each mapping found for this designation
      mappings.forEach((mapping, mappingIndex) => {
        console.log(`👕 Processing mapping ${mappingIndex + 1} for ${designation}:`, {
          mappingId: mapping._id,
          project: mapping.project,
          designations: mapping.designations,
          uniformTypes: mapping.uniformTypes
        });
        
        mapping.uniformTypes.forEach(uniformType => {
          const inventoryItem = inventoryItems.find(item => item.name === uniformType);
          console.log(`🔍 Looking for uniform "${uniformType}":`, inventoryItem ? 'Found' : 'Not found');
          
          // Debug: Show all inventory items with similar names
          const similarItems = inventoryItems.filter(item => 
            item.name.toLowerCase().includes(uniformType.toLowerCase()) || 
            uniformType.toLowerCase().includes(item.name.toLowerCase())
          );
          if (similarItems.length > 0) {
            console.log(`🔍 Similar items found for "${uniformType}":`, similarItems.map(item => item.name));
          }
          
          if (inventoryItem && !addedUniformIds.has(inventoryItem._id)) {
            uniforms.push(inventoryItem);
            addedUniformIds.add(inventoryItem._id);
            console.log(`✅ Added uniform: ${inventoryItem.name} from designation: ${designation}`);
          } else if (inventoryItem) {
            console.log(`⚠️ Uniform already added: ${inventoryItem.name}`);
          }
        });
      });
      
      if (mappings.length === 0) {
        console.log(`❌ No mapping found for designation: ${designation} in project: ${selectedProject.projectName}`);
        
        // Debug: Check if there are mappings for this designation in other projects
        const otherProjectMappings = uniformMappings.filter(m => 
          m.project !== selectedProject.projectName && 
          m.designations.includes(designation)
        );
        if (otherProjectMappings.length > 0) {
          console.log(`🔍 Found mappings for "${designation}" in other projects:`, otherProjectMappings.map(m => m.project));
        }
      }
    });
    
    console.log(`📊 Final result: ${uniforms.length} uniforms found:`, uniforms.map(u => u.name));
    
    // Debug: Show which designations contributed which uniforms
    console.log('📋 Summary by designation:');
    selectedDesignations.forEach(designation => {
      // Use same logic as above for consistency
      let mappings = uniformMappings.filter(m => 
        m.project === selectedProject.projectName && 
        m.designations.includes(designation)
      );
      
      if (mappings.length === 0) {
        mappings = uniformMappings.filter(m => 
          (m.project.toLowerCase().includes(selectedProject.projectName.toLowerCase()) ||
           selectedProject.projectName.toLowerCase().includes(m.project.toLowerCase())) &&
          m.designations.includes(designation)
        );
      }
      
      const designationUniforms = mappings.flatMap(m => m.uniformTypes);
      console.log(`  ${designation}: ${designationUniforms.length} uniform types -`, designationUniforms);
    });
    
    return uniforms;
  }, [selectedProject, selectedDesignations, uniformMappings, inventoryItems]);

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
        if (inventoryItem && !addedUniformIds.has(inventoryItem._id)) {
          uniforms.push(inventoryItem);
          addedUniformIds.add(inventoryItem._id);
          console.log(`✅ Added uniform: ${inventoryItem.name} for designation: ${designation}`);
        } else if (inventoryItem) {
          console.log(`⚠️ Uniform already added: ${inventoryItem.name}`);
        }
      });
    });
    
    console.log(`📊 Final result for ${designation}: ${uniforms.length} uniforms found:`, uniforms.map(u => u.name));
    return uniforms;
  };

  // Helper function to get designations that have a specific uniform
  const getUniformDesignations = (uniformName: string): string[] => {
    const designations: string[] = [];
    
    selectedDesignations.forEach(designation => {
      // Use same logic as above for consistency
      let mappings = uniformMappings.filter(m => 
        m.project === selectedProject?.projectName && 
        m.designations.includes(designation)
      );
      
      if (mappings.length === 0 && selectedProject) {
        mappings = uniformMappings.filter(m => 
          (m.project.toLowerCase().includes(selectedProject.projectName.toLowerCase()) ||
           selectedProject.projectName.toLowerCase().includes(m.project.toLowerCase())) &&
          m.designations.includes(designation)
        );
      }
      
      const hasUniform = mappings.some(mapping => 
        mapping.uniformTypes.includes(uniformName)
      );
      
      if (hasUniform) {
        designations.push(designation);
      }
    });
    
    return designations;
  };

  // Debug effect to monitor designation changes
  useEffect(() => {
    console.log('🔄 Selected designations changed:', selectedDesignations);
    if (selectedProject) {
      console.log('🔍 Available uniforms will be:', availableUniforms.map(u => u.name));
    }
  }, [selectedDesignations, selectedProject, availableUniforms]);

  // Debug effect to monitor uniform selection changes
  useEffect(() => {
    console.log('👕 Selected uniforms changed:', selectedUniforms);
  }, [selectedUniforms]);

  // Handle uniform selection and quantity
  const handleUniformSelection = (uniformName: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedUniforms(prev => prev.filter(u => !(u.name === uniformName && u.size === size)));
      return;
    }

    setSelectedUniforms(prev => {
      const existing = prev.find(u => u.name === uniformName && u.size === size);
      if (existing) {
        return prev.map(u => 
          u.name === uniformName && u.size === size 
            ? { ...u, quantity } 
            : u
        );
      } else {
        return [...prev, { name: uniformName, size, quantity }];
      }
    });
  };



  // Create bulk issue entries
  const createBulkIssueEntries = (uniforms: Array<{name: string, quantity: number, size: string}>, project: Project, designations: string[]) => {
    const entries: BulkIssueItem[] = [];
    
    const relevantEmployees = employees.filter(emp => 
      emp.projectName === project.projectName && 
      designations.includes(emp.designation)
    );

    if (relevantEmployees.length > 0) {
      uniforms.forEach(uniform => {
        const inventoryItem = inventoryItems.find(item => item.name === uniform.name);
        if (inventoryItem) {
          const quantityPerEmployee = Math.ceil(uniform.quantity / relevantEmployees.length);
          
          relevantEmployees.forEach((employee, index) => {
            const actualQuantity = index === relevantEmployees.length - 1 
              ? uniform.quantity - (quantityPerEmployee * (relevantEmployees.length - 1))
              : quantityPerEmployee;
            
            if (actualQuantity > 0) {
              entries.push({
                itemId: inventoryItem._id,
                itemName: inventoryItem.name,
                itemCode: inventoryItem.itemCode,
                size: uniform.size,
                quantity: actualQuantity,
                employeeId: employee.employeeId,
                employeeName: employee.fullName,
                remarks: `Bulk issue for ${designations.join(', ')} - ${project.projectName} | Employee: ${employee.fullName} (${employee.designation}) | Project Address: ${project.address || 'N/A'}`
              });
            }
          });
        }
      });
    } else {
      // Create bulk entries when no specific employees are found
      uniforms.forEach(uniform => {
        const inventoryItem = inventoryItems.find(item => item.name === uniform.name);
        if (inventoryItem) {
          entries.push({
            itemId: inventoryItem._id,
            itemName: inventoryItem.name,
            itemCode: inventoryItem.itemCode,
            size: uniform.size,
            quantity: uniform.quantity,
            employeeId: `BULK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            employeeName: `Bulk Issue - ${designations.join(', ')}`,
            remarks: `Bulk issue for ${designations.join(', ')} - ${project.projectName} | Project Address: ${project.address || 'N/A'} | Total Manpower: ${project.totalManpower}`
          });
        }
      });
    }
    
    console.log('Created bulk issue entries:', entries);
    console.log('Project details used:', project);
    console.log('Designations used:', designations);
    console.log('Relevant employees found:', relevantEmployees.length);
    
    return entries;
  };


  // Show DC popup for uniforms
  const showDCPopupForUniforms = () => {
    if (selectedUniforms.length === 0) {
      showToast({ message: "Please select at least one uniform with quantity", type: "error" });
      return;
    }

    if (!selectedProject || selectedDesignations.length === 0) {
      showToast({ message: "Please select both project and at least one designation", type: "error" });
      return;
    }

    try {
      const newEntries = createBulkIssueEntries(selectedUniforms, selectedProject, selectedDesignations);
      
      if (newEntries.length === 0) {
        showToast({ 
          message: "No valid entries could be created. Please check your selections.", 
          type: "error" 
        });
        return;
      }
      
      setSelectedItems(prev => [...prev, ...newEntries]);
      showToast({ 
        message: `Added ${newEntries.length} items to bulk issue for ${selectedProject.projectName} - ${selectedDesignations.join(', ')}`, 
        type: "success" 
      });
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
      showToast({ 
        message: "Error processing uniforms. Please try again.", 
        type: "error" 
      });
    }
  };



  // Create DC from bulk issue items




  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
    showToast({ message: "Item removed from bulk issue list", type: "info" });
  };




  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBulkIssueDCs = bulkIssueDCs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(bulkIssueDCs.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // New function to create DC from issue
  const createDCFromIssue = async () => {
    if (!selectedIssueForDC) {
      showToast({ message: "No issue selected for DC creation", type: "error" });
      return;
    }

    if (!dcCreationData.dcNumber || !dcCreationData.address) {
      showToast({ message: "Please fill in DC Number and Address", type: "error" });
      return;
    }

    setIsCreatingDC(true);
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/from-issue/${selectedIssueForDC._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dcCreationData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('DC Creation Response:', result);
        
        if (result.success) {
          setCreatedDC(result.dc);
          
          // Update the issue in the local state to include the DC
          setIssues(prev => prev.map(issue => 
            issue._id === selectedIssueForDC._id 
              ? { ...issue, outwardDC: result.dc }
              : issue
          ));
          
          showToast({ 
            message: `DC created successfully! DC Number: ${result.dc.dcNumber}`, 
            type: "success" 
          });
          
          // Close DC creation modal and open employee mapping modal
          setShowDCCreationModal(false);
          // Refresh issues to ensure DC is properly attached
          await refreshIssues();
          // Fetch employees for this project/designation
          await fetchEmployeesForMapping(selectedIssueForDC.department);
          setShowEmployeeMappingModal(true);
          
        } else {
          showToast({ 
            message: result.message || "Failed to create DC", 
            type: "error" 
          });
        }
      } else {
        const errorData = await response.json();
        console.error('DC Creation Error:', errorData);
        showToast({ 
          message: errorData.message || "Failed to create DC", 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Error creating DC:", error);
      showToast({ 
        message: "Error creating DC. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsCreatingDC(false);
    }
  };


  // Function to update DC with employee mappings
  const updateDCWithEmployeeMappings = async () => {
    if (!createdDC) {
      showToast({ message: "No DC selected for mapping", type: "error" });
      return;
    }

    if (employeeMappings.length === 0) {
      showToast({ message: "Please add at least one employee mapping", type: "error" });
      return;
    }

    setIsUpdatingMappings(true);
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${createdDC._id}/update-employee-mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeMappings }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Employee Mapping Update Response:', result);
        
        if (result.success) {
          // Update the issue in the local state with the updated DC
          setIssues(prev => prev.map(issue => 
            issue._id === selectedIssueForDC?._id 
              ? { ...issue, outwardDC: result.dc }
              : issue
          ));
          
          showToast({ 
            message: "Employee mappings updated successfully!", 
            type: "success" 
          });
          
          // Close modal and reset state
          setShowEmployeeMappingModal(false);
          setCreatedDC(null);
          setEmployeeMappings([]);
          setSelectedIssueForDC(null);
          setDcCreationData({
            dcNumber: "",
            dcDate: new Date().toISOString().split('T')[0],
            address: "",
            remarks: ""
          });
          
        } else {
          showToast({ 
            message: result.message || "Failed to update employee mappings", 
            type: "error" 
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Employee Mapping Update Error:', errorData);
        showToast({ 
          message: errorData.message || "Failed to update employee mappings", 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Error updating employee mappings:", error);
      showToast({ 
        message: "Error updating employee mappings. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsUpdatingMappings(false);
    }
  };

  // Function to fetch employees for specific project and designation
  const fetchEmployeesForMapping = async (projectName: string, designation?: string) => {
    setEmployeesLoading(true);
    try {
      console.log('Fetching employees for project:', projectName, 'designation:', designation);
      console.log('Total employees available:', employees.length);
      console.log('Sample employee data:', employees.slice(0, 3));
      
      let employeesToFilter = employees;
      
      // If no employees loaded locally, try to fetch fresh data
      if (employees.length === 0) {
        console.log('No employees loaded locally, fetching fresh data...');
        try {
          const employeesRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
          const employeesData = await employeesRes.json();
          
          if (employeesData && employeesData.kycData) {
            const employeeList = employeesData.kycData.map((kyc: { personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; department?: string } }) => ({
              employeeId: kyc.personalDetails?.employeeId || "",
              fullName: kyc.personalDetails?.fullName || "",
              designation: kyc.personalDetails?.designation || "",
              projectName: kyc.personalDetails?.projectName || "",
              department: kyc.personalDetails?.department || ""
            })).filter((emp: Employee) => emp.employeeId && emp.fullName);
            
            employeesToFilter = employeeList;
            setEmployees(employeeList); // Update the global employees state
            console.log('Fresh employee data loaded:', employeeList.length);
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
        const projectMatch = emp.projectName === projectName || 
                           emp.projectName?.toLowerCase().includes(projectName.toLowerCase()) ||
                           projectName.toLowerCase().includes(emp.projectName?.toLowerCase() || '');
        const designationMatch = !designation || emp.designation === designation;
        
        console.log(`Employee ${emp.employeeId}: projectName="${emp.projectName}", matches=${projectMatch}, designation="${emp.designation}", designationMatch=${designationMatch}`);
        
        return projectMatch && designationMatch;
      });
      
      console.log('Filtered employees:', filteredEmployees);
      console.log('Available project names in employees:', [...new Set(employeesToFilter.map(emp => emp.projectName))]);
      
      setAvailableEmployees(filteredEmployees);
      
      if (filteredEmployees.length === 0) {
        console.log('No employees found. Available projects:', [...new Set(employeesToFilter.map(emp => emp.projectName))]);
        showToast({ 
          message: `No employees found for "${projectName}". Available projects: ${[...new Set(employeesToFilter.map(emp => emp.projectName))].slice(0, 3).join(', ')}`, 
          type: "info" 
        });
      } else {
        showToast({ 
          message: `Found ${filteredEmployees.length} employees for ${projectName}`, 
          type: "success" 
        });
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      showToast({ 
        message: "Error fetching employees for mapping", 
        type: "error" 
      });
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Function to add employee mapping
  const addEmployeeMapping = (itemId: string, employeeId: string, quantity: number, size: string, uniformType: string) => {
    const newMapping: EmployeeMapping = {
      itemId,
      employeeId,
      quantity,
      size,
      uniformType
    };
    
    setEmployeeMappings(prev => [...prev, newMapping]);
    showToast({ 
      message: `Added mapping for ${employeeId}`, 
      type: "success" 
    });
  };

  // Function to remove employee mapping
  const removeEmployeeMapping = (index: number) => {
    setEmployeeMappings(prev => prev.filter((_, i) => i !== index));
    showToast({ message: "Employee mapping removed", type: "info" });
  };

  // Function to fetch DC details
  const fetchDCDetails = async (dcId: string): Promise<OutwardDC | null> => {
    try {
      console.log('Fetching DC details for ID:', dcId);
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${dcId}`);
      
      if (!response.ok) {
        console.error('DC API response not ok:', response.status, response.statusText);
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('DC API response:', result);
      
      if (result.success && result.dc) {
        const dcData = result.dc;
        return {
          _id: dcData._id,
          customer: dcData.customer || '',
          dcNumber: dcData.dcNumber,
          dcDate: dcData.dcDate,
          address: dcData.address,
          remarks: dcData.remarks,
          items: dcData.items || [],
          createdAt: dcData.createdAt,
          updatedAt: dcData.updatedAt
        };
      } else {
        console.error('DC API returned unsuccessful response:', result);
        throw new Error(result.message || "Failed to fetch DC details");
      }
    } catch (error) {
      console.error("Error fetching DC details:", error);
      showToast({ 
        message: `Error fetching DC details: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: "error" 
      });
      return null;
    }
  };

  // Function to handle DC creation/mapping button click
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCreateDC = async (issue: Issue) => {
    setSelectedIssueForDC(issue);
    
    // Check if DC already exists for this issue (either outwardDC object or dcNumber)
    if (issue.outwardDC || issue.dcNumber) {
      // DC already exists, try to fetch latest DC details
      console.log('DC exists for issue, fetching details...');
      const dcId = issue.outwardDC?._id;
      if (dcId) {
        const dcDetails = await fetchDCDetails(dcId);
      
        if (dcDetails) {
          // Successfully fetched latest DC details
          setCreatedDC(dcDetails);
          // Fetch employees for this project/designation
          await fetchEmployeesForMapping(issue.department);
          setShowEmployeeMappingModal(true);
        } else {
          // Fallback: use existing DC data from issue
          console.log('Using fallback DC data from issue');
          if (issue.outwardDC) {
            setCreatedDC(issue.outwardDC!);
          } else {
            showToast({ 
              message: "DC exists but details are not available. Please contact support.", 
              type: "error" 
            });
            return;
          }
          // Fetch employees for this project/designation
          await fetchEmployeesForMapping(issue.department);
          setShowEmployeeMappingModal(true);
          showToast({ 
            message: "Using cached DC data. Some details might not be up-to-date.", 
            type: "info" 
          });
        }
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
            const matchingDC = allDCs.find((dc: DCAPIResponse) => dc.dcNumber === issue.dcNumber);
            
            if (matchingDC) {
              console.log('Found DC by number:', matchingDC);
              setCreatedDC(matchingDC);
              await fetchEmployeesForMapping(issue.department);
              setShowEmployeeMappingModal(true);
            } else {
              showToast({ 
                message: `DC ${issue.dcNumber} exists but could not find details in system. Please contact support.`, 
                type: "error" 
              });
            }
          } else {
            showToast({ 
              message: `Failed to fetch DC details. Please try again.`, 
              type: "error" 
            });
          }
        } catch (error) {
          console.error('Error fetching DC by number:', error);
          showToast({ 
            message: `Error fetching DC details. Please try again.`, 
            type: "error" 
          });
        }
      }
    } else {
      // No DC exists, show DC creation modal
      setDcCreationData({
        dcNumber: `DC${Date.now()}`,
        dcDate: new Date().toISOString().split('T')[0],
        address: issue.department,
        remarks: `Generated from Issue ${issue._id}`
      });
      setShowDCCreationModal(true);
    }
  };

  // Create issue from bulk issue items
  const createIssueFromBulkItems = async () => {
    if (selectedItems.length === 0) {
      showToast({ message: "No items to create issue for", type: "error" });
      return;
    }

    if (!selectedProject) {
      showToast({ message: "Please select a project first", type: "error" });
      return;
    }

    if (!bulkIssueData.issueTo || !bulkIssueData.department || !bulkIssueData.purpose) {
      showToast({ message: "Please fill in all required fields (Issue To, Project, and Purpose)", type: "error" });
      return;
    }

    setIsCreatingIssue(true);
    try {
      // Create issue payload
      const issuePayload = {
        issueTo: bulkIssueData.issueTo,
        department: bulkIssueData.department,
        purpose: bulkIssueData.purpose,
        address: selectedProject.address || bulkIssueData.address || "",
        issueDate: bulkIssueData.issueDate,
        items: selectedItems.map(item => ({
          id: item.itemId,
          quantity: item.quantity,
          size: item.size,
          employeeId: item.employeeId
        }))
      };

      console.log('Creating issue with payload:', issuePayload);

      const response = await fetch('https://inventory.zenapi.co.in/api/inventory/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issuePayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Issue API Response:', result);
        
        if (result.success) {
          showToast({ 
            message: `Issue created successfully! Issue ID: ${result.data?._id || 'N/A'}`, 
            type: "success" 
          });
          
          // Clear form and close modal
          setSelectedItems([]);
          setBulkIssueData({
            issueTo: "",
            department: "",
            purpose: "",
            address: "",
            issueDate: new Date().toISOString().split('T')[0],
            items: []
          });
          setSelectedProject(null);
          setShowCreateModal(false);
          
          // Automatically refresh issues list to show the new issue
          await refreshIssues();
          
          // Reset to first page to show the new issue
          setCurrentPage(1);
          
          showToast({ 
            message: "Issues list updated successfully!", 
            type: "success" 
          });
          
        } else {
          showToast({ 
            message: result.message || "Failed to create issue", 
            type: "error" 
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Issue API Error Response:', errorData);
        showToast({ 
          message: errorData.message || "Failed to create issue", 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Error creating issue:", error);
      showToast({ 
        message: "Error creating issue. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsCreatingIssue(false);
    }
  };

  return (
    <CoordinatorDashboardLayout>
      <div className={`min-h-screen flex flex-col py-8 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
      }`}>
        {/* Header */}
        <div className={`rounded-2xl mb-8 p-6 flex items-center gap-6 shadow-lg w-full max-w-7xl mx-auto ${
          theme === "dark"
            ? "bg-gray-900"
            : "bg-gradient-to-r from-blue-500 to-blue-800"
        }`}>
          <div className={`rounded-xl p-4 flex items-center justify-center ${
            theme === "dark" ? "bg-[#232e3e]" : "bg-blue-600 bg-opacity-30"
          }`}>
            <FaStore className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">Bulk Issues ({bulkIssueDCs.length})</h1>
            <p className="text-white text-base opacity-90">Manage bulk issues and create DCs from them</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className={`flex items-center gap-2 px-5 py-3 rounded-lg text-base font-semibold shadow transition border-2 ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
              onClick={() => setShowCreateModal(true)}
            >
              <FaPlus className="w-4 h-4" />
              Create Bulk Issue
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 px-4">
          {/* Left Panel - Info/Guidelines */}
          <div className="lg:w-1/3 w-full">
            <div className={`rounded-xl p-6 border shadow-sm sticky top-8 transition-colors duration-300 ${
              theme === "dark"
                ? "bg-gray-900 border-blue-900"
                : "bg-white border-blue-100"
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-50 text-blue-600"}`}>
                  <FaBoxOpen className="w-5 h-5" />
                </div>
                <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>Bulk Issue Guidelines</h2>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-600"}`}>
                    <FaUsers className="w-4 h-4" />
                  </span>
                  <span className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    Select multiple items and assign them to different employees in one transaction
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-600"}`}>
                    <FaTshirt className="w-4 h-4" />
                  </span>
                  <span className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    Ensure sufficient stock availability before creating bulk issues
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-600"}`}>
                    <FaCalendarAlt className="w-4 h-4" />
                  </span>
                  <span className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    All bulk issues are tracked with timestamps and approval workflows
                  </span>
                </li>
              </ul>
              
              <div className={`mt-8 p-4 rounded-xl border text-blue-700 transition-colors duration-300 ${theme === "dark" ? "bg-gray-900 border-blue-800 text-blue-200" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FaStore className="w-4 h-4" />
                  <span className="font-semibold">Need Help?</span>
                </div>
                <p className="text-sm">Contact <span className="font-medium">stores@zenployee.com</span> for support.</p>
              </div>
            </div>
          </div>

          {/* Right Panel - Outward DC Table */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                Inventory Issues
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshIssues}
                  disabled={issuesLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    issuesLoading
                      ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                      : theme === "dark"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {issuesLoading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <FaSearch className="w-4 h-4" />
                  )}
                  {issuesLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {issuesError && (
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-red-900 border-red-700 text-red-200" : "bg-red-50 border-red-200 text-red-800"}`}>
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="w-5 h-5" />
                  <span>{issuesError}</span>
                </div>
              </div>
            )}

            {/* Issues Table */}
            {!issuesLoading && issues.length > 0 && (
              <div className={`rounded-xl border shadow-lg overflow-hidden ${
                theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
              }`}>
                {/* Table Container with Better Scrolling */}
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                          <tr>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              #
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              DATE
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} style={{ width: '200px', maxWidth: '200px' }}>
                              PROJECT NAME
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} style={{ width: '120px', maxWidth: '120px' }}>
                              CUSTOMER
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              STATUS
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              ACTIONS
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-900" : "divide-gray-200 bg-white"}`}>
                          {bulkIssueDCsLoading ? (
                            <tr>
                              <td colSpan={6} className={`px-6 py-8 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                                  Loading bulk issue DCs...
                                </div>
                              </td>
                            </tr>
                          ) : bulkIssueDCsError ? (
                            <tr>
                              <td colSpan={6} className={`px-6 py-8 text-center ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                                <div className="flex items-center justify-center">
                                  <FaExclamationTriangle className="mr-2" />
                                  {bulkIssueDCsError}
                                </div>
                              </td>
                            </tr>
                          ) : bulkIssueDCs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className={`px-6 py-8 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                No bulk issue DCs found
                              </td>
                            </tr>
                          ) : (
                            currentBulkIssueDCs.map((bulkIssueDC) => {
                              console.log(`Rendering bulk issue DC ${bulkIssueDC._id}:`, {
                                customer: bulkIssueDC.customer,
                                dcNumber: bulkIssueDC.dcNumber,
                                address: bulkIssueDC.address
                            });
                            return (
                              <tr key={bulkIssueDC._id} className={`${theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50"} transition-all duration-200 group`}>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                  <div className="text-center font-semibold">
                                    {indexOfFirstItem + bulkIssueDCs.indexOf(bulkIssueDC) + 1}
                                  </div>
                                </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                <div className="text-center">
                                  <div className="font-semibold">
                                      {new Date(bulkIssueDC.dcDate).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: '2-digit', 
                                        day: '2-digit' 
                                      })}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`} style={{ width: '200px', maxWidth: '200px' }}>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold truncate text-blue-600 hover:text-blue-800 cursor-pointer" title={bulkIssueDC.address}>
                                      {bulkIssueDC.address}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`} style={{ width: '120px', maxWidth: '120px' }}>
                                  <div className="truncate" title={bulkIssueDC.customer}>
                                    {bulkIssueDC.customer.length > 20 ? `${bulkIssueDC.customer.substring(0, 20)}...` : bulkIssueDC.customer}
                                </div>
                              </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    bulkIssueDC.isRetrievable === false && bulkIssueDC.retrievalStatus === 'available'
                                      ? theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"
                                      : theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"
                                  }`}>
                                    {bulkIssueDC.isRetrievable === false && bulkIssueDC.retrievalStatus === 'available' ? 'Issued' : 'Pending'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                      onClick={() => {
                                        // Handle view bulk issue DC
                                        console.log('View bulk issue DC:', bulkIssueDC._id);
                                      }}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105 ${
                                      theme === "dark" 
                                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25" 
                                        : "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                        <FaEye className="w-3 h-3" />
                                      View
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => {
                                        // Handle map employees for bulk issue DC
                                        console.log('Map employees for bulk issue DC:', bulkIssueDC._id);
                                      }}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105 ${
                                        theme === "dark" 
                                          ? "bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-green-500/25" 
                                          : "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                        <FaUsers className="w-3 h-3" />
                                        Map Employees
                                    </div>
                                  </button>
                                  <button
                                      onClick={() => {
                                        // Handle download bulk issue DC
                                        console.log('Download bulk issue DC:', bulkIssueDC._id);
                                      }}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105 ${
                                      theme === "dark" 
                                        ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-purple-500/25" 
                                        : "bg-purple-500 text-white hover:bg-purple-600 shadow-md hover:shadow-lg"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <FaDownload className="w-3 h-3" />
                                        Download Issue
                                    </div>
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Pagination Controls */}
                <div className={`flex items-center justify-between p-6 border-t ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                  <div className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    <span className="font-semibold">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, bulkIssueDCs.length)}</span> of {bulkIssueDCs.length} bulk issue DCs
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        currentPage === 1
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : theme === "dark"
                            ? "bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105"
                            : "bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105"
                      }`}
                    >
                      ← Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const pageNum = index + 1;
                        const isCurrent = currentPage === pageNum;
                        const isNearCurrent = Math.abs(currentPage - pageNum) <= 2;
                        
                        if (isNearCurrent || pageNum === 1 || pageNum === totalPages) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                isCurrent
                                  ? theme === "dark"
                                    ? "bg-blue-700 text-white shadow-lg"
                                    : "bg-blue-600 text-white shadow-lg"
                                  : theme === "dark"
                                    ? "bg-gray-700 text-gray-200 hover:bg-blue-600 hover:text-white transform hover:scale-105"
                                    : "bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transform hover:scale-105"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                          return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        currentPage === totalPages
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : theme === "dark"
                            ? "bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105"
                            : "bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105"
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!issuesLoading && issues.length === 0 && (
              <div className={`text-center py-12 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                <FaBoxOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
                <p className="text-sm">No inventory issues have been created yet.</p>
                <div className="mt-4 text-xs opacity-75">
                  Debug: issuesLoading={issuesLoading.toString()}, issues.length={issues.length}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Bulk Issue Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedProject(null);
                  setSelectedDesignations([]);
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
                            <div className="space-y-4">
                              {designationUniforms.map((uniform) => (
                                <div key={uniform._id} className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <h4 className={`font-medium ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                        {uniform.name}
                                      </h4>
                                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                        {uniform.category} • {uniform.subCategory}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        theme === "dark" ? "bg-blue-800 text-blue-200" : "bg-blue-100 text-blue-800"
                                      }`}>
                                        {uniform.sizes.length} sizes available
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {uniform.sizes.map((size) => {
                                      const availableQty = uniform.sizeInventory?.find(si => si.size === size)?.quantity || 0;
                                      const selectedUniform = selectedUniforms.find(u => u.name === uniform.name && u.size === size);
                                      const currentQty = selectedUniform?.quantity || 0;
                                      
                                      return (
                                        <div key={size} className={`p-2 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className={`font-medium text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                              Size: {size}
                                            </span>
                                            <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                              Stock: {availableQty}
                                            </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              min="0"
                                              max={availableQty}
                                              value={currentQty}
                                              onChange={(e) => handleUniformSelection(uniform.name, size, parseInt(e.target.value) || 0)}
                                              className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:border-transparent ${
                                                theme === "dark"
                                                  ? "bg-gray-600 border-gray-500 text-gray-100 focus:ring-blue-900"
                                                  : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                                              }`}
                                              placeholder="Qty"
                                            />
                                            <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                              / {availableQty}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
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
                      <table className={`min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                        <thead className={theme === "dark" ? "bg-gray-800" : "bg-gray-50"}>
                          <tr>
                            <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                              Item Name
                            </th>
                            <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                              Code
                            </th>
                            <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                              Size
                            </th>
                            <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                              Qty
                            </th>
                            <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                              Designation
                            </th>
                            <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-800" : "divide-gray-200 bg-white"}`}>
                          {selectedItems.map((item, index) => (
                            <tr key={index} className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                              <td className={`px-3 py-2 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {item.itemName}
                              </td>
                              <td className={`px-3 py-2 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {item.itemCode}
                              </td>
                              <td className={`px-3 py-2 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {item.size}
                              </td>
                              <td className={`px-3 py-2 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {item.quantity}
                              </td>
                              <td className={`px-3 py-2 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                {selectedDesignations.join(', ')}
                              </td>
                              <td className="px-3 py-2 text-sm">
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
                      setShowCreateModal(false);
                      setSelectedProject(null);
                      setSelectedDesignations([]);
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
        {showDCCreationModal && selectedIssueForDC && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                onClick={() => {
                  setShowDCCreationModal(false);
                  setSelectedIssueForDC(null);
                }}
              >
                <FaTimes className="w-6 h-6" />
              </button>
              
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                <FaFileAlt className="w-6 h-6" />
                Create Outward DC from Issue
              </h2>

              <div className="space-y-6">
                {/* Issue Information */}
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                  <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                    Issue Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Issue To: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForDC.issueTo}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Department: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForDC.department}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Purpose: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForDC.purpose}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Items: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{selectedIssueForDC.items.length} items</span>
                    </div>
                  </div>
                </div>

                {/* DC Form */}
                <div className="space-y-4">
                  <div>
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                      DC Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={dcCreationData.dcNumber}
                      onChange={e => setDcCreationData(prev => ({ ...prev, dcNumber: e.target.value }))}
                      placeholder="Enter DC Number"
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
                      onChange={e => setDcCreationData(prev => ({ ...prev, dcDate: e.target.value }))}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                          : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={dcCreationData.address}
                      onChange={e => setDcCreationData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Delivery address"
                      rows={3}
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
                    <input
                      type="text"
                      value={dcCreationData.remarks}
                      onChange={e => setDcCreationData(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Additional remarks"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-900"
                          : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={() => {
                      setShowDCCreationModal(false);
                      setSelectedIssueForDC(null);
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                      theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createDCFromIssue}
                    disabled={!dcCreationData.dcNumber || !dcCreationData.address || isCreatingDC}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                      dcCreationData.dcNumber && dcCreationData.address && !isCreatingDC
                        ? theme === "dark"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isCreatingDC ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
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

        {/* Employee Mapping Modal */}
        {showEmployeeMappingModal && createdDC && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                onClick={() => {
                  setShowEmployeeMappingModal(false);
                  setCreatedDC(null);
                  setEmployeeMappings([]);
                }}
              >
                <FaTimes className="w-6 h-6" />
              </button>
              
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                <FaUserPlus className="w-6 h-6" />
                Employee Mapping for DC: {createdDC.dcNumber}
                {selectedIssueForDC?.outwardDC && (
                  <span className={`text-sm font-normal ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    (Existing DC)
                  </span>
                )}
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
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{createdDC.customer || 'N/A'}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>DC Number: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{createdDC.dcNumber}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Address: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{createdDC.address}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Total Items: </span>
                      <span className={`${theme === "dark" ? "text-blue-100" : "text-blue-900"}`}>{createdDC.items.length}</span>
                    </div>
                  </div>
                </div>

                {/* Items to Map */}
                <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <h3 className={`font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    Items to Map ({createdDC.items.length} items)
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                      <thead className={theme === "dark" ? "bg-gray-700" : "bg-gray-100"}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Item Name
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Size
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Quantity
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Current Employee
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-800" : "divide-gray-200 bg-white"}`}>
                        {createdDC.items.map((item, index) => (
                          <tr key={index} className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.uniformType}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.size}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.employeeId || (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  Not Mapped
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <select
                                  onChange={(e) => {
                                    const employeeId = e.target.value;
                                    if (employeeId && employeeId !== '') {
                                      addEmployeeMapping(item.itemId, employeeId, item.quantity, item.size, item.uniformType);
                                      e.target.value = ''; // Reset selection
                                    }
                                  }}
                                  className={`px-2 py-1 rounded text-xs border focus:outline-none focus:ring-1 ${
                                    theme === "dark" 
                                      ? "bg-gray-700 border-gray-600 text-white" 
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  defaultValue=""
                                >
                                  <option value="">Select Employee</option>
                                  {availableEmployees.map((emp) => (
                                    <option key={emp.employeeId} value={emp.employeeId}>
                                      {emp.fullName} ({emp.employeeId}) - {emp.designation}
                                    </option>
                                  ))}
                                </select>
                                {employeesLoading && (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                          {employeeMappings.map((mapping, index) => (
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
                                  onClick={() => removeEmployeeMapping(index)}
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
                    setCreatedDC(null);
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
                  disabled={employeeMappings.length === 0 || isUpdatingMappings}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    employeeMappings.length > 0 && !isUpdatingMappings
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

        {/* View Issue Details Modal */}
        {showViewModal && selectedIssueForView && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedIssueForView(null);
                }}
              >
                <FaTimes className="w-6 h-6" />
              </button>
              
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                <FaSearch className="w-6 h-6" />
                Issue Details
              </h2>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Issue Information */}
                <div className={`rounded-xl p-6 border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>Issue Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Issue ID: </span>
                      <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{selectedIssueForView._id}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Issue Date: </span>
                      <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        {new Date(selectedIssueForView.issueDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Issue To: </span>
                      <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{selectedIssueForView.issueTo}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Department: </span>
                      <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{selectedIssueForView.department}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Purpose: </span>
                      <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{selectedIssueForView.purpose || 'No purpose specified'}</span>
                    </div>
                  </div>
                </div>

                {/* Items Details */}
                <div className={`rounded-xl p-6 border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    Items ({selectedIssueForView.items.length} items, {selectedIssueForView.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} pieces)
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                      <thead className={theme === "dark" ? "bg-gray-700" : "bg-gray-100"}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Item Name
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Code
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Category
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Sub-Category
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Size
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-800" : "divide-gray-200 bg-white"}`}>
                        {selectedIssueForView.items.map((item, index) => (
                          <tr key={index} className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.itemId?.name || 'Unknown Item'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.itemId?.itemCode || 'N/A'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.itemId?.category || 'N/A'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.itemId?.subCategory || 'N/A'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              {item.size || 'N/A'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"
                              }`}>
                                {item.quantity} {item.quantity === 1 ? 'piece' : 'pieces'}
                              </span>
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
                    setShowViewModal(false);
                    setSelectedIssueForView(null);
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </CoordinatorDashboardLayout>
  );
}