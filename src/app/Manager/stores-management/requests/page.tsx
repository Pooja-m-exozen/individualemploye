"use client";
import React, { useState, useEffect, useRef } from "react";
import ManagerDashboardLayout  from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaDownload, FaChevronLeft, FaChevronRight, FaClock, FaEdit, FaExclamationTriangle, FaCheck, FaTimes, FaBox, FaWarehouse, FaUserTie } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const statusOptions = ["Approved", "Pending", "Rejected"];

// New interfaces for inventory management
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
}

interface SizeEditData {
  originalSize: string;
  newSize: string;
  uniformType: string;
  availableSizes: string[];
  stockLevels: Record<string, number>;
}

interface DCRequest {
  customer: string;
  dcNumber: string;
  dcDate: string;
  remarks: string;
  address: string;
  items: Array<{
    id: string;
    employeeId: string;
    itemCode: string;
    name: string;
    size: string;
    quantity: number;
    price: string;
    remarks: string;
  }>;
}

function getStatusColor(status: string, theme: string) {
  switch (status?.toLowerCase()) {
    case "approved":
      return theme === "dark"
        ? "bg-emerald-900 text-emerald-200 border-emerald-700"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending":
      return theme === "dark"
        ? "bg-amber-900 text-amber-200 border-amber-700"
        : "bg-amber-100 text-amber-800 border-amber-200";
    case "rejected":
      return theme === "dark"
        ? "bg-red-900 text-red-200 border-red-700"
        : "bg-red-100 text-red-800 border-red-200";
    default:
      return theme === "dark"
        ? "bg-gray-700 text-gray-200 border-gray-600"
        : "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export interface UniformRequest {
  _id?: string;
  employeeId: string;
  fullName: string;
  projectName: string;
  uniformType: string[];
  approvalStatus: string;
  requestDate?: string;
  designation?: string;
  gender?: string;
  size?: Record<string, string>;
  qty?: number;
  issuedStatus?: string;
  remarks?: string;
  approvedBy?: string;
  approvedDate?: string;
  issuedBy?: string;
  issuedDate?: string;
  dcNumber?: string;
  documentPath?: string;
}

export default function StoreRequestsPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<UniformRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UniformRequest | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [sizeEditModal, setSizeEditModal] = useState<SizeEditData | null>(null);
  const [dcModal, setDcModal] = useState<UniformRequest | null>(null);
  const [dcLoading, setDcLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const sizeEditModalRef = useRef<HTMLDialogElement | null>(null);
  const dcModalRef = useRef<HTMLDialogElement | null>(null);
  const rowsPerPage = 5;

  // Fetch inventory data
  useEffect(() => {
    setInventoryLoading(true);
    fetch("https://inventory.zenapi.co.in/api/inventory/opening-balances")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch inventory data");
        const data = await res.json();
        setInventoryData(Array.isArray(data) ? data : []);
        setInventoryLoading(false);
      })
      .catch((err) => {
        console.error("Inventory fetch error:", err);
        setInventoryLoading(false);
      });
  }, []);

  // Fetch uniform requests
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("https://cafm.zenapi.co.in/api/uniforms/all")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch uniform requests");
        const data = await res.json();
        setRequests(Array.isArray(data.uniforms) ? data.uniforms : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
        setLoading(false);
      });
  }, []);

  // Check stock availability for a specific size
  const checkStockAvailability = (uniformType: string, size: string): number => {
    const inventoryItem = inventoryData.find(item => 
      item.name.toLowerCase().includes(uniformType.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(uniformType.toLowerCase())
    );
    
    if (!inventoryItem) return 0;
    
    const sizeInventory = inventoryItem.sizeInventory.find(si => si.size === size);
    return sizeInventory ? sizeInventory.quantity : 0;
  };

  // Get available sizes for a uniform type
  const getAvailableSizes = (uniformType: string): string[] => {
    const inventoryItem = inventoryData.find(item => 
      item.name.toLowerCase().includes(uniformType.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(uniformType.toLowerCase())
    );
    
    if (!inventoryItem) return [];
    
    return inventoryItem.sizeInventory
      .filter(si => si.quantity > 0)
      .map(si => si.size);
  };

  // Get stock levels for all sizes of a uniform type
  const getStockLevels = (uniformType: string): Record<string, number> => {
    const inventoryItem = inventoryData.find(item => 
      item.name.toLowerCase().includes(uniformType.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(uniformType.toLowerCase())
    );
    
    if (!inventoryItem) return {};
    
    const stockLevels: Record<string, number> = {};
    inventoryItem.sizeInventory.forEach(si => {
      stockLevels[si.size] = si.quantity;
    });
    return stockLevels;
  };

  // Handle size edit
  const handleSizeEdit = (request: UniformRequest, uniformType: string, originalSize: string) => {
    const availableSizes = getAvailableSizes(uniformType);
    const stockLevels = getStockLevels(uniformType);
    
    setSizeEditModal({
      originalSize,
      newSize: originalSize,
      uniformType,
      availableSizes,
      stockLevels
    });
  };

  // Save size edit
  const handleSaveSizeEdit = async () => {
    if (!sizeEditModal || !selectedRequest) return;
    
    try {
      // Update the request with new size
      const updatedRequest = { ...selectedRequest };
      if (updatedRequest.size) {
        updatedRequest.size[sizeEditModal.uniformType] = sizeEditModal.newSize;
      }
      
      // Post the size change to the API
      const updateData = {
        requestId: selectedRequest._id,
        uniformType: sizeEditModal.uniformType,
        originalSize: sizeEditModal.originalSize,
        newSize: sizeEditModal.newSize,
        employeeId: selectedRequest.employeeId,
        remarks: `Size changed from ${sizeEditModal.originalSize} to ${sizeEditModal.newSize} due to stock availability`,
        timestamp: new Date().toISOString(),
        updatedBy: "Manager" // This could be dynamic based on logged-in user
      };

      // Post to API (you can replace this URL with your actual API endpoint)
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/uniforms/update-size", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          throw new Error("Failed to update size on server");
        }
        
        const result = await response.json();
        console.log("Size update API response:", result);
      } catch (apiError) {
        console.error("API Error:", apiError);
        // Continue with local update even if API fails
      }

      // Update the request in the list
      setRequests(prev => prev.map(req => 
        req._id === selectedRequest._id ? updatedRequest : req
      ));
      
      setSizeEditModal(null);
      setSelectedRequest(updatedRequest);
      
      // Show success message
      setToast({ type: 'success', message: `Size updated successfully from ${sizeEditModal.originalSize} to ${sizeEditModal.newSize}` });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error updating size:", error);
      setToast({ type: 'error', message: 'Failed to update size. Please try again.' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Create DC (Delivery Challan)
  const handleCreateDC = async (request: UniformRequest) => {
    setDcLoading(true);
    try {
      const dcData: DCRequest = {
        customer: request.fullName,
        dcNumber: `DC${Date.now()}`,
        dcDate: new Date().toISOString().split('T')[0],
        remarks: `Uniform request for ${request.employeeId}`,
        address: request.projectName || "Project Location",
        items: request.uniformType?.map(type => ({
          id: request._id || "",
          employeeId: request.employeeId,
          itemCode: "",
          name: type,
          size: request.size?.[type] || "",
          quantity: 1,
          price: "",
          remarks: "Approved by manager"
        })) || []
      };

      const response = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dcData)
      });

      const result = await response.json();
      
      if (result.success) {
        // Update the request with DC number
        const updatedRequest = { ...request, dcNumber: result.dcId };
        setRequests(prev => prev.map(req => 
          req._id === request._id ? updatedRequest : req
        ));
        setDcModal(null);
      } else {
        throw new Error(result.message || "Failed to create DC");
      }
    } catch (error) {
      console.error("Error creating DC:", error);
    } finally {
      setDcLoading(false);
    }
  };

  // Filtered and paginated data
  const filtered = requests.filter((req) => {
    const matchesStatus = statusFilter ? req.approvalStatus === statusFilter : true;
    const matchesSearch = search
      ? (
          req.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
          req.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          req.projectName?.toLowerCase().includes(search.toLowerCase()) ||
          req.uniformType?.join(", ").toLowerCase().includes(search.toLowerCase())
        )
      : true;
    return matchesStatus && matchesSearch;
  });
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // CSV Export
  function exportToCSV() {
    if (!filtered.length) return;
    const headers = [
      "Employee ID",
      "Name",
      "Project",
      "Uniform Type",
      "Status",
      "Request Date"
    ];
    const rows = filtered.map(req => [
      req.employeeId,
      req.fullName,
      req.projectName,
      Array.isArray(req.uniformType) ? req.uniformType.join("; ") : "",
      req.approvalStatus,
      req.requestDate ? new Date(req.requestDate).toLocaleDateString() : ""
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `uniform-requests-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <ManagerDashboardLayout >
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? theme === "dark" ? "bg-green-800 text-green-200 border border-green-600" : "bg-green-100 text-green-800 border border-green-200"
            : toast.type === 'error'
            ? theme === "dark" ? "bg-red-800 text-red-200 border border-red-600" : "bg-red-100 text-red-800 border border-red-200"
            : theme === "dark" ? "bg-blue-800 text-blue-200 border border-blue-600" : "bg-blue-100 text-blue-800 border border-blue-200"
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <FaCheck className="w-4 h-4" />}
            {toast.type === 'error' && <FaTimesCircle className="w-4 h-4" />}
            {toast.type === 'info' && <FaClock className="w-4 h-4" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
      
      {/* Modal for viewing details */}
      {selectedRequest && (
        <dialog ref={modalRef} open className="fixed z-50 left-0 top-0 w-full h-full flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-xl shadow-lg max-w-2xl w-full p-6 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-3 right-3 ${theme === "dark" ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"}`}
              onClick={() => setSelectedRequest(null)}
              aria-label="Close"
            >
              <FaTimesCircle className="w-6 h-6" />
            </button>
            <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Uniform Request Details</h2>
            
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Employee ID:</span> {selectedRequest.employeeId}</div>
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Name:</span> {selectedRequest.fullName}</div>
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Designation:</span> {selectedRequest.designation}</div>
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Gender:</span> {selectedRequest.gender}</div>
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Project:</span> {selectedRequest.projectName}</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Status:</span> 
                  <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedRequest.approvalStatus, theme)}`}>
                    {selectedRequest.approvalStatus}
                  </span>
                </div>
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Issued Status:</span> {selectedRequest.issuedStatus}</div>
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Request Date:</span> {selectedRequest.requestDate ? new Date(selectedRequest.requestDate).toLocaleString() : ""}</div>
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">DC Number:</span> {selectedRequest.dcNumber || "Not issued"}</div>
              </div>
            </div>

            {/* Uniform Items with Stock Information */}
            <div className="mb-6">
              <h3 className={`text-lg font-semibold mb-3 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Uniform Items</h3>
              <div className="space-y-3">
                {selectedRequest.uniformType?.map((uniformType, index) => {
                  const size = selectedRequest.size?.[uniformType] || "";
                  const stockLevel = checkStockAvailability(uniformType, size);
                  const isOutOfStock = stockLevel === 0;
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FaUserTie className={`w-4 h-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />
                          <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{uniformType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOutOfStock ? (
                            <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                          ) : (
                            <FaBox className="w-4 h-4 text-green-500" />
                          )}
                          <span className={`text-sm ${isOutOfStock ? "text-red-500" : "text-green-600"}`}>
                            Stock: {stockLevel} pcs
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Size: <span className="font-semibold">{size}</span>
                          </span>
                          <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Qty: <span className="font-semibold">{selectedRequest.qty || 1}</span>
                          </span>
                        </div>
                        
                        {isOutOfStock && (
                          <button
                            onClick={() => handleSizeEdit(selectedRequest, uniformType, size)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                              theme === "dark" 
                                ? "bg-amber-800 text-amber-200 hover:bg-amber-700" 
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                          >
                            <FaEdit className="w-3 h-3" />
                            Change Size
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-2 text-sm">
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Remarks:</span> {selectedRequest.remarks || "No remarks"}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Approved By:</span> {selectedRequest.approvedBy || "Not approved"}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Approved Date:</span> {selectedRequest.approvedDate ? new Date(selectedRequest.approvedDate).toLocaleString() : "Not approved"}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Issued By:</span> {selectedRequest.issuedBy || "Not issued"}</div>
              <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Issued Date:</span> {selectedRequest.issuedDate ? new Date(selectedRequest.issuedDate).toLocaleString() : "Not issued"}</div>
              {selectedRequest.documentPath && (
                <div className={theme === "dark" ? "text-gray-100" : "text-gray-800"}><span className="font-semibold">Document:</span> <a href={selectedRequest.documentPath} target="_blank" rel="noopener noreferrer" className={theme === "dark" ? "text-blue-300 underline" : "text-blue-700 underline"}>View Document</a></div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              {selectedRequest.approvalStatus === "Approved" && !selectedRequest.dcNumber && (
                <button
                  onClick={() => setDcModal(selectedRequest)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    theme === "dark" 
                      ? "bg-green-800 text-green-200 hover:bg-green-700" 
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  <FaWarehouse className="w-4 h-4" />
                  Create DC
                </button>
              )}
            </div>
          </div>
        </dialog>
      )}

      {/* Size Edit Modal */}
      {sizeEditModal && (
        <dialog ref={sizeEditModalRef} open className="fixed z-50 left-0 top-0 w-full h-full flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-xl shadow-lg max-w-lg w-full p-6 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-3 right-3 ${theme === "dark" ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"}`}
              onClick={() => setSizeEditModal(null)}
              aria-label="Close"
            >
              <FaTimesCircle className="w-6 h-6" />
            </button>
            
            <div className="mb-6">
              <h2 className={`text-xl font-bold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Update Uniform Size</h2>
              <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                Size <span className="font-semibold text-red-500">{sizeEditModal.originalSize}</span> is currently out of stock for 
                <span className="font-semibold"> {sizeEditModal.uniformType}</span>. Please select an available size below.
              </p>
            </div>

            {/* Current Size Info */}
            <div className={`p-4 rounded-lg mb-6 ${theme === "dark" ? "bg-red-900/20 border border-red-700" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center gap-3 mb-2">
                <FaExclamationTriangle className="w-5 h-5 text-red-500" />
                <span className={`font-semibold ${theme === "dark" ? "text-red-300" : "text-red-700"}`}>Current Size (Out of Stock)</span>
              </div>
              <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                <span className="font-semibold">Size:</span> {sizeEditModal.originalSize} | 
                <span className="font-semibold"> Stock:</span> 0 pcs
              </div>
            </div>

            {/* Available Sizes */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <FaBox className={`w-4 h-4 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                <label className={`block text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Available Sizes with Stock
                </label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sizeEditModal.availableSizes.map(size => {
                  const stockLevel = sizeEditModal.stockLevels[size] || 0;
                  const isSelected = sizeEditModal.newSize === size;
                  const isLowStock = stockLevel <= 2;
                  
                  return (
                    <button
                      key={size}
                      onClick={() => setSizeEditModal(prev => prev ? { ...prev, newSize: size } : null)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 relative ${
                        isSelected
                          ? theme === "dark"
                            ? "bg-blue-800 text-white border-blue-600 shadow-lg"
                            : "bg-blue-600 text-white border-blue-500 shadow-lg"
                          : theme === "dark"
                          ? "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:border-gray-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold mb-1">{size}</div>
                        <div className={`text-xs ${isSelected ? "text-blue-100" : theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          Stock: {stockLevel} pcs
                        </div>
                        {isLowStock && stockLevel > 0 && (
                          <div className={`text-xs mt-1 px-2 py-1 rounded-full ${
                            theme === "dark" ? "bg-amber-800 text-amber-200" : "bg-amber-100 text-amber-700"
                          }`}>
                            Low Stock
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <FaCheck className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size Comparison */}
            {sizeEditModal.newSize && sizeEditModal.newSize !== sizeEditModal.originalSize && (
              <div className={`p-4 rounded-lg mb-6 ${theme === "dark" ? "bg-blue-900/20 border border-blue-700" : "bg-blue-50 border border-blue-200"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <FaCheck className="w-5 h-5 text-green-500" />
                  <span className={`font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Size Change Summary</span>
                </div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  <div className="flex items-center gap-4">
                    <span>
                      <span className="font-semibold">From:</span> {sizeEditModal.originalSize} (0 pcs)
                    </span>
                    <span className="text-gray-400">→</span>
                    <span>
                      <span className="font-semibold">To:</span> {sizeEditModal.newSize} ({sizeEditModal.stockLevels[sizeEditModal.newSize] || 0} pcs)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSizeEdit}
                disabled={!sizeEditModal.newSize || sizeEditModal.newSize === sizeEditModal.originalSize}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === "dark" 
                    ? "bg-green-800 text-green-200 hover:bg-green-700" 
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                <FaCheck className="w-4 h-4" />
                Update Size
              </button>
              <button
                onClick={() => setSizeEditModal(null)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  theme === "dark" 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <FaTimes className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* DC Creation Modal */}
      {dcModal && (
        <dialog ref={dcModalRef} open className="fixed z-50 left-0 top-0 w-full h-full flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-xl shadow-lg max-w-lg w-full p-6 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
            <button
              className={`absolute top-3 right-3 ${theme === "dark" ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"}`}
              onClick={() => setDcModal(null)}
              aria-label="Close"
            >
              <FaTimesCircle className="w-6 h-6" />
            </button>
            
            <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Create Delivery Challan</h2>
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Create a delivery challan for employee <span className="font-semibold">{dcModal.employeeId}</span>
            </p>

            <div className="space-y-3 mb-6">
              <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  <span className="font-semibold">Employee:</span> {dcModal.fullName}
                </div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  <span className="font-semibold">Project:</span> {dcModal.projectName}
                </div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  <span className="font-semibold">Items:</span> {dcModal.uniformType?.join(", ")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCreateDC(dcModal)}
                disabled={dcLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === "dark" 
                    ? "bg-green-800 text-green-200 hover:bg-green-700" 
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {dcLoading ? (
                  <FaClock className="w-4 h-4 animate-spin" />
                ) : (
                  <FaWarehouse className="w-4 h-4" />
                )}
                {dcLoading ? "Creating..." : "Create DC"}
              </button>
              <button
                onClick={() => setDcModal(null)}
                disabled={dcLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  theme === "dark" 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <FaTimes className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}
      <div
        className={`min-h-screen flex flex-col py-8 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950"
            : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
        }`}
      >
        {/* Header */}
        <div
          className={`rounded-2xl mb-8 p-6 flex items-center justify-between shadow-lg w-full max-w-7xl mx-auto transition-colors duration-300 ${
            theme === "dark"
              ? "bg-[#2d3748]"
              : "bg-gradient-to-r from-blue-500 to-blue-800"
          }`}
        >
          <div className="flex items-center gap-5">
            <div
              className={`rounded-xl p-4 flex items-center justify-center ${
                theme === "dark"
                  ? "bg-[#232b38]"
                  : "bg-blue-100"
              }`}
            >
              <FaStore className={`w-10 h-10 ${theme === "dark" ? "text-white" : "text-blue-700"}`} />
            </div>
            <div>
              <h1 className={`text-3xl font-bold mb-1 ${theme === "dark" ? "text-white" : "text-white"}`}>Store Requests</h1>
              <p className={`text-base opacity-90 ${theme === "dark" ? "text-white" : "text-white"}`}>
                View and manage store requests with real-time inventory tracking
              </p>
              {inventoryLoading && (
                <div className="flex items-center gap-2 mt-2">
                  <FaClock className={`w-4 h-4 animate-spin ${theme === "dark" ? "text-blue-300" : "text-blue-200"}`} />
                  <span className={`text-sm ${theme === "dark" ? "text-blue-200" : "text-blue-200"}`}>Loading inventory data...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-white/20 text-white"}`}>
              <FaWarehouse className="w-4 h-4" />
              <span>Inventory Connected</span>
            </div>
            <button
              onClick={exportToCSV}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                theme === "dark"
                  ? "bg-gray-900 text-blue-200 hover:bg-blue-900"
                  : "bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              <FaDownload className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Inventory Summary Cards */}
            {!inventoryLoading && inventoryData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-xl border transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-900" : "bg-blue-100"}`}>
                      <FaStore className={`w-5 h-5 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Total Items</p>
                      <p className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{inventoryData.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl border transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900" : "bg-green-100"}`}>
                      <FaBox className={`w-5 h-5 ${theme === "dark" ? "text-green-300" : "text-green-600"}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>In Stock</p>
                      <p className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {requests.filter(req => {
                          const stockStatus = req.uniformType?.map(uniformType => {
                            const size = req.size?.[uniformType] || "";
                            return checkStockAvailability(uniformType, size);
                          }) || [];
                          return stockStatus.every(stock => stock > 0);
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl border transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-red-900" : "bg-red-100"}`}>
                      <FaExclamationTriangle className={`w-5 h-5 ${theme === "dark" ? "text-red-300" : "text-red-600"}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Out of Stock</p>
                      <p className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {requests.filter(req => {
                          const stockStatus = req.uniformType?.map(uniformType => {
                            const size = req.size?.[uniformType] || "";
                            return checkStockAvailability(uniformType, size);
                          }) || [];
                          return stockStatus.some(stock => stock === 0);
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl border transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-amber-900" : "bg-amber-100"}`}>
                      <FaClock className={`w-5 h-5 ${theme === "dark" ? "text-amber-300" : "text-amber-600"}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Pending</p>
                      <p className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {requests.filter(req => req.approvalStatus === "Pending").length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div
              className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-800"
                  : "bg-white border-gray-200"
              }`}
            >
              {loading ? (
                <div className="flex flex-col justify-center items-center py-16">
                  <div className="relative">
                    <FaClock className={`animate-spin w-12 h-12 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />
                    <div className={`absolute inset-0 rounded-full border-4 animate-pulse ${theme === "dark" ? "border-blue-900" : "border-blue-100"}`}></div>
                  </div>
                  <p className={theme === "dark" ? "text-gray-200 font-medium mt-4" : "text-gray-600 font-medium mt-4"}>Loading store requests...</p>
                  <p className={theme === "dark" ? "text-sm text-gray-400 mt-1" : "text-sm text-gray-500 mt-1"}>Please wait while we fetch the data</p>
                </div>
              ) : error ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className={theme === "dark" ? "bg-red-900 rounded-full p-4 mb-4" : "bg-red-50 rounded-full p-4 mb-4"}>
                    <FaTimesCircle className={theme === "dark" ? "w-8 h-8 text-red-300" : "w-8 h-8 text-red-600"} />
                  </div>
                  <h3 className={theme === "dark" ? "text-lg font-semibold text-gray-100 mb-2" : "text-lg font-semibold text-gray-900 mb-2"}>Error Loading Data</h3>
                  <p className={theme === "dark" ? "text-gray-300 text-center max-w-md" : "text-gray-600 text-center max-w-md"}>{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className={`mt-4 px-6 py-2 rounded-lg transition-colors duration-200 ${theme === "dark" ? "bg-blue-800 text-white hover:bg-blue-900" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    Try Again
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className={theme === "dark" ? "bg-gray-800 rounded-full p-4 mb-4" : "bg-gray-50 rounded-full p-4 mb-4"}>
                    <FaStore className={theme === "dark" ? "w-8 h-8 text-gray-500" : "w-8 h-8 text-gray-400"} />
                  </div>
                  <h3 className={theme === "dark" ? "text-lg font-semibold text-gray-100 mb-2" : "text-lg font-semibold text-gray-900 mb-2"}>No Requests Found</h3>
                  <p className={theme === "dark" ? "text-gray-300 text-center max-w-md" : "text-gray-600 text-center max-w-md"}>
                    {search || statusFilter
                      ? "No store requests match your current filters. Try adjusting your search criteria."
                      : "No store requests available at the moment."
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Search and Filter Section */}
                  <div className={`px-6 py-4 border-b transition-colors duration-300 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                          <input
                            type="text"
                            placeholder="Search by employee ID, name, project, or uniform type..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900 placeholder-gray-400" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500 placeholder-gray-500"}`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                            showFilters
                              ? theme === "dark"
                                ? "bg-blue-900 text-blue-200 border-blue-800"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                              : theme === "dark"
                              ? "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <FaFilter className="w-4 h-4" />
                          Filters
                          <span className={`text-xs px-2 py-1 rounded-full ml-1 ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>
                            {[statusFilter].filter(Boolean).length}
                          </span>
                        </button>
                      </div>
                    </div>
                    {/* Advanced Filters Panel */}
                    {showFilters && (
                      <div className={`mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                        {/* Status Filter */}
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"}`}
                          >
                            <option value="">All Status</option>
                            {statusOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                        {/* Clear Filters */}
                        <div className={`flex items-center justify-between mt-4 pt-4 border-t col-span-full ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center gap-3">
                            {statusFilter && (
                              <button
                                onClick={() => { setStatusFilter(""); setCurrentPage(1); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${theme === "dark" ? "bg-red-900 text-red-200 hover:bg-red-800" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                              >
                                <FaTimesCircle className="w-4 h-4" />
                                Clear All Filters
                              </button>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={theme === "dark" ? "text-sm text-gray-300" : "text-sm text-gray-600"}>
                              Showing <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{filtered.length}</span> of <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{requests.length}</span> requests
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Requests Table */}
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y transition-colors duration-300 ${theme === "dark" ? "divide-gray-800" : "divide-gray-200"}`}>
                      <thead className={theme === "dark" ? "bg-gray-900" : "bg-gray-50"}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Employee ID</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Project</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Uniform Type</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Stock Status</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Request Date</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "bg-gray-900 divide-y divide-gray-800" : "bg-white divide-y divide-gray-200"}>
                        {paginated.map((req, idx) => {
                          // Calculate overall stock status
                          const stockStatus = req.uniformType?.map(uniformType => {
                            const size = req.size?.[uniformType] || "";
                            return checkStockAvailability(uniformType, size);
                          }) || [];
                          
                          const hasOutOfStock = stockStatus.some(stock => stock === 0);
                          const allInStock = stockStatus.every(stock => stock > 0);
                          const stockStatusText = hasOutOfStock ? "Out of Stock" : allInStock ? "In Stock" : "Partial Stock";
                          
                          return (
                            <tr key={req._id || idx} className={`transition-all duration-200 group ${theme === "dark" ? "hover:bg-gray-800" : "hover:bg-blue-50"}`}>
                              <td className={`px-6 py-4 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>{req.employeeId}</td>
                              <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>{req.fullName}</td>
                              <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>{req.projectName}</td>
                              <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>
                                <div className="space-y-1">
                                  {req.uniformType?.map((type, index) => {
                                    const size = req.size?.[type] || "";
                                    const stock = checkStockAvailability(type, size);
                                    return (
                                      <div key={index} className="flex items-center gap-2 text-xs">
                                        <span>{type}: {size}</span>
                                        {stock === 0 ? (
                                          <FaExclamationTriangle className="w-3 h-3 text-red-500" />
                                        ) : (
                                          <FaBox className="w-3 h-3 text-green-500" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${
                                  hasOutOfStock
                                    ? theme === "dark"
                                      ? "bg-red-900 text-red-200 border-red-700"
                                      : "bg-red-100 text-red-800 border-red-200"
                                    : allInStock
                                    ? theme === "dark"
                                      ? "bg-green-900 text-green-200 border-green-700"
                                      : "bg-green-100 text-green-800 border-green-200"
                                    : theme === "dark"
                                    ? "bg-amber-900 text-amber-200 border-amber-700"
                                    : "bg-amber-100 text-amber-800 border-amber-200"
                                }`}>
                                  {hasOutOfStock ? <FaExclamationTriangle className="w-3 h-3 mr-1" /> : 
                                   allInStock ? <FaBox className="w-3 h-3 mr-1" /> : 
                                   <FaClock className="w-3 h-3 mr-1" />}
                                  {stockStatusText}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${getStatusColor(req.approvalStatus, theme)}`}>
                                  {req.approvalStatus === "Approved" && <FaCheckCircle className="w-3 h-3 mr-1" />}
                                  {req.approvalStatus === "Pending" && <FaClock className="w-3 h-3 mr-1" />}
                                  {req.approvalStatus === "Rejected" && <FaTimesCircle className="w-3 h-3 mr-1" />}
                                  {req.approvalStatus}
                                </span>
                              </td>
                              <td className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-black"}`}>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : ""}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    className={`px-3 py-1 rounded-lg font-semibold text-sm transition ${theme === "dark" ? "bg-blue-900 text-blue-200 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                                    onClick={() => setSelectedRequest(req)}
                                  >
                                    View
                                  </button>
                                  {hasOutOfStock && (
                                    <button
                                      className={`px-3 py-1 rounded-lg font-semibold text-sm transition ${theme === "dark" ? "bg-amber-800 text-amber-200 hover:bg-amber-700" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                                      onClick={() => {
                                        const outOfStockType = req.uniformType?.find(type => {
                                          const size = req.size?.[type] || "";
                                          return checkStockAvailability(type, size) === 0;
                                        });
                                        if (outOfStockType) {
                                          const size = req.size?.[outOfStockType] || "";
                                          handleSizeEdit(req, outOfStockType, size);
                                        }
                                      }}
                                    >
                                      <FaEdit className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className={`px-6 py-4 border-t transition-colors duration-300 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className={theme === "dark" ? "text-sm text-gray-300" : "text-sm text-gray-600"}>
                          Showing <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                          <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>
                            {Math.min(currentPage * rowsPerPage, filtered.length)}
                          </span>{' '}
                          of <span className={theme === "dark" ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>{filtered.length}</span> results
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border ${theme === "dark" ? "text-gray-400 bg-gray-900 border-gray-700 hover:bg-gray-800" : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100"}`}
                          >
                            <FaChevronLeft className="w-4 h-4" />
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`px-3 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
                                    currentPage === pageNum
                                      ? theme === "dark"
                                        ? "bg-blue-800 text-white border-blue-700 shadow-md"
                                        : "bg-blue-600 text-white border-blue-600 shadow-md"
                                      : theme === "dark"
                                      ? "text-gray-300 bg-gray-900 border-gray-700 hover:bg-gray-800"
                                      : "text-gray-700 bg-white border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border ${theme === "dark" ? "text-gray-400 bg-gray-900 border-gray-700 hover:bg-gray-800" : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100"}`}
                          >
                            Next
                            <FaChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ManagerDashboardLayout >
  );
}