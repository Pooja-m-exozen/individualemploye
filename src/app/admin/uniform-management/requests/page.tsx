"use client";

import React, { useEffect, useState } from "react";
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { FaCheckCircle, FaTimesCircle, FaSearch } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

interface UniformRequest {
  _id: string;
  employee: {
    employeeId: string;
    fullName: string;
    designation: string;
    employeeImage: string;
    projectName: string;
    gender?: string;
  };
  status: string;
  requestedItems: string[];
  qty?: number;
  remarks?: string;
  sizes?: { [key: string]: string };
  requestDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Add type for API mapping
interface UniformApiResponse {
  _id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  employeeImage?: string;
  projectName: string;
  gender?: string;
  approvalStatus: string;
  uniformType: string[];
  qty?: number;
  remarks?: string;
  size?: { [key: string]: string };
  requestDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function UniformRequestsPage() {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<UniformRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending'>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All Projects');
  const [projectOptions, setProjectOptions] = useState<string[]>(['All Projects']);
  const [employeeImages, setEmployeeImages] = useState<{ [id: string]: string }>({});



  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to fetch uniform requests.");
        setLoading(false);
        return;
      }
      // Map API data to your UniformRequest interface
      const mapped = data.uniforms.map((item: UniformApiResponse) => ({
        _id: item._id,
        employee: {
          employeeId: item.employeeId,
          fullName: item.fullName,
          designation: item.designation,
          employeeImage: "", // If you have an image, use it here
          projectName: item.projectName,
          gender: item.gender,
        },
        status: item.approvalStatus,
        requestedItems: item.uniformType,
        qty: item.qty,
        remarks: item.remarks,
        sizes: item.size,
        requestDate: item.requestDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      setRequests(mapped);
      
      // Set project options from the mapped requests
      const projectNames = mapped.map((req: UniformRequest) => req.employee.projectName).filter(Boolean) as string[];
      const projects: string[] = Array.from(new Set(projectNames));
      setProjectOptions(['All Projects', ...projects]);
      
      setLoading(false);
    } catch {
      setError("Failed to fetch uniform requests.");
      setLoading(false);
    }
  };

  // Update handleAction to use the new API endpoint and improve table UI/UX
  const handleAction = async (employeeId: string, action: "approve" | "reject") => {
    setError(null);
    try {
      const endpoint = `https://cafm.zenapi.co.in/api/uniforms/${employeeId}/${action}`;
      const remarks = action === 'approve' ? 'Approved by admin' : 'Rejected by admin';
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        const message = data.message || `Failed to ${action} uniform request.`;
        setError(message);
        setToast({ type: "error", message });
        setTimeout(() => setToast(null), 3500);
        return;
      }
      // Only update status, do not remove
      setRequests(prev =>
        prev.map(req =>
          req._id === employeeId
            ? { ...req, status: action === 'approve' ? 'Approved' : 'Rejected' }
            : req
        )
      );
      setToast({ type: "success", message: `Uniform request ${action}d successfully.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} uniform request.`;
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };






  // Filtered requests by search, status, and project
  const filteredRequests = requests.filter(req =>
    (statusFilter === 'All' || req.status === statusFilter) &&
    (projectFilter === 'All Projects' || req.employee.projectName === projectFilter) &&
    (req.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
      req.employee.employeeId.toLowerCase().includes(search.toLowerCase()))
  );

  // Sort filteredRequests by status and name
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    // First sort by status (Pending first, then Approved, then Rejected)
    const statusOrder = { 'Pending': 0, 'Approved': 1, 'Rejected': 2 };
    const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
    const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
    
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
    // Then sort by name alphabetically
    return a.employee.fullName.localeCompare(b.employee.fullName);
  });


  // Fetch employee images for requests
  useEffect(() => {
    requests.forEach(req => {
      const empId = req.employee?.employeeId;
      if (empId && !employeeImages[empId]) {
        fetch(`https://cafm.zenapi.co.in/api/kyc/${empId}`)
          .then(res => res.json())
          .then(data => {
            if (data.kycData?.personalDetails?.employeeImage) {
              setEmployeeImages(prev => ({
                ...prev,
                [empId]: data.kycData.personalDetails.employeeImage
              }));
            }
          });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  return (
    <AdminDashboardLayout>
      <div className={`flex flex-col gap-4 p-2 lg:p-4 w-full font-sans h-screen overflow-y-auto ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'
      }`}>
          {/* Toast/Snackbar */}
          {toast && (
            <div className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
            </div>
          )}
        
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center flex-1">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className={`pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full ${theme === 'dark' ? 'bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-blue-300' : 'bg-white text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
              />
            </div>
            {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'All' | 'Approved' | 'Pending')}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
              >
              <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
            >
              {projectOptions.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            </div>
          </div>
        {/* Excel-style Table */}
        <div className="w-full">
          <div className="overflow-x-auto w-full custom-scrollbar">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                  <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                    <tr>
                      <th className={`px-2 py-3 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Gender</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Request Date</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-40 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Requested Items</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Qty</th>
                      <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Remarks</th>
                      <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
            {loading ? (
                      <tr>
                        <td colSpan={11} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2">Loading...</span>
              </div>
                        </td>
                      </tr>
            ) : error ? (
                      <tr>
                        <td colSpan={11} className={`text-center py-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                          {error}
                        </td>
                      </tr>
                    ) : sortedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={11} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      sortedRequests.map((request, index) => (
                        <tr key={request._id} className={`${
                          index % 2 === 0 
                            ? (theme === 'dark' ? 'bg-gray-800' : 'bg-white') 
                            : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50')
                        } hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-blue-50'} transition-colors`}>
                          <td className={`px-2 py-2 text-center font-medium border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {index + 1}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Image 
                                  src={employeeImages[request.employee.employeeId] || '/file.svg'} 
                                  alt={request.employee.fullName} 
                                  width={32} 
                                  height={32} 
                                  className="w-full h-full object-cover rounded-full"
                                />
                      </div>
                              <div>
                                <div className="font-semibold">{request.employee.fullName}</div>
                                <div className="text-xs text-gray-500">{request.employee.employeeId}</div>
                  </div>
              </div>
                        </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {request.employee.designation}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {request.employee.projectName}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {request.employee.gender || ''}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {request.requestDate ? new Date(request.requestDate).toLocaleDateString() : ''}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              request.status === 'Approved' 
                                ? 'bg-green-100 text-green-700' 
                                : request.status === 'Rejected' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            <div className="flex flex-wrap gap-1">
                            {request.requestedItems.map(item => (
                                <span key={item} className={`inline-block rounded px-2 py-1 text-xs font-semibold ${theme === 'dark' ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                                {item}{request.sizes && request.sizes[item] ? ` (${request.sizes[item]})` : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {request.qty || ''}
                          </td>
                          <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                            {request.remarks || ''}
                          </td>
                          <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                          {request.status === 'Pending' ? (
                              <div className="flex gap-1">
                              <button
                                onClick={() => handleAction(request.employee.employeeId, 'approve')}
                                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                                  }`}
                                  title="Approve"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(request.employee.employeeId, 'reject')}
                                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                  title="Reject"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                request.status === 'Approved' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {request.status}
                              </span>
                          )}
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
                  </div>
                </div>
              </div>
          </div>
          
      </div>
    </AdminDashboardLayout>
  );
}