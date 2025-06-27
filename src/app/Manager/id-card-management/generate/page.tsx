"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import IDCardModal from "@/components/dashboard/IDCardModal";
import { FaIdCard, FaSpinner, FaDownload, FaSearch, FaUser, FaClock, FaCheckCircle, FaTimesCircle, FaCheck, FaTimes, FaFilter, FaCalendarAlt,  FaChevronDown, FaChevronUp, FaInfoCircle, } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import Image from "next/image";

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  phoneNumber?: string;
  kycApprovalDate?: string;
  status: string;
  email?: string;
  approvalDate?: string;
  employeeImage?: string;
}

interface KycForm {
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
    employeeImage: string;
    bloodGroup: string;
    phoneNumber: string;
    email: string;
    kycApprovalDate: string;
    status: string;
  };
}

interface ReadyToIssueItem {
  idCardId: string;
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  requestDate: string;
  approvedBy: string;
  approvalDate: string;
  employeeImage?: string;
  bloodGroup?: string;
}

interface IDCardRequest {
  _id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  employeeImage?: string;
  status: 'Requested' | 'Approved' | 'Rejected' | 'Issued';
  requestDate: string;
  approvedBy?: string;
  approvedDate?: string;
  issuedBy?: string;
  issuedDate?: string;
  rejectionReason?: string;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface WorkflowStatus {
  totalEmployees: number;
  kycPending: number;
  kycApproved: number;
  kycRejected: number;
  canRequestIdCard: number;
  idCardRequested: number;
  idCardApproved: number;
  idCardIssued: number;
  idCardRejected: number;
  readyToIssue: number;
}

interface RecentActivity {
  type: string;
  employeeId: string;
  fullName: string;
  date: string;
}

interface BulkOperationRequest {
  idCardIds: string[];
  approvedBy?: string;
  issuedBy?: string;
}

interface FilterOptions {
  status: string;
  project: string;
  designation: string;
  dateRange: {
    start: string;
    end: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface IDCardData {
  fullName: string;
  employeeId: string;
  designation: string;
  projectName: string;
  bloodGroup?: string;
  employeeImage?: string;
  qrCodeImage: string;
  validUntil: string;
}

export default function GenerateIDCardPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('generate');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<IDCardRequest[]>([]);
  const [allRequests, setAllRequests] = useState<IDCardRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [idCardData, setIdCardData] = useState<IDCardData | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    project: '',
    designation: '',
    dateRange: { start: '', end: '' },
    sortBy: 'requestDate',
    sortOrder: 'desc'
  });

  const tabs = [
    { id: 'generate', title: 'Generate Request', icon: FaIdCard },
    { id: 'pending', title: 'Pending Requests', icon: FaClock },
    { id: 'approved', title: 'Approved Cards', icon: FaCheckCircle },
    { id: 'workflow', title: 'Workflow Status', icon: FaInfoCircle },
  ];

  useEffect(() => {
    fetchEmployees();
    fetchAllRequests();
    fetchWorkflowStatus();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/kyc/approved-kyc/no-idcard-request");
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      setEmployees(data.data || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
      if (!response.ok) {
        throw new Error('Failed to fetch employee details');
      }
      const data = await response.json();
      
      if (data.kycForms) {
        const employee = data.kycForms.find((form: KycForm) => 
          form.personalDetails.employeeId === employeeId
        );
        
        if (employee) {
          return {
            employeeId: employee.personalDetails.employeeId,
            fullName: employee.personalDetails.fullName,
            designation: employee.personalDetails.designation,
            projectName: employee.personalDetails.projectName,
            employeeImage: employee.personalDetails.employeeImage,
            bloodGroup: employee.personalDetails.bloodGroup,
            phoneNumber: employee.personalDetails.phoneNumber,
            email: employee.personalDetails.email,
            kycApprovalDate: employee.personalDetails.kycApprovalDate,
            status: employee.personalDetails.status
          };
        }
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch employee details:", err);
      return null;
    }
  };

  const fetchAllRequests = async () => {
    setLoadingRequests(true);
    try {
      // Fetch pending requests
      const pendingResponse = await fetch("https://cafm.zenapi.co.in/api/id-cards/pending-requests");
      if (!pendingResponse.ok) {
        throw new Error('Failed to fetch pending ID card requests');
      }
      const pendingData = await pendingResponse.json();
      console.log('Pending Requests API Response:', pendingData);
      
      // Fetch ready to issue requests
      const readyToIssueResponse = await fetch("https://cafm.zenapi.co.in/api/id-cards/ready-to-issue");
      if (!readyToIssueResponse.ok) {
        throw new Error('Failed to fetch ready to issue requests');
      }
      const readyToIssueData = await readyToIssueResponse.json();
      console.log('Ready to Issue API Response:', readyToIssueData);
      
      // Fetch all requests (for other statuses)
      const allResponse = await fetch("https://cafm.zenapi.co.in/api/id-cards/all");
      if (!allResponse.ok) {
        throw new Error('Failed to fetch all ID card requests');
      }
      const allData = await allResponse.json();
      console.log('All Requests API Response:', allData);
      
      // Combine all requests
      let allRequests: IDCardRequest[] = [];
      
      // Add pending requests
      if (pendingData.data && pendingData.data.pendingRequests) {
        allRequests = [...(pendingData.data.pendingRequests as IDCardRequest[])];
      }
      
      // Add ready to issue requests (convert to IDCardRequest format)
      if (readyToIssueData.data && Array.isArray(readyToIssueData.data)) {
        const readyToIssueRequests = readyToIssueData.data.map((item: ReadyToIssueItem) => ({
          _id: item.idCardId,
          employeeId: item.employeeId,
          fullName: item.fullName,
          designation: item.designation,
          projectName: item.projectName,
          status: 'Approved' as const,
          requestDate: item.requestDate,
          approvedBy: item.approvedBy,
          approvedDate: item.approvalDate,
          validUntil: new Date(new Date(item.requestDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          employeeImage: item.employeeImage,
          bloodGroup: item.bloodGroup,
        }));
        allRequests = [...allRequests, ...readyToIssueRequests];
      }
      
      // Add other requests (issued, rejected) from all endpoint
      if (allData.idCards) {
        const otherRequests = (allData.idCards as IDCardRequest[]).filter((req: IDCardRequest) => 
          req.status !== 'Requested' && req.status !== 'Approved'
        );
        allRequests = [...allRequests, ...otherRequests];
      } else if (allData.data) {
        const otherRequests = (allData.data as IDCardRequest[]).filter((req: IDCardRequest) => 
          req.status !== 'Requested' && req.status !== 'Approved'
        );
        allRequests = [...allRequests, ...otherRequests];
      } else if (Array.isArray(allData)) {
        const otherRequests = (allData as IDCardRequest[]).filter((req: IDCardRequest) => 
          req.status !== 'Requested' && req.status !== 'Approved'
        );
        allRequests = [...allRequests, ...otherRequests];
      }
      
      setAllRequests(allRequests);
      setPendingRequests(allRequests.filter((req: IDCardRequest) => req.status === 'Requested'));
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to fetch ID card requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchWorkflowStatus = async () => {
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/id-cards/workflow-summary");
      if (!response.ok) {
        throw new Error('Failed to fetch workflow status');
      }
      const data = await response.json();
      console.log('Workflow Summary API Response:', data);
      setWorkflowStatus(data.data?.workflowStats || null);
      setRecentActivities(data.data?.recentActivities || []);
    } catch (err) {
      console.error("Failed to fetch workflow status:", err);
    }
  };

  const handleGenerateRequest = async () => {
    if (!selectedEmployee) {
      setError("Please select an employee.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/id-cards/${selectedEmployee}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate ID card request');
      }

      setSuccess('ID Card request generated successfully and pending approval');
      setGeneratedCard(data.idCard);
      setSelectedEmployee("");
      
      // Refresh the requests list and workflow status with a small delay
      setTimeout(() => {
        fetchAllRequests();
        fetchWorkflowStatus();
      }, 1000);
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred while generating the request.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
    try {
      const requestBody = {
        status,
        approvedBy: "HR Manager",
        ...(status === 'Rejected' && { rejectionReason })
      };

      const response = await fetch(`https://cafm.zenapi.co.in/api/id-cards/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update request status');
      }

      setSuccess(`Request ${status.toLowerCase()} successfully`);
      fetchAllRequests();
      fetchWorkflowStatus();
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred while updating the request.");
    }
  };

  const handleIssueCard = async (request: IDCardRequest) => {
    try {
      const issueResponse = await fetch(`https://cafm.zenapi.co.in/api/id-cards/${request._id}/issue`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuedBy: "HR Manager"
        }),
      });

      const issueData = await issueResponse.json();

      if (!issueResponse.ok) {
        throw new Error(issueData.message || 'Failed to issue ID card');
      }

      // Now generate QR Code
      const qrResponse = await fetch(`https://cafm.zenapi.co.in/api/qr-code/generate/${request.employeeId}`, {
        method: 'POST'
      });
      const qrData = await qrResponse.json();

      if (!qrResponse.ok) {
        // Even if QR fails, the card is issued. Show success with a warning.
        setError("Card issued, but failed to generate QR code.");
      }

      // Fetch employee details including image
      const employeeDetails = await fetchEmployeeDetails(request.employeeId);

      setIdCardData({
        fullName: request.fullName,
        employeeId: request.employeeId,
        designation: request.designation,
        projectName: request.projectName,
        qrCodeImage: qrData.qrCode?.qrCodeImage || '',
        validUntil: request.validUntil || new Date().toISOString(),
        bloodGroup: employeeDetails?.bloodGroup || request.bloodGroup,
        employeeImage: employeeDetails?.employeeImage || request.employeeImage
      });
      setShowIdCardModal(true);

      setSuccess('ID Card issued successfully');
      fetchAllRequests();
      fetchWorkflowStatus();
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred while issuing the card.");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) {
      setError("Please select requests to approve");
      return;
    }

    setBulkLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const requestBody: BulkOperationRequest = {
        idCardIds: selectedRequests,
        approvedBy: "HR Manager"
      };

      const response = await fetch("https://cafm.zenapi.co.in/api/id-cards/bulk-approve", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to bulk approve requests');
      }

      setSuccess(`Successfully approved ${selectedRequests.length} requests`);
      setSelectedRequests([]);
      fetchAllRequests();
      fetchWorkflowStatus();
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred while bulk approving requests.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkIssue = async () => {
    if (selectedRequests.length === 0) {
      setError("Please select requests to issue");
      return;
    }

    setBulkLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const requestBody: BulkOperationRequest = {
        idCardIds: selectedRequests,
        issuedBy: "HR Manager"
      };

      const response = await fetch("https://cafm.zenapi.co.in/api/id-cards/bulk-issue", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to bulk issue cards');
      }

      setSuccess(`Successfully issued ${selectedRequests.length} ID cards`);
      setSelectedRequests([]);
      fetchAllRequests();
      fetchWorkflowStatus();
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred while bulk issuing cards.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests(prevSelectedRequests => {
      if (prevSelectedRequests.includes(requestId)) {
        return prevSelectedRequests.filter(id => id !== requestId);
      } else {
        return [...prevSelectedRequests, requestId];
      }
    });
  };

  const handleSelectAllRequests = (requests: IDCardRequest[]) => {
    if (selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(requests.map(req => req._id));
    }
  };

  // Get unique values for filter options
  const uniqueProjects = [...new Set(allRequests.map(req => req.projectName))];
  const uniqueDesignations = [...new Set(allRequests.map(req => req.designation))];
  const uniqueStatuses = [...new Set(allRequests.map(req => req.status))];

  // Apply filters and search
  const filteredRequests = allRequests
    .filter((req) => {
      const matchesSearch = 
        req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !filters.status || req.status === filters.status;
      const matchesProject = !filters.project || req.projectName === filters.project;
      const matchesDesignation = !filters.designation || req.designation === filters.designation;
      
      const matchesDateRange = !filters.dateRange.start || !filters.dateRange.end || 
        (req.requestDate && 
         new Date(req.requestDate) >= new Date(filters.dateRange.start) &&
         new Date(req.requestDate) <= new Date(filters.dateRange.end));

      return matchesSearch && matchesStatus && matchesProject && matchesDesignation && matchesDateRange;
    })
    .sort((a, b) => {
      let aValue: string | Date, bValue: string | Date;
      
      switch (filters.sortBy) {
        case 'fullName':
          aValue = a.fullName;
          bValue = b.fullName;
          break;
        case 'employeeId':
          aValue = a.employeeId;
          bValue = b.employeeId;
          break;
        case 'designation':
          aValue = a.designation;
          bValue = b.designation;
          break;
        case 'projectName':
          aValue = a.projectName;
          bValue = b.projectName;
          break;
        case 'requestDate':
          aValue = new Date(a.requestDate);
          bValue = new Date(b.requestDate);
          break;
        default:
          aValue = a.fullName;
          bValue = b.fullName;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Issued':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      project: '',
      designation: '',
      dateRange: { start: '', end: '' },
      sortBy: 'requestDate',
      sortOrder: 'desc'
    });
    setSearchTerm('');
  };

  const activeFiltersCount = [
    filters.status,
    filters.project,
    filters.designation,
    filters.dateRange.start,
    filters.dateRange.end,
    searchTerm
  ].filter(Boolean).length;

  const getTabRequests = () => {
    switch (activeTab) {
      case 'pending':
        return filteredRequests.filter(req => req.status === 'Requested');
      case 'approved':
        return filteredRequests.filter(req => req.status === 'Approved' || req.status === 'Issued');
      default:
        return filteredRequests;
    }
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
      } p-6`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className={`flex items-center gap-6 rounded-2xl px-8 py-8 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-gray-800 to-gray-700'
                : 'bg-gradient-to-r from-blue-600 to-blue-500'
            }`}>
              <div className={`flex items-center justify-center w-16 h-16 rounded-xl ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-500 bg-opacity-30'
              }`}>
                <FaIdCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">ID Card Management</h1>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-blue-100'}`}>
                  Generate and manage employee identification cards
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={`rounded-3xl p-2 mb-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          } border border-gray-200 shadow-lg`}>
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all duration-200 ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-gray-700 text-blue-400 shadow-lg'
                          : 'bg-blue-600 text-white shadow-lg'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'generate' && (
              <motion.div
                key="generate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`rounded-3xl p-8 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                } shadow-lg`}
              >
                {/* Instructions Panel */}
                <div className={`mb-8 p-6 rounded-2xl border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-blue-900/20' 
                        : 'bg-blue-600 bg-opacity-10'
                    }`}>
                      <FaInfoCircle className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>ID Card Generation Process</h2>
                      <ul className={`mt-2 space-y-2 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <li className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                          }`}></span>
                          <span>Only employees with approved KYC are eligible for ID card generation</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                          }`}></span>
                          <span>Select an employee from the dropdown to view their details</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                          }`}></span>
                          <span>Generate ID card request for approval by HR/Admin</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                          }`}></span>
                          <span>Once approved, the ID card can be issued to the employee</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Generation Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div>
                    <label
                      htmlFor="employee"
                      className={`block text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      } mb-2`}
                    >
                      Select Employee
                    </label>
                    <div className="relative">
                      <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                      }`} />
                      <select
                        id="employee"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-gray-200'
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="" disabled>
                          -- Select an employee with approved KYC --
                        </option>
                        {employees.map((emp) => (
                          <option key={emp.employeeId} value={emp.employeeId}>
                            {emp.fullName} ({emp.employeeId}) - {emp.designation} | {emp.projectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected Employee Details */}
                    {selectedEmployee && (
                      <div className={`mt-4 p-4 rounded-xl border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        {(() => {
                          const selectedEmp = employees.find(emp => emp.employeeId === selectedEmployee);
                          if (!selectedEmp) return null;
                          
                          return (
                            <div className="space-y-2">
                              <h4 className={`font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Selected Employee Details</h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Name:</span>
                                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedEmp.fullName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Designation:</span>
                                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedEmp.designation}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Project:</span>
                                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedEmp.projectName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Phone:</span>
                                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedEmp.phoneNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>KYC Approved:</span>
                                  <span className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>
                                    {new Date(selectedEmp.kycApprovalDate || '').toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleGenerateRequest}
                      disabled={loading || !selectedEmployee}
                      className={`w-full px-8 py-4 rounded-xl text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        loading || !selectedEmployee
                          ? theme === 'dark'
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gray-400 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin" /> Generating Request...
                        </>
                      ) : (
                        <>
                          <FaIdCard /> Generate Request
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated Card Preview */}
                {generatedCard && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 pt-6 border-t border-gray-200"
                  >
                    <h2 className={`text-xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    } mb-4`}>Generated Request</h2>
                    <div className={`rounded-2xl p-6 border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-green-50 border-green-200'
                    } flex items-center justify-between`}>
                      <div className="flex items-center gap-4">
                        <FaCheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <p className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>Request Generated Successfully</p>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>Pending approval from HR/Admin</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setGeneratedCard(null)}
                        className={`p-2 rounded-lg ${
                          theme === 'dark'
                            ? 'hover:bg-gray-600 text-gray-400'
                            : 'hover:bg-green-100 text-green-600'
                        }`}
                      >
                        <FaTimes className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {(activeTab === 'pending' || activeTab === 'approved') && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Bulk Operations */}
                {selectedRequests.length > 0 && (
                  <div className={`rounded-3xl p-6 border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-blue-50 border-blue-200'
                  } shadow-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FaCheckCircle className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                        <div>
                          <h3 className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            Bulk Operations
                          </h3>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {selectedRequests.length} request{selectedRequests.length !== 1 ? 's' : ''} selected
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {activeTab === 'pending' && (
                          <button
                            onClick={handleBulkApprove}
                            disabled={bulkLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm disabled:opacity-50"
                          >
                            {bulkLoading ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <FaCheck className="w-4 h-4" />
                            )}
                            Bulk Approve
                          </button>
                        )}
                        {activeTab === 'approved' && (
                          <button
                            onClick={handleBulkIssue}
                            disabled={bulkLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm disabled:opacity-50"
                          >
                            {bulkLoading ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <FaIdCard className="w-4 h-4" />
                            )}
                            Bulk Issue
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRequests([])}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <FaTimes className="w-4 h-4" />
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search and Filters */}
                <div className={`rounded-3xl p-8 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                } shadow-lg`}>
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Search Bar */}
                    <div className="flex-1">
                      <div className="relative">
                        <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                        }`} />
                        <input
                          type="text"
                          placeholder="Search by employee name or ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-gray-200'
                              : 'bg-gray-50 border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Filter Toggle */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          fetchAllRequests();
                          fetchWorkflowStatus();
                        }}
                        className={`flex items-center gap-2 px-6 py-4 rounded-xl border transition-all duration-200 ${
                          theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        <FaSpinner className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 py-4 rounded-xl border transition-all duration-200 ${
                          showFilters 
                            ? theme === 'dark'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-blue-600 text-white border-blue-600'
                            : theme === 'dark'
                              ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        <FaFilter />
                        Filters
                        {activeFiltersCount > 0 && (
                          <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                            {activeFiltersCount}
                          </span>
                        )}
                      </button>
                      
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={clearFilters}
                          className={`flex items-center gap-2 px-6 py-4 rounded-xl border transition-all duration-200 ${
                            theme === 'dark'
                              ? 'border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400'
                              : 'border-gray-300 text-gray-700 hover:border-red-500 hover:text-red-600'
                          }`}
                        >
                          <FaTimes />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Panel */}
                  {showFilters && (
                    <div className={`mt-6 p-6 rounded-2xl border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Status Filter */}
                        <div>
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          } mb-2`}>Status</label>
                          <select
                            value={filters.status}
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              theme === 'dark'
                                ? 'bg-gray-600 border-gray-500 text-gray-200'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>

                        {/* Project Filter */}
                        <div>
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          } mb-2`}>Project</label>
                          <select
                            value={filters.project}
                            onChange={(e) => setFilters({...filters, project: e.target.value})}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              theme === 'dark'
                                ? 'bg-gray-600 border-gray-500 text-gray-200'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="">All Projects</option>
                            {uniqueProjects.map(project => (
                              <option key={project} value={project}>{project}</option>
                            ))}
                          </select>
                        </div>

                        {/* Designation Filter */}
                        <div>
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          } mb-2`}>Designation</label>
                          <select
                            value={filters.designation}
                            onChange={(e) => setFilters({...filters, designation: e.target.value})}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              theme === 'dark'
                                ? 'bg-gray-600 border-gray-500 text-gray-200'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="">All Designations</option>
                            {uniqueDesignations.map(designation => (
                              <option key={designation} value={designation}>{designation}</option>
                            ))}
                          </select>
                        </div>

                        {/* Sort Options */}
                        <div>
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          } mb-2`}>Sort By</label>
                          <div className="flex gap-2">
                            <select
                              value={filters.sortBy}
                              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                              className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                theme === 'dark'
                                  ? 'bg-gray-600 border-gray-500 text-gray-200'
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="requestDate">Request Date</option>
                              <option value="fullName">Name</option>
                              <option value="employeeId">Employee ID</option>
                              <option value="designation">Designation</option>
                              <option value="projectName">Project</option>
                            </select>
                            <button
                              onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
                              className={`px-4 py-3 border rounded-lg hover:bg-gray-50 transition-all duration-200 ${
                                theme === 'dark'
                                  ? 'border-gray-500 hover:bg-gray-600 text-gray-200'
                                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {filters.sortOrder === 'asc' ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Date Range Filter */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          } mb-2`}>Request Date From</label>
                          <div className="relative">
                            <FaCalendarAlt className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                            <input
                              type="date"
                              value={filters.dateRange.start}
                              onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, start: e.target.value}})}
                              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                theme === 'dark'
                                  ? 'bg-gray-600 border-gray-500 text-gray-200'
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          } mb-2`}>Request Date To</label>
                          <div className="relative">
                            <FaCalendarAlt className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                            <input
                              type="date"
                              value={filters.dateRange.end}
                              onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, end: e.target.value}})}
                              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                theme === 'dark'
                                  ? 'bg-gray-600 border-gray-500 text-gray-200'
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Results Table */}
                <div className={`rounded-3xl border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                } shadow-lg overflow-hidden`}>
                  {loadingRequests ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="text-center">
                        <FaSpinner className="animate-spin text-blue-600 w-16 h-16 mx-auto mb-4" />
                        <p className={`text-lg ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>Loading requests...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-16 px-4">
                      <FaTimesCircle className="mx-auto text-red-500 w-16 h-16 mb-4" />
                      <h3 className={`text-xl font-semibold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>Failed to load data</h3>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{error}</p>
                    </div>
                  ) : getTabRequests().length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <FaIdCard className={`mx-auto w-16 h-16 mb-4 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <h3 className={`text-xl font-semibold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        No {activeTab === 'pending' ? 'pending requests' : 'approved cards'} found
                      </h3>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {searchTerm || activeFiltersCount > 0 
                          ? "Try adjusting your search or filter criteria" 
                          : activeTab === 'pending' 
                            ? "No pending ID card requests at the moment"
                            : "No approved ID cards found"}
                      </p>
                      {/* Debug Information */}
                      <div className={`mt-4 p-4 rounded-lg text-sm ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <p>Debug Info:</p>
                        <p>Total Requests: {allRequests.length}</p>
                        <p>Pending Requests: {pendingRequests.length}</p>
                        <p>Filtered Requests: {getTabRequests().length}</p>
                        <p>Search Term: &quot;{searchTerm}&quot;</p>
                        <p>Active Filters: {activeFiltersCount}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${
                          theme === 'dark'
                            ? 'bg-gray-700'
                            : 'bg-gradient-to-r from-gray-50 to-gray-100'
                        }`}>
                          <tr>
                            <th className="px-8 py-4 text-left">
                              <input
                                type="checkbox"
                                checked={selectedRequests.length === getTabRequests().length && getTabRequests().length > 0}
                                onChange={() => handleSelectAllRequests(getTabRequests())}
                                className={`rounded border-gray-300 ${
                                  theme === 'dark' ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                                }`}
                              />
                            </th>
                            <th className={`px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>Employee</th>
                            <th className={`px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>Designation</th>
                            <th className={`px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>Project</th>
                            <th className={`px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>Status</th>
                            <th className={`px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>Request Date</th>
                            <th className={`px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${
                          theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                        }`}>
                          {getTabRequests().map((request, index) => (
                            <tr key={request._id} className={`hover:bg-blue-50 transition-all duration-200 ${
                              index % 2 === 0 
                                ? theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                                : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                            }`}>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedRequests.includes(request._id)}
                                  onChange={() => handleSelectRequest(request._id)}
                                  className={`rounded border-gray-300 ${
                                    theme === 'dark' ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                                  }`}
                                />
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'
                                    }`}>
                                      {request.employeeImage ? (
                                        <Image src={request.employeeImage} alt={request.fullName} width={48} height={48} className="rounded-full" />
                                      ) : (
                                        <FaUser className={`w-6 h-6 ${
                                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                        }`} />
                                      )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                                      theme === 'dark' ? 'border-gray-800' : 'border-white'
                                    } ${
                                      request.status === 'Issued' ? 'bg-green-500' : 
                                      request.status === 'Approved' ? 'bg-blue-500' :
                                      request.status === 'Requested' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></div>
                                  </div>
                                  <div>
                                    <div className={`font-semibold text-lg ${
                                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>{request.fullName}</div>
                                    <div className={`text-sm font-mono ${
                                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                    }`}>{request.employeeId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <span className={`font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>{request.designation}</span>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                                  {request.projectName}
                                </span>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${getStatusColor(request.status)}`}>
                                  {request.status === 'Issued' && <FaCheckCircle className="w-4 h-4 mr-2" />}
                                  {request.status}
                                </span>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                                  {new Date(request.requestDate).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  {request.status === 'Requested' && (
                                    <>
                                      <button 
                                        onClick={() => handleApproveRequest(request._id, 'Approved')}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm"
                                      >
                                        <FaCheck className="w-4 h-4" /> Approve
                                      </button>
                                      <button 
                                        onClick={() => handleApproveRequest(request._id, 'Rejected', 'Incomplete documentation')}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm"
                                      >
                                        <FaTimes className="w-4 h-4" /> Reject
                                      </button>
                                    </>
                                  )}
                                  {request.status === 'Approved' && (
                                    <button 
                                      onClick={() => handleIssueCard(request)}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
                                    >
                                      <FaIdCard className="w-4 h-4" /> Issue Card
                                    </button>
                                  )}
                                  {request.status === 'Issued' && (
                                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm">
                                      <FaDownload className="w-4 h-4" /> Download
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'workflow' && (
              <motion.div
                key="workflow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Workflow Status Dashboard */}
                <div className={`rounded-3xl p-8 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                } shadow-lg`}>
                  <h2 className={`text-2xl font-bold mb-6 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Workflow Status Overview</h2>
                  
                  {workflowStatus ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Total Employees */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-blue-600'
                            }`}>Total Employees</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.totalEmployees}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'
                          }`}>
                            <FaUser className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* KYC Pending */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-yellow-600'
                            }`}>KYC Pending</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.kycPending}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-100'
                          }`}>
                            <FaClock className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* KYC Approved */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-green-600'
                            }`}>KYC Approved</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.kycApproved}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-green-900/20' : 'bg-green-100'
                          }`}>
                            <FaCheckCircle className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-green-400' : 'text-green-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* KYC Rejected */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-red-600'
                            }`}>KYC Rejected</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.kycRejected}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'
                          }`}>
                            <FaTimesCircle className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-red-400' : 'text-red-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* Ready for ID Card */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-indigo-50 border-indigo-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-indigo-600'
                            }`}>Ready for ID Card</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.canRequestIdCard}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-indigo-900/20' : 'bg-indigo-100'
                          }`}>
                            <FaIdCard className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* ID Card Requested */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-orange-600'
                            }`}>ID Card Requested</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.idCardRequested}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-100'
                          }`}>
                            <FaClock className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* ID Card Approved */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-blue-600'
                            }`}>ID Card Approved</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.idCardApproved}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'
                          }`}>
                            <FaCheckCircle className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* Ready to Issue */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-purple-50 border-purple-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-purple-600'
                            }`}>Ready to Issue</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.readyToIssue}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-100'
                          }`}>
                            <FaDownload className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* ID Card Issued */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-green-600'
                            }`}>ID Cards Issued</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.idCardIssued}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-green-900/20' : 'bg-green-100'
                          }`}>
                            <FaDownload className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-green-400' : 'text-green-600'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* ID Card Rejected */}
                      <div className={`p-6 rounded-2xl border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-red-600'
                            }`}>ID Card Rejected</p>
                            <p className={`text-3xl font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{workflowStatus.idCardRejected}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'
                          }`}>
                            <FaTimesCircle className={`w-6 h-6 ${
                              theme === 'dark' ? 'text-red-400' : 'text-red-600'
                            }`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FaSpinner className="animate-spin text-blue-600 w-12 h-12 mx-auto mb-4" />
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Loading workflow status...
                      </p>
                    </div>
                  )}
                </div>

                {/* Recent Activities */}
                <div className={`rounded-3xl p-8 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                } shadow-lg`}>
                  <h3 className={`text-xl font-bold mb-6 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Recent Activities</h3>
                  
                  {recentActivities.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivities.map((activity, index) => (
                        <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${
                          theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              activity.type.includes('Issued') 
                                ? theme === 'dark' ? 'bg-green-900/20' : 'bg-green-100'
                                : activity.type.includes('Approved')
                                ? theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'
                                : activity.type.includes('Requested')
                                ? theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-100'
                                : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                            }`}>
                              {activity.type.includes('Issued') && <FaDownload className={`w-4 h-4 ${
                                theme === 'dark' ? 'text-green-400' : 'text-green-600'
                              }`} />}
                              {activity.type.includes('Approved') && <FaCheckCircle className={`w-4 h-4 ${
                                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                              }`} />}
                              {activity.type.includes('Requested') && <FaClock className={`w-4 h-4 ${
                                theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                              }`} />}
                            </div>
                            <div>
                              <p className={`font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>{activity.type}</p>
                              <p className={`text-sm ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {activity.fullName} ({activity.employeeId})
                              </p>
                            </div>
                          </div>
                          <div className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {new Date(activity.date).toLocaleDateString()} {new Date(activity.date).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FaInfoCircle className={`mx-auto w-12 h-12 mb-4 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        No recent activities found
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className={`rounded-3xl p-8 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                } shadow-lg`}>
                  <h3 className={`text-xl font-bold mb-6 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Quick Actions</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <button
                      onClick={() => setActiveTab('generate')}
                      className={`p-6 rounded-2xl border transition-all duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 hover:border-blue-500 hover:bg-gray-600'
                          : 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'
                        }`}>
                          <FaIdCard className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="text-left">
                          <h4 className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>Generate ID Card</h4>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Create new ID card requests</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`p-6 rounded-2xl border transition-all duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 hover:border-orange-500 hover:bg-gray-600'
                          : 'bg-orange-50 border-orange-200 hover:border-orange-300 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-100'
                        }`}>
                          <FaClock className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                          }`} />
                        </div>
                        <div className="text-left">
                          <h4 className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>Review Pending</h4>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Approve or reject requests</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('approved')}
                      className={`p-6 rounded-2xl border transition-all duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 hover:border-green-500 hover:bg-gray-600'
                          : 'bg-green-50 border-green-200 hover:border-green-300 hover:bg-green-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          theme === 'dark' ? 'bg-green-900/20' : 'bg-green-100'
                        }`}>
                          <FaDownload className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`} />
                        </div>
                        <div className="text-left">
                          <h4 className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>Issue Cards</h4>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Issue approved ID cards</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <IDCardModal
        isOpen={showIdCardModal}
        onClose={() => setShowIdCardModal(false)}
        cardData={idCardData}
        theme={theme || 'light'}
      />

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl ${
              theme === 'dark'
                ? 'bg-red-900/50 text-red-300 border border-red-800'
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}
          >
            <FaTimesCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-2 hover:opacity-70"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl ${
              theme === 'dark'
                ? 'bg-green-900/50 text-green-300 border border-green-800'
                : 'bg-green-50 text-green-600 border border-green-100'
            }`}
          >
            <FaCheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-2 hover:opacity-70"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ManagerDashboardLayout>
  );
} 