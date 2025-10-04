"use client";

import React, { useEffect, useState } from "react";
import CoordinatorDashboardLayout from "@/components/dashboard/CoordinatorDashboardLayout";
import { FaIdCard, FaUser, FaSpinner, FaSearch, FaCheckCircle, FaTimesCircle, FaUsers, FaTimes } from "react-icons/fa";
import EditKYCModal from "@/components/dashboard/EditKYCModal";
import ViewKYCModal from "@/components/dashboard/ViewKYCModal";
import CreateKYCForm from '../create/CreateKYCForm';
import { useTheme } from "@/context/ThemeContext";
import Image from 'next/image';

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

// This represents the data structure coming from EditKYCModal, which lacks `_id`
type KYCDataFromModal = Omit<KYCForm, '_id'>;

export default function ViewAllKYCPage() {
  const { theme } = useTheme();
  const [kycForms, setKYCForms] = useState<KYCForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [statusFilter] = useState("All Status");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [newJoiners, setNewJoiners] = useState<NewJoiner[]>([]);
  const [newJoinersLoading, setNewJoinersLoading] = useState(false);
  const [newJoinersError, setNewJoinersError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState(30);
  const [modal, setModal] = useState<null | { type: 'joiner' | 'view' | 'edit', data: KYCForm | null }>(null);
  const [newJoinersSearch, setNewJoinersSearch] = useState("");
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [showCreateKycModal, setShowCreateKycModal] = useState(false);

  const designationOptions = Array.from(new Set(kycForms.map(f => f.personalDetails.designation))).filter(Boolean);

  useEffect(() => {
    fetchKYCForms();
  }, []);

  useEffect(() => {
    if (modal?.type === 'joiner') {
      fetchNewJoiners(timeFrame);
    }
  }, [modal?.type, timeFrame]);

  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/project/projects")
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Silently handle project loading error
      });
  }, []);

  const fetchKYCForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const data = await res.json();
      setKYCForms(data.kycForms || []);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to fetch KYC forms: ${err.message}`);
      } else {
        setError("An unknown error occurred while fetching KYC forms.");
      }
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
    } catch (err) {
        if (err instanceof Error) {
            setNewJoinersError(`Failed to fetch new joiners data: ${err.message}`);
        } else {
            setNewJoinersError("An unknown error occurred while fetching new joiners.");
        }
    } finally {
      setNewJoinersLoading(false);
    }
  };

  // Calculate filtered and paginated data
  const filtered = kycForms
    .filter(form => {
      const matchesProject = projectFilter === "All Projects" || form.personalDetails.projectName === projectFilter;
      const matchesDesignation = designationFilter === "All Designations" || form.personalDetails.designation === designationFilter;
      const matchesStatus = statusFilter === "All Status" || form.status === statusFilter;
      const matchesSearch = search ? (
        form.personalDetails.fullName.toLowerCase().includes(search.toLowerCase()) ||
        form.personalDetails.employeeId.toLowerCase().includes(search.toLowerCase())
      ) : true;
      return matchesProject && matchesDesignation && matchesStatus && matchesSearch;
    });



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



  return (
    <CoordinatorDashboardLayout>
      <div className={`min-h-screen flex flex-col items-center justify-center py-8 transition-colors duration-200 ${theme === "dark" ? "bg-gray-900" : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"}`}>

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

            {/* Create KYC Form */}
            {showCreateKycModal && (
              <div className="mb-6">
                <CreateKYCForm />
              </div>
            )}

            {/* Enhanced Data Table */}
            <div className="overflow-hidden">
              {/* Filter Row - Match Employee Management Page */}
              <div className="flex flex-row flex-wrap gap-2 px-6 py-4 border-b items-center w-full
                ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}">
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
                    {["All Projects", ...projectList.map(p => p.projectName)].map(project => (
                      <option key={project} value={project}>{project}</option>
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
                    {["All Designations", ...designationOptions].map(designation => (
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
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const found = filtered.find(form =>
                          form.personalDetails.employeeId.toLowerCase() === search.toLowerCase() ||
                          form.personalDetails.fullName.toLowerCase() === search.toLowerCase()
                        );
                        if (found) {
                          setModal({ type: 'view', data: found });
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
                {/* New Joiners and Create KYC Buttons */}
                <div className="flex items-center gap-3">
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
                  <button
                    onClick={() => setShowCreateKycModal(prev => !prev)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${showCreateKycModal
                        ? theme === 'dark' ? 'bg-green-900 text-green-200 border border-green-700' : 'bg-green-100 text-green-700 border border-green-200'
                        : theme === 'dark' ? 'bg-gray-800 text-green-200 border border-gray-700 hover:bg-gray-700' : 'bg-white text-green-700 border border-gray-200 hover:bg-gray-50'}
                    `}
                  >
                    <FaIdCard className="w-4 h-4" />
                    {showCreateKycModal ? 'Close KYC' : 'Create KYC'}
                  </button>
                </div>
              </div>

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
                    {search || projectFilter !== 'All Projects' || statusFilter !== 'All Status' || designationFilter !== 'All Designations'
                      ? "No KYC records match your current filters. Try adjusting your search criteria."
                      : "No KYC records available at the moment."
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Excel-like Table */}
                  <div className={`overflow-x-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
                    <table className="w-full text-sm table-auto border-separate min-w-[1000px]" style={{ borderSpacing: 0 }}>
                      <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                        <tr>
                          <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-16 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Photo</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-24 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee ID</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-32 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee Name</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-28 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-32 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-28 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Phone</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-32 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date of Joining</th>
                          <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-24 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                        {filtered.map((form, index) => (
                          <tr key={form._id} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                            <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{index + 1}</td>
                            <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                              {form.personalDetails.employeeImage ? (
                                <Image
                                  src={form.personalDetails.employeeImage}
                                  alt={form.personalDetails.fullName}
                                  width={32}
                                  height={32}
                                  className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                                />
                              ) : (
                                <div className={`w-8 h-8 rounded flex items-center justify-center border ${theme === 'dark' ? 'bg-gray-700 border-blue-900' : 'bg-gray-200 border-blue-200'}`}>
                                  <FaUser className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`} />
                                </div>
                              )}
                            </td>
                            <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{form.personalDetails.employeeId}</td>
                            <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={form.personalDetails.fullName}>{form.personalDetails.fullName}</div></td>
                            <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={form.personalDetails.designation}>{form.personalDetails.designation}</div></td>
                            <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={form.personalDetails.projectName}>{form.personalDetails.projectName}</div></td>
                            <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                              <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                                form.status === 'approved' 
                                  ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                                  : form.status === 'pending'
                                  ? theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                                  : form.status === 'rejected'
                                  ? theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                                  : theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {form.status}
                              </span>
                            </td>
                            <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={form.personalDetails.phoneNumber}>{form.personalDetails.phoneNumber}</div></td>
                            <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                              {new Date(form.personalDetails.dateOfJoining).toLocaleDateString()}
                            </td>
                            <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setModal({ type: 'view', data: form })}
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
                                  onClick={() => setModal({ type: 'edit', data: form })}
                                  title="Edit KYC"
                                  className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                    theme === 'dark' 
                                      ? 'border-green-500 text-green-400 bg-gray-800 hover:bg-gray-700 focus:ring-green-400' 
                                      : 'border-green-500 text-green-600 bg-white hover:bg-green-50 focus:ring-green-400'
                                  }`}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

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
            {modal.type === 'view' && modal.data && (
              <ViewKYCModal
                open={true}
                kycData={modal.data}
                onClose={() => setModal(null)}
              />
            )}

            {/* Edit KYC Modal */}
            {modal.type === 'edit' && modal.data && (
              <EditKYCModal
                open={true}
                kycData={modal.data}
                onClose={() => setModal(null)}
                onSave={(updatedData: KYCDataFromModal) => {
                  if (modal.data?._id) {
                    const fullData: KYCForm = { ...updatedData, _id: modal.data._id };
                    setKYCForms(prev => prev.map(f => f._id === fullData._id ? fullData : f));
                    setToast({ type: 'success', message: 'KYC record updated successfully.' });
                  }
                  setModal(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </CoordinatorDashboardLayout>
  );
}
