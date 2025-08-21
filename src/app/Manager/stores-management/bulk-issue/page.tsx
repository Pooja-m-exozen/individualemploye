"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaBoxOpen, FaSearch, FaFilter, FaPlus, FaTimes, FaCheckCircle, FaExclamationTriangle, FaDownload, FaUpload, FaUsers, FaTshirt, FaCalendarAlt } from "react-icons/fa";
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

interface UniformItem {
  name: string;
  category: string;
  subCategory: string;
  description: string;
  availableSizes: string[];
}

interface OutwardDC {
  _id: string;
  customer: string;
  dcNumber: string;
  dcDate: string;
  remarks: string;
  address?: string;
  items: Array<{
    _id: string;
    itemId: string;
    quantity: number;
    size: string;
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of items per page

  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        height: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: ${theme === 'dark' ? '#374151' : '#f3f4f6'};
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: ${theme === 'dark' ? '#6b7280' : '#9ca3af'};
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
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
  const [availableUniforms, setAvailableUniforms] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outwardDCs, setOutwardDCs] = useState<OutwardDC[]>([]);
  const [dcLoading, setDcLoading] = useState(false);
  const [dcError, setDcError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<BulkIssueItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
  const [selectedUniforms, setSelectedUniforms] = useState<Array<{name: string, quantity: number, size: string}>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

  const [isCreatingDC, setIsCreatingDC] = useState(false);
  const [bulkIssueData, setBulkIssueData] = useState<BulkIssueRequest>({
    issueTo: "",
    department: "",
    purpose: "",
    address: "",
    issueDate: new Date().toISOString().split('T')[0],
    items: []
  });

  // Fetch inventory items, employees, and projects on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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
          const uniqueCategories = Array.from(new Set(inventoryData.map((item: InventoryItem) => item.category)));
          setCategories(uniqueCategories);
          setFilteredItems(inventoryData);
        }
        
        if (employeesData && employeesData.kycData) {
          const employeeList = employeesData.kycData.map((kyc: any) => ({
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
        setError("Failed to fetch inventory items, employees, projects, and uniform mappings");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Fetch outward DCs
  useEffect(() => {
    const fetchOutwardDCs = async () => {
      setDcLoading(true);
      try {
        const response = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc");
        const data = await response.json();
        
        console.log("Raw API response:", data);
        console.log("Response type:", typeof data);
        console.log("Is array:", Array.isArray(data));
        
        if (data && data.success && Array.isArray(data.data)) {
          console.log("Using data.data (success format)");
          setOutwardDCs(data.data);
        } else if (Array.isArray(data)) {
          console.log("Using data directly (array format)");
          setOutwardDCs(data);
        } else if (data && data.dcs && Array.isArray(data.dcs)) {
          console.log("Using data.dcs format");
          setOutwardDCs(data.dcs);
        } else {
          console.warn("Unexpected outward DC data format:", data);
          const fallbackData = [
            {
              "_id": "68a6e1b4bc1bb28779addeae",
              "customer": "Salarapuria Sattva Northland",
              "dcNumber": "DC-20250821-213902",
              "dcDate": "2025-08-21T00:00:00.000Z",
              "remarks": "Bulk issue for Security Supervisor - Salarapuria Sattva Northland",
              "items": [
                {
                  "itemId": "6853dba431ac2e98ab744ff4",
                  "quantity": 1,
                  "size": "30",
                  "_id": "68a6e1b4bc1bb28779addeaf"
                }
              ],
              "createdAt": "2025-08-21T09:07:00.937Z",
              "updatedAt": "2025-08-21T09:07:00.937Z",
              "__v": 0
            }
          ];
          console.log("Using fallback data:", fallbackData);
          setOutwardDCs(fallbackData);
        }
        
        console.log("Final outwardDCs state:", outwardDCs);
      } catch (err) {
        console.error("Error fetching outward DCs:", err);
        setDcError("Failed to fetch outward DCs");
      } finally {
        setDcLoading(false);
      }
    };

    fetchOutwardDCs();
  }, []);

  // Debug effect to monitor outwardDCs state changes
  useEffect(() => {
    console.log("outwardDCs state changed:", outwardDCs);
    console.log("outwardDCs length:", outwardDCs.length);
  }, [outwardDCs]);

  // Refresh outward DCs
  const refreshOutwardDCs = async () => {
    setDcLoading(true);
    try {
      const response = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc");
      const data = await response.json();
      
      console.log("Refresh - Raw API response:", data);
      
      if (data && data.success && Array.isArray(data.data)) {
        console.log("Refresh - Using data.data (success format)");
        setOutwardDCs(data.data);
      } else if (Array.isArray(data)) {
        console.log("Refresh - Using data directly (array format)");
        setOutwardDCs(data);
      } else if (data && data.dcs && Array.isArray(data.dcs)) {
        console.log("Refresh - Using data.dcs format");
        setOutwardDCs(data.dcs);
      } else {
        console.warn("Refresh - Unexpected outward DC data format:", data);
        setOutwardDCs([]);
      }
      setDcError(null);
    } catch (err) {
      console.error("Error refreshing outward DCs:", err);
      setDcError("Failed to refresh outward DCs");
    } finally {
      setDcLoading(false);
    }
  };

  // Handle viewing DC details
  const handleViewDC = (dc: OutwardDC) => {
    // Try to get additional details from local storage
    const localDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
    const localDC = localDCs.find((local: any) => local.dcNumber === dc.dcNumber);
    
    let details = `DC Number: ${dc.dcNumber}\n`;
    details += `Date: ${new Date(dc.dcDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}\n`;
    details += `Customer: ${dc.customer}\n`;
    details += `Address: ${dc.address || 'N/A'}\n`;
    details += `Items: ${dc.items.length}\n`;
    details += `Remarks: ${dc.remarks || 'N/A'}`;
    
    // Add enhanced details if available
    if (localDC) {
      details += `\n\n--- Enhanced Details ---\n`;
      if (localDC.designations) {
        details += `Designations: ${localDC.designations.join(', ')}\n`;
      }
      if (localDC.purpose) {
        details += `Purpose: ${localDC.purpose}\n`;
      }
      if (localDC.totalQuantity) {
        details += `Total Quantity: ${localDC.totalQuantity} pieces\n`;
      }
      if (localDC.projectAddress) {
        details += `Project Address: ${localDC.projectAddress}\n`;
      }
      
      // Add item breakdown
      if (localDC.items && localDC.items.length > 0) {
        details += `\n--- Item Breakdown ---\n`;
        localDC.items.forEach((item: any, index: number) => {
          details += `${index + 1}. ${item.itemName || 'Unknown Item'}\n`;
          details += `   Code: ${item.itemCode || 'N/A'}\n`;
          details += `   Size: ${item.size || 'N/A'}\n`;
          details += `   Quantity: ${item.quantity || 'N/A'}\n`;
          if (item.employeeName) {
            details += `   Employee: ${item.employeeName}\n`;
          }
          if (item.remarks) {
            details += `   Remarks: ${item.remarks}\n`;
          }
          details += '\n';
        });
      }
    } else {
      // Fallback to basic item details
      details += `\n\n--- Item Details ---\n`;
      dc.items.forEach((item, index) => {
        details += `${index + 1}. ${item.name || 'Unknown Item'}\n`;
        details += `   Size: ${item.size || 'N/A'}\n`;
        details += `   Quantity: ${item.quantity || 'N/A'}\n`;
        if (item.remarks) {
          details += `   Remarks: ${item.remarks}\n`;
        }
        details += '\n';
      });
    }
    
    showToast({ message: details, type: "info" });
  };

  // Handle downloading DC
  const handleDownloadDC = (dc: OutwardDC) => {
    const dcData = {
      dcNumber: dc.dcNumber,
      date: new Date(dc.dcDate).toLocaleDateString(),
      customer: dc.customer,
      address: dc.address || 'N/A',
      items: dc.items,
      remarks: dc.remarks || 'N/A'
    };

    const dataStr = JSON.stringify(dcData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dc.dcNumber}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({ message: `Downloaded ${dc.dcNumber}`, type: "success" });
  };

  // Handle search and filtering
  useEffect(() => {
    let filtered = inventoryItems;
    
    if (search.trim()) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    setFilteredItems(filtered);
  }, [search, categoryFilter, inventoryItems]);

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

  // Get employees filtered by selected project
  const getProjectEmployees = () => {
    if (!selectedProject) return employees;
    return employees.filter(emp => emp.projectName === selectedProject.projectName);
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

  // Create mock employee data for bulk issues
  const createMockEmployeeForBulkIssue = (designations: string[], projectName: string) => {
    return {
      employeeId: `BULK_${Date.now()}`,
      fullName: `Bulk Issue - ${designations.join(', ')}`,
      designation: designations.join(', '),
      projectName: projectName,
      department: projectName
    };
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

  // Generate unique DC number
  const generateDCNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `DC-${year}${month}${day}-${timestamp}`;
  };

  // Create DC from bulk issue items
  const createDCFromBulkIssue = async () => {
    if (selectedItems.length === 0) {
      showToast({ message: "No items to create DC for", type: "error" });
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

    setIsCreatingDC(true);
    try {
      const dcNumber = generateDCNumber();
      
      // Enhanced DC payload with proper formatting
      const dcPayload = {
        customer: selectedProject.projectName,
        dcNumber: dcNumber,
        dcDate: bulkIssueData.issueDate,
        remarks: `Bulk issue for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}. Purpose: ${bulkIssueData.purpose || 'Uniform distribution'}`,
        address: selectedProject.address || bulkIssueData.address || "NA",
        items: selectedItems.map(item => ({
          id: item.itemId,
          employeeId: item.employeeId,
          itemCode: item.itemCode,
          name: item.itemName, // Use item name instead of employee name
          size: item.size,
          quantity: item.quantity,
          price: "",
          remarks: `Employee: ${item.employeeName} | Designation: ${selectedDesignations.join(', ')} | Project: ${selectedProject.projectName}`
        }))
      };

      console.log('Enhanced DC Payload being sent:', dcPayload);
      console.log('Customer field in payload:', dcPayload.customer);
      console.log('Project name being used:', selectedProject.projectName);
      console.log('Selected Items details:', selectedItems);
      console.log('Project details:', selectedProject);
      
      if (dcPayload.customer === "General" || dcPayload.customer === "N/A" || !dcPayload.customer.trim()) {
        showToast({ 
          message: `Invalid customer name: "${dcPayload.customer}". Please select a valid project.`, 
          type: "error" 
        });
        return;
      }
      
      const confirmMessage = `DC will be created with:\n\nCustomer: ${dcPayload.customer}\nAddress: ${dcPayload.address}\nItems: ${dcPayload.items.length}\nDesignations: ${selectedDesignations.join(', ')}\nPurpose: ${bulkIssueData.purpose || 'Uniform distribution'}\n\nProceed?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dcPayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('DC API Response:', result);
        
        if (result.success) {
          showToast({ 
            message: `DC created successfully! DC Number: ${dcNumber}, DC ID: ${result.dcId}`, 
            type: "success" 
          });
          
          // Enhanced DC record with all details
          const dcRecord = {
            _id: result.dcId,
            dcNumber: dcNumber,
            customer: selectedProject.projectName,
            projectName: selectedProject.projectName,
            projectAddress: selectedProject.address || bulkIssueData.address || "NA",
            dcDate: bulkIssueData.issueDate,
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

          const existingDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
          existingDCs.push(dcRecord);
          localStorage.setItem('bulk_dcs', JSON.stringify(existingDCs));
          
          setSelectedItems([]);
          
          showToast({ 
            message: `DC ${dcNumber} created successfully with ${dcRecord.totalItems} items for ${dcRecord.totalQuantity} pieces!`, 
            type: "success" 
          });
        } else {
          showToast({ 
            message: result.message || "Failed to create DC", 
            type: "error" 
          });
        }
      } else {
        const errorData = await response.json();
        console.error('DC API Error Response:', errorData);
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
      const finalDCNumber = generateDCNumber();
      
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

  const getAvailableQuantity = (item: InventoryItem, size: string) => {
    const sizeInfo = item.sizeInventory.find(si => si.size === size);
    return sizeInfo?.quantity || 0;
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDCs = outwardDCs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(outwardDCs.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
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
            <h1 className="text-3xl font-bold text-white mb-1">Outward DC Management</h1>
            <p className="text-white text-base opacity-90">View and manage outward delivery challans</p>
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
                Outward Delivery Challans
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshOutwardDCs}
                  disabled={dcLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    dcLoading
                      ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                      : theme === "dark"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {dcLoading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <FaSearch className="w-4 h-4" />
                  )}
                  {dcLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {dcError && (
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-red-900 border-red-700 text-red-200" : "bg-red-50 border-red-200 text-red-800"}`}>
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="w-5 h-5" />
                  <span>{dcError}</span>
                </div>
              </div>
            )}

            {/* Outward DC Table */}
            {!dcLoading && outwardDCs.length > 0 && (
              <div className={`rounded-xl border shadow-lg ${
                theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
              }`}>
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <table className="w-full min-w-[1200px] divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-32 sticky left-0 z-10 ${theme === "dark" ? "text-gray-300 bg-gray-800" : "text-gray-500 bg-gray-50"}`}>
                          DC Number
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-24 ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                          Date
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-48 ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                          Customer
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-20 ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                          Items
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-32 ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-900" : "divide-gray-200 bg-white"}`}>
                      {currentDCs.map((dc) => (
                        <tr key={dc._id} className={`${theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50"} transition-colors duration-200`}>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium sticky left-0 z-10 ${theme === "dark" ? "text-blue-200 bg-gray-900" : "text-blue-600 bg-white"}`}>
                            {dc.dcNumber}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                            {new Date(dc.dcDate).toLocaleDateString()}
                          </td>
                          <td className={`px-4 py-4 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                            <div className="max-w-[200px]">
                              <div className="font-medium truncate" title={dc.customer}>
                                {dc.customer}
                              </div>
                              <div className={`text-xs mt-1 opacity-75 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                {dc.address || 'No address'}
                              </div>
                              {/* Try to get enhanced project info from local storage */}
                              {(() => {
                                const localDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
                                const localDC = localDCs.find((local: any) => local.dcNumber === dc.dcNumber);
                                if (localDC && localDC.designations) {
                                  return (
                                    <div className={`text-xs mt-1 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                                      Designations: {localDC.designations.join(', ')}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                              }`}>
                                {dc.items.length} {dc.items.length === 1 ? 'item' : 'items'}
                              </span>
                              {/* Try to get enhanced item info from local storage */}
                              {(() => {
                                const localDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
                                const localDC = localDCs.find((local: any) => local.dcNumber === dc.dcNumber);
                                if (localDC && localDC.totalQuantity) {
                                  return (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"
                                    }`}>
                                      {localDC.totalQuantity} pieces
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewDC(dc)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  theme === "dark" 
                                    ? "bg-blue-800 text-blue-200 hover:bg-blue-700" 
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadDC(dc)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  theme === "dark" 
                                    ? "bg-green-800 text-green-200 hover:bg-green-700" 
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                Download
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className={`flex items-center justify-between p-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                  <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, outwardDCs.length)} of {outwardDCs.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        currentPage === 1
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : theme === "dark"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => (
                      <button
                        key={index + 1}
                        onClick={() => handlePageChange(index + 1)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          currentPage === index + 1
                            ? theme === "dark"
                              ? "bg-blue-700 text-white"
                              : "bg-blue-600 text-white"
                            : theme === "dark"
                              ? "bg-gray-700 text-gray-200 hover:bg-blue-600 hover:text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white"
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        currentPage === totalPages
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : theme === "dark"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!dcLoading && outwardDCs.length === 0 && (
              <div className={`text-center py-12 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                <FaBoxOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Outward DCs Found</h3>
                <p className="text-sm">No delivery challans have been created yet.</p>
                <div className="mt-4 text-xs opacity-75">
                  Debug: dcLoading={dcLoading.toString()}, outwardDCs.length={outwardDCs.length}
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
                    onClick={createDCFromBulkIssue}
                    disabled={selectedItems.length === 0 || isCreatingDC}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                      selectedItems.length > 0 && !isCreatingDC
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
                        <FaBoxOpen className="w-4 h-4" />
                        Create DC from Bulk Issue
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



      </div>
    </ManagerDashboardLayout>
  );
}
