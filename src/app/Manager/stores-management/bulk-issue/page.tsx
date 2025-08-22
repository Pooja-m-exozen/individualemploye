"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaBoxOpen, FaSearch,FaPlus, FaTimes, FaExclamationTriangle, FaDownload, FaUsers, FaTshirt, FaCalendarAlt } from "react-icons/fa";
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
}

export default function BulkIssuePage() {
  const { theme } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Fetch inventory items, employees, and projects on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const inventoryRes = await fetch("https://inventory.zenapi.co.in/api/inventory/items");
        const inventoryData = await inventoryRes.json();
        
        const employeesRes = await fetch("https://cafm.zenapi.co.in/api/kyc/all");
        const employeesData = await employeesRes.json();
        
        const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
        const projectsData = await projectsRes.json();

        const mappingsRes = await fetch("https://cafm.zenapi.co.in/api/uniforms/uniform-mappings");
        const mappingsData = await mappingsRes.json();
        
        if (inventoryData && Array.isArray(inventoryData)) {
          setInventoryItems(inventoryData);
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
        } else if (employeesRes.ok === false) {
          console.warn("Employee API failed, proceeding without employee data");
          setEmployees([]);
        }

        if (projectsData && Array.isArray(projectsData)) {
          setProjects(projectsData);
        }

        if (mappingsData && mappingsData.success) {
          setUniformMappings(mappingsData.data.filter((m: UniformMapping) => m.isActive !== false));
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
        
        if (data && data.success && Array.isArray(data.data)) {
          console.log("Using data.data (success format)");
          setIssues(data.data);
        } else if (Array.isArray(data)) {
          console.log("Using data directly (array format)");
          setIssues(data);
        } else {
          console.warn("Unexpected issue data format:", data);
          setIssues([]);
        }
        
        console.log("Final issues state:", issues);
      } catch (err) {
        console.error("Error fetching issues:", err);
        setIssuesError("Failed to fetch issues");
      } finally {
        setIssuesLoading(false);
      }
    };

    fetchIssues();
  }, []);

  // Debug effect to monitor issues state changes
  useEffect(() => {
    console.log("issues state changed:", issues);
    console.log("issues length:", issues.length);
  }, [issues]);

  // Refresh issues
  const refreshIssues = async () => {
    setIssuesLoading(true);
    try {
      const response = await fetch("https://inventory.zenapi.co.in/api/inventory/issue");
      const data = await response.json();
      
      console.log("Refresh - Raw API response:", data);
      
      if (data && data.success && Array.isArray(data.data)) {
        console.log("Refresh - Using data.data (success format)");
        setIssues(data.data);
      } else if (Array.isArray(data)) {
        console.log("Refresh - Using data directly (array format)");
        setIssues(data);
      } else {
        console.warn("Refresh - Unexpected issue data format:", data);
        setIssues([]);
      }
      setIssuesError(null);
    } catch (err) {
      console.error("Error refreshing issues:", err);
      setIssuesError("Failed to refresh issues");
    } finally {
      setIssuesLoading(false);
    }
  };

  // Handle viewing issue details
  const handleViewIssue = (issue: Issue) => {
    setSelectedIssueForView(issue);
    setShowViewModal(true);
  };

  // Handle downloading issue
  const handleDownloadIssue = (issue: Issue) => {
    // Create HTML content for the delivery challan
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bulk Issue Challan</title>
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
          }
          .items-table th,
          .items-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: center;
            font-size: 12px;
          }
          .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .items-table .item-name {
            text-align: left;
            font-weight: bold;
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
            height: 40px;
            margin-bottom: 5px;
          }
          .signature-label {
            font-size: 14px;
            font-weight: bold;
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
          <div class="document-title">Bulk Issue Challan</div>
        </div>
        
        <div class="document-info">
          <div class="info-item">
            <span class="info-label">Bulk Issue No:</span>
            <span class="info-value">${issue._id.slice(-8).toUpperCase()}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date:</span>
            <span class="info-value">${new Date(issue.issueDate).toISOString().split('T')[0]}</span>
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
            <p>${issue.issueTo}</p>
            <p>${issue.department}</p>
            <p>${issue.purpose || 'Uniform Issue'}</p>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Sl No</th>
              <th>Item Name</th>
              <th>Item Code</th>
              <th>Category</th>
              <th>Sub-Category</th>
              <th>Size</th>
              <th>Quantity</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${issue.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td class="item-name">${item.itemId?.name || 'Unknown Item'}</td>
                <td>${item.itemId?.itemCode || 'N/A'}</td>
                <td>${item.itemId?.category || 'N/A'}</td>
                <td>${item.itemId?.subCategory || 'N/A'}</td>
                <td>${item.size || 'N/A'}</td>
                <td>${item.quantity || 'N/A'}</td>
                <td>${item.remarks || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="notes">
          <h3>Notes/Conditions:</h3>
          <ol>
            <li>Complaints will be entertained if the goods are received within 24hrs of delivery</li>
            <li>Goods are delivered after careful checking</li>
            <li>This is a Bulk Issue Challan</li>
            <li>All items are issued as per company policy</li>
          </ol>
        </div>
        
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Initiated by</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Received by</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Issued by</div>
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
    link.download = `Delivery_Challan_${issue._id.slice(-8)}_${new Date(issue.issueDate).toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({ 
      message: `Delivery Challan downloaded successfully! You can print it or save as PDF.`, 
      type: "success" 
    });
  };





  // Handle project selection
  const handleProjectChange = (projectName: string) => {
    const project = projects.find(p => p.projectName === projectName);
    console.log('Project selected:', projectName, 'Project object:', project);
    
    if (!project) {
      console.error('No project found for name:', projectName);
      showToast({ message: "Project not found. Please try selecting again.", type: "error" });
      return;
    }
    
    if (!project.projectName || project.projectName.trim() === "") {
      console.error('Project has no name:', project);
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
    
    console.log('Project set successfully:', project);
  };

  // Handle designation selection
  const handleDesignationChange = (designation: string, checked: boolean) => {
    if (checked) {
      setSelectedDesignations(prev => [...prev, designation]);
    } else {
      setSelectedDesignations(prev => prev.filter(d => d !== designation));
    }
    setSelectedUniforms([]);
  };

  // Get available designations for selected project
  const getAvailableDesignations = () => {
    if (!selectedProject) return [];
    return selectedProject.designationWiseCount ? Object.keys(selectedProject.designationWiseCount) : [];
  };

  // Get available uniforms for selected project and designations
  const getAvailableUniforms = () => {
    if (!selectedProject || selectedDesignations.length === 0) return [];
    
    const availableUniforms: InventoryItem[] = [];
    
    selectedDesignations.forEach(designation => {
      const mapping = uniformMappings.find(m => 
        m.project === selectedProject.projectName && 
        m.designations.includes(designation)
      );
      
      if (mapping) {
        mapping.uniformTypes.forEach(uniformType => {
          const inventoryItem = inventoryItems.find(item => item.name === uniformType);
          if (inventoryItem && !availableUniforms.find(u => u._id === inventoryItem._id)) {
            availableUniforms.push(inventoryItem);
          }
        });
      }
    });
    
    return availableUniforms;
  };



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

  // Add uniforms to bulk issue
  const addUniformsToBulkIssue = async () => {
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
      
      setSelectedItems(prev => [...prev, ...newEntries]);
      showToast({ message: `Added ${newEntries.length} items to bulk issue`, type: "success" });
      setSelectedUniforms([]);
      
    } catch (error) {
      console.error("Error processing uniforms:", error);
      showToast({ 
        message: "Error processing uniforms. Please try again.", 
        type: "error" 
      });
    }
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

  // Generate unique issue number
  const generateIssueNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `ISSUE-${year}${month}${day}-${timestamp}`;
  };

  // Create DC from bulk issue items
  const createDCFromBulkIssue = async () => {
    if (selectedItems.length === 0) {
      showToast({ message: "No items to create issue for", type: "error" });
      return;
    }

    if (!selectedProject) {
      showToast({ message: "Please select a project first", type: "error" });
      return;
    }

    if (!selectedProject.projectName || selectedProject.projectName.trim() === "") {
      showToast({ message: "Project name is required. Please select a valid project.", type: "error" });
      return;
    }

    if (selectedProject.projectName === "General" || selectedProject.projectName === "N/A") {
      showToast({ message: "Please select a specific project, not a generic one.", type: "error" });
      return;
    }

    if (!selectedProject.address && !bulkIssueData.address) {
      showToast({ message: "Project address is required. Please add an address to the project or bulk issue data.", type: "error" });
      return;
    }

    setIsCreatingIssue(true);
    try {
      const confirmMessage = `Issue will be created with:\n\nProject: ${selectedProject.projectName}\nAddress: ${selectedProject.address || bulkIssueData.address || "NA"}\nItems: ${selectedItems.length}\nDesignations: ${selectedDesignations.join(', ')}\nPurpose: ${bulkIssueData.purpose || 'Uniform distribution'}\n\nProceed?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      // Create issue payload
      const issuePayload = {
        ...bulkIssueData,
        items: selectedItems.map(item => ({
          id: item.itemId,
          quantity: item.quantity,
          size: item.size,
          employeeId: item.employeeId
        }))
      };

      console.log('Issue Payload being sent:', issuePayload);
      console.log('Project name being used:', selectedProject.projectName);
      console.log('Selected Items details:', selectedItems);
      console.log('Project details:', selectedProject);

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
            message: `Issue created successfully!`, 
            type: "success" 
          });
          
          // Create local record for tracking
          const issueRecord = {
            _id: `issue_${Date.now()}`,
            projectName: selectedProject.projectName,
            projectAddress: selectedProject.address || bulkIssueData.address || "NA",
            issueDate: bulkIssueData.issueDate,
            remarks: `Bulk issue for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}. Purpose: ${bulkIssueData.purpose || 'Uniform distribution'}`,
            designations: selectedDesignations,
            purpose: bulkIssueData.purpose || 'Uniform distribution',
            items: selectedItems.map(item => ({
              itemId: item.itemId,
              itemName: item.itemName,
              itemCode: item.itemCode,
              employeeId: item.employeeId,
              employeeName: item.employeeName,
              size: item.size,
              quantity: item.quantity,
              remarks: item.remarks || `Bulk issue for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}`
            })),
            totalItems: selectedItems.length,
            totalQuantity: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0
          };

          const existingIssues = JSON.parse(localStorage.getItem('bulk_issues') || '[]');
          existingIssues.push(issueRecord);
          localStorage.setItem('bulk_issues', JSON.stringify(existingIssues));
          
          setSelectedItems([]);
          
          showToast({ 
            message: `Issue created successfully with ${issueRecord.totalItems} items for ${issueRecord.totalQuantity} pieces!`, 
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

  // Export bulk DCs to main DC system
  const exportBulkDCsToMainSystem = () => {
    try {
      const bulkDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
      if (bulkDCs.length === 0) {
        showToast({ 
          message: "No bulk DCs to export", 
          type: "info" 
        });
        return;
      }

      const existingDCs = JSON.parse(localStorage.getItem('dcs') || '[]');
      const updatedDCs = [...existingDCs, ...bulkDCs];
      localStorage.setItem('dcs', JSON.stringify(updatedDCs));
      
      localStorage.removeItem('bulk_dcs');
      
      showToast({ 
        message: `${bulkDCs.length} bulk DC(s) exported to main DC system`, 
        type: "success" 
      });
      
    } catch (error) {
      console.error("Error exporting bulk DCs:", error);
      showToast({ 
        message: "Error exporting bulk DCs", 
        type: "error" 
      });
    }
  };

  // Get locally stored DCs
  const getLocalDCs = () => {
    const dcs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dc_')) {
        try {
          const dcData = JSON.parse(localStorage.getItem(key) || '{}');
          dcs.push({ key, ...dcData });
        } catch (e) {
          console.error('Error parsing local DC data:', e);
        }
      }
    }
    return dcs;
  };

  // Show local DCs info
  const showLocalDCsInfo = () => {
    const localDCs = getLocalDCs();
    const bulkDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
    
    if (localDCs.length > 0 || bulkDCs.length > 0) {
      const totalDCs = localDCs.length + bulkDCs.length;
      showToast({ 
        message: `${totalDCs} DC(s) stored locally (${localDCs.length} regular, ${bulkDCs.length} bulk)`, 
        type: "info" 
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Regular DCs:', localDCs);
        console.log('Bulk DCs:', bulkDCs);
      }
    } else {
      showToast({ 
        message: "No DCs stored locally", 
        type: "info" 
      });
    }
  };

  const handleAddItem = (item: InventoryItem, size: string, quantity: number, employeeId: string, remarks?: string) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) return;

    const newItem: BulkIssueItem = {
      itemId: item._id,
      itemName: item.name,
      itemCode: item.itemCode,
      size,
      quantity,
      employeeId,
      employeeName: employee.fullName,
      remarks
    };

    setSelectedItems(prev => [...prev, newItem]);
    showToast({ message: "Item added to bulk issue list", type: "success" });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
    showToast({ message: "Item removed from bulk issue list", type: "info" });
  };

  const handleSubmitBulkIssue = async () => {
    if (selectedItems.length === 0) {
      showToast({ message: "Please add at least one item", type: "error" });
      return;
    }

    if (!bulkIssueData.issueTo || !bulkIssueData.department || !bulkIssueData.purpose) {
      showToast({ message: "Please fill in all required fields (Issue To, Project, and Purpose)", type: "error" });
      return;
    }

    if (!selectedProject) {
      showToast({ message: "Please select a project first", type: "error" });
      return;
    }

    if (!selectedProject.projectName) {
      showToast({ message: "Project information is incomplete. Please reselect the project.", type: "error" });
      return;
    }

    if (selectedProject.projectName === "General" || selectedProject.projectName === "N/A" || !selectedProject.projectName.trim()) {
      showToast({ message: "Please select a valid project with a proper name", type: "error" });
      return;
    }

    try {
      const finalDCNumber = generateIssueNumber();
      
      // Enhanced final DC payload with proper formatting
      const finalDCPayload = {
        customer: selectedProject.projectName,
        dcNumber: finalDCNumber,
        dcDate: bulkIssueData.issueDate,
        remarks: `Final bulk issue: ${bulkIssueData.purpose} for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}`,
        address: selectedProject.address || bulkIssueData.address || "NA",
        items: selectedItems.map(item => ({
          id: item.itemId,
          employeeId: item.employeeId,
          itemCode: item.itemCode,
          name: item.itemName, // Use item name instead of employee name
          size: item.size,
          quantity: item.quantity,
          price: "",
          remarks: `Employee: ${item.employeeName} | Designation: ${selectedDesignations.join(', ')} | Project: ${selectedProject.projectName} | Purpose: ${bulkIssueData.purpose}`
        }))
      };

      console.log('Enhanced Final DC Payload being sent:', finalDCPayload);
      console.log('Selected Project:', selectedProject);
      console.log('Selected Items:', selectedItems);
      console.log('Bulk Issue Data:', bulkIssueData);
      console.log('Customer field in payload:', finalDCPayload.customer);
      console.log('Project name being used:', selectedProject.projectName);

      const dcResponse = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalDCPayload),
      });

      if (dcResponse.ok) {
        const dcResult = await dcResponse.json();
        
        if (dcResult.success) {
          // Enhanced final DC record with all details
          const finalDCRecord = {
            _id: dcResult.dcId,
            dcNumber: finalDCNumber,
            customer: selectedProject.projectName,
            projectName: selectedProject.projectName,
            projectAddress: selectedProject.address || bulkIssueData.address || "NA",
            dcDate: bulkIssueData.issueDate,
            remarks: `Final bulk issue: ${bulkIssueData.purpose} for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}`,
            designations: selectedDesignations,
            purpose: bulkIssueData.purpose,
            issueTo: bulkIssueData.issueTo,
            items: selectedItems.map(item => ({
              itemId: item.itemId,
              itemName: item.itemName,
              itemCode: item.itemCode,
              employeeId: item.employeeId,
              employeeName: item.employeeName,
              size: item.size,
              quantity: item.quantity,
              remarks: item.remarks || `Bulk issue for ${selectedProject.projectName}`
            })),
            totalItems: selectedItems.length,
            totalQuantity: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0
          };

          const existingDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
          existingDCs.push(finalDCRecord);
          localStorage.setItem('bulk_dcs', JSON.stringify(existingDCs));

          const payload = {
            ...bulkIssueData,
            items: selectedItems.map(item => ({
              id: item.itemId,
              quantity: item.quantity,
              size: item.size,
              employeeId: item.employeeId
            }))
          };

          const response = await fetch('https://inventory.zenapi.co.in/api/inventory/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data = await response.json();
            showToast({ 
              message: `Bulk issue created successfully! DC Number: ${finalDCNumber}, DC ID: ${dcResult.dcId}`, 
              type: "success" 
            });
            
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
            
            showToast({ 
              message: `Complete! Bulk issue submitted and DC ${finalDCNumber} created with ${finalDCRecord.totalItems} items for ${finalDCRecord.totalQuantity} pieces. Use 'Export DCs' to move to main DC system.`, 
              type: "success" 
            });
            
          } else {
            const errorData = await response.json();
            showToast({ 
              message: errorData.message || "Failed to create bulk issue", 
              type: "error" 
            });
          }
        } else {
          showToast({ 
            message: dcResult.message || "Failed to create DC for bulk issue", 
            type: "error" 
          });
        }
      } else {
        const errorData = await dcResponse.json();
        showToast({ 
          message: errorData.message || "Failed to create DC for bulk issue", 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Error creating bulk issue:", error);
      showToast({ 
        message: "An error occurred while creating bulk issue", 
        type: "error" 
      });
    }
  };


  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentIssues = issues.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(issues.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
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
          try {
            const refreshResponse = await fetch("https://inventory.zenapi.co.in/api/inventory/issue");
            const refreshData = await refreshResponse.json();
            
            if (refreshData && refreshData.success && Array.isArray(refreshData.data)) {
              setIssues(refreshData.data);
            } else if (Array.isArray(refreshData)) {
              setIssues(refreshData);
            }
            
            // Reset to first page to show the new issue
            setCurrentPage(1);
            
            showToast({ 
              message: "Issues list updated successfully!", 
              type: "success" 
            });
          } catch (refreshError) {
            console.error("Error refreshing issues:", refreshError);
            // Still show success message even if refresh fails
          }
          
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
    <ManagerDashboardLayout>
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
            <h1 className="text-3xl font-bold text-white mb-1">Issue Management</h1>
            <p className="text-white text-base opacity-90">View and manage inventory issues</p>
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
                              Date
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Issue To & Purpose
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Department
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Items & Pieces
                            </th>
                            <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-900" : "divide-gray-200 bg-white"}`}>
                          {currentIssues.map((issue, index) => (
                            <tr key={issue._id} className={`${theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50"} transition-all duration-200 group`}>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                <div className="text-center">
                                  <div className="font-semibold">
                                    {new Date(issue.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                    {new Date(issue.issueDate).getFullYear()}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold truncate" title={issue.issueTo}>
                                    {issue.issueTo}
                                  </div>
                                  <div className={`text-xs mt-1 opacity-75 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                    <span className="font-medium">Purpose:</span> {issue.purpose || 'No purpose specified'}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {issue.department}
                                </div>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                <div className="flex flex-col gap-2">
                                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                                  }`}>
                                    {issue.items.length} {issue.items.length === 1 ? 'item' : 'items'}
                                  </div>
                                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"
                                  }`}>
                                    {issue.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} pieces
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleViewIssue(issue)}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105 ${
                                      theme === "dark" 
                                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25" 
                                        : "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <FaSearch className="w-3 h-3" />
                                      View
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadIssue(issue)}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105 ${
                                      theme === "dark" 
                                        ? "bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-green-500/25" 
                                        : "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <FaDownload className="w-3 h-3" />
                                      Download
                                    </div>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Pagination Controls */}
                <div className={`flex items-center justify-between p-6 border-t ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                  <div className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    <span className="font-semibold">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, issues.length)}</span> of {issues.length} issues
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
                  <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-950 border-green-800" : "bg-green-50 border-green-200"}`}>
                    <h3 className={`font-semibold mb-3 flex items-center gap-2 ${theme === "dark" ? "text-green-200" : "text-green-800"}`}>
                      <FaTshirt className="w-4 h-4" />
                      Available Uniforms for {selectedDesignations.join(', ')}
                    </h3>
                    
                    {getAvailableUniforms().length > 0 ? (
                      <div className="space-y-4">
                        {getAvailableUniforms().map((uniform) => (
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
                        
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={showDCPopupForUniforms}
                            disabled={selectedUniforms.length === 0}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                              selectedUniforms.length > 0
                                ? theme === "dark"
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-green-600 text-white hover:bg-green-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            <FaBoxOpen className="w-4 h-4" />
                            Add to Bulk Issue ({selectedUniforms.length})
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`text-center py-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        No uniforms mapped for {selectedDesignations.join(', ')} in {selectedProject.projectName}
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
    </ManagerDashboardLayout>
  );
}