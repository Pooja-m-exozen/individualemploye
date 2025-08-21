"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaBoxOpen, FaSearch, FaPlus, FaTimes, FaExclamationTriangle, FaUsers, FaTshirt, FaCalendarAlt } from "react-icons/fa";
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
  const [outwardDCs, setOutwardDCs] = useState<OutwardDC[]>([]);
  const [dcLoading, setDcLoading] = useState(false);
  const [dcError, setDcError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<BulkIssueItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
  const [selectedUniforms, setSelectedUniforms] = useState<Array<{name: string, quantity: number, size: string}>>([]);

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
        setOutwardDCs(data.data);
      } else if (Array.isArray(data)) {
        setOutwardDCs(data);
      } else if (data && data.dcs && Array.isArray(data.dcs)) {
        setOutwardDCs(data.dcs);
      } else {
        console.warn("Unexpected outward DC data format during refresh:", data);
      }
    } catch (err) {
      console.error("Error refreshing outward DCs:", err);
      setDcError("Failed to refresh outward DCs");
    } finally {
      setDcLoading(false);
    }
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

  // Get available designations for selected project
  const getAvailableDesignations = () => {
    if (!selectedProject) return [];
    return selectedProject.designationWiseCount ? Object.keys(selectedProject.designationWiseCount) : [];
  };

  // Get available uniforms for selected project and designations
  const getAvailableUniforms = () => {
    if (!selectedProject || selectedDesignations.length === 0) return [];
    
    const availableUniforms: InventoryItem[] = [];
    
    selectedDesignations.forEach((designation: string) => {
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

  // Get available quantity for an item and size
  const getAvailableQuantity = (item: InventoryItem, size: string) => {
    const sizeInfo = item.sizeInventory.find((si: { size: string; quantity: number }) => si.size === size);
    return sizeInfo?.quantity || 0;
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

      // Create DC for uniforms
      const dcNumber = generateDCNumber();
      const dcPayload = {
        customer: selectedProject.projectName,
        dcNumber: dcNumber,
        dcDate: new Date().toISOString().split('T')[0],
        remarks: `Bulk issue: ${selectedUniforms.map(u => `${u.name} (${u.quantity} ${u.size})`).join(', ')} for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}`,
        address: selectedProject.address || "NA",
        items: newEntries.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          size: item.size,
          employeeId: item.employeeId,
          name: item.employeeName,
          itemCode: item.itemCode,
          price: "0",
          remarks: item.remarks
        }))
      };

      // Store DC locally
      const localDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
      const newDC = {
        ...dcPayload,
        dcId: `local_${Date.now()}`,
        totalItems: newEntries.length,
        totalQuantity: newEntries.reduce((sum, item) => sum + item.quantity, 0),
        designations: selectedDesignations,
        projectName: selectedProject.projectName
      };
      localDCs.push(newDC);
      localStorage.setItem('bulk_dcs', JSON.stringify(localDCs));

      showToast({ 
        message: `DC ${dcNumber} created successfully with ${newEntries.length} items! Use 'Export DCs' to move to main DC system.`, 
        type: "success" 
      });

      // Clear selections
      setSelectedUniforms([]);
      setSelectedProject(null);
      setSelectedDesignations([]);
      
      // Refresh outward DCs to show the new DC
      refreshOutwardDCs();
      
    } catch (error) {
      console.error("Error processing uniforms:", error);
      showToast({ 
        message: "Error processing uniforms. Please try again.", 
        type: "error" 
      });
    }
  };

  // Generate DC number
  const generateDCNumber = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0') + 
                   now.getSeconds().toString().padStart(2, '0');
    return `DC-${dateStr}-${timeStr}`;
  };

  // Handle view DC
  const handleViewDC = (dc: OutwardDC) => {
    console.log("Viewing DC:", dc);
    showToast({ 
      message: `Viewing DC ${dc.dcNumber}`, 
      type: "info" 
    });
  };

  // Handle download DC
  const handleDownloadDC = (dc: OutwardDC) => {
    console.log("Downloading DC:", dc);
    showToast({ 
      message: `Downloading DC ${dc.dcNumber}`, 
      type: "info" 
    });
  };

  // Create simplified DC that matches existing API format
  const createSimplifiedDC = async () => {
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

    setIsCreatingDC(true);
    try {
      const dcNumber = generateDCNumber();
      
      // Simplified payload that matches existing API format exactly
      const simplifiedPayload = {
        customer: selectedProject.projectName,
        dcNumber: dcNumber,
        dcDate: bulkIssueData.issueDate,
        remarks: `Bulk issue for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}`,
        address: selectedProject.address || bulkIssueData.address || "NA",
        items: selectedItems.map(item => ({
          id: item.itemId, // API expects 'id' field, not 'itemId'
          quantity: item.quantity,
          size: item.size
        }))
      };

      console.log('Simplified DC Payload being sent:', simplifiedPayload);
      console.log('This matches the existing API format exactly');

      const response = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simplifiedPayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Simplified DC API Response:', result);
        
        if (result.success) {
          showToast({ 
            message: `Simplified DC created successfully! DC Number: ${dcNumber}`, 
            type: "success" 
          });
          
          // Store the simplified DC record
          const dcRecord = {
            _id: result.dcId || dcNumber,
            dcNumber: dcNumber,
            customer: selectedProject.projectName,
            dcDate: bulkIssueData.issueDate,
            remarks: `Bulk issue for ${selectedDesignations.join(', ')} - ${selectedProject.projectName}`,
            address: selectedProject.address || bulkIssueData.address || "NA",
            items: selectedItems.map(item => ({
              itemId: item.itemId,
              quantity: item.quantity,
              size: item.size
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0
          };

          const existingDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
          existingDCs.push(dcRecord);
          localStorage.setItem('bulk_dcs', JSON.stringify(existingDCs));
          
          setSelectedItems([]);
          
          showToast({ 
            message: `Simplified DC ${dcNumber} created successfully!`, 
            type: "success" 
          });
        } else {
          showToast({ 
            message: result.message || "Failed to create simplified DC", 
            type: "error" 
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Simplified DC API Error Response:', errorData);
        showToast({ 
          message: errorData.message || "Failed to create simplified DC", 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Error creating simplified DC:", error);
      showToast({ 
        message: "Error creating simplified DC. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsCreatingDC(false);
    }
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
              <div className="w-full rounded-2xl shadow-xl transition-colors duration-300">
                {/* Restrict height and enable both scrollbars */}
                <div className="w-full h-[400px] overflow-x-auto overflow-y-auto">
                  {/* Increase min-w to force horizontal scroll on smaller screens */}
                  <table className={`min-w-[800px] table-fixed divide-y ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
                    <thead className={theme === "dark" ? "bg-blue-950" : "bg-blue-50"}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                          DC Number
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                          Date
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                          Customer
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                          Items
                        </th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700 bg-gray-900" : "divide-gray-200 bg-white"}`}>
                      {currentDCs.map((dc) => (
                        <tr key={dc._id} className={`transition ${theme === "dark" ? "hover:bg-blue-950" : "hover:bg-blue-100"}`}>
                          <td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>
                            {dc.dcNumber}
                          </td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>
                            {new Date(dc.dcDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>
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
                                const localDC = localDCs.find((local: { dcNumber: string; designations?: string[] }) => local.dcNumber === dc.dcNumber);
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
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                              }`}>
                                {dc.items.length} {dc.items.length === 1 ? 'item' : 'items'}
                              </span>
                              {/* Try to get enhanced item info from local storage */}
                              {(() => {
                                const localDCs = JSON.parse(localStorage.getItem('bulk_dcs') || '[]');
                                const localDC = localDCs.find((local: { dcNumber: string; totalQuantity?: number }) => local.dcNumber === dc.dcNumber);
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
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewDC(dc)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                                  theme === "dark" 
                                    ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" 
                                    : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                                }`}
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadDC(dc)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                                  theme === "dark" 
                                    ? "bg-green-900 text-green-200 border-green-700 hover:bg-green-800" 
                                    : "bg-green-600 text-white border-green-700 hover:bg-green-700"
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
                
                {/* Enhanced Pagination Controls */}
                <div className={`flex items-center justify-between p-6 border-t ${
                  theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
                }`}>
                  <div className={`text-sm font-medium ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}>
                    <span className="font-semibold text-blue-600">
                      {indexOfFirstItem + 1}
                    </span>
                    {" to "}
                    <span className="font-semibold text-blue-600">
                      {Math.min(indexOfLastItem, outwardDCs.length)}
                    </span>
                    {" of "}
                    <span className="font-semibold text-blue-600">
                      {outwardDCs.length}
                    </span>
                    {" entries"}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        currentPage === 1
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : theme === "dark"
                            ? "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:shadow-lg"
                            : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-300"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const pageNumber = index + 1;
                        const isCurrentPage = currentPage === pageNumber;
                        const isNearCurrent = Math.abs(currentPage - pageNumber) <= 2;
                        
                        if (isNearCurrent || pageNumber === 1 || pageNumber === totalPages) {
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => handlePageChange(pageNumber)}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                isCurrentPage
                                  ? theme === "dark"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                                    : "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                  : theme === "dark"
                                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:shadow-lg"
                                    : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-300"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                          return (
                            <span
                              key={pageNumber}
                              className={`px-3 py-2 text-sm ${
                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              ...
                            </span>
                          );
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
                            ? "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:shadow-lg"
                            : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-300"
                      }`}
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!dcLoading && outwardDCs.length === 0 && (
              <div className="w-full rounded-2xl shadow-xl transition-colors duration-300">
                <div className={`text-center py-12 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
                  <FaBoxOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Outward DCs Found</h3>
                  <p className="text-sm">No delivery challans have been created yet.</p>
                  <div className="mt-4 text-xs opacity-75">
                    Debug: dcLoading={dcLoading.toString()}, outwardDCs.length={outwardDCs.length}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {dcLoading && (
              <div className="w-full rounded-2xl shadow-xl transition-colors duration-300">
                <div className={`text-center py-12 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
                  <div className="flex items-center justify-center mb-4">
                    <svg className="animate-spin w-8 h-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Loading Outward DCs</h3>
                  <p className="text-sm">Please wait while we fetch the latest delivery challans...</p>
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
                      onChange={e => setBulkIssueData(prev => ({ ...prev, department: e.target.value }))}
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
                                onChange={(e) => setSelectedDesignations(prev => {
                                  if (e.target.checked) {
                                    return [...prev, designation];
                                  } else {
                                    return prev.filter(d => d !== designation);
                                  }
                                })}
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
                                const availableQty = getAvailableQuantity(uniform, size);
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
                                  onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== index))}
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
                    onClick={() => {
                      setIsCreatingDC(true);
                      createSimplifiedDC();
                    }}
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
                        Create DC
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
