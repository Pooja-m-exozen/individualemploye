"use client";
import React, { useState, useEffect, useCallback } from "react";
import ManagerDashboardLayout  from "@/components/dashboard/ManagerDashboardLayout";
import CreateDCModal from "@/components/dashboard/CreateDCmodal";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter, FaPlus, FaTimes } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const guidelines = [
  "All DC records are updated in real-time as per store records.",
  "Click 'View' to see more details about each DC.",
  "Contact the stores team for any discrepancies.",
];

// TypeScript types for API response
interface DCItem {
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
  uniformType?: string[]; // Store uniform types
  projectName?: string; // Store project name
  approvalStatus?: string; // Store approval status
  requestDate?: string; // Store request date
  individualEmployeeData?: { // Store individual employee data
    employeeId: string;
    fullName: string;
    designation: string;
    uniformType: string[];
    size: Record<string, string>;
    qty: number;
    projectName: string;
  };
  _id: string;
}

interface DC {
  _id: string;
  customer: string;
  projectName?: string; // Add project name field
  dcNumber: string;
  dcDate: string;
  remarks: string;
  items: DCItem[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ApiResponse {
  dcs: DC[];
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

// Helper function to fetch uniform request for a customer
async function fetchUniformRequestForCustomer(employeeId: string, fullName: string): Promise<unknown> {
  try {
    const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
    
    // Check if response is ok
    if (!res.ok) {
      console.error(`API Error: ${res.status} ${res.statusText}`);
      return null;
    }
    
    // Check if response is JSON
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("API returned non-JSON response:", contentType);
      return null;
    }
    
    const data = await res.json();
    if (data.success) {
      // Try to match by employeeId first, then by fullName
      const byEmployeeId = data.uniforms.find((u: unknown) => (u as { employeeId: string }).employeeId === employeeId);
      if (byEmployeeId) return byEmployeeId;
      
      const byFullName = data.uniforms.find((u: unknown) => (u as { fullName: string }).fullName === fullName);
      if (byFullName) return byFullName;
      
      // If no exact match, try partial name match
      const partialMatch = data.uniforms.find((u: unknown) => 
        (u as { fullName: string }).fullName.toLowerCase().includes(fullName.toLowerCase()) ||
        fullName.toLowerCase().includes((u as { fullName: string }).fullName.toLowerCase())
      );
      return partialMatch || null;
    }
  } catch (error) {
    console.error("Error fetching uniform request:", error);
    // Log the actual response if it's not JSON
    if (error instanceof SyntaxError) {
      console.error("JSON parsing error - API might be returning HTML or plain text");
    }
  }
  return null;
}

export default function StoreDCPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [dcData, setDcData] = useState<DC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDC, setSelectedDC] = useState<DC | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uniformReq, setUniformReq] = useState<unknown>(null);

  // Helper function to get project name from uniform requests
  const getProjectNameFromUniformRequests = useCallback(async (customer: string): Promise<string> => {
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      if (!res.ok) return extractProjectName();
      
      const data = await res.json();
      if (data.success) {
        // Try to find matching uniform request by customer name
        const customerNames = customer.split(',').map(name => name.trim());
        for (const customerName of customerNames) {
          const matchingRequest = data.uniforms.find((u: unknown) => 
            (u as { fullName: string }).fullName === customerName || 
            customerName.includes((u as { fullName: string }).fullName) ||
            (u as { fullName: string }).fullName.includes(customerName)
          );
          if (matchingRequest && (matchingRequest as { projectName: string }).projectName) {
            return (matchingRequest as { projectName: string }).projectName;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching project name from uniform requests:", error);
    }
    return extractProjectName();
  }, []);

  // Helper function to get project name with proper fallback logic
  const getProjectName = (dc: DC) => {
    // First check if DC has projectName directly
    if (dc.projectName && dc.projectName !== "N/A") return dc.projectName;
    
    // Check if any item has projectName
    if (dc.items && dc.items.length > 0) {
      for (const item of dc.items) {
        // Check individualEmployeeData first (highest priority)
        if (item.individualEmployeeData && item.individualEmployeeData.projectName) {
          return item.individualEmployeeData.projectName;
        }
        // Check item's projectName
        if (item.projectName && item.projectName !== "N/A") {
          return item.projectName;
        }
      }
    }
    
    // If no project name found, return "N/A"
    return "N/A";
  };

  // Helper function to fetch project details from API
  const getProjectDetails = async (projectName: string) => {
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects");
      if (!res.ok) return { projectName, address: "N/A" };
      
      const data = await res.json();
      const project = data.find((p: { projectName: string }) => 
        p.projectName === projectName || 
        projectName.includes(p.projectName) || 
        p.projectName.includes(projectName)
      );
      
      if (project) {
        return {
          projectName: project.projectName,
          address: project.address
        };
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
    return { projectName, address: "N/A" };
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
          // Get actual project name from uniform requests
          const actualProjectName = await getProjectNameFromUniformRequests(dc.customer);
          
          return {
            ...dc,
            // Use actual project name from uniform requests
            projectName: actualProjectName,
            // Process items to match our expected structure
            items: dc.items.map(item => ({
              ...item,
              // Extract employee data from customer name
              employeeId: extractEmployeeId(dc.customer),
              name: item.name, // Keep the original item name (uniform type)
              designation: "Employee", // Default designation
              // Use the size from API response (this is the modified/selected size)
              size: item.size || "",
              quantity: item.quantity || 1,
              // Create individualEmployeeData from available information
              individualEmployeeData: {
                employeeId: extractEmployeeId(dc.customer),
                fullName: extractEmployeeName(dc.customer),
                designation: "Employee",
                uniformType: [item.name], // Use item name as uniform type
                size: { [item.name]: item.size }, // Create size object
                qty: item.quantity || 1,
                projectName: actualProjectName
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
    // Default project name
    return "General";
  };

  // Helper function to extract employee ID from customer name
  const extractEmployeeId = (customer: string): string => {
    // For now, generate a simple ID from customer name
    return customer.split(',')[0]?.trim() || "EMP001";
  };

  // Helper function to extract employee name from customer
  const extractEmployeeName = (customer: string): string => {
    return customer.split(',')[0]?.trim() || customer;
  };



  // Helper function to get individual employee data from uniform requests
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getEmployeeDataFromUniformRequests = async (_employeeName: string) => {
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      if (!res.ok) return null;
      
      const data = await res.json();
      if (data.success) {
        const matchingRequest = data.uniforms.find((u: unknown) => 
          (u as { fullName: string }).fullName === _employeeName || 
          _employeeName.includes((u as { fullName: string }).fullName) ||
          (u as { fullName: string }).fullName.includes(_employeeName)
        );
        return matchingRequest as unknown || null;
      }
    } catch (error) {
      console.error("Error fetching employee data from uniform requests:", error);
    }
    return null;
  };

  // Function to refresh DC data
  const refreshDCData = async () => {
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
        // Get actual project name from uniform requests
        const actualProjectName = await getProjectNameFromUniformRequests(dc.customer);
        
        return {
          ...dc,
          // Use actual project name from uniform requests
          projectName: actualProjectName,
          // Process items to match our expected structure
          items: dc.items.map(item => ({
            ...item,
            // Extract employee data from customer name
            employeeId: extractEmployeeId(dc.customer),
            name: item.name, // Keep the original item name (uniform type)
            designation: "Employee", // Default designation
            // Use the size from API response (this is the modified/selected size)
            size: item.size || "",
            quantity: item.quantity || 1,
            // Create individualEmployeeData from available information
            individualEmployeeData: {
              employeeId: extractEmployeeId(dc.customer),
              fullName: extractEmployeeName(dc.customer),
              designation: "Employee",
              uniformType: [item.name], // Use item name as uniform type
              size: { [item.name]: item.size }, // Create size object
              qty: item.quantity || 1,
              projectName: actualProjectName
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
  };

  useEffect(() => {
    async function fetchUniform() {
      if (selectedDC) {
        const req = await fetchUniformRequestForCustomer(
          selectedDC.items[0]?.employeeId,
          selectedDC.customer
        );
        setUniformReq(req);
        
        // Fetch uniform request data to get original requested sizes and item details
        try {
          const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              const employeeName = selectedDC.customer.split(',')[0]?.trim() || selectedDC.customer;
              // Specify type as unknown and cast to expected shape
              const employeeUniformRequest = (data.uniforms as Array<{
                fullName: string;
                uniformType?: string[];
                size?: Record<string, string>;
              }>).find((u) => 
                u.fullName === employeeName || 
                employeeName.includes(u.fullName) ||
                u.fullName.includes(employeeName)
              );
              
              if (employeeUniformRequest) {
                // Update requested sizes and item details for each item
                selectedDC.items.forEach((item, index) => {
                  // Update requested size
                  const requestedSizeElement = document.getElementById(`requested-size-${index}`);
                  if (requestedSizeElement) {
                    // Get the corresponding uniform type for this item by index
                    const uniformType = employeeUniformRequest.uniformType?.[index] || 
                      employeeUniformRequest.uniformType?.find((type: string) => 
                        type.toLowerCase().includes('shirt') || 
                        type.toLowerCase().includes('pant') ||
                        type.toLowerCase().includes('executive')
                      );
                    
                    if (uniformType && employeeUniformRequest.size && employeeUniformRequest.size[uniformType]) {
                      requestedSizeElement.textContent = employeeUniformRequest.size[uniformType];
                    } else {
                      requestedSizeElement.textContent = 'N/A';
                    }
                  }
                  
                  // Update item name and code
                  const itemNameElement = document.getElementById(`item-name-${index}`);
                  const itemCodeElement = document.getElementById(`item-code-${index}`);
                  
                  if (itemNameElement) {
                    // Get the corresponding uniform type for this item by index
                    const uniformType = employeeUniformRequest.uniformType?.[index] || 
                      employeeUniformRequest.uniformType?.find((type: string) => 
                        type.toLowerCase().includes('shirt') || 
                        type.toLowerCase().includes('pant') ||
                        type.toLowerCase().includes('executive')
                      );
                    itemNameElement.textContent = uniformType || 'N/A';
                  }
                  
                  if (itemCodeElement) {
                    // Generate item code based on uniform type
                    const uniformType = employeeUniformRequest.uniformType?.[index] || 
                      employeeUniformRequest.uniformType?.find((type: string) => 
                        type.toLowerCase().includes('shirt') || 
                        type.toLowerCase().includes('pant') ||
                        type.toLowerCase().includes('executive')
                      );
                    
                    if (uniformType) {
                      const code = uniformType.replace(/\s+/g, '-').toUpperCase();
                      itemCodeElement.textContent = code;
                    } else {
                      itemCodeElement.textContent = 'N/A';
                    }
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error("Error fetching uniform request data:", error);
        }
      } else {
        setUniformReq(null);
      }
    }
    fetchUniform();
  }, [selectedDC]);

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
    const matchesStatus = statusFilter ? dc.status === statusFilter : true;
    const matchesSearch = search ? (
      (dc.dcNumber && dc.dcNumber.toLowerCase().includes(search.toLowerCase())) ||
      ((dc.projectName || "N/A") && (dc.projectName || "N/A").toLowerCase().includes(search.toLowerCase()))
    ) : true;
    return matchesStatus && matchesSearch;
  });

  // Download DC as PDF (exact match to image format)
  const handleDownloadDC = async (dc: DC) => {
    try {
      // Log the DC data for debugging
      console.log("Generating PDF for DC:", dc);
      console.log("DC items:", dc.items);
      
      // Create PDF with A4 portrait orientation for proper A4 sheet format
      const doc = new jsPDF('portrait', 'mm', 'a4');
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
    doc.rect(15, y + 5, pageWidth / 2 - 25, 20);
    doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED\n25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", 17, y + 8, { maxWidth: pageWidth / 2 - 29 });
    doc.rect(pageWidth / 2 + 2, y + 5, pageWidth / 2 - 25, 20);
    
    // Get project name using helper function
    const projectName = getProjectName(dc);
    console.log("Project name for PDF:", projectName);
    
    // Fetch project details from API
    const projectDetails = await getProjectDetails(projectName);
    console.log("Project details for PDF:", projectDetails);
    
    // Create the "To" text with project name and address
    const toText = `${projectDetails.projectName}\n${projectDetails.address}`;
    doc.text(toText, pageWidth / 2 + 4, y + 8, { maxWidth: pageWidth / 2 - 29 });

    y += 30;

    // Fetch uniform request data to get actual uniform type names
    let allUniformRequests = [];
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          allUniformRequests = data.uniforms;
          console.log("Fetched uniform requests:", allUniformRequests);
        }
      }
    } catch (error) {
      console.error("Error fetching uniform requests:", error);
    }
    
    // Parse customer names from DC
    const customerNames = dc.customer.split(',').map(name => name.trim()).filter(name => name.length > 0);
    console.log("Customer names from DC:", customerNames);
    
    // Get all uniform types from all employees in this DC
    const allUniformTypes = new Set<string>();
    const employeeUniformRequests: Array<{
      fullName: string;
      uniformType?: string[];
      size?: Record<string, string>;
      employeeId?: string;
      designation?: string;
    }> = [];
    
    // Find uniform requests for all employees in this DC
    for (const customerName of customerNames) {
      const employeeUniformRequest = (allUniformRequests as Array<{
        fullName: string;
        uniformType?: string[];
        size?: Record<string, string>;
        employeeId?: string;
        designation?: string;
      }>).find((u) => 
        u.fullName === customerName || 
        customerName.includes(u.fullName) ||
        u.fullName.includes(customerName)
      );
      
      if (employeeUniformRequest) {
        employeeUniformRequests.push(employeeUniformRequest);
        // Add all uniform types from this employee
        if (employeeUniformRequest.uniformType) {
          employeeUniformRequest.uniformType.forEach(type => allUniformTypes.add(type));
        }
      }
    }
    
    console.log("Found uniform requests for employees:", employeeUniformRequests);
    console.log("All uniform types:", Array.from(allUniformTypes));
    
    // Create table headers with all uniform types
    const uniformTypesArray = Array.from(allUniformTypes);
    const tableHeaders = ["Sl No", "Emp ID", "Names", "DESIGNATION", "No of Set", ...uniformTypesArray, "Amount", "Emp Sign"];
    
    // Create table body with all employees
    const tableBody = customerNames.map((customerName, index) => {
      const employeeUniformRequest = employeeUniformRequests.find(req => 
        req.fullName === customerName || 
        customerName.includes(req.fullName) ||
        req.fullName.includes(customerName)
      );
      
      // Get employee data
      const employeeId = employeeUniformRequest?.employeeId || `EMP${String(index + 1).padStart(3, '0')}`;
      const designation = employeeUniformRequest?.designation || "Employee";
      
      // Check if employee has accessories to determine "No of Set"
      const hasAccessories = employeeUniformRequest?.uniformType?.some((type: string) => 
        (type && type.toLowerCase().includes('accessories')) || 
        (type && type.toLowerCase().includes('accessory'))
      );
      const noOfSet = hasAccessories ? "Full set" : "NA";
      
      // Create row with sizes for each uniform type
      const row = [
        index + 1, // Sl No
        employeeId,
        customerName,
        designation,
        noOfSet,
        // Add size values for each uniform type
        ...uniformTypesArray.map((uniformType: string) => {
          // Check if this employee has this uniform type
          if (employeeUniformRequest?.uniformType?.includes(uniformType)) {
            // Get size from uniform request
            if (employeeUniformRequest.size && employeeUniformRequest.size[uniformType]) {
              return employeeUniformRequest.size[uniformType];
            }
          }
          return "NA";
        }),
        "NA", // Amount field
        "" // Employee signature field
      ];
      
      return row;
    });
      
    console.log(`Table body for all employees:`, tableBody);
    console.log("DC items with modification data:", dc.items.map(item => ({
      name: item.name,
      size: item.size,
      remarks: item.remarks,
      sizeModificationData: item.sizeModificationData
    })));
    
    // Calculate optimal column widths for portrait orientation with overflow prevention
    const baseColumns = 5; // Sl No, Emp ID, Names, DESIGNATION, No of Set
    const uniformColumns = uniformTypesArray.length;
    
    // Calculate optimal column widths - ensure fit within A4 portrait
    const totalColumns = baseColumns + uniformColumns + 2; // +2 for Amount and Emp Sign
    const availableWidth = pageWidth - 30; // Increased margins to prevent overflow
    
    // Calculate maximum width per column to prevent overflow
    const maxColumnWidth = Math.min(availableWidth / totalColumns, 25); // Cap at 25mm per column
    
    const columnWidths: Record<string, { cellWidth: number }> = {
      '0': { cellWidth: Math.min(12, maxColumnWidth) }, // Sl No - compact
      '1': { cellWidth: Math.min(20, maxColumnWidth) }, // Emp ID - compact
      '2': { cellWidth: Math.min(35, maxColumnWidth * 1.5) }, // Names - wider but capped
      '3': { cellWidth: Math.min(25, maxColumnWidth) }, // DESIGNATION - compact
      '4': { cellWidth: Math.min(15, maxColumnWidth) }, // No of Set - compact
      // Dynamic uniform type columns
      ...uniformTypesArray.reduce((acc: Record<string, { cellWidth: number }>, _: string, index: number) => {
        acc[String(baseColumns + index)] = { cellWidth: Math.min(25, maxColumnWidth) }; // Increased width for uniform type names
        return acc;
      }, {} as Record<string, { cellWidth: number }>),
      [String(baseColumns + uniformColumns)]: { cellWidth: Math.min(15, maxColumnWidth) }, // Amount - compact
      [String(baseColumns + uniformColumns + 1)]: { cellWidth: Math.min(20, maxColumnWidth) } // Emp Sign - compact
    };
    
    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', fontSize: 8 }, // Reduced font size
      styles: { fontSize: 7, cellPadding: 2, textColor: 20 }, // Reduced font size and padding
      margin: { left: 15, right: 15, top: 2, bottom: 2 }, // Increased margins to prevent overflow
      tableWidth: pageWidth - 30, // Use reduced width to prevent overflow
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
    doc.text("2. Goods are delivered after careful checking", 12, finalY + 17);

    // Signature lines - compact for single page
    const sigY = finalY + 20; // Reduced spacing
    doc.setDrawColor(120);
    doc.line(20, sigY, 60, sigY);
    doc.text("Initiated by", 30, sigY + 3);
    doc.line(pageWidth / 2 - 20, sigY, pageWidth / 2 + 20, sigY);
    doc.text("Received by", pageWidth / 2 - 8, sigY + 3);
    doc.line(pageWidth - 60, sigY, pageWidth - 20, sigY);
    doc.text("Issued by", pageWidth - 50, sigY + 3);

    doc.save(`NRDC_${dc.dcNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  // Download all DCs as summary PDF (styled, with logo and table)
  const handleDownloadAllDCs = () => {
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
    doc.text("Delivery Challan Summary", pageWidth / 2, y, { align: "center" });

    y += 12;

    // Table - Only required columns: Sl.No, Customer, DC Number, Quantity, Size
    autoTable(doc, {
      startY: y,
      head: [["Sl.No", "Customer", "DC Number", "Quantity", "Size"]],
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
        '2': { cellWidth: 40 }, // DC Number - increased for full data
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
    doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery.", 14, finalY + 15);
    doc.text("2. Goods are delivered after careful checking.", 14, finalY + 20);

    // Footer
    doc.setFontSize(10);
    doc.text("Initiated by", 14, finalY + 35);
    doc.text("Received by", 80, finalY + 35);
    doc.text("Issued by", 150, finalY + 35);

    doc.save("All_DCs_Summary.pdf");
  };

  return (
    <ManagerDashboardLayout >
      <div
        className={`min-h-screen flex flex-col py-8 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950"
            : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
        }`}
      >
        {/* Header */}
        <div
          className={`rounded-2xl mb-8 p-6 flex items-center gap-6 shadow-lg w-full max-w-7xl mx-auto ${
            theme === "dark"
              ? "bg-gray-900"
              : "bg-gradient-to-r from-blue-500 to-blue-800"
          }`}
        >
          <div
            className={`rounded-xl p-4 flex items-center justify-center ${
              theme === "dark" ? "bg-[#232e3e]" : "bg-blue-600 bg-opacity-30"
            }`}
          >
            <FaStore className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">Delivery Challans (DC)</h1>
            <p className="text-white text-base opacity-90">View and manage DC records</p>
          </div>
          <button
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-base font-semibold shadow transition border-2 ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
            onClick={() => setShowCreate(true)}
          >
            <FaPlus className="w-4 h-4" />
            Create DC
          </button>
        </div>
        {/* Main Content */}
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 px-4">
          {/* Left Panel - Info/Guidelines */}
          <div className="lg:w-1/3 w-full">
            <div
              className={`rounded-xl p-6 border shadow-sm sticky top-8 transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-gray-900 border-blue-900"
                  : "bg-white border-blue-100"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-50 text-blue-600"}`}>
                  <FaInfoCircle className="w-5 h-5" />
                </div>
                <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>DC Guidelines</h2>
              </div>
              <ul className="space-y-4">
                {guidelines.map((g, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-600"}`}><FaBoxOpen className="w-4 h-4" /></span>
                    <span className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{g}</span>
                  </li>
                ))}
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
          {/* Right Panel - Search, Filter, DC Table */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Download All DCs PDF Button */}
            <div className="flex justify-end mb-2">
              <button
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-base font-semibold shadow transition border-2 ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
                onClick={handleDownloadAllDCs}
              >
                <FaBoxOpen className="w-4 h-4" />
                Download All DCs PDF
              </button>
            </div>
            {/* Search and Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-2 items-start md:items-center">
              <div className="relative w-full md:w-1/2">
                <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search by DC number or project name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900 placeholder-gray-400" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500 placeholder-gray-500"}`}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <FaFilter className={`w-5 h-5 mr-2 ${theme === "dark" ? "text-blue-200" : "text-blue-600"}`} />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className={`px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"}`}
                >
                  <option value="">All Status</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* DC Table */}
            <div className="w-full rounded-2xl shadow-xl transition-colors duration-300">
              {/* Restrict height and enable both scrollbars */}
              <div className="w-full h-[320px] overflow-x-auto overflow-y-auto">
                {/* Increase min-w to force horizontal scroll on smaller screens */}
                <table className={`min-w-[800px] table-fixed divide-y ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
                  <thead className={theme === "dark" ? "bg-blue-950" : "bg-blue-50"}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>DC Number</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Date</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Project Name</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-blue-600 font-semibold">Loading DC records...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-red-600 font-semibold">{error}</td>
                      </tr>
                    ) : filteredDC.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500">No DC records found.</td>
                      </tr>
                    ) : (
                      filteredDC.map((dc, idx) => (
                        <tr key={idx} className={`transition ${theme === "dark" ? "hover:bg-blue-950" : "hover:bg-blue-100"}`}>
                          <td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>{dc.dcNumber}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>{dc.dcDate ? dc.dcDate.split('T')[0] : ''}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>{dc.projectName || "N/A"}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>{dc.status}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
                                onClick={() => setSelectedDC(dc)}
                              >
                                View
                              </button>
                              <button
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${theme === "dark" ? "bg-green-900 text-green-200 border-green-700 hover:bg-green-800" : "bg-green-600 text-white border-green-700 hover:bg-green-700"}`}
                                onClick={() => handleDownloadDC(dc)}
                              >
                                Download DC
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* DC Details Modal */}
            {selectedDC && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                <div className={`rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
                  <button
                    className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                    onClick={() => setSelectedDC(null)}
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                  <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                    <FaBoxOpen className="w-6 h-6" />
                    Delivery Challan Details
                  </h2>
                  <div className={`space-y-6 max-h-[70vh] overflow-y-auto pr-2`}> 
                    {/* DC Basic Info */}
                    <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                      <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>DC Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="font-semibold text-sm">DC Number:</span>
                          <div className="text-lg font-bold">{selectedDC.dcNumber}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Date:</span>
                          <div className="text-lg">{selectedDC.dcDate ? selectedDC.dcDate.split('T')[0] : ''}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Project Name:</span>
                          <div className="text-lg">{getProjectName(selectedDC)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Project Information */}
                    <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-950 border-green-800" : "bg-green-50 border-green-200"}`}>
                      <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-green-200" : "text-green-800"}`}>Project Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="font-semibold text-sm">Project Name:</span>
                          <div className="text-lg">{getProjectName(selectedDC)}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Total Employees:</span>
                          <div className="text-lg">
                            {selectedDC.customer.includes(',') 
                              ? selectedDC.customer.split(',').length 
                              : selectedDC.items.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee Details */}
                    <div>
                      <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>Employee Details</h3>
                      <div className="space-y-4">
                        {/* Display DC items with actual sizes */}
                        {selectedDC.items.map((item, i) => (
                              <div key={i} className={`rounded-lg p-4 border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className={`font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                                Item {i + 1}: {item.name}
                                  </h4>
                                  <span className={`px-2 py-1 rounded text-xs ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                                ID: {item.employeeId || "N/A"}
                                  </span>
                                </div>
                            
                            {/* Item Details */}
                            <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                              <div className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>DC Item Details:</div>
                              
                              {/* Basic Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-4">
                                <div><b>Employee ID:</b> {item.employeeId || 'N/A'}</div>
                                <div><b>Item Name:</b> <span id={`item-name-${i}`}>{item.name || 'N/A'}</span></div>
                                <div><b>Requested Size:</b> <span id={`requested-size-${i}`}>Loading...</span></div>
                                <div><b>Dispatched Size:</b> {item.size || 'N/A'}</div>
                                <div><b>Quantity:</b> {item.quantity || 'N/A'}</div>
                                <div><b>Price:</b> {item.price || 'N/A'}</div>
                              </div>

                              {/* Size Modification Data */}
                              {(item.sizeData || item.remarks) && (
                                <div className="mt-4">
                                  <div className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Size Change Details:</div>
                                  <div className={`p-3 rounded border ${theme === "dark" ? "bg-yellow-900 border-yellow-700" : "bg-yellow-50 border-yellow-200"}`}>
                                    <div className="text-sm">
                                      <div><b>Requested Size:</b> <span id={`requested-size-${i}`}>Loading...</span></div>
                                      <div><b>Dispatched Size:</b> {item.size || 'N/A'}</div>
                                      <div><b>Status:</b> {
                                        item.sizeModificationData?.modified || 
                                        (item.remarks && item.remarks.includes('Modified from')) ? 
                                        'Modified' : 'As Requested'
                                      }</div>
                                      {item.remarks && item.remarks.includes('Modified from') && (
                                        <div><b>Note:</b> {item.remarks}</div>
                                      )}
                                      {item.sizeModificationData?.modificationNote && (
                                        <div><b>Note:</b> {item.sizeModificationData.modificationNote}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Remarks */}
                              {item.remarks && (
                                <div className="mt-4 text-sm">
                                  <b>Remarks:</b> {item.remarks}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remarks */}
                    {selectedDC.remarks && (
                      <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-yellow-900 border-yellow-700" : "bg-yellow-50 border-yellow-200"}`}>
                        <span className="font-semibold">Remarks:</span> {selectedDC.remarks}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Create DC Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <CreateDCModal
              onClose={() => setShowCreate(false)}
              theme={theme}
              setDcData={setDcData}
              dcData={dcData}
              refreshDCData={refreshDCData}
            />
          </div>
        )}
      </div>
    </ManagerDashboardLayout >
  );
}