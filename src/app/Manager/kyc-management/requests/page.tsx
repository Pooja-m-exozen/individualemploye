"use client";

import React, { useEffect, useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaEye } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
// Removed unused Link import
import CreateKYCForm from '../create/CreateKYCForm';
import ViewKYCModal from '@/components/dashboard/ViewKYCModal';

interface KYCRequest {
  _id: string;
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    employeeImage: string;
    projectName: string;
  };
  status: string;
}

interface KYCData {
  personalDetails: {
    employeeId: string;
    projectName: string;
    fullName: string;
    fathersName: string;
    mothersName: string;
    gender: string;
    dob: string;
    phoneNumber: string;
    designation: string;
    dateOfJoining: string;
    nationality: string;
    religion: string;
    maritalStatus: string;
    bloodGroup: string;
    uanNumber: string;
    esicNumber: string;
    experience: string;
    educationalQualification: string;
    languages: string[];
    employeeImage: string;
    email: string;
    workType: string;
  };
  addressDetails: {
    permanentAddress: {
      state: string;
      city: string;
      street: string;
      postalCode: string;
    };
    currentAddress: {
      state: string;
      city: string;
      street: string;
      postalCode: string;
    };
  };
  bankDetails: {
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
  };
  identificationDetails: {
    identificationType: string;
    identificationNumber: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
    aadhar: string;
  };
  documents: Array<{
    type: string;
    url: string;
    uploadedAt: string;
    _id: string;
  }>;
  status: string;
}

// removed unused ViewMode

export default function KYCRequestsPage() {
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  // removed instructions card state to avoid unused
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [empIdFilter, setEmpIdFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [, setSelectedRequestId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "designation" | "employeeId" | "project" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showColsMenu, setShowColsMenu] = useState(false);
  type VisibleCols = {
    photo: boolean;
    name: boolean;
    designation: boolean;
    employeeId: boolean;
    project: boolean;
    status: boolean;
    actions: boolean;
  };
  const [visibleCols, setVisibleCols] = useState<VisibleCols>({
    photo: true,
    name: true,
    designation: true,
    employeeId: true,
    project: true,
    status: true,
    actions: true,
  });
  const { theme } = useTheme();
  const [showCreateKycModal, setShowCreateKycModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedKYCData, setSelectedKYCData] = useState<KYCData | null>(null);
  const [loadingKYCData, setLoadingKYCData] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetch("https://cafm.zenapi.co.in/api/project/projects")
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Silently fail on project fetch error
      });
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const data = await res.json();
      setRequests((data.kycForms || []).filter((k: KYCRequest) => k.status === "Pending"));
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to fetch KYC requests: ${err.message}`);
      } else {
        setError("An unknown error occurred while fetching KYC requests.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchKYCData = async (employeeId: string) => {
    setLoadingKYCData(true);
    setError(null);
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.reason || data.message || "Failed to fetch KYC data");
      
      // Check if the response has the expected structure
      // The API might return data directly or wrapped in a kycData property
      const kycData = data.kycData || data;
      if (kycData && kycData.personalDetails) {
        setSelectedKYCData(kycData);
        setShowViewModal(true);
      } else {
        console.error('Invalid KYC data structure:', data);
        throw new Error("Invalid KYC data structure received");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch KYC data.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setLoadingKYCData(false);
    }
  };

  const designationOptions = Array.from(new Set(requests.map(f => f.personalDetails.designation))).filter(Boolean);

  const handleAction = async (id: string, action: "approve" | "reject", employeeId: string) => {
    setActionLoading(id + action);
    setError(null);
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.reason || data.message || "Action failed");
      setRequests((prev) => prev.filter((req) => req._id !== id));
      setToast({ type: "success", message: data.message || `KYC ${action}d successfully.` });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update KYC status.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesProject = projectFilter === "All Projects" || req.personalDetails.projectName === projectFilter;
    const matchesDesignation = designationFilter === "All Designations" || req.personalDetails.designation === designationFilter;
    const matchesSearch = req.personalDetails.fullName.toLowerCase().includes(search.toLowerCase()) ||
      req.personalDetails.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesHeaderId = empIdFilter === "" || req.personalDetails.employeeId.toLowerCase().includes(empIdFilter.toLowerCase());
    const matchesHeaderName = nameFilter === "" || req.personalDetails.fullName.toLowerCase().includes(nameFilter.toLowerCase());
    return matchesProject && matchesDesignation && matchesSearch && matchesHeaderId && matchesHeaderName;
  });

  const sortedRequests = React.useMemo(() => {
    const items = [...filteredRequests];
    if (!sortBy) return items;
    const direction = sortDir === "asc" ? 1 : -1;
    items.sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (sortBy === "name") {
        aVal = a.personalDetails.fullName || "";
        bVal = b.personalDetails.fullName || "";
      } else if (sortBy === "designation") {
        aVal = a.personalDetails.designation || "";
        bVal = b.personalDetails.designation || "";
      } else if (sortBy === "employeeId") {
        aVal = a.personalDetails.employeeId || "";
        bVal = b.personalDetails.employeeId || "";
      } else if (sortBy === "project") {
        aVal = a.personalDetails.projectName || "";
        bVal = b.personalDetails.projectName || "";
      }
      return aVal.localeCompare(bVal, undefined, { sensitivity: 'base' }) * direction;
    });
    return items;
  }, [filteredRequests, sortBy, sortDir]);

  const onSort = (key: "name" | "designation" | "employeeId" | "project") => {
    if (sortBy === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const toggleColumn = (key: keyof VisibleCols) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportCsv = () => {
    const headerParts: string[] = ["Row #"];
    if (visibleCols.photo) headerParts.push("Photo");
    if (visibleCols.name) headerParts.push("Name");
    if (visibleCols.designation) headerParts.push("Designation");
    if (visibleCols.employeeId) headerParts.push("Employee ID");
    if (visibleCols.project) headerParts.push("Project");
    if (visibleCols.status) headerParts.push("Status");
    if (visibleCols.actions) headerParts.push("Actions");

    const rows = sortedRequests.map((req, idx) => {
      const parts: string[] = [String(idx + 1)];
      if (visibleCols.photo) parts.push("");
      if (visibleCols.name) parts.push(req.personalDetails.fullName || "");
      if (visibleCols.designation) parts.push(req.personalDetails.designation || "");
      if (visibleCols.employeeId) parts.push(req.personalDetails.employeeId || "");
      if (visibleCols.project) parts.push(req.personalDetails.projectName || "");
      if (visibleCols.status) parts.push("Pending");
      if (visibleCols.actions) parts.push("");
      return parts
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headerParts.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "kyc_requests.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
          {/* Toast/Snackbar */}
          {toast && (
            <div className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
            </div>
          )}
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
              {/* Project Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="All Projects">All Projects</option>
                {projectList.map(p => (
                  <option key={p._id} value={p.projectName}>{p.projectName}</option>
                ))}
              </select>
            </div>
              {/* Designation Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="All Designations">All Designations</option>
                {designationOptions.map(designation => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>
            </div>
              {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                placeholder="Search employee name or ID..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setSelectedRequestId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && search) {
                      const found = sortedRequests.find(req =>
                        req.personalDetails.employeeId.toLowerCase() === search.toLowerCase() ||
                        req.personalDetails.fullName.toLowerCase() === search.toLowerCase()
                      );
                      if (found) {
                        setSelectedRequestId(found._id);
                        document.getElementById(found._id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowColsMenu(prev => !prev)}
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'bg-white border-blue-200 text-blue-700'}`}
                >
                  Columns
                </button>
                {showColsMenu && (
                  <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg p-3 border z-40 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'bg-white border-blue-200 text-black'}`}>
                    {(Object.keys(visibleCols) as Array<keyof VisibleCols>).map((key) => (
                      <label key={String(key)} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                        <input type="checkbox" checked={visibleCols[key]} onChange={() => toggleColumn(key)} />
                        <span className="capitalize">{String(key)}</span>
    </label>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setShowCreateKycModal(prev => !prev)} className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}>{showCreateKycModal ? 'Close KYC' : 'Create KYC'}</button>
              <button
                onClick={exportCsv}
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'bg-white border-blue-200 text-blue-700'}`}
              >
                Export CSV
              </button>
            </div>
            </div>
          </div>
        {showCreateKycModal && (
          <div className="mb-6">
            <CreateKYCForm />
          </div>
        )}
        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading KYC requests...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap ${theme === "dark" ? "text-blue-200 bg-blue-900" : "text-blue-700 bg-blue-50"}`}>#</th>
                    {visibleCols.photo && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-16 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Photo</th>)}
                    {visibleCols.name && (<th onClick={() => onSort('name')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                    {visibleCols.designation && (<th onClick={() => onSort('designation')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Designation {sortBy === 'designation' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                    {visibleCols.employeeId && (<th onClick={() => onSort('employeeId')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Employee ID {sortBy === 'employeeId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                    {visibleCols.project && (<th onClick={() => onSort('project')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Project {sortBy === 'project' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                    {visibleCols.status && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Status</th>)}
                    {visibleCols.actions && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Actions</th>)}
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className="px-2 py-1 sticky left-0 z-20"></th>
                    {visibleCols.photo && (<th className="px-2 py-1 w-16"></th>)}
                    {visibleCols.name && (
                      <th className="px-2 py-1">
                        <input
                          value={nameFilter}
                          onChange={e => setNameFilter(e.target.value)}
                          placeholder="Filter name"
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        />
                      </th>
                    )}
                    {visibleCols.designation && (
                      <th className="px-2 py-1">
                        <select
                          value={designationFilter}
                          onChange={e => setDesignationFilter(e.target.value)}
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        >
                          <option value="All Designations">All Designations</option>
                          {designationOptions.map(d => (<option key={d} value={d}>{d}</option>))}
                        </select>
                      </th>
                    )}
                    {visibleCols.employeeId && (
                      <th className="px-2 py-1">
                        <input
                          value={empIdFilter}
                          onChange={e => setEmpIdFilter(e.target.value)}
                          placeholder="Filter ID"
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        />
                      </th>
                    )}
                    {visibleCols.project && (
                      <th className="px-2 py-1">
                        <select
                          value={projectFilter}
                          onChange={e => setProjectFilter(e.target.value)}
                          className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        >
                          <option value="All Projects">All Projects</option>
                          {projectList.map(p => (<option key={p._id} value={p.projectName}>{p.projectName}</option>))}
                        </select>
                      </th>
                    )}
                    {visibleCols.status && (<th className="px-2 py-1"></th>)}
                    {visibleCols.actions && (<th className="px-2 py-1"></th>)}
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {sortedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No KYC requests found</td>
                    </tr>
                  ) : sortedRequests.map((req, idx) => (
                    <tr key={req._id} id={req._id} className={theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"}>
                      <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}`}>{idx + 1}</td>
                      {visibleCols.photo && (
                        <td className="px-2 py-1">
                          <Image src={req.personalDetails.employeeImage || "/placeholder-user.jpg"} alt={req.personalDetails.fullName} width={32} height={32} className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`} />
                        </td>
                      )}
                      {visibleCols.name && (
                        <td className="px-2 py-1"><div className="truncate" title={req.personalDetails.fullName}>{req.personalDetails.fullName}</div></td>
                      )}
                      {visibleCols.designation && (
                        <td className="px-2 py-1"><div className="truncate" title={req.personalDetails.designation}>{req.personalDetails.designation}</div></td>
                      )}
                      {visibleCols.employeeId && (<td className={`px-2 py-1 font-semibold whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{req.personalDetails.employeeId}</td>)}
                      {visibleCols.project && (
                        <td className={`px-2 py-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}><div className="truncate" title={req.personalDetails.projectName}>{req.personalDetails.projectName}</div></td>
                      )}
                      {visibleCols.status && (
                        <td className="px-2 py-1 text-center">
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                        </td>
                      )}
                      {visibleCols.actions && (
                        <td className="px-2 py-1 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                              disabled={actionLoading === req._id + "approve"}
                              title="Approve KYC"
                              className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                                ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400'}
                              `}
                            >
                              {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                            </button>
                            <button
                              onClick={() => handleAction(req._id, "reject", req.personalDetails.employeeId)}
                              disabled={actionLoading === req._id + "reject"}
                              title="Reject KYC"
                              className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                                ${theme === 'dark' ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-700' : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300'}
                              `}
                            >
                              {actionLoading === req._id + "reject" ? <FaSpinner className="animate-spin" /> : <FaTimesCircle />}
                            </button>
                            <button
                              onClick={() => fetchKYCData(req.personalDetails.employeeId)}
                              disabled={loadingKYCData}
                              title="View KYC"
                              className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                  : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                              }`}
                            >
                              {loadingKYCData ? <FaSpinner className="animate-spin" /> : <FaEye />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* View KYC Modal */}
      {showViewModal && selectedKYCData && (
        <ViewKYCModal
          open={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedKYCData(null);
          }}
          kycData={selectedKYCData}
        />
      )}
    </ManagerDashboardLayout>
  );
} 