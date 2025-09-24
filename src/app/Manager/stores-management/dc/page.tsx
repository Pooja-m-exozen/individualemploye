"use client";
import React, { useState, useEffect, useCallback } from "react";
import ManagerDashboardLayout  from "@/components/dashboard/ManagerDashboardLayout";
import CreateDCModal from "@/components/dashboard/CreateDCmodal";
import { FaSearch } from "react-icons/fa";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [dcData, setDcData] = useState<DC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDC, setSelectedDC] = useState<DC | null>(null);
  // Removed unused uniformReq state
  const [employeeDetails, setEmployeeDetails] = useState<Record<string, {fullName: string, designation: string}>>({});
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
       
        // Removed uniform request fetching as it's no longer needed
      } else {
        setEmployeeDetails({});
      }
    }
    fetchEmployeeData();
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
        items: DCItem[];
        totalSetCount: number; // Add total set count for this employee
      }> = [];
      
      // Group DC items by employeeId - ONLY employees in this specific DC
      // Keep all items separate to handle multiple items with same type but different sizes
      const employeeGroups = dc.items.reduce((groups: Record<string, DCItem[]>, item) => {
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
        
        employeeData.push({
          employeeId: employeeId,
          fullName: kycDetails?.fullName || 'Employee Not Found',
          designation: kycDetails?.designation || 'Employee',
          uniformType: uniformTypes,
          size: sizeMap,
          projectName: dc.projectName || dc.customer,
          items: items,
          totalSetCount: totalSetCount
        });
        
        console.log(`Added employee to PDF: ${employeeId} - ${kycDetails?.fullName || 'Not Found'} (${kycDetails?.designation || 'Employee'})`);
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
            item.uniformType.forEach(type => {
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
          employee.employeeId, // Use actual employee ID from DC
          employee.fullName,   // Use actual full name from KYC
          employee.designation, // Use actual designation from KYC
          noOfSet,
          // Add size values for each uniform type
          ...uniformTypesArray.map((uniformType: string) => {
            // Check if this employee has this uniform type in their items
            const matchingItem = employee.items.find((item: DCItem) => {
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
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search DC number, project name, or customer..."
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
            onClick={() => setShowCreate(true)}
          >
            Create DC
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

          {/* Table - Excel-like compact grid full screen */}
          <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
            <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
              {loading ? (
                <div className="py-12 text-center text-lg font-semibold">Loading DC records...</div>
              ) : error ? (
                <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
              ) : (
                <>
                <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                  <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                    <tr>
                      <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                      <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>DC Number</th>
                      <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                      <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project Name</th>
                      <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Customer</th>
                      <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                      <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                    </tr>
                    {/* Inline header filters */}
                    <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                      <th className={`px-2 py-1 sticky left-0 z-20 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                      <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                          placeholder="Filter DC#" 
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                        />
                      </th>
                      <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                      <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <input 
                          value={search} 
                          onChange={e => setSearch(e.target.value)} 
                          placeholder="Filter Project" 
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                        />
                      </th>
                      <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <input 
                          value={search} 
                          onChange={e => setSearch(e.target.value)} 
                          placeholder="Filter Customer" 
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                        />
                      </th>
                      <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        >
                          <option value="">All</option>
                          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                      </th>
                      <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    </tr>
                  </thead>
                  <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                    {filteredDC.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No DC records found</td>
                      </tr>
                    ) : filteredDC.map((dc, idx) => (
                      <tr key={idx} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                        <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                        <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{dc.dcNumber}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{dc.dcDate ? dc.dcDate.split('T')[0] : ''}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={getProjectName(dc)}>{getProjectName(dc)}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}><div className="truncate" title={dc.customer}>{dc.customer}</div></td>
                        <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                            dc.status === 'Issued' 
                              ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              : theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {dc.status || "N/A"}
                          </span>
                        </td>
                        <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <div className="flex gap-1">
                              <button
                                onClick={() => setSelectedDC(dc)}
                              title="View Details"
                              className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                  : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                              }`}
                              >
                                 View
                              </button>
                              <button
                                onClick={() => handleDownloadDC(dc)}
                                disabled={pdfLoading === dc.dcNumber}
                              title="Download PDF"
                              className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'border-green-500 text-green-400 bg-gray-800 hover:bg-gray-700 focus:ring-green-400' 
                                  : 'border-green-500 text-green-600 bg-white hover:bg-green-50 focus:ring-green-400'
                              }`}
                              >
                                {pdfLoading === dc.dcNumber ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                ) : (
                                "PDF"
                                )}
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
          </div>
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
          />
        </div>
      )}
      
      {/* DC Details Modal */}
      {selectedDC && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold" onClick={() => setSelectedDC(null)}>&times;</button>
              <h2 className="text-2xl font-bold mb-4 text-center">Delivery Challan Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><b>DC Number:</b> {selectedDC?.dcNumber}</div>
                  <div><b>Date:</b> {selectedDC?.dcDate ? selectedDC?.dcDate.split('T')[0] : ''}</div>
                  <div><b>Project:</b> {selectedDC ? getProjectName(selectedDC!) : 'N/A'}</div>
                  <div><b>Status:</b> Issued</div>
                  <div><b>Customer:</b> {selectedDC?.customer}</div>
                  <div><b>Total Items:</b> {selectedDC?.items.length}</div>
                </div>

                {/* Employee Details */}
                <div>
                  <h3 className="font-semibold mb-3">Employee Details</h3>
                  <div className="space-y-3">
                    {(() => {
                      // Group DC items by employeeId
                      const employeeGroups = selectedDC?.items.reduce((groups: Record<string, DCItem[]>, item) => {
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
                              <b>Items:</b> {items.map(item => `${item.name || item.uniformType} (Size: ${item.size}, Qty: ${item.quantity})`).join(', ')}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

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
    </>
  );
}