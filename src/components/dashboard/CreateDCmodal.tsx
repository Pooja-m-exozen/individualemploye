"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FaStore, FaCheckCircle, FaInfoCircle, FaTimes, FaPlus, FaExclamationTriangle, FaBoxOpen } from "react-icons/fa";
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
  uniformType?: string[];
  projectName?: string;
  approvalStatus?: string;
  requestDate?: string;
  individualEmployeeData?: {
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
  projectName?: string;
  dcNumber: string;
  dcDate: string;
  remarks: string;
  items: DCItem[];
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
}

export default function CreateDCModal({ onClose, theme, setDcData, dcData, refreshDCData }: CreateDCModalProps) {
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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, Record<string, string>>>({}); // { [requestId]: { [type]: size } }

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
  const stepIcons = [
    <FaStore key="store" className="w-5 h-5" />, 
    <FaCheckCircle key="check" className="w-5 h-5" />, 
    <FaInfoCircle key="info" className="w-5 h-5" />
  ];

  // Step validation
  const isStep1Valid = selectedProject !== '';
  const isStep2Valid = selectedRequests.length > 0;
  
  // Check if all sizes are selected for step 3
  const allSizesSelected = selectedRequests.every(req => {
    if (!Array.isArray(req.uniformType)) return true;
    return req.uniformType.every(type => {
      const inventoryItem = findInventoryItemByType(type);
      if (!inventoryItem) return true; // Skip if no inventory match
      const selected = selectedSizes[req._id]?.[type] || (req.size && req.size[type]) || '';
      return selected !== '';
    });
  });
  
  const isStep3Valid = customer.trim() && dcNumber.trim() && dcDate.trim() && allSizesSelected;

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
          const selectedSize = selectedSizes[selectedRequest._id]?.[type] || originalSize;
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
            remarks: selectedRequest.remarks || (isModified ? `Size modified: ${originalSize} → ${selectedSize}` : "")
          };
        });
      });

      // Create payload with modified sizes properly stored
      const payload = {
        customer: selectedProject || "General", // Use project name as customer instead of employee names
        dcNumber,
        dcDate,
        remarks,
        address,
        items: items.map(item => ({
          id: item.id,
          employeeId: item.employeeId,
          itemCode: item.itemCode,
          name: item.name,
          size: item.size, // This will be the modified size
          quantity: item.quantity,
          price: item.price,
          remarks: item.remarks,
          // Store modification info in remarks if size was modified
          ...(item.sizeData && JSON.parse(item.sizeData).modified && {
            remarks: `${item.remarks || ''} [Modified from ${JSON.parse(item.sizeData).original} to ${item.size}]`
          })
        }))
      };

      // Log the payload for debugging
      console.log('DC Payload being sent:', payload);
      console.log('Selected Project:', selectedProject);
      console.log('Customer field:', payload.customer);
      console.log('Address field:', payload.address);

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

      // First, create the DC
      const res = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
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
        setSaveDCError(null);
        onClose();
      } else {
        setSaveDCError(data.message || 'Failed to save Outward DC');
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
  const getSizeChangeSummary = () => {
    const changes: Array<{
      employeeName: string;
      type: string;
      originalSize: string;
      newSize: string;
    }> = [];
    
    selectedRequests.forEach(req => {
      if (!Array.isArray(req.uniformType)) return;
      
      req.uniformType.forEach(type => {
        const originalSize = req.size && req.size[type] ? req.size[type] : '';
        const selected = selectedSizes[req._id]?.[type] || originalSize;
        
        if (selected !== originalSize && originalSize !== '') {
          changes.push({
            employeeName: req.fullName,
            type,
            originalSize,
            newSize: selected
          });
        }
      });
    });
    
    return changes;
  };

  // Wrap stepLabels in useMemo
  const stepLabels = React.useMemo(() => ["Project", "Uniform Request", "DC Details"], []);

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
      showToast({ 
        message: "Delivery Challan created successfully!", 
        type: "success" 
      });
    }
  };

  // Auto-generate DC number
  function handleAutoGenerateDCNumber() {
    const random = Math.floor(100000 + Math.random() * 900000);
    setDcNumber(`DC${random}`);
    setDcNumberError(null);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md transition-all duration-500 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-modal="true"
      role="dialog"
      aria-label="Create Delivery Challan Modal"
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
                  <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Generate Delivery Challan</h2>
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
        
        {/* Enhanced Stepper and Progress Bar */}
        <div className="flex flex-col gap-3 px-6 pt-6 pb-3">
          <div className="flex justify-center items-center gap-2">
            {stepLabels.map((label, idx) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center group">
                  <div className={`relative w-14 h-14 flex items-center justify-center rounded-full font-bold border-2 mb-2 transition-all duration-300 transform group-hover:scale-110
                    ${step === idx + 1
                      ? theme === "dark"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-400 shadow-lg shadow-blue-500/25"
                        : "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-blue-400 shadow-lg shadow-blue-500/25"
                      : step > idx + 1
                        ? theme === "dark"
                          ? "bg-green-600 text-white border-green-400 shadow-lg"
                          : "bg-green-500 text-white border-green-400 shadow-lg"
                        : theme === "dark"
                          ? "bg-gray-800 text-gray-400 border-gray-700"
                          : "bg-gray-200 text-gray-500 border-gray-300"
                    }`}>
                    {stepIcons[idx]}
                    {step > idx + 1 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <FaCheckCircle className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <span className={`text-sm font-semibold transition-all duration-200 ${step === idx + 1
                    ? theme === "dark" ? "text-blue-300" : "text-blue-700"
                    : step > idx + 1
                      ? theme === "dark" ? "text-green-300" : "text-green-600"
                      : theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {label}
                  </span>
                  <span className={`text-xs mt-1 ${step === idx + 1
                    ? theme === "dark" ? "text-blue-400" : "text-blue-600"
                    : theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`}>
                    Step {idx + 1}
                  </span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className={`w-20 h-1 mx-4 rounded-full transition-all duration-500
                    ${step > idx + 1
                      ? theme === "dark" ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-green-400 to-green-500"
                      : theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                    }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
            <div
              className={`h-3 rounded-full transition-all duration-700 bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          
          {/* Step Indicator */}
          <div className="text-center">
            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Step {step} of {stepLabels.length}
            </span>
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
              {/* Step 1: Project Selection */}
              {step === 1 && (
                <section className={`rounded-2xl border-2 shadow-2xl p-6 md:p-8 transition-all duration-500 transform hover:scale-[1.02] flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#232e3e] via-blue-950 to-blue-900 border-blue-900/50" : "bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-200"}`}
                  aria-labelledby="step1-header">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-2xl ${theme === "dark" ? "bg-blue-900/50" : "bg-blue-100"}`}>
                      <FaStore className={`w-6 h-6 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`} />
                    </div>
                    <div>
                      <h2 id="step1-header" className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-blue-900"}`}>Project Selection</h2>
                      <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Choose the project for your delivery challan</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block mb-3 font-semibold text-lg ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                        Select Project <span className="text-red-500">*</span>
                      </label>
                      <p className={`text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Only projects with specific names (not &quot;General&quot; or generic names) are shown.
                      </p>
                      <div className="relative">
                        <select
                          value={selectedProject}
                          onChange={e => {
                            setSelectedProject(e.target.value);
                            setSelectedRequests([]);
                            setTouched(t => ({ ...t, selectedProject: true }));
                          }}
                          className={`w-full p-4 border-2 rounded-xl focus:ring-4 transition-all duration-300 text-base font-medium appearance-none
                            ${theme === "dark"
                              ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900/50 focus:border-blue-500"
                              : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50 focus:border-blue-500"
                            }`}
                          aria-required="true"
                        >
                          <option value="">Choose a project from the list</option>
                          {projectList.length > 0 ? (
                            projectList.map(project => (
                              <option key={project} value={project}>{project}</option>
                            ))
                          ) : (
                            <option value="" disabled>No valid projects available</option>
                          )}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <div className={`w-5 h-5 border-2 border-r-0 border-b-0 transform rotate-45 ${theme === "dark" ? "border-gray-400" : "border-gray-500"}`}></div>
                        </div>
                      </div>
                      {touched.selectedProject && !isStep1Valid && (
                        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 dark:text-red-400 text-sm">Please select a project to continue.</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Project Selection Summary */}
                    {selectedProject && (
                      <div className={`p-4 rounded-2xl ${theme === "dark" ? "bg-green-900/20" : "bg-green-50"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-800" : "bg-green-100"}`}>
                            <FaCheckCircle className={`w-5 h-5 ${theme === "dark" ? "text-green-300" : "text-green-600"}`} />
                          </div>
                          <div>
                            <h4 className={`font-semibold ${theme === "dark" ? "text-green-200" : "text-green-800"}`}>Project Selected</h4>
                            <p className={`text-sm ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>
                              <strong>Project:</strong> {selectedProject}<br/>
                              <strong>Note:</strong> This project name will be used as the customer name in the generated DC.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className={`p-4 rounded-2xl ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-800" : "bg-blue-100"}`}>
                          <FaInfoCircle className={`w-5 h-5 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>How it works</h4>
                          <p className={`text-sm ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                            Select a project to view all approved uniform requests for that project. 
                            You&apos;ll be able to choose which employees to include in your delivery challan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-8">
                    <button
                      type="button"
                      disabled={!isStep1Valid}
                      onClick={() => setStep(2)}
                      className={`px-8 py-3 rounded-xl font-semibold text-base transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4
                        ${isStep1Valid
                          ? theme === "dark" 
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25" 
                            : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/25"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                      Continue to Employee Selection →
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
              {/* Step 3: DC Details & Preview */}
              {step === 3 && (
                <section className={`rounded-2xl border shadow-lg p-6 md:p-10 transition-colors duration-300 flex flex-col gap-4
                  ${theme === "dark" ? "bg-gradient-to-br from-[#232e3e] via-indigo-950 to-indigo-900 border-indigo-900" : "bg-gradient-to-br from-indigo-50 via-white to-indigo-100 border-indigo-100"}`}
                  aria-labelledby="step3-header">
                  <div className="flex items-center gap-2 mb-2">
                    <FaInfoCircle className={`w-5 h-5 ${theme === "dark" ? "text-indigo-200" : "text-indigo-700"}`} />
                    <span id="step3-header" className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-indigo-900"}`}>DC Details</span>
                  </div>
                  {/* Simplified Employee Size Selection */}
                  {selectedRequests.length > 0 && (
                    <div className={`md:col-span-2 p-6 rounded-xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-sm`}>
                      <div className={`font-semibold text-lg mb-6 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
                        📋 Size Selection ({selectedRequests.length} employees)
                      </div>
                      <div className="space-y-6">
                        {selectedRequests.map((req) => (
                          <div key={req._id} className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <div className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-gray-800"}`}>{req.fullName}</div>
                                <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>ID: {req.employeeId} • {req.designation}</div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${theme === "dark" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>
                                Qty: {req.qty}
                              </div>
                            </div>
                            
                            {/* Enhanced Uniform Type Dropdowns with Original Size Display */}
                            {Array.isArray(req.uniformType) && req.uniformType.map(type => {
                              const inventoryItem = findInventoryItemByType(type);
                              const originalSize = req.size && req.size[type] ? req.size[type] : '';
                              const selected = selectedSizes[req._id]?.[type] || originalSize;
                              const selectedSizeInventory = inventoryItem?.sizeInventory.find(si => si.size === selected);
                              const hasChanged = selected !== originalSize && originalSize !== '';
                              
                              return (
                                <div key={type} className="mb-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <label className={`block text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
                                      {type}
                                    </label>
                                    <div className="flex items-center gap-2">
                                      {inventoryItem && (
                                        <span className="text-xs text-green-600 font-medium">✓ Available</span>
                                      )}
                                      {hasChanged && (
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${theme === "dark" ? "bg-yellow-600 text-yellow-100" : "bg-yellow-100 text-yellow-700"}`}>
                                          Modified
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Original Size Display */}
                                  {originalSize && (
                                    <div className={`mb-3 p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                            Original Request Size:
                                          </span>
                                          <div className={`text-sm font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                            {originalSize}
                                          </div>
                                        </div>
                                        {hasChanged && (
                                          <div className={`text-xs px-2 py-1 rounded-full ${theme === "dark" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>
                                            Changed
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {inventoryItem ? (
                                    <div className="space-y-3">
                                      {/* Enhanced Size Dropdown */}
                                      <div>
                                        <label className={`block text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                          {hasChanged ? "New Size Selection:" : "Select Size:"}
                                        </label>
                                        <select
                                          value={selected}
                                          onChange={e => handleSizeChange(req._id, type, e.target.value)}
                                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm
                                            ${hasChanged 
                                              ? theme === "dark"
                                                ? "bg-yellow-900/20 border-yellow-600 text-yellow-100 focus:border-yellow-500"
                                                : "bg-yellow-50 border-yellow-300 text-yellow-800 focus:border-yellow-500"
                                              : theme === "dark"
                                                ? "bg-gray-600 border-gray-500 text-white focus:border-blue-400"
                                                : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                                            }`}
                                        >
                                          <option value="">Select size for {type}</option>
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
                                                {size} {isOriginalSize ? "(Original)" : ""} {isOutOfStock ? "(Out of stock)" : `(${availableQty} available)`}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </div>
                                      
                                      {/* Enhanced Selected Size Indicator */}
                                      {selected && selectedSizeInventory && (
                                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${hasChanged 
                                          ? theme === "dark" ? "bg-yellow-900/20 border-yellow-700" : "bg-yellow-50 border-yellow-200"
                                          : theme === "dark" ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200"
                                        }`}>
                                          <div className={`w-3 h-3 rounded-full ${hasChanged ? "bg-yellow-500" : "bg-green-500"}`}></div>
                                          <div className="flex-1">
                                            <div className={`text-sm font-medium ${hasChanged 
                                              ? theme === "dark" ? "text-yellow-300" : "text-yellow-700"
                                              : theme === "dark" ? "text-green-300" : "text-green-700"
                                            }`}>
                                              {hasChanged ? "New Selection:" : "Selected:"} {selected}
                                            </div>
                                            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                              {selectedSizeInventory.quantity} available in stock
                                            </div>
                                          </div>
                                          {hasChanged && (
                                            <div className={`text-xs px-2 py-1 rounded-full ${theme === "dark" ? "bg-yellow-600 text-yellow-100" : "bg-yellow-100 text-yellow-700"}`}>
                                              Modified
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Change Summary */}
                                      {hasChanged && (
                                        <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-blue-900/20 border-blue-700" : "bg-blue-50 border-blue-200"}`}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className={`text-xs font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                                              Size Change Summary
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 text-sm">
                                            <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                              {originalSize}
                                            </span>
                                            <div className={`w-8 h-px ${theme === "dark" ? "bg-gray-600" : "bg-gray-300"}`}></div>
                                            <span className={`font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                                              {selected}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200"}`}>
                                      <div className={`text-sm ${theme === "dark" ? "text-red-300" : "text-red-600"}`}>
                                        ⚠️ No inventory match for &quot;{type}&quot;
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Selection Summary with Size Changes */}
                  {selectedRequests.length > 0 && (
                    <div className={`md:col-span-2 p-4 rounded-lg border ${theme === "dark" ? "bg-blue-900/20 border-blue-700" : "bg-blue-50 border-blue-200"}`}>
                      <div className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                        ✅ Selection Progress
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedRequests.map((req) => {
                          const selectedSizesForReq = selectedSizes[req._id] || {};
                          const totalTypes = Array.isArray(req.uniformType) ? req.uniformType.length : 0;
                          const selectedCount = Object.keys(selectedSizesForReq).length;
                          const isComplete = selectedCount === totalTypes;
                          
                          // Count size changes for this employee
                          const sizeChanges = Array.isArray(req.uniformType) ? req.uniformType.filter(type => {
                            const originalSize = req.size && req.size[type] ? req.size[type] : '';
                            const selected = selectedSizesForReq[type] || originalSize;
                            return selected !== originalSize && originalSize !== '';
                          }).length : 0;
                          
                          return (
                            <div key={req._id} className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-700"}`}>{req.fullName}</div>
                                <div className="flex gap-2">
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isComplete 
                                      ? theme === "dark" ? "bg-green-600 text-white" : "bg-green-100 text-green-700"
                                      : theme === "dark" ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {selectedCount}/{totalTypes} selected
                                  </div>
                                  {sizeChanges > 0 && (
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${theme === "dark" ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-700"}`}>
                                      {sizeChanges} changed
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isComplete && (
                                <div className={`text-xs ${theme === "dark" ? "text-green-300" : "text-green-600"}`}>
                                  ✓ All sizes selected
                                </div>
                              )}
                              {sizeChanges > 0 && (
                                <div className={`text-xs mt-1 ${theme === "dark" ? "text-orange-300" : "text-orange-600"}`}>
                                  ⚠️ {sizeChanges} size(s) modified from original request
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Size Changes Summary */}
                  {(() => {
                    const sizeChanges = getSizeChangeSummary();
                    if (sizeChanges.length > 0) {
                      return (
                        <div className={`md:col-span-2 p-4 rounded-lg border ${theme === "dark" ? "bg-orange-900/20 border-orange-700" : "bg-orange-50 border-orange-200"}`}>
                          <div className={`font-semibold mb-3 flex items-center gap-2 ${theme === "dark" ? "text-orange-200" : "text-orange-800"}`}>
                            <FaExclamationTriangle className="w-4 h-4" />
                            Size Changes Summary ({sizeChanges.length} changes)
                          </div>
                          <div className="space-y-2">
                            {sizeChanges.map((change, index) => (
                              <div key={index} className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
                                    {change.employeeName}
                                  </div>
                                  <div className={`text-xs px-2 py-1 rounded-full ${theme === "dark" ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-700"}`}>
                                    {change.type}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                    {change.originalSize}
                                  </span>
                                  <div className={`w-6 h-px ${theme === "dark" ? "bg-gray-600" : "bg-gray-300"}`}></div>
                                  <span className={`font-semibold ${theme === "dark" ? "text-orange-300" : "text-orange-700"}`}>
                                    {change.newSize}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className={`mt-3 p-3 rounded-lg ${theme === "dark" ? "bg-orange-900/30" : "bg-orange-100"}`}>
                            <div className={`text-xs ${theme === "dark" ? "text-orange-200" : "text-orange-700"}`}>
                              <strong>Note:</strong> These changes will be reflected in the generated PDF. 
                              The original request sizes have been modified based on your selections.
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                        Customer <span className="text-red-500">*</span>
                        <span className="ml-1 text-xs text-gray-400" title="Name of the person or entity receiving the delivery.">(?)</span>
                      </label>
                      <input type="text" value={customer} onChange={e => { setCustomer(e.target.value); setTouched(t => ({ ...t, customer: true })); }}
                        className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
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
                      {/* <div className="text-xs text-gray-500 mt-1">Any additional notes for this DC (optional).</div> */}
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block mb-1 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Address</label>
                      <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                        className={`w-full p-4 border rounded-lg focus:ring-2 transition-all duration-200
                          ${theme === "dark"
                            ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                            : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                         }`} />
                      {/* <div className="text-xs text-gray-500 mt-1">Delivery address (optional).</div> */}
                    </div>
                  </div>
                  {!allSizesSelected && selectedRequests.length > 0 && (
                    <div className={`p-4 rounded-lg border flex items-center gap-2 mt-6
                      ${theme === "dark" ? "bg-yellow-900 border-yellow-700 text-yellow-200" : "bg-yellow-100 border-yellow-200 text-yellow-700"}`}>
                      <FaExclamationTriangle className="w-4 h-4" />
                      Please select sizes for all uniform types before creating the DC.
                    </div>
                  )}
                  
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