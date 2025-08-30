"use client";
import React, { useState, useEffect, useCallback } from "react";
import ManagerDashboardLayout  from "@/components/dashboard/ManagerDashboardLayout";
import CreateDCModal from "@/components/dashboard/CreateDCmodal";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter, FaPlus, FaTimes } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface UniformRequestData {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  uniformType: string[];
  size: Record<string, string>;
  qty: number;
  remarks?: string;
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
async function fetchUniformRequestForCustomer(employeeId: string, fullName: string): Promise<UniformRequestData | null> {
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
      console.log("🔍 Searching for uniform request with:", { employeeId, fullName });
      console.log("🔍 Available uniforms:", data.uniforms.length);
     
      // Try to match by employeeId first, then by fullName
      const byEmployeeId = data.uniforms.find((u: UniformRequestData) => {
        return u.employeeId === employeeId;
      });
      if (byEmployeeId) {
        console.log("🔍 Found by employeeId:", byEmployeeId);
        return byEmployeeId;
      }
     
      const byFullName = data.uniforms.find((u: UniformRequestData) => {
        return u.fullName === fullName;
      });
      if (byFullName) {
        console.log("🔍 Found by fullName:", byFullName);
        return byFullName;
      }
     
      // If no exact match, try partial name match
      const partialMatch = data.uniforms.find((u: UniformRequestData) => {
        const uniformFullName = u.fullName;
        const matches = uniformFullName.toLowerCase().includes(fullName.toLowerCase()) ||
                       fullName.toLowerCase().includes(uniformFullName.toLowerCase());
        if (matches) {
          console.log("🔍 Found partial match:", { uniformFullName, fullName });
        }
        return matches;
      });
     
      if (partialMatch) {
        console.log("🔍 Returning partial match:", partialMatch);
        return partialMatch as UniformRequestData;
      }
     
      console.log("🔍 No match found for:", { employeeId, fullName });
      return null;
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
  const [uniformReq, setUniformReq] = useState<UniformRequestData | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [allPdfLoading, setAllPdfLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
            quantity: item.quantity || 1,
            // Use stored individualEmployeeData if available, otherwise create from available info
            individualEmployeeData: item.individualEmployeeData || {
              employeeId: item.employeeId || extractEmployeeId(dc.customer),
              fullName: extractEmployeeName(dc.customer),
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
        console.log("🔍 Fetching uniform request for DC:", selectedDC.dcNumber);
        console.log("🔍 DC customer:", selectedDC.customer);
        console.log("🔍 DC items:", selectedDC.items);
       
        const req = await fetchUniformRequestForCustomer(
          selectedDC.items[0]?.employeeId,
          selectedDC.customer
        );
       
        console.log("🔍 Fetched uniform request:", req);
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
  const handleDownloadDC = async (dc: DC) => {
    try {
      setPdfLoading(dc.dcNumber);
     
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
    doc.text(toText, pageWidth / 2 + 4, y + 8, { maxWidth: pageWidth / 2 - 29 });

    y += 30;

    // Fetch employee data from uniforms API to get proper employee information
    console.log("Fetching employee data from uniforms API for DC:", dc.dcNumber);
    // Using let because employeeData is modified with push() operations
    // eslint-disable-next-line prefer-const
    let employeeData: Array<{
      employeeId: string;
      fullName: string;
      designation: string;
      uniformType: string[];
      size: Record<string, string>;
      projectName: string;
    }> = [];
   
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.employeeGroups) {
          console.log("Using new API structure with employeeGroups:", data.employeeGroups.length, "employees");
         
          // Parse customer names from DC
          const customerNames = dc.customer.split(',').map(name => name.trim());
          console.log("DC customer names:", customerNames);
         
          // Match employees by customer names
          data.employeeGroups.forEach((group: { fullName?: string; employeeId?: string; designation?: string; projectName?: string; requests?: Array<{ uniformType?: string[]; size?: Record<string, string> }> }) => {
            const groupName = group.fullName?.trim();
            if (groupName) {
              // Check if this employee matches any customer name in the DC
              const isMatchingEmployee = customerNames.some(customerName => {
                // Try exact match first
                if (customerName === groupName) return true;
               
                // Try partial match
                if (customerName.toLowerCase().includes(groupName.toLowerCase()) ||
                    groupName.toLowerCase().includes(customerName.toLowerCase())) return true;
               
                // Try matching by project name if customer name doesn't match
                if (group.projectName && 
                    (group.projectName === dc.projectName || 
                     group.projectName === dc.customer ||
                     (dc.projectName && dc.projectName.toLowerCase().includes(group.projectName.toLowerCase())) ||
                     (group.projectName && group.projectName.toLowerCase().includes(dc.projectName?.toLowerCase() || '')))) {
                  return true;
                }
               
                return false;
              });
             
              if (isMatchingEmployee) {
                const employeeInfo = {
                  employeeId: group.employeeId || `EMP${String(employeeData.length + 1).padStart(3, '0')}`,
                  fullName: group.fullName || "Unknown Employee",
                  designation: group.designation || "Employee",
                  uniformType: group.requests?.[0]?.uniformType || [],
                  size: group.requests?.[0]?.size || {},
                  projectName: group.projectName || dc.projectName || dc.customer
                };
               
                // Add to employee data array if not already present
                if (!employeeData.find(emp => emp.employeeId === employeeInfo.employeeId)) {
                  employeeData.push(employeeInfo);
                  console.log(`Added employee: ${employeeInfo.employeeId} - ${employeeInfo.fullName} (${employeeInfo.designation})`);
                }
              }
            }
          });
         
          // If no employees found, try to match by project name
          if (employeeData.length === 0) {
            console.log("No employees found by name, trying to match by project...");
            data.employeeGroups.forEach((group: { fullName?: string; employeeId?: string; designation?: string; projectName?: string; requests?: Array<{ uniformType?: string[]; size?: Record<string, string> }> }) => {
              if (group.projectName && 
                  (group.projectName === dc.projectName || 
                   group.projectName === dc.customer ||
                   (dc.projectName && dc.projectName.toLowerCase().includes(group.projectName.toLowerCase())) ||
                   (group.projectName && group.projectName.toLowerCase().includes(dc.projectName?.toLowerCase() || '')))) {
               
                const employeeInfo = {
                  employeeId: group.employeeId || `EMP${String(employeeData.length + 1).padStart(3, '0')}`,
                  fullName: group.fullName || "Unknown Employee",
                  designation: group.designation || "Employee",
                  uniformType: group.requests?.[0]?.uniformType || [],
                  size: group.requests?.[0]?.size || {},
                  projectName: group.projectName || dc.projectName || dc.customer
                };
               
                if (!employeeData.find(emp => emp.employeeId === employeeInfo.employeeId)) {
                  employeeData.push(employeeInfo);
                  console.log(`Added employee by project: ${employeeInfo.employeeId} - ${employeeInfo.fullName}`);
                }
              }
            });
          }
        } else if (data.success && data.uniforms) {
          console.log("Using legacy API structure with uniforms:", data.uniforms.length, "uniforms");
         
          // Fallback to old API structure
          const customerNames = dc.customer.split(',').map(name => name.trim());
          data.uniforms.forEach((uniform: { fullName?: string; employeeId?: string; designation?: string; projectName?: string; uniformType?: string[]; size?: Record<string, string> }) => {
            const uniformName = uniform.fullName?.trim();
            if (uniformName) {
              const isMatchingEmployee = customerNames.some(customerName => {
                if (customerName === uniformName) return true;
                if (customerName.toLowerCase().includes(uniformName.toLowerCase()) ||
                    uniformName.toLowerCase().includes(customerName.toLowerCase())) return true;
               
                // Try matching by project name
                if (uniform.projectName && 
                    (uniform.projectName === dc.projectName || 
                     uniform.projectName === dc.customer)) return true;
               
                return false;
              });
             
              if (isMatchingEmployee) {
                const employeeInfo = {
                  employeeId: uniform.employeeId || `EMP${String(employeeData.length + 1).padStart(3, '0')}`,
                  fullName: uniform.fullName || "Unknown Employee",
                  designation: uniform.designation || "Employee",
                  uniformType: uniform.uniformType || [],
                  size: uniform.size || {},
                  projectName: uniform.projectName || dc.projectName || dc.customer
                };
               
                if (!employeeData.find(emp => emp.employeeId === employeeInfo.employeeId)) {
                  employeeData.push(employeeInfo);
                  console.log(`Added employee from legacy API: ${employeeInfo.employeeId} - ${employeeInfo.fullName}`);
                }
              }
            }
          });
        }
      }
    } catch (error) {
      console.error("Error fetching employee data from uniforms API:", error);
    }
   
    // If still no employee data found, create basic employee entries from DC customer names
    if (employeeData.length === 0) {
      console.log("No employee data found from API, creating basic entries from DC customer names");
      const customerNames = dc.customer.split(',').map(name => name.trim());
      customerNames.forEach((customerName, index) => {
        // Using push() to modify employeeData array
        employeeData.push({
          employeeId: `EMP${String(index + 1).padStart(3, '0')}`,
          fullName: customerName,
          designation: "Employee",
          uniformType: [],
          size: {},
          projectName: dc.projectName || dc.customer
        });
      });
    }
   
    console.log("Final employee data for PDF:", employeeData);
   
    // Get all unique uniform types from employee data and DC items
    const allUniformTypes = new Set<string>();
    
    // Add uniform types from employee data
    employeeData.forEach(emp => {
      if (emp.uniformType && Array.isArray(emp.uniformType)) {
        emp.uniformType.forEach(type => {
          if (type && typeof type === 'string' && type.trim()) {
            allUniformTypes.add(type.trim());
          }
        });
      }
    });
    
    // Add uniform types from DC items as fallback
    dc.items.forEach(item => {
      if (item.name && typeof item.name === 'string' && item.name.trim()) {
        allUniformTypes.add(item.name.trim());
      }
    });
   
    // If no uniform types found, use a default
    if (allUniformTypes.size === 0) {
      allUniformTypes.add("Uniform");
    }
   
    const uniformTypesArray = Array.from(allUniformTypes);
    console.log("Uniform types for PDF:", uniformTypesArray);
   
    // Create table headers with uniform types
    const tableHeaders = ["Sl No", "Emp ID", "Names", "DESIGNATION", "No of Set", ...uniformTypesArray, "Amount", "Emp Sign"];
   
    // Create table body using employee data
    const tableBody: (string | number)[][] = [];
   
    employeeData.forEach((employee, index) => {
      // Check if employee has accessories to determine "No of Set"
      const hasAccessories = employee.uniformType?.some((type: string) =>
        (type && type.toLowerCase().includes('accessories')) ||
        (type && type.toLowerCase().includes('accessory'))
      );
      const noOfSet = hasAccessories ? "Full set" : "1";
     
      // Create row with sizes for each uniform type
      const row = [
        index + 1, // Sl No
        employee.employeeId, // Use actual employee ID
        employee.fullName,   // Use actual full name
        employee.designation, // Use actual designation
        noOfSet,
        // Add size values for each uniform type
        ...uniformTypesArray.map((uniformType: string) => {
          // Check if this employee has this uniform type
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
    setToast(`DC ${dc.dcNumber} PDF generated successfully!`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setToast("Error generating PDF. Please try again.");
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
    setToast("All DCs Summary PDF generated successfully!");
    } catch (error) {
      console.error("Error generating All DCs PDF:", error);
      setToast("Error generating PDF. Please try again.");
    } finally {
      setAllPdfLoading(false);
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
            <div className="flex justify-end mb-4">
              <button
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-base font-semibold shadow-lg transition-all duration-300 border-2 transform hover:scale-105 active:scale-95 ${theme === "dark" ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white border-blue-500 hover:from-blue-700 hover:to-blue-900 hover:shadow-blue-500/25" : "bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-400 hover:from-blue-600 hover:to-blue-800 hover:shadow-blue-500/25"}`}
                onClick={handleDownloadAllDCs}
                disabled={allPdfLoading}
              >
                {allPdfLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <FaBoxOpen className="w-5 h-5" />
                    Download All DCs Summary
                  </>
                )}
              </button>
            </div>
            {/* Search and Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-2 items-start md:items-center">
              <div className="relative w-full md:w-1/2">
                <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search by DC number, project name, or customer..."
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
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>{getProjectName(dc)}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>{dc.status}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md ${theme === "dark" ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/25" : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 hover:from-blue-600 hover:to-blue-800 hover:shadow-blue-500/25"}`}
                                onClick={() => setSelectedDC(dc)}
                              >
                                 View
                              </button>
                              <button
                                className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md ${theme === "dark" ? "bg-gradient-to-r from-green-600 to-green-700 text-white border-green-500 hover:from-green-700 hover:to-green-800 hover:shadow-green-500/25" : "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/25"}`}
                                onClick={() => handleDownloadDC(dc)}
                                disabled={pdfLoading === dc.dcNumber}
                              >
                                {pdfLoading === dc.dcNumber ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                    Generating...
                                  </>
                                ) : (
                                  " Download DC"
                                )}
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
                    {/* DC Summary */}
                    <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-950 border-green-800" : "bg-green-50 border-green-200"}`}>
                      <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-green-200" : "text-green-800"}`}>DC Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <span className="font-semibold text-sm">DC Number:</span>
                          <div className="text-lg font-bold">{selectedDC.dcNumber}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Date:</span>
                          <div className="text-lg">{selectedDC.dcDate ? selectedDC.dcDate.split('T')[0] : ''}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Project:</span>
                          <div className="text-lg">{getProjectName(selectedDC)}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Total Employees:</span>
                          <div className="text-lg">{selectedDC.customer.split(',').length}</div>
                        </div>
                      </div>
                    </div>

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



                    {/* Employee Details */}
                    <div>
                      <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>Employee Details</h3>
                      <div className="space-y-4">
                        {/* Parse customer names and display employee information */}
                        {selectedDC.customer.split(',').map((customerName, i) => {
                          const trimmedName = customerName.trim();
                          const employeeId = `EMP${String(i + 1).padStart(3, '0')}`;
                         
                          return (
                            <div key={i} className={`rounded-lg p-4 border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className={`font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                                  Employee {i + 1}: {trimmedName}
                                </h4>
                                <span className={`px-2 py-1 rounded text-xs ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                                  ID: {employeeId}
                                </span>
                              </div>
                             
                              {/* Employee Information */}
                              <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                                <div className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Employee Information:</div>
                               
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-4">
                                  <div><b>Employee ID:</b> {(() => {
                                    // Try to get employee ID from uniform request data
                                    const employeeUniformRequest = uniformReq;
                                    return employeeUniformRequest?.employeeId || employeeId;
                                  })()}</div>
                                  <div><b>Full Name:</b> {trimmedName}</div>
                                  <div><b>Designation:</b> {(() => {
                                    // Try to get designation from uniform request data
                                    const employeeUniformRequest = uniformReq;
                                    return employeeUniformRequest?.designation || 'Employee';
                                  })()}</div>
                                  <div><b>Project:</b> {getProjectName(selectedDC)}</div>
                                </div>

                                {/* Uniform Items for this Employee */}
                                <div className="mt-4">
                                  <div className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Uniform Items:</div>
                                  <div className="space-y-2">
                                    {/* Get uniform request data for this specific employee */}
                                    {(() => {
                                      // Try to find uniform request data for this employee
                                      const employeeUniformRequest = uniformReq;
                                      if (employeeUniformRequest && employeeUniformRequest.uniformType && employeeUniformRequest.size) {
                                        // Display uniform items from the uniform request data
                                        return employeeUniformRequest.uniformType.map((uniformType: string, typeIndex: number) => {
                                          const size = employeeUniformRequest.size[uniformType] || 'N/A';
                                         
                                          return (
                                            <div key={typeIndex} className={`p-3 rounded border ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"}`}>
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                <div><b>Item:</b> {uniformType.trim()}</div>
                                                <div><b>Size:</b> {size}</div>
                                                <div><b>Dispatched Size:</b> {size}</div>
                                              </div>
                                              {employeeUniformRequest.remarks && (
                                                <div className="mt-2 text-xs text-gray-600">
                                                  <b>Note:</b> {employeeUniformRequest.remarks}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        });
                                      } else {
                                        // Fallback to DC items if no uniform request data
                                        return selectedDC.items.map((item, itemIndex) => (
                                          <div key={itemIndex} className={`p-3 rounded border ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"}`}>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                              <div><b>Item:</b> {item.name || 'N/A'}</div>
                                              <div><b>Size:</b> {item.size || 'N/A'}</div>
                                              <div><b>Dispatched Size:</b> {item.size || 'N/A'}</div>
                                            </div>
                                            {item.remarks && (
                                              <div className="mt-2 text-xs text-gray-600">
                                                <b>Note:</b> {item.remarks}
                                              </div>
                                            )}
                                          </div>
                                        ));
                                      }
                                    })()}
                                  </div>
                                </div>


                              </div>
                            </div>
                          );
                        })}
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
    </>
  );
}