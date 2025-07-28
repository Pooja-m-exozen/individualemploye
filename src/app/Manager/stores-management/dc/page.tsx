"use client";
import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { IndividualEmployeeDetails } from "@/components/dashboard/IndividualEmployeeDetails";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter, FaCheckCircle,  FaPlus, FaTimes } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showToast } from "@/components/Toast";

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
              name: extractEmployeeName(dc.customer),
              designation: "Employee", // Default designation
              // Parse size if it's a JSON string
              size: typeof item.size === 'string' ? item.size : JSON.stringify(item.size),
              quantity: item.quantity || 1,
              // Create individualEmployeeData from available information
              individualEmployeeData: {
                employeeId: extractEmployeeId(dc.customer),
                fullName: extractEmployeeName(dc.customer),
                designation: "Employee",
                uniformType: extractUniformTypes(item.size),
                size: parseSizeData(item.size),
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

  // Helper function to extract uniform types from size data
  const extractUniformTypes = (size: string): string[] => {
    try {
      const sizeObj = typeof size === 'string' ? JSON.parse(size) : size;
      return Object.keys(sizeObj || {});
    } catch (error) {
      console.error("Error parsing size data:", error);
      return [];
    }
  };

  // Helper function to parse size data into a record
  const parseSizeData = (size: string): Record<string, string> => {
    try {
      if (typeof size === 'string') {
        return JSON.parse(size);
      }
      return size || {};
    } catch (error) {
      console.error("Error parsing size data:", error);
      return {};
    }
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
            name: extractEmployeeName(dc.customer),
            designation: "Employee", // Default designation
            // Parse size if it's a JSON string
            size: typeof item.size === 'string' ? item.size : JSON.stringify(item.size),
            quantity: item.quantity || 1,
            // Create individualEmployeeData from available information
            individualEmployeeData: {
              employeeId: extractEmployeeId(dc.customer),
              fullName: extractEmployeeName(dc.customer),
              designation: "Employee",
              uniformType: extractUniformTypes(item.size),
              size: parseSizeData(item.size),
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
      dc.dcNumber.toLowerCase().includes(search.toLowerCase()) ||
      (dc.projectName || "N/A").toLowerCase().includes(search.toLowerCase())
    ) : true;
    return matchesStatus && matchesSearch;
  });

  // Download DC as PDF (exact match to image format)
  const handleDownloadDC = async (dc: DC) => {
    // Log the DC data for debugging
    console.log("Generating PDF for DC:", dc);
    console.log("DC items:", dc.items);
    
    const doc = new jsPDF();
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable = undefined;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 10; // Reduced starting position

    // Company Name & Address (compact layout)
    doc.setFontSize(12); // Reduced from 14
    doc.setFont("helvetica", "bold");
    doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED", pageWidth / 2, y + 5, { align: "center" });
    doc.setFontSize(8); // Reduced from 9
    doc.setFont("helvetica", "normal");
    doc.text("25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", pageWidth / 2, y + 10, { align: "center" });

    // Document Title
    doc.setFontSize(10); // Reduced from 12
    doc.setFont("helvetica", "bold");
    doc.text("Non-Returnable Delivery Challan", pageWidth / 2, y + 15, { align: "center" });

    // Outer border (reduced height)
    doc.setDrawColor(180);
    doc.rect(5, 4, pageWidth - 10, pageHeight - 8, 'S');

    y += 18; // Reduced spacing

    // NRDC No and Date row (compact)
    doc.setFontSize(9); // Reduced from 10
    doc.setFont("helvetica", "bold");
    doc.text(`NRDC No: ${dc.dcNumber}`, 12, y);
    doc.text(`Date: ${dc.dcDate ? dc.dcDate.split("T")[0] : ""}`, pageWidth - 60, y);

    y += 4; // Reduced spacing

    // From/To boxes (compact)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("From:", 12, y + 3);
    doc.text("To:", pageWidth / 2 + 2, y + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7); // Reduced from 9
    doc.rect(12, y + 5, pageWidth / 2 - 18, 12); // Reduced height from 18
    doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED\n25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", 14, y + 8, { maxWidth: pageWidth / 2 - 22 });
    doc.rect(pageWidth / 2 + 2, y + 5, pageWidth / 2 - 18, 12); // Reduced height
    
    // Get project name using helper function
    const projectName = getProjectName(dc);
    console.log("Project name for PDF:", projectName);
    
    doc.text(projectName, pageWidth / 2 + 4, y + 8, { maxWidth: pageWidth / 2 - 22 });

    y += 18; // Reduced spacing

    // DYNAMIC TABLE GENERATION - Based on actual uniform API data
    const tableBody = [];
    
    // First, fetch all uniform requests to get employee data
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
    
    // Get all unique uniform types from the API to create dynamic headers
    const allUniformTypes = new Set<string>();
    allUniformRequests.forEach((uniform: {
      uniformType?: string[];
    }) => {
      if (uniform.uniformType && Array.isArray(uniform.uniformType)) {
        uniform.uniformType.forEach((type: string) => allUniformTypes.add(type));
      }
    });
    
    // Convert to array and sort for consistent ordering
    const dynamicUniformTypes = Array.from(allUniformTypes).sort();
    console.log("Dynamic uniform types found:", dynamicUniformTypes);
    
    // Limit the number of uniform types to prevent overflow
    const maxUniformTypes = Math.min(dynamicUniformTypes.length, 10); // Increased from 6 to 10 since columns are smaller
    const limitedUniformTypes = dynamicUniformTypes.slice(0, maxUniformTypes);
    
    // Create dynamic table headers
    const tableHeaders = ["Sl No", "Emp ID", "Names", "DESIGNATION", "No of Set", ...limitedUniformTypes, "Amount", "Emp Sign"];
    
    // Process each employee in the DC
    const employees = dc.customer.includes(',') 
      ? dc.customer.split(',').map(name => name.trim())
      : [dc.customer];
    
    // Limit number of employees to prevent overflow
    const maxEmployees = Math.min(employees.length, 12); // Increased from 8 to 12 for better height
    const limitedEmployees = employees.slice(0, maxEmployees);
    
    for (let idx = 0; idx < limitedEmployees.length; idx++) {
      const employeeName = limitedEmployees[idx];
      
      // Try to get uniform request data for this specific employee
      let employeeUniformData = null;
      if (allUniformRequests.length > 0) {
        employeeUniformData = allUniformRequests.find((u: unknown) => 
          (u as { fullName: string }).fullName === employeeName || 
          employeeName.includes((u as { fullName: string }).fullName) ||
          (u as { fullName: string }).fullName.includes(employeeName)
        );
        console.log(`Found uniform data for ${employeeName}:`, employeeUniformData);
      }
      
      // Use uniform request data if available, otherwise use default
      const empId = employeeUniformData ? employeeUniformData.employeeId : `EMP${idx + 1}`;
      const designation = employeeUniformData ? employeeUniformData.designation : "Employee";
      
      // Parse size data for this employee
      const sizeData = employeeUniformData ? employeeUniformData.size : {};
      const uniformTypes = employeeUniformData ? employeeUniformData.uniformType : [];
      
      console.log(`Size data for ${employeeName}:`, sizeData);
      console.log(`Uniform types for ${employeeName}:`, uniformTypes);
      
      // Get quantity
      const quantity = employeeUniformData ? employeeUniformData.qty : 1;
      const noOfSet = sizeData['Accessories'] ? "Full set" : quantity.toString();
      
      // Create dynamic table row with values for each uniform type
      const tableRow = [
        idx + 1,
        empId,
        employeeName.length > 12 ? employeeName.substring(0, 12) + "..." : employeeName, // Reduced from 15 to 12
        designation.length > 10 ? designation.substring(0, 10) + "..." : designation, // Reduced from 12 to 10
        noOfSet,
        // Add size values for each limited uniform type
        ...limitedUniformTypes.map(uniformType => {
          return sizeData[uniformType] || "NA";
        }),
        "NA", // Amount field
        "" // Employee signature field
      ];
      
      console.log(`Dynamic table row for employee ${idx + 1}:`, tableRow);
      tableBody.push(tableRow);
    }
    
    // Add empty rows to fill remaining space (but not too many)
    const emptyRowsNeeded = Math.max(0, 12 - tableBody.length); // Increased from 6 to 12 for better height
    for (let i = 0; i < emptyRowsNeeded; i++) {
      const emptyRow = ["", "", "", "", "", ...limitedUniformTypes.map(() => ""), "", ""];
      tableBody.push(emptyRow);
    }
    
    // Calculate optimal column widths for better fit
    const baseColumns = 5; // Sl No, Emp ID, Names, DESIGNATION, No of Set
    const uniformColumns = limitedUniformTypes.length;
    // const endColumns = 2; // Amount, Emp Sign
    // const totalColumns = baseColumns + uniformColumns + endColumns; // <-- Remove unused variable
    
    // Calculate optimal column widths - much smaller for better fit
    const columnWidths: Record<string, { cellWidth: number }> = {
      '0': { cellWidth: 12 }, // Sl No - reduced from 15
      '1': { cellWidth: 18 }, // Emp ID - reduced from 20
      '2': { cellWidth: 25 }, // Names - reduced from 35
      '3': { cellWidth: 20 }, // DESIGNATION - reduced from 25
      '4': { cellWidth: 15 }, // No of Set - reduced from 20
      // Dynamic uniform type columns (much smaller width)
      ...limitedUniformTypes.reduce((acc, _, index) => {
        acc[String(baseColumns + index)] = { cellWidth: 12 }; // Much smaller width for uniform types - reduced from 15
        return acc;
      }, {} as Record<string, { cellWidth: number }>),
      [String(baseColumns + uniformColumns)]: { cellWidth: 12 }, // Amount - reduced from 15
      [String(baseColumns + uniformColumns + 1)]: { cellWidth: 15 } // Emp Sign - reduced from 20
    };
    
    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', fontSize: 6 }, // Further reduced font size
      styles: { fontSize: 5, cellPadding: 1.2, textColor: 20 }, // Increased cell padding from 0.3 to 1.2 for better height
      margin: { left: 5, right: 5, top: 1, bottom: 1 }, // Minimal margins
      tableWidth: pageWidth - 10, // Use almost full width
      columnStyles: columnWidths,
      didDrawPage: function(data) {
        // Ensure we don't exceed page height
        if (data.cursor && data.cursor.y > pageHeight - 30) {
          doc.addPage();
        }
      }
    });

    // Get Y after table
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 20;

    // Terms & Conditions (compact)
    doc.setFontSize(7); // Reduced from 9
    doc.setFont("helvetica", "normal");
    doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery", 12, finalY + 5);
    doc.text("2. Goods are delivered after careful checking", 12, finalY + 9);

    // Signature lines (compact)
    const sigY = finalY + 18; // Reduced spacing
    doc.setDrawColor(120);
    doc.line(20, sigY, 60, sigY);
    doc.text("Initiated by", 28, sigY + 3);
    doc.line(pageWidth / 2 - 20, sigY, pageWidth / 2 + 20, sigY);
    doc.text("Received by", pageWidth / 2 - 8, sigY + 3);
    doc.line(pageWidth - 60, sigY, pageWidth - 20, sigY);
    doc.text("Issued by", pageWidth - 50, sigY + 3);

    doc.save(`NRDC_${dc.dcNumber}.pdf`);
  };

  // Download all DCs as summary PDF (styled, with logo and table)
  const handleDownloadAllDCs = () => {
    const doc = new jsPDF();
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable = undefined;

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 12;

    // Company Name & Address (exact match to image)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EXOZEN FACILITY MANAGEMENT SERVICES PRIVATE LIMITED", pageWidth / 2, y + 7, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("25/1, 4th Floor, SKIP House, Museum Road, Near Brigade Tower, Bangalore - 560025, Karnataka", pageWidth / 2, y + 13, { align: "center" });

    y += 22;

    // Table Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Delivery Challan Summary", pageWidth / 2, y, { align: "center" });

    y += 8;

    // Table - Only required columns: Sl.No, Customer, DC Number, Quantity, Size
    autoTable(doc, {
      startY: y,
      head: [["Sl.No", "Customer", "DC Number", "Quantity", "Size"]],
      body: dcData.map((dc, idx) => [
        idx + 1,
        dc.customer,
        dc.dcNumber,
        dc.items.map(item => item.quantity).join(", "),
        dc.items.map(item => item.size).join(", ")
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 12, right: 12 },
      tableWidth: pageWidth - 24,
    });

    // Get Y after table
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;

    // Terms & Conditions
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions", 14, finalY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery.", 14, finalY + 13);
    doc.text("2. Goods are delivered after careful checking.", 14, finalY + 18);

    // Footer
    doc.setFontSize(10);
    doc.text("Initiated by", 14, finalY + 32);
    doc.text("Received by", 80, finalY + 32);
    doc.text("Issued by", 150, finalY + 32);

    doc.save("All_DCs_Summary.pdf");
  };

  return (
    <ManagerDashboardLayout>
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
                        {/* Handle multiple employees from customer name */}
                        {(() => {
                          // Check if customer contains multiple names
                          if (selectedDC.customer.includes(',')) {
                            const customerNames = selectedDC.customer.split(',').map(name => name.trim());
                            return customerNames.map((customerName, i) => (
                              <div key={i} className={`rounded-lg p-4 border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className={`font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                                    Employee {i + 1}: {customerName}
                                  </h4>
                                  <span className={`px-2 py-1 rounded text-xs ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                                    ID: {extractEmployeeId(customerName)}
                                  </span>
                                </div>
                                <IndividualEmployeeDetails 
                                  employeeName={customerName} 
                                  theme={theme} 
                                />
                              </div>
                            ));
                          } else {
                            // Single employee - use existing logic
                            return selectedDC.items.map((item, i) => (
                              <div key={i} className={`rounded-lg p-4 border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className={`font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                                    Employee {i + 1}: {item.individualEmployeeData ? item.individualEmployeeData.fullName : (item.name || selectedDC.customer)}
                                  </h4>
                                  <span className={`px-2 py-1 rounded text-xs ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                                    ID: {item.individualEmployeeData ? item.individualEmployeeData.employeeId : (item.employeeId || "N/A")}
                                  </span>
                                </div>
                                <IndividualEmployeeDetails 
                                  employeeName={item.individualEmployeeData ? item.individualEmployeeData.fullName : (item.name || selectedDC.customer)} 
                                  theme={theme} 
                                />
                              </div>
                            ));
                          }
                        })()}
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
    </ManagerDashboardLayout>
  );
}

// interface SelectedItem {
//   id: string;
//   name: string;
//   itemCode: string;
//   size: string;
//   quantity: number;
//   employeeId: string;
//   unit: string;
//   stock: number;
// }

// type DisplayItem = SelectedItem & { price?: string; remarks?: string };

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
    uniformType: string[];
    size: Record<string, string>;
    qty: number;
    uniformRequested: boolean;
    approvalStatus: string;
    issuedStatus: string;
    remarks: string;
    requestDate: string;
    type: string[];
  }>;
}



// Step-by-step CreateDCModal
function CreateDCModal({ onClose, theme, setDcData, dcData, refreshDCData }: { onClose: () => void; theme: string; setDcData: React.Dispatch<React.SetStateAction<DC[]>>; dcData: DC[]; refreshDCData: () => Promise<void> }) {
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
  const [dcNumberError, setDcNumberError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  // const [show, setShow] = useState(false);
  // const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // const [hasUnsaved, setHasUnsaved] = useState(false);

  // Stepper icons
  const stepIcons = [
    <FaStore key="store" className="w-5 h-5" />, 
    <FaCheckCircle key="check" className="w-5 h-5" />, 
    <FaInfoCircle key="info" className="w-5 h-5" />
  ];

  // Step validation
  const isStep1Valid = selectedProject !== '';
  const isStep2Valid = selectedRequests.length > 0;
  const isStep3Valid = customer.trim() && dcNumber.trim() && dcDate.trim();

  useEffect(() => {
    const fetchUniformData = async () => {
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        const data: UniformApiResponse = await res.json();
        if (data.success) {
          const uniqueProjects = Array.from(new Set(data.uniforms.map(u => u.projectName)));
          setProjectList(uniqueProjects);
        }
      } catch {
        // setError("Failed to fetch projects");
      }
    };
    fetchUniformData();
  }, []);

  // Filter uniform requests when project is selected
  useEffect(() => {
    const fetchUniformRequests = async () => {
      setLoading(true);
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        const data: UniformApiResponse = await res.json();
        if (data.success) {
          const filteredRequests = data.uniforms.filter(
            req => req.projectName === selectedProject && req.approvalStatus === 'Approved'
          );
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
  }, [selectedProject]);

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
    try {
      // Create items array from selected requests
      const items = selectedRequests.map(selectedRequest => ({
        id: selectedRequest._id,
        employeeId: selectedRequest.employeeId,
        itemCode: Array.isArray(selectedRequest.items) && selectedRequest.items[0] && typeof selectedRequest.items[0] === 'object' && 'type' in selectedRequest.items[0] ? (selectedRequest.items[0] as { type?: string }).type || "" : "",
        name: Array.isArray(selectedRequest.items) && selectedRequest.items[0] && typeof selectedRequest.items[0] === 'object' && 'type' in selectedRequest.items[0] ? (selectedRequest.items[0] as { type?: string }).type || "" : "",
        size: typeof selectedRequest.size === 'object' && selectedRequest.uniformType && selectedRequest.uniformType[0] && selectedRequest.size[selectedRequest.uniformType[0]] ? selectedRequest.size[selectedRequest.uniformType[0]] : '',
        quantity: selectedRequest.qty || 1,
        price: "", // Add price if available
        remarks: selectedRequest.remarks || ""
      }));

      const payload = {
        customer: selectedRequests.map(req => req.fullName).join(", "),
        dcNumber,
        dcDate,
        remarks,
        address,
        items
      };

      const res = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        // --- PATCH: Store projectName immediately in new DC object ---
        setDcData(prev => [
          {
            _id: data.dcId,
            customer: payload.customer,
            dcNumber: payload.dcNumber,
            dcDate: payload.dcDate,
            remarks: payload.remarks,
            projectName: selectedProject, // <-- Store project name immediately
            items: items.map(item => ({
              itemId: item.id,
              employeeId: item.employeeId,
              itemCode: item.itemCode,
              name: item.name,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              remarks: item.remarks,
              _id: item.id,
              // Optionally, you can also store projectName in each item if needed:
              // projectName: selectedProject,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0,
          },
          ...prev,
        ]);
        setSaveDCError(null);
        onClose();
      } else {
        setSaveDCError(data.message || 'Failed to save Outward DC');
      }
    } catch (err: unknown) {
      setSaveDCError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Wrap stepLabels in useMemo
  const stepLabels = React.useMemo(() => ["Project", "Uniform Request", "DC Details"], []);

  // Step navigation
  // const nextStep = () => setStep(s => Math.min(s + 1, 3));
  // const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // Stepper labels
  // const stepLabels = ["Project", "Uniform Request", "DC Details"];

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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsaved(
      !!customer || !!dcNumber || !!remarks || !!address || selectedRequests.length > 0 || !!selectedProject
    );
  }, [customer, dcNumber, remarks, address, selectedRequests, selectedProject]);

  // Animate modal open
  useEffect(() => { setShow(true); }, []);

  // Scroll to top on step change
  useEffect(() => {
    if (modalRef.current) modalRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Confirm before cloSign if unsaved
  const handleRequestClose = () => {
    if (hasUnsaved && !success) setShowCloseConfirm(true);
    else onClose();
  };

  // Stepper progress bar
  const progressPercent = ((step-1)/(stepLabels.length-1))*100;



  // Success animation
  const successAnimation = success && (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className="rounded-full bg-green-100 p-6 mb-4">
        <FaCheckCircle className="w-16 h-16 text-green-600 animate-bounce" />
      </div>
      <div className="text-2xl font-bold text-green-700 mb-2">DC Created!</div>
      <div className="text-gray-600 mb-6">Your Delivery Challan has been successfully created.</div>
      <button
        className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        onClick={() => { setSuccess(false); setStep(1); setSelectedProject(''); setSelectedRequests([]); setCustomer(''); setDcNumber(''); setRemarks(''); }}
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
    await handleCreateDC();
    setSaving(false);
    if (!saveDCError) {
      setSuccess(true);
      showToast({ message: "Delivery Challan created successfully!", type: "success" });
    }
  };

  // Fix 1: Remove the MouseEvent type from handleAutoGenerateDCNumber and implement the function
  function handleAutoGenerateDCNumber() {
    // Simple DC number generator (customize as needed)
    const random = Math.floor(100000 + Math.random() * 900000);
    setDcNumber(`DC${random}`);
    setDcNumberError(null);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-modal="true"
      role="dialog"
      aria-label="Create Delivery Challan Modal"
    >
      <div
        ref={modalRef}
        className={`relative rounded-3xl shadow-2xl border-2 max-w-3xl w-full flex flex-col overflow-y-auto max-h-[95vh] transition-all duration-300 ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} ${theme === "dark" ? "bg-[#181f2a] border-blue-900" : "bg-white border-blue-200"}`}
        tabIndex={-1}
      >
        {/* Brand accent */}
        <div className={`absolute left-0 top-0 w-full h-2 rounded-t-3xl ${theme === "dark" ? "bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900" : "bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400"}`}></div>
        {/* Modal Header (sticky) */}
        <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${theme === "dark" ? "bg-[#181f2a] border-blue-900" : "bg-white border-blue-100"}`}>
          <div className="flex items-center gap-3">
            <Image src="/v1/employee/exozen_logo1.png" alt="Brand Logo" width={56} height={32} className="w-14 h-8 object-contain bg-white rounded shadow mr-4" />
            <FaBoxOpen className={`w-7 h-7 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`} />
            <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Generate Delivery Challan</h2>
          </div>
          <button
            onClick={handleRequestClose}
            aria-label="Close modal"
            className={`p-3 rounded-full transition absolute top-4 right-4 z-20 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === "dark" ? "hover:bg-blue-900 text-gray-400 hover:text-blue-300" : "hover:bg-blue-100 text-gray-600 hover:text-blue-600"}`}
          >
            <FaTimes className="w-7 h-7" />
          </button>
        </div>
        {/* Stepper and Progress Bar */}
        <div className="flex flex-col gap-2 px-4 pt-6 pb-2">
          <div className="flex justify-center items-center gap-0">
            {stepLabels.map((label, idx) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                  <div className={`w-11 h-11 flex items-center justify-center rounded-full font-bold border-2 mb-1 transition-all duration-200
                    ${step === idx + 1
                      ? theme === "dark"
                        ? "bg-blue-700 text-white border-blue-400 shadow-lg"
                        : "bg-blue-600 text-white border-blue-400 shadow-lg"
                      : theme === "dark"
                        ? "bg-gray-800 text-gray-400 border-gray-700"
                        : "bg-gray-200 text-gray-500 border-gray-300"
                    }`}>
                    {stepIcons[idx]}
                  </div>
                  <span className={`text-xs font-medium transition-colors duration-200 ${step === idx + 1
                    ? theme === "dark" ? "text-blue-300" : "text-blue-700"
                    : theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {label}
                  </span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className={`w-16 h-1 mx-2 rounded transition-all duration-200
                    ${step > idx + 1
                      ? theme === "dark" ? "bg-blue-700" : "bg-blue-600"
                      : theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                    }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-blue-950 rounded-full overflow-hidden mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${theme === "dark" ? "bg-blue-700" : "bg-blue-600"}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        {/* ARIA live region for announcements */}
        <div ref={announceRef} className="sr-only" aria-live="polite"></div>
        {/* Modal Content */}
        <div className="p-4 md:p-8 flex flex-col gap-10 animate-fade-in">
          {saving && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 rounded-3xl">
              <svg className="animate-spin h-12 w-12 text-blue-600" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
            </div>
          )}
          {successAnimation}
          {!success && (
            <>
              {/* Step 1: Project Selection */}
              {step === 1 && (
                <section className={`rounded-2xl border shadow-lg p-6 md:p-10 transition-colors duration-300 flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#232e3e] via-blue-950 to-blue-900 border-blue-900" : "bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-100"}`}
                  aria-labelledby="step1-header">
                  <div className="flex items-center gap-2 mb-2">
                    <FaStore className={`w-5 h-5 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`} />
                    <span id="step1-header" className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-blue-900"}`}>Project Selection</span>
                  </div>
                  <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Select Project <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-gray-400" title="Choose the project for which you want to generate a Delivery Challan.">(?)</span>
                  </label>
                  <select
                    value={selectedProject}
                    onChange={e => {
                      setSelectedProject(e.target.value);
                      setSelectedRequests([]);
                      setTouched(t => ({ ...t, selectedProject: true }));
                    }}
                    className={`w-full p-4 border rounded-lg focus:ring-2 transition-all duration-200
                      ${theme === "dark"
                        ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900"
                        : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"
                      }`}
                    aria-required="true"
                  >
                    <option value="">Select a project</option>
                    {projectList.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                  {touched.selectedProject && !isStep1Valid && <div className="text-red-600 text-xs mt-1">Please select a project.</div>}
                  <div className="text-xs text-gray-500 mt-2">Choose the project for which you want to generate a Delivery Challan.</div>
                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      disabled={!isStep1Valid}
                      onClick={() => setStep(2)}
                      className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200
                        ${isStep1Valid
                          ? theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                      Next
                    </button>
                  </div>
                </section>
              )}
              {/* Step 2: Uniform Request Selection */}
              {step === 2 && (
                <section className={`rounded-2xl border shadow-lg p-6 md:p-10 transition-colors duration-300 flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#233e2e] via-green-950 to-green-900 border-green-900" : "bg-gradient-to-br from-green-50 via-white to-green-100 border-green-100"}`}
                  aria-labelledby="step2-header">
                  <div className="flex items-center gap-2 mb-2">
                    <FaCheckCircle className={`w-5 h-5 ${theme === "dark" ? "text-green-200" : "text-green-700"}`} />
                    <span id="step2-header" className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-green-900"}`}>Select Employees</span>
                  </div>
                  <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Select Employees <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-gray-400" title="Select the employees whose approved uniform requests should be included in this delivery challan.">(?)</span>
                  </label>
                  {loading ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                      Loading...
                    </div>
                  ) : (
                    <div className={`max-h-60 overflow-y-auto border rounded-lg p-4 ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                      {uniformRequests.length === 0 ? (
                        <div className={`text-center py-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          No approved uniform requests found for this project.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {uniformRequests.map(request => (
                            <label key={request._id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                              theme === "dark" 
                                ? "hover:bg-gray-800 border border-gray-700" 
                                : "hover:bg-gray-50 border border-gray-200"
                            }`}>
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
                              <div className="flex-1">
                                <div className={`font-medium ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                  {request.fullName}
                                </div>
                                <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                  ID: {request.employeeId} • {request.designation} • {request.projectName}
                                </div>
                                <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                                  Uniform: {Array.isArray(request.uniformType) ? request.uniformType.join(", ") : ""} • Qty: {request.qty}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {touched.selectedRequests && !isStep2Valid && <div className="text-red-600 text-xs mt-1">Please select at least one employee.</div>}
                  <div className="text-xs text-gray-500 mt-2">Select the employees whose approved uniform requests should be included in this delivery challan. All selected employees will be grouped under a Signle DC.</div>
                  <div className="flex justify-between mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200
                        ${theme === "dark" ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!isStep2Valid}
                      onClick={() => setStep(3)}
                      className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200
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
              {/* Step 3: DC Details & Preview */}
              {step === 3 && (
                <section className={`rounded-2xl border shadow-lg p-6 md:p-10 transition-colors duration-300 flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#232e3e] via-indigo-950 to-indigo-900 border-indigo-900" : "bg-gradient-to-br from-indigo-50 via-white to-indigo-100 border-indigo-100"}`}
                  aria-labelledby="step3-header">
                  <div className="flex items-center gap-2 mb-2">
                    <FaInfoCircle className={`w-5 h-5 ${theme === "dark" ? "text-indigo-200" : "text-indigo-700"}`} />
                    <span id="step3-header" className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-indigo-900"}`}>DC Details</span>
                  </div>
                  {/* Selected Employees Summary */}
                  {selectedRequests.length > 0 && (
                    <div className={`md:col-span-2 p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                      <div className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                        Selected Employees ({selectedRequests.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {selectedRequests.map((req) => (
                          <div key={req._id} className={`text-sm p-2 rounded ${theme === "dark" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                            <div className="font-medium">{req.fullName}</div>
                            <div className="text-xs opacity-75">ID: {req.employeeId} • {req.designation}</div>
                            <div className="text-xs opacity-75">Qty: {req.qty} • {Array.isArray(req.uniformType) ? req.uniformType.join(", ") : ""}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                        Customer <span className="text-red-500">*</span>
                        <span className="ml-1 text-xs text-gray-400" title="Name of the person or entity receiving the delivery.">(?)</span>
                      </label>
                      <input type="text" value={customer} onChange={e => { setCustomer(e.target.value); setTouched(t => ({ ...t, customer: true })); }}
                        className={`w-full p-4 border rounded-lg focus:ring-2 transition-all duration-200
                          ${theme === "dark"
                            ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                            : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                         }`} aria-required="true" />
                      {touched.customer && !customer.trim() && <div className="text-red-600 text-xs mt-1">Customer is required.</div>}
                      <div className="text-xs text-gray-500 mt-1">Name of the person or entity receiving the delivery.</div>
                    </div>
                    <div>
                      <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                        DC Number <span className="text-red-500">*</span>
                        <span className="ml-1 text-xs text-gray-400" title="Unique identifier for this Delivery Challan.">(?)</span>
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={dcNumber} onChange={e => { setDcNumber(e.target.value); setTouched(t => ({ ...t, dcNumber: true })); setDcNumberError(null); }}
                          className={`w-full p-4 border rounded-lg focus:ring-2 transition-all duration-200
                            ${theme === "dark"
                              ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                              : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                           }`} aria-required="true" />
                        <button type="button" onClick={handleAutoGenerateDCNumber}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border text-xs whitespace-nowrap
                            ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}`}
                        >Auto-generate</button>
                      </div>
                      {touched.dcNumber && !dcNumber.trim() && <div className="text-red-600 text-xs mt-1">DC Number is required.</div>}
                      {dcNumberError && <div className="text-red-600 text-xs mt-1">{dcNumberError}</div>}
                      <div className="text-xs text-gray-500 mt-1">Unique identifier for this Delivery Challan.</div>
                    </div>
                    <div>
                      <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                        DC Date <span className="text-red-500">*</span>
                        <span className="ml-1 text-xs text-gray-400" title="Date of issue for this DC.">(?)</span>
                      </label>
                      <input type="date" value={dcDate} onChange={e => { setDcDate(e.target.value); setTouched(t => ({ ...t, dcDate: true })); }}
                        className={`w-full p-4 border rounded-lg focus:ring-2 transition-all duration-200
                          ${theme === "dark"
                            ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                            : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                         }`} aria-required="true" />
                      {touched.dcDate && !dcDate.trim() && <div className="text-red-600 text-xs mt-1">Date is required.</div>}
                      <div className="text-xs text-gray-500 mt-1">Date of issue for this DC.</div>
                    </div>
                    <div>
                      <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Remarks</label>
                      <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                        className={`w-full p-4 border rounded-lg focus:ring-2 transition-all duration-200
                          ${theme === "dark"
                            ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                            : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                         }`} />
                      <div className="text-xs text-gray-500 mt-1">Any additional notes for this DC (optional).</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Address</label>
                      <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                        className={`w-full p-4 border rounded-lg focus:ring-2 transition-all duration-200
                          ${theme === "dark"
                            ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                            : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                         }`} />
                      <div className="text-xs text-gray-500 mt-1">Delivery address (optional).</div>
                    </div>
                  </div>
                  {saveDCError && (
                    <div className={`p-4 rounded-lg border flex items-center gap-2 mt-6
                      ${theme === "dark" ? "bg-red-900 border-red-700 text-red-200" : "bg-red-100 border-red-200 text-red-700"}`}>
                      <FaTimes className="w-4 h-4" />
                      {saveDCError}
                    </div>
                  )}
                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200
                        ${theme === "dark" ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateDCWithUX}
                      disabled={saving || !isStep3Valid}
                      className={`px-8 py-3 rounded-lg font-medium text-lg flex items-center gap-2 transition-all duration-200
                        ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}
                        ${(saving || !isStep3Valid) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {saving && <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>}
                      <FaPlus className="w-4 h-4" />
                      Generate DC
                    </button>
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
        {/* Confirm close dialog */}
        {showCloseConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className={`rounded-xl shadow-xl p-8 bg-white dark:bg-gray-900 border ${theme === "dark" ? "border-blue-900" : "border-blue-200"}`}>
              <div className="font-bold text-lg mb-2">Discard changes?</div>
              <div className="mb-4 text-gray-600 dark:text-gray-300">You have unsaved changes. Are you sure you want to close?</div>
              <div className="flex gap-4 justify-end">
                <button
                  className={`px-4 py-2 rounded border ${theme === "dark" ? "bg-gray-800 text-gray-200 border-blue-900 hover:bg-blue-900" : "bg-gray-100 text-blue-700 border-blue-200 hover:bg-blue-200"}`}
                  onClick={() => setShowCloseConfirm(false)}
                >Cancel</button>
                <button
                  className={`px-4 py-2 rounded border ${theme === "dark" ? "bg-red-900 text-red-100 border-red-700 hover:bg-red-800" : "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"}`}
                  onClick={() => { setShowCloseConfirm(false); onClose(); }}
                >Discard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// PATCH: In getProjectName, prefer dc.projectName if present (already does this)
// PATCH: No changes needed in handleDownloadDC or table rendering, as projectName is now always present in new DCs