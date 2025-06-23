"use client";

import React, { useEffect, useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaIdCard, FaUser, FaSpinner, FaSearch, FaCheckCircle, FaTimesCircle, FaChevronLeft, FaChevronRight, FaEdit, FaTrash, FaFilter, FaBriefcase, FaListAlt, FaCalendarAlt, FaPhone, FaUsers, FaDownload, FaEye, FaSort, FaSortUp, FaSortDown, FaBuilding, FaChartLine, FaClock, FaStar, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import EditKYCModal from "@/components/dashboard/EditKYCModal";
import ViewKYCModal from "@/components/dashboard/ViewKYCModal";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from 'xlsx';

interface KYCForm {
  _id: string;
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    employeeImage: string;
    projectName: string;
    fathersName: string;
    mothersName: string;
    gender: string;
    dob: string;
    phoneNumber: string;
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

interface NewJoiner {
  fullName: string;
  employeeId: string;
  projectName: string;
  designation: string;
  dateOfJoining: string;
  phoneNumber: string;
}

interface NewJoinersResponse {
  success: boolean;
  count: number;
  timeFrame: string;
  data: NewJoiner[];
}

export default function ViewAllKYCPage() {
  const { theme } = useTheme();
  const [kycForms, setKYCForms] = useState<KYCForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [projectFilter, setProjectFilter] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");
  const router = useRouter();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [newJoiners, setNewJoiners] = useState<NewJoiner[]>([]);
  const [newJoinersLoading, setNewJoinersLoading] = useState(false);
  const [newJoinersError, setNewJoinersError] = useState<string | null>(null);
  const [showNewJoiners, setShowNewJoiners] = useState(false);
  const [timeFrame, setTimeFrame] = useState(30);
  const [sortField, setSortField] = useState<"name" | "employeeId" | "designation" | "project" | "status">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [modal, setModal] = useState<null | { type: 'joiner' | 'view' | 'edit', data: any }>(null);
  const [newJoinersSearch, setNewJoinersSearch] = useState("");

  const projectNames = Array.from(new Set(kycForms.map(f => f.personalDetails.projectName))).filter(Boolean);
  const statusOptions = Array.from(new Set(kycForms.map(f => f.status))).filter(Boolean);
  const designationOptions = Array.from(new Set(kycForms.map(f => f.personalDetails.designation))).filter(Boolean);

  useEffect(() => {
    fetchKYCForms();
  }, []);

  useEffect(() => {
    if (modal?.type === 'joiner') {
      fetchNewJoiners(timeFrame);
    }
  }, [modal?.type, timeFrame]);

  const fetchKYCForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const data = await res.json();
      setKYCForms(data.kycForms || []);
    } catch (err: any) {
      setError("Failed to fetch KYC forms.");
    } finally {
      setLoading(false);
    }
  };

  const fetchNewJoiners = async (days: number = 30) => {
    setNewJoinersLoading(true);
    setNewJoinersError(null);
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/reports/new-joiners?days=${days}`);
      const data: NewJoinersResponse = await res.json();
      if (data.success) {
        setNewJoiners(data.data || []);
      } else {
        setNewJoinersError("Failed to fetch new joiners data.");
      }
    } catch (err: any) {
      setNewJoinersError("Failed to fetch new joiners data.");
    } finally {
      setNewJoinersLoading(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <FaSort className="w-3 h-3 text-gray-400" />;
    return sortDirection === "asc" ? <FaSortUp className="w-3 h-3 text-blue-600" /> : <FaSortDown className="w-3 h-3 text-blue-600" />;
  };

  // Calculate filtered and paginated data
  const filtered = kycForms
    .filter(form => {
      const matchesProject = projectFilter ? form.personalDetails.projectName === projectFilter : true;
      const matchesEmployeeId = employeeIdFilter ? form.personalDetails.employeeId.toLowerCase().includes(employeeIdFilter.toLowerCase()) : true;
      const matchesDesignation = designationFilter ? form.personalDetails.designation === designationFilter : true;
      const matchesStatus = statusFilter ? form.status === statusFilter : true;
      const matchesSearch = search ? (
        form.personalDetails.fullName.toLowerCase().includes(search.toLowerCase()) ||
        form.personalDetails.employeeId.toLowerCase().includes(search.toLowerCase())
      ) : true;
      return matchesProject && matchesEmployeeId && matchesDesignation && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let aValue: string, bValue: string;
      
      switch (sortField) {
        case "name":
          aValue = a.personalDetails.fullName.toLowerCase();
          bValue = b.personalDetails.fullName.toLowerCase();
          break;
        case "employeeId":
          aValue = a.personalDetails.employeeId.toLowerCase();
          bValue = b.personalDetails.employeeId.toLowerCase();
          break;
        case "designation":
          aValue = a.personalDetails.designation.toLowerCase();
          bValue = b.personalDetails.designation.toLowerCase();
          break;
        case "project":
          aValue = a.personalDetails.projectName.toLowerCase();
          bValue = b.personalDetails.projectName.toLowerCase();
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          aValue = a.personalDetails.fullName.toLowerCase();
          bValue = b.personalDetails.fullName.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  // Paginate only the filtered results
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter new joiners based on search
  const filteredNewJoiners = newJoiners.filter(joiner => {
    if (!newJoinersSearch) return true;
    const searchTerm = newJoinersSearch.toLowerCase();
    return (
      joiner.fullName.toLowerCase().includes(searchTerm) ||
      joiner.employeeId.toLowerCase().includes(searchTerm) ||
      joiner.designation.toLowerCase().includes(searchTerm) ||
      joiner.projectName.toLowerCase().includes(searchTerm)
    );
  });

  const handleExportToExcel = () => {
    // Prepare data for export (flatten nested objects as needed)
    const exportData = filtered.map(form => ({
      EmployeeID: form.personalDetails.employeeId,
      Name: form.personalDetails.fullName,
      Designation: form.personalDetails.designation,
      Project: form.personalDetails.projectName,
      Status: form.status,
      Phone: form.personalDetails.phoneNumber,
      Email: form.personalDetails.email,
      DateOfJoining: form.personalDetails.dateOfJoining,
      // Add more fields as needed
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KYC Records');
    XLSX.writeFile(workbook, 'kyc_records.xlsx');
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'} flex flex-col py-8`}>
        {/* Modern KYC Header */}
        <div className={`rounded-2xl mb-8 p-6 flex items-center justify-between shadow-lg w-full max-w-7xl mx-auto
          ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-500 to-blue-800'}`}
        >
          <div className="flex items-center gap-5">
            <div className={`rounded-xl p-4 flex items-center justify-center
              ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-600 bg-opacity-30'}`}
            >
              <FaIdCard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">KYC Records</h1>
              <p className="text-white text-base opacity-90">Comprehensive employee KYC records and management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md
              ${theme === 'dark' ? 'bg-gray-800 text-blue-200 hover:bg-gray-700' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
              onClick={handleExportToExcel}
            >
              <FaDownload className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Toast Notification */}
            {toast && (
              <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white text-sm flex items-center gap-3 max-w-md animate-slide-in
                ${toast.type === "success" ? 'bg-emerald-500' : 'bg-red-500'}`}
              >
                {toast.type === "success" ? <FaCheckCircle className="w-5 h-5" /> : <FaTimesCircle className="w-5 h-5" />}
                <span className="font-medium">{toast.message}</span>
                <button onClick={() => setToast(null)} className="ml-auto">
                  <FaTimesCircle className="w-4 h-4 opacity-70 hover:opacity-100" />
                </button>
              </div>
            )}

            {/* Enhanced Data Table */}
            <div className={`rounded-xl shadow-sm border overflow-hidden
              ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            >
              {loading ? (
                <div className="flex flex-col justify-center items-center py-16">
                  <div className="relative">
                    <FaSpinner className={`animate-spin w-12 h-12 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className={`absolute inset-0 rounded-full border-4 animate-pulse
                      ${theme === 'dark' ? 'border-blue-900' : 'border-blue-100'}`}></div>
                  </div>
                  <p className={`font-medium mt-4 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Loading KYC records...</p>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Please wait while we fetch the data</p>
                </div>
              ) : error ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className={`rounded-full p-4 mb-4
                    ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'}`}
                  >
                    <FaTimesCircle className={`w-8 h-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Error Loading Data</h3>
                  <p className={`text-center max-w-md ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
                  <button 
                    onClick={fetchKYCForms}
                    className={`mt-4 px-6 py-2 rounded-lg transition-colors duration-200
                      ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    Try Again
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className={`rounded-full p-4 mb-4
                    ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    <FaUser className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Records Found</h3>
                  <p className={`text-center max-w-md ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {search || projectFilter || statusFilter || designationFilter || employeeIdFilter 
                      ? "No KYC records match your current filters. Try adjusting your search criteria."
                      : "No KYC records available at the moment."
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Search and Filter Section - Integrated */}
                  <div className={`px-6 py-4 border-b flex flex-col lg:flex-row gap-4 items-start lg:items-center
                    ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="relative">
                        <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4
                          ${theme === 'dark' ? 'text-blue-300' : 'text-gray-400'}`}
                        />
                        <input
                          type="text"
                          placeholder="Search by employee name or ID..."
                          value={search}
                          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200
                            ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-100 placeholder-blue-300 focus:ring-blue-700' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                          ${showFilters 
                            ? theme === 'dark' ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-200'
                            : theme === 'dark' ? 'bg-gray-800 text-blue-200 border border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}
                        `}
                      >
                        <FaFilter className="w-4 h-4" />
                        Filters
                        <span className={`text-xs px-2 py-1 rounded-full ml-1
                          ${theme === 'dark' ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-700'}`}
                        >
                          {[projectFilter, statusFilter, designationFilter, employeeIdFilter].filter(Boolean).length
                          }
                        </span>
                      </button>
                      <button
                        onClick={() => setModal({ type: 'joiner', data: null })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                          ${modal?.type === 'joiner'
                            ? theme === 'dark' ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-200'
                            : theme === 'dark' ? 'bg-gray-800 text-blue-200 border border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}
                        `}
                      >
                        <FaUsers className="w-4 h-4" />
                        New Joiners
                      </button>
                    </div>
                  </div>

                  {/* Advanced Filters Panel */}
                  {showFilters && (
                    <div className={`mt-4 pt-4 border-t
                      ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Project Filter */}
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2
                            ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}
                          >
                            <FaBuilding className="w-3 h-3 inline mr-1" />
                            Project
                          </label>
                          <select
                            value={projectFilter}
                            onChange={e => { setProjectFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm
                              ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-100 focus:ring-blue-700' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'}`}
                          >
                            <option value="">All Projects</option>
                            {projectNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2
                            ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}
                          >
                            <FaListAlt className="w-3 h-3 inline mr-1" />
                            Status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm
                              ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-100 focus:ring-blue-700' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'}`}
                          >
                            <option value="">All Status</option>
                            {statusOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>

                        {/* Designation Filter */}
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2
                            ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}
                          >
                            <FaBriefcase className="w-3 h-3 inline mr-1" />
                            Designation
                          </label>
                          <select
                            value={designationFilter}
                            onChange={e => { setDesignationFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm
                              ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-100 focus:ring-blue-700' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'}`}
                          >
                            <option value="">All Designations</option>
                            {designationOptions.map(designation => (
                              <option key={designation} value={designation}>{designation}</option>
                            ))}
                          </select>
                        </div>

                        {/* Employee ID Filter */}
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2
                            ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}
                          >
                            <FaUser className="w-3 h-3 inline mr-1" />
                            Employee ID
                          </label>
                          <input
                            type="text"
                            value={employeeIdFilter}
                            onChange={e => { setEmployeeIdFilter(e.target.value); setCurrentPage(1); }}
                            placeholder="Enter employee ID..."
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm
                              ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-100 placeholder-blue-300 focus:ring-blue-700' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
                          />
                        </div>
                      </div>

                      {/* Clear Filters */}
                      <div className={`flex items-center justify-between mt-4 pt-4 border-t
                        ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          {(projectFilter || employeeIdFilter || search || statusFilter || designationFilter) && (
                            <button
                              onClick={() => { 
                                setProjectFilter(""); 
                                setEmployeeIdFilter(""); 
                                setSearch(""); 
                                setStatusFilter(""); 
                                setDesignationFilter(""); 
                                setCurrentPage(1); 
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                                ${theme === 'dark' ? 'bg-red-900/30 text-red-200 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                            >
                              <FaTimesCircle className="w-4 h-4" />
                              Clear All Filters
                            </button>
                          )}
                        </div>
                        <div className={`text-right text-sm
                          ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}
                        >
                          Showing <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filtered.length}</span> of <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycForms.length}</span> records
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KYC Records Table */}
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y
                      ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}
                    >
                      <thead className={theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}>
                        <tr>
                          {/* Column Headers */}
                          {[
                            { title: 'Employee', icon: FaUser, sortKey: 'name' },
                            { title: 'Designation', icon: FaBriefcase, sortKey: 'designation' },
                            { title: 'Project', icon: FaBuilding, sortKey: 'project' },
                            { title: 'Status', icon: FaListAlt, sortKey: 'status' },
                            { title: 'Actions', icon: FaEdit }
                          ].map(col => (
                            <th
                              key={col.title}
                              className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors duration-200
                                ${theme === 'dark' ? 'text-blue-200 hover:bg-blue-950' : 'text-gray-600 hover:bg-blue-50'}`}
                              onClick={() => col.sortKey && handleSort(col.sortKey as any)}
                            >
                              <div className="flex items-center gap-2">
                                <col.icon className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                                {col.title}
                                {col.sortKey && getSortIcon(col.sortKey as any)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}>
                        {paginated.map(form => (
                          <tr key={form._id} className={`transition-all duration-200 group
                            ${theme === 'dark' ? 'hover:bg-blue-950' : 'hover:bg-blue-50'}`}
                          >
                            {/* Employee Cell */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {form.personalDetails.employeeImage ? (
                                    <img
                                      src={form.personalDetails.employeeImage}
                                      alt={form.personalDetails.fullName}
                                      className={`w-12 h-12 rounded-full object-cover border-2 shadow-sm group-hover:border-blue-300 transition-colors duration-200
                                        ${theme === 'dark' ? 'border-blue-900' : 'border-gray-200'}`}
                                    />
                                  ) : (
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm group-hover:border-blue-300
                                      ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}
                                    >
                                      <FaUser className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`} />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className={`text-sm font-semibold group-hover:text-blue-400 transition-colors duration-200
                                    ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                                  >
                                    {form.personalDetails.fullName}
                                  </div>
                                  <div className={`text-xs font-mono mt-1
                                    ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}
                                  >
                                    {form.personalDetails.employeeId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {/* Designation Cell */}
                            <td className={`px-6 py-4 whitespace-nowrap
                              ${theme === 'dark' ? 'text-blue-100' : 'text-gray-700'} font-medium`}
                            >{form.personalDetails.designation}</td>
                            {/* Project Cell */}
                            <td className={`px-6 py-4 whitespace-nowrap
                              ${theme === 'dark' ? 'text-blue-100' : 'text-gray-700'} font-medium`}
                            >{form.personalDetails.projectName}</td>
                            {/* Status Cell */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200
                                ${theme === 'dark'
                                  ? form.status.toLowerCase() === 'approved'
                                    ? 'bg-emerald-900/30 text-emerald-200 border-emerald-800'
                                    : form.status.toLowerCase() === 'pending'
                                      ? 'bg-amber-900/30 text-amber-200 border-amber-800'
                                      : form.status.toLowerCase() === 'rejected'
                                        ? 'bg-red-900/30 text-red-200 border-red-800'
                                        : 'bg-gray-700 text-gray-200 border-gray-600'
                                  : getStatusColor(form.status)
                                }`}
                              >
                                {form.status === 'approved' && <FaCheckCircle className="w-3 h-3 mr-1" />}
                                {form.status === 'pending' && <FaClock className="w-3 h-3 mr-1" />}
                                {form.status === 'rejected' && <FaTimesCircle className="w-3 h-3 mr-1" />}
                                {form.status}
                              </span>
                            </td>
                            {/* Actions Cell */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setModal({ type: 'edit', data: form })}
                                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105
                                    ${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                  title="Edit KYC"
                                >
                                  <FaEdit className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => setModal({ type: 'view', data: form })}
                                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105
                                    ${theme === 'dark' ? 'bg-gray-700 text-blue-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                  title="View Details"
                                >
                                  <FaEye className="w-3 h-3" />
                                  View
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this KYC record? This action cannot be undone.')) {
                                      try {
                                        await fetch(`https://cafm.zenapi.co.in/api/kyc/${form.personalDetails.employeeId}`, { method: 'DELETE' });
                                        setKYCForms(prev => prev.filter(f => f._id !== form._id));
                                        setToast({ type: 'success', message: 'KYC record deleted successfully.' });
                                      } catch {
                                        setToast({ type: 'error', message: 'Failed to delete KYC record.' });
                                      }
                                    }
                                  }}
                                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105
                                    ${theme === 'dark' ? 'bg-red-900/30 text-red-200 hover:bg-red-900/50' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                  title="Delete KYC"
                                >
                                  <FaTrash className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className={`px-6 py-4 border-t flex items-center justify-between
                      ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className={`text-sm
                        ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}
                      >
                        Showing <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                        <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{Math.min(currentPage * rowsPerPage, filtered.length)}</span>{' '}
                        of <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filtered.length}</span> results
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                            ${theme === 'dark' ? 'text-blue-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed' : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
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
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                                  ${currentPage === pageNum
                                    ? theme === 'dark' ? 'bg-blue-700 text-white shadow-md' : 'bg-blue-600 text-white shadow-md'
                                    : theme === 'dark' ? 'text-blue-200 bg-gray-800 border border-gray-700 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                            ${theme === 'dark' ? 'text-blue-200 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed' : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                        >
                          Next
                          <FaChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Rendering */}
        {modal && (
          <>
            {/* New Joiners Modal */}
            {modal.type === 'joiner' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-500 bg-opacity-30 rounded-xl p-3">
                          <FaUsers className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">New Joiners Report</h2>
                          <p className="text-blue-100 text-sm">Employees who joined in the last {timeFrame} days</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setModal(null)}
                        className="text-white hover:text-blue-100 transition-colors duration-200"
                      >
                        <FaTimes className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6">
                    {/* Time Frame Selector */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Time Frame</label>
                      <select
                        value={timeFrame}
                        onChange={(e) => setTimeFrame(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={7}>Last 7 days</option>
                        <option value={15}>Last 15 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={60}>Last 60 days</option>
                        <option value={90}>Last 90 days</option>
                      </select>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                      <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search new joiners..."
                          value={newJoinersSearch}
                          onChange={(e) => setNewJoinersSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* New Joiners List */}
                    <div className="max-h-96 overflow-y-auto">
                      {newJoinersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <FaSpinner className="animate-spin text-blue-600 w-8 h-8" />
                          <span className="ml-3 text-gray-600">Loading new joiners...</span>
                        </div>
                      ) : newJoinersError ? (
                        <div className="text-center py-8">
                          <FaTimesCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                          <p className="text-red-600">{newJoinersError}</p>
                        </div>
                      ) : filteredNewJoiners.length === 0 ? (
                        <div className="text-center py-8">
                          <FaUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No new joiners found for the selected time frame.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredNewJoiners.map((joiner, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <FaUser className="w-6 h-6 text-blue-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{joiner.fullName}</h3>
                                    <p className="text-sm text-gray-600">{joiner.designation}</p>
                                    <p className="text-xs text-gray-500">ID: {joiner.employeeId}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-blue-600">{joiner.projectName}</p>
                                  <p className="text-xs text-gray-500">Joined: {new Date(joiner.dateOfJoining).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View KYC Modal */}
            {modal.type === 'view' && (
              <ViewKYCModal
                open={true}
                kycData={modal.data}
                onClose={() => setModal(null)}
              />
            )}

            {/* Edit KYC Modal */}
            {modal.type === 'edit' && (
              <EditKYCModal
                open={true}
                kycData={modal.data}
                onClose={() => setModal(null)}
                onSave={(updatedData: KYCForm) => {
                  setKYCForms(prev => prev.map(f => f._id === updatedData._id ? updatedData : f));
                  setToast({ type: 'success', message: 'KYC record updated successfully.' });
                  setModal(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}
