"use client";

import React, { useEffect, useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaIdCard, FaUser, FaCheckCircle, FaTimesCircle, FaSpinner, FaSearch, FaInfoCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

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

type ViewMode = 'card' | 'table';

export default function KYCRequestsPage() {
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [empIdFilter, setEmpIdFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "designation" | "employeeId" | "project" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showColsMenu, setShowColsMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    photo: true,
    name: true,
    designation: true,
    employeeId: true,
    project: true,
    status: true,
    actions: true,
  });
  const { theme } = useTheme();

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

  const toggleColumn = (key: keyof typeof visibleCols) => {
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
      <div className={`min-h-screen flex flex-col items-stretch py-0 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Full-screen Excel-like layout: toolbar + grid */}
        <div className="w-full flex flex-col gap-2 flex-1 min-h-0">
          {/* Toast/Snackbar */}
          {toast && (
            <div className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 animate-fade-in ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
            </div>
          )}
          {/* Filters and Search (Excel-like controls) */}
          <div className={`w-full mb-2 flex flex-col md:flex-row items-center gap-3 justify-between sticky top-0 z-30 py-2 px-2 md:px-4
            ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}
          >
            <div className="flex-1 flex items-center gap-3">
              {/* Project Dropdown */}
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

              {/* Designation Dropdown */}
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

              {/* Search Bar */}
              <div className={`relative flex items-center rounded-xl px-4 py-2 shadow w-full border transition
                ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100'}`}
              >
                <FaSearch className={`mr-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`} />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
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
                  className={`flex-1 bg-transparent outline-none placeholder-blue-300 transition
                    ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch">
              <div className="relative">
                <button
                  onClick={() => setShowColsMenu(prev => !prev)}
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-blue-200 text-blue-700'}`}
                >
                  Columns
                </button>
                {showColsMenu && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg p-3 border z-40 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-blue-200 text-black'}`}>
                    {Object.keys(visibleCols).map(key => (
                      <label key={key} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={(visibleCols as any)[key]}
                          onChange={() => toggleColumn(key as keyof typeof visibleCols)}
                        />
                        <span className="capitalize">{key}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={exportCsv}
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-blue-200 text-blue-700'}`}
              >
                Export CSV
              </button>
            </div>
          </div>
          {/* Excel-like Table View */}
          <div
            className="w-full flex-1 overflow-auto min-h-0 px-2 md:px-4"
          >
            {loading ? (
              <div className="flex flex-col justify-center items-center min-h-[200px] gap-3">
                <FaSpinner className="animate-spin text-blue-600 w-10 h-10" />
                <span className="text-blue-700 font-medium">Loading pending KYC requests...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg">
                <FaTimesCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-lg font-medium">{error}</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-yellow-50 text-yellow-600 p-6 rounded-2xl flex flex-col items-center gap-3 max-w-lg mx-auto shadow-lg">
                <FaUser className="w-10 h-10 flex-shrink-0" />
                <p className="text-lg font-medium">No pending KYC requests found.</p>
              </div>
            ) : (
              <div className={`overflow-auto rounded-none shadow-none ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <table className={`w-full text-xs border table-fixed ${theme === 'dark' ? 'border-gray-700' : 'border-blue-200'}`}>
                  <colgroup>
                    <col style={{ width: 56 }} />
                    {visibleCols.photo && (<col style={{ width: 68 }} />)}
                    {visibleCols.name && (<col style={{ width: 240 }} />)}
                    {visibleCols.designation && (<col style={{ width: 180 }} />)}
                    {visibleCols.employeeId && (<col style={{ width: 160 }} />)}
                    {visibleCols.project && (<col style={{ width: 220 }} />)}
                    {visibleCols.status && (<col style={{ width: 120 }} />)}
                    {visibleCols.actions && (<col style={{ width: 200 }} />)}
                  </colgroup>
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'} sticky top-0 z-10`}> 
                    <tr>
                      <th className={`px-2 py-1 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap ${theme === 'dark' ? 'text-blue-200 bg-gray-700' : 'text-blue-700 bg-blue-50'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>#</th>
                      {visibleCols.photo && (
                        <th className={`px-2 py-1 text-left font-bold uppercase whitespace-nowrap ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>Photo</th>
                      )}
                      {visibleCols.name && (
                        <th onClick={() => onSort('name')} className={`px-2 py-1 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      )}
                      {visibleCols.designation && (
                        <th onClick={() => onSort('designation')} className={`px-2 py-1 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>Designation {sortBy === 'designation' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      )}
                      {visibleCols.employeeId && (
                        <th onClick={() => onSort('employeeId')} className={`px-2 py-1 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>Employee ID {sortBy === 'employeeId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      )}
                      {visibleCols.project && (
                        <th onClick={() => onSort('project')} className={`px-2 py-1 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>Project {sortBy === 'project' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      )}
                      {visibleCols.status && (
                        <th className={`px-2 py-1 text-left font-bold uppercase whitespace-nowrap ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>Status</th>
                      )}
                      {visibleCols.actions && (
                        <th className={`px-2 py-1 text-left font-bold uppercase whitespace-nowrap ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} border ${theme === 'dark' ? 'border-gray-600' : 'border-blue-200'}`}>Actions</th>
                      )}
                    </tr>
                    <tr className={theme === 'dark' ? 'bg-gray-800/40' : 'bg-white'}>
                      <th className={`px-2 py-1 sticky left-0 z-20 ${theme === 'dark' ? 'bg-gray-800/40' : 'bg-white'}`}></th>
                      {visibleCols.photo && (<th className="px-2 py-1"></th>)}
                      {visibleCols.name && (
                        <th className="px-2 py-1">
                          <input
                            value={nameFilter}
                            onChange={e => setNameFilter(e.target.value)}
                            placeholder="Filter name"
                            className={`w-full border rounded px-2 py-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          />
                        </th>
                      )}
                      {visibleCols.designation && (
                        <th className="px-2 py-1">
                          <select
                            value={designationFilter}
                            onChange={e => setDesignationFilter(e.target.value)}
                            className={`w-full border rounded px-2 py-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
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
                            className={`w-full border rounded px-2 py-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          />
                        </th>
                      )}
                      {visibleCols.project && (
                        <th className="px-2 py-1">
                          <select
                            value={projectFilter}
                            onChange={e => setProjectFilter(e.target.value)}
                            className={`w-full border rounded px-2 py-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
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
                  <tbody>
                    {sortedRequests.map((req, idx) => (
                      <tr
                        key={req._id}
                        id={req._id}
                        className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} transition ${selectedRequestId === req._id ? (theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-100') : ''} ${theme === 'dark' ? 'odd:bg-gray-800' : 'odd:bg-white'} ${theme === 'dark' ? 'even:bg-gray-900/5' : 'even:bg-blue-50/40'}`}
                      >
                        <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-600 border-blue-200'} border`}>{idx + 1}</td>
                        {visibleCols.photo && (
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'border-gray-700' : 'border-blue-200'}`}>
                            <Image src={req.personalDetails.employeeImage || "/placeholder-user.jpg"} alt={req.personalDetails.fullName} width={36} height={36} className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`} />
                          </td>
                        )}
                        {visibleCols.name && (
                          <td className={`px-2 py-1 font-semibold border ${theme === 'dark' ? 'text-blue-100 border-gray-700' : 'text-blue-800 border-blue-200'}`}>
                            <div className="truncate" title={req.personalDetails.fullName}>{req.personalDetails.fullName}</div>
                          </td>
                        )}
                        {visibleCols.designation && (
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-200 border-gray-700' : 'text-black border-blue-200'}`}>
                            <div className="truncate" title={req.personalDetails.designation}>{req.personalDetails.designation}</div>
                          </td>
                        )}
                        {visibleCols.employeeId && (
                          <td className={`px-2 py-1 border whitespace-nowrap ${theme === 'dark' ? 'text-gray-200 border-gray-700' : 'text-black border-blue-200'}`}>{req.personalDetails.employeeId}</td>
                        )}
                        {visibleCols.project && (
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-gray-700' : 'text-blue-500 border-blue-200'}`}>
                            <div className="truncate" title={req.personalDetails.projectName}>{req.personalDetails.projectName}</div>
                          </td>
                        )}
                        {visibleCols.status && (
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'border-gray-700' : 'border-blue-200'}`}>
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Pending</span>
                          </td>
                        )}
                        {visibleCols.actions && (
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'border-gray-700' : 'border-blue-200'}`}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAction(req._id, "approve", req.personalDetails.employeeId)}
                                disabled={actionLoading === req._id + "approve"}
                                title="Approve KYC"
                                className={`flex items-center justify-center gap-1 px-3 py-1 rounded font-semibold text-[11px] shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                                  ${theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-900 text-white focus:ring-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white focus:ring-blue-400'}
                                `}
                              >
                                {actionLoading === req._id + "approve" ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-white" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(req._id, "reject", req.personalDetails.employeeId)}
                                disabled={actionLoading === req._id + "reject"}
                                title="Reject KYC"
                                className={`flex items-center justify-center gap-1 px-3 py-1 rounded font-semibold text-[11px] shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                                  ${theme === 'dark' ? 'bg-gradient-to-r from-red-700 to-red-900 text-white focus:ring-red-700' : 'bg-gradient-to-r from-red-400 to-red-600 text-white focus:ring-red-300'}
                                `}
                              >
                                {actionLoading === req._id + "reject" ? <FaSpinner className="animate-spin" /> : <FaTimesCircle className="text-white" />}
                                Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
} 