"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import IDCardModal from "@/components/dashboard/IDCardModal";
import { FaIdCard, FaSpinner, FaDownload, FaSearch, FaCheckCircle, FaTimesCircle, FaCheck, FaTimes, FaEye } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import jsPDF from "jspdf";

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




interface FilterOptions {
  status: string;
  project: string;
  designation: string;
  dateRange: { start: string; end: string };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  employeeId?: string;
  fullName?: string;
}

interface IDCardData {
  fullName: string;
  employeeId: string;
  designation: string;
  projectName: string;
  bloodGroup?: string;
  employeeImage: string;
  qrCodeImage: string;
  validUntil: string;
}

export default function GenerateIDCardPage() {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [, setGeneratedCard] = useState<Record<string, unknown> | null>(null);
  const [allRequests, setAllRequests] = useState<IDCardRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setWorkflowStatus] = useState<Record<string, unknown> | null>(null);
  const [, setRecentActivities] = useState<Record<string, unknown>[]>([]);
  // Removed unused bulkLoading state
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

  // Removed unused tabs array

  useEffect(() => {
    fetchEmployees();
    fetchAllRequests();
    fetchWorkflowStatus();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/kyc/approved-kyc/no-idcard-request");
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data.data || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
      if (!response.ok) throw new Error('Failed to fetch employee details');
      const data = await response.json();
      if (data.kycForms) {
        const employee = data.kycForms.find((form: KycForm) => form.personalDetails.employeeId === employeeId);
        if (employee) return {
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
      return null;
    } catch (err) {
      console.error("Failed to fetch employee details:", err);
      return null;
    }
  };

  const fetchAllRequests = async () => {
    setLoadingRequests(true);
    try {
      const pendingResponse = await fetch("https://cafm.zenapi.co.in/api/id-cards/pending-requests");
      if (!pendingResponse.ok) throw new Error('Failed to fetch pending ID card requests');
      const pendingData = await pendingResponse.json();

      const readyToIssueResponse = await fetch("https://cafm.zenapi.co.in/api/id-cards/ready-to-issue");
      if (!readyToIssueResponse.ok) throw new Error('Failed to fetch ready to issue requests');
      const readyToIssueData = await readyToIssueResponse.json();

      const allResponse = await fetch("https://cafm.zenapi.co.in/api/id-cards/all");
      if (!allResponse.ok) throw new Error('Failed to fetch all ID card requests');
      const allData = await allResponse.json();

      let allRequests: IDCardRequest[] = [];
      if (pendingData.data && pendingData.data.pendingRequests) allRequests = [...(pendingData.data.pendingRequests as IDCardRequest[])];
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
      if (allData.idCards) {
        const otherRequests = (allData.idCards as IDCardRequest[]).filter((req: IDCardRequest) => req.status !== 'Requested' && req.status !== 'Approved');
        allRequests = [...allRequests, ...otherRequests];
      } else if (allData.data) {
        const otherRequests = (allData.data as IDCardRequest[]).filter((req: IDCardRequest) => req.status !== 'Requested' && req.status !== 'Approved');
        allRequests = [...allRequests, ...otherRequests];
      } else if (Array.isArray(allData)) {
        const otherRequests = (allData as IDCardRequest[]).filter((req: IDCardRequest) => req.status !== 'Requested' && req.status !== 'Approved');
        allRequests = [...allRequests, ...otherRequests];
      }
      setAllRequests(allRequests);
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
      if (!response.ok) throw new Error('Failed to fetch workflow status');
      const data = await response.json();
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
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        let backendError = data.error || data.message;
        if (data.errors && typeof data.errors === 'object') backendError = Object.values(data.errors).join(' ');
        if (typeof backendError === 'string' && backendError.includes('IDCard validation failed: employeeImage: Path `employeeImage` is required.')) {
          backendError = 'Employee image is missing. Please add an image during KYC.';
        }
        throw new Error(backendError || 'Failed to generate ID card request');
      }
      setSuccess('ID Card request generated successfully and pending approval');
      setGeneratedCard(data.idCard);
      setSelectedEmployee("");
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
      const requestBody = { status, approvedBy: "HR Manager", ...(status === 'Rejected' && { rejectionReason }) };
      const response = await fetch(`https://cafm.zenapi.co.in/api/id-cards/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update request status');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuedBy: "HR Manager" }),
      });
      const issueData = await issueResponse.json();
      if (!issueResponse.ok) throw new Error(issueData.message || 'Failed to issue ID card');
      const qrResponse = await fetch(`https://cafm.zenapi.co.in/api/qr-code/generate/${request.employeeId}`, { method: 'POST' });
      const qrData = await qrResponse.json();
      if (!qrResponse.ok) setError("Card issued, but failed to generate QR code.");
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

  // Removed unused handleBulkApprove function

  // Removed unused handleBulkIssue function

  // Removed unused handleSelectRequest and handleSelectAllRequests functions

  const uniqueProjects = [...new Set(allRequests.map(req => req.projectName))];
  const uniqueDesignations = [...new Set(allRequests.map(req => req.designation))];
  const uniqueStatuses = [...new Set(allRequests.map(req => req.status))];

  const filteredRequests = allRequests
    .filter(req => {
      const matchesSearch = req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || req.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filters.status || req.status === filters.status;
      const matchesProject = !filters.project || req.projectName === filters.project;
      const matchesDesignation = !filters.designation || req.designation === filters.designation;
      const matchesDateRange = !filters.dateRange.start || !filters.dateRange.end ||
        (req.requestDate && new Date(req.requestDate) >= new Date(filters.dateRange.start) && new Date(req.requestDate) <= new Date(filters.dateRange.end));
      return matchesSearch && matchesStatus && matchesProject && matchesDesignation && matchesDateRange;
    })
    .sort((a, b) => {
      let aValue: string | Date, bValue: string | Date;
      switch (filters.sortBy) {
        case 'fullName': [aValue, bValue] = [a.fullName, b.fullName]; break;
        case 'employeeId': [aValue, bValue] = [a.employeeId, b.employeeId]; break;
        case 'designation': [aValue, bValue] = [a.designation, b.designation]; break;
        case 'projectName': [aValue, bValue] = [a.projectName, b.projectName]; break;
        case 'requestDate': [aValue, bValue] = [new Date(a.requestDate), new Date(b.requestDate)]; break;
        default: [aValue, bValue] = [a.fullName, b.fullName];
      }
      return filters.sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Issued': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Removed unused clearFilters, activeFiltersCount, and getTabRequests functions

  const getImageDataUri = (url: string): Promise<string | null> => {
    return new Promise(async (resolve) => {
      try {
        let safeUrl = url;
        if (safeUrl && safeUrl.startsWith('https://')) safeUrl = 'https://' + safeUrl.substring(7);
        const fetchUrl = safeUrl && safeUrl.startsWith('https')
          ? `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(safeUrl)}`
          : safeUrl;
        const response = await fetch(fetchUrl);
        if (!response.ok) { console.error('Failed to fetch image for PDF:', response.statusText); resolve(null); return; }
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error fetching image for PDF:', error);
        resolve(null);
      }
    });
  };

  const handleDownloadIdCard = async (request: IDCardRequest) => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [54, 86] });
      const primaryColor: [number, number, number] = [30, 64, 175];
      const accentColor: [number, number, number] = [59, 130, 246];
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 86, 10, 'F');
      const logoDataUri = await getImageDataUri("/exozen_logo1.png");
      if (logoDataUri) doc.addImage(logoDataUri, "PNG", 3, 1.5, 12, 7);
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Exozen Pvt. Ltd.", 43, 7, { align: "center" });
      doc.setFillColor(245, 245, 250);
      doc.rect(0, 10, 86, 44, 'F');
      const centerX = 16, centerY = 27, radius = 13, imgSize = 24;
      doc.setFillColor(255, 255, 255);
      doc.circle(centerX, centerY, radius, 'F');
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1);
      doc.circle(centerX, centerY, radius, 'S');
      let employeeImageUri: string | null = null;
      let imageType: 'JPEG' | 'PNG' = 'JPEG';
      if (request.employeeImage) {
        employeeImageUri = await getImageDataUri(request.employeeImage);
        if (!employeeImageUri) { imageType = 'PNG'; employeeImageUri = await getImageDataUri(request.employeeImage); }
      }
      if (employeeImageUri) {
        try { doc.addImage(employeeImageUri, imageType, centerX - imgSize/2, centerY - imgSize/2, imgSize, imgSize, undefined, 'FAST'); }
        catch { try { doc.addImage(employeeImageUri, 'PNG', centerX - imgSize/2, centerY - imgSize/2, imgSize, imgSize, undefined, 'FAST'); }
          catch { doc.setFontSize(8); doc.setTextColor(180, 180, 180); doc.text("No Photo", centerX, centerY, { align: "center" }); } }
      } else { doc.setFontSize(8); doc.setTextColor(180, 180, 180); doc.text("No Photo", centerX, centerY, { align: "center" }); }
      const xDetails = 30, lineGap = 7;
      let yDetails = 15;
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("Name:", xDetails, yDetails);
      doc.setFont("helvetica", "normal");
      doc.text(request.fullName, xDetails + 18, yDetails);
      yDetails += lineGap;
      doc.setFont("helvetica", "bold");
      doc.text("Employee ID:", xDetails, yDetails);
      doc.setFont("helvetica", "normal");
      doc.text(request.employeeId, xDetails + 18, yDetails);
      yDetails += lineGap;
      doc.setFont("helvetica", "bold");
      doc.text("Designation:", xDetails, yDetails);
      doc.setFont("helvetica", "normal");
      doc.text(request.designation, xDetails + 18, yDetails);
      yDetails += lineGap;
      doc.setFont("helvetica", "bold");
      doc.text("Project:", xDetails, yDetails);
      doc.setFont("helvetica", "normal");
      doc.text(request.projectName, xDetails + 18, yDetails);
      yDetails += lineGap;
      if (request.bloodGroup) {
        doc.setFont("helvetica", "bold");
        doc.text("Blood Group:", xDetails, yDetails);
        doc.setFont("helvetica", "normal");
        doc.text(request.bloodGroup, xDetails + 18, yDetails);
        yDetails += lineGap;
      }
      if (request.validUntil) {
        doc.setFont("helvetica", "bold");
        doc.text("Valid Until:", xDetails, yDetails);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(request.validUntil).toLocaleDateString(), xDetails + 18, yDetails);
        yDetails += lineGap;
      }
      doc.setFillColor(...accentColor);
      doc.rect(0, 54 - 7, 86, 7, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("www.exozen.in", 43, 54 - 2, { align: "center" });
      doc.save(`IDCard-${request.employeeId}.pdf`);
    } catch {
      alert("Failed to generate ID Card PDF. Please try again.");
    }
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={filters.project}
                onChange={e => setFilters({ ...filters, project: e.target.value })}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Projects</option>
                {uniqueProjects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {/* Designation Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={filters.designation}
                onChange={e => setFilters({ ...filters, designation: e.target.value })}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Designations</option>
                {uniqueDesignations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {/* Status Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Status</option>
                {uniqueStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            {/* Generate Request Section */}
            <div className="flex items-center gap-2">
              <select 
                value={selectedEmployee} 
                onChange={e => setSelectedEmployee(e.target.value)} 
                className={`appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[220px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>
              <button 
                onClick={handleGenerateRequest} 
                disabled={loading || !selectedEmployee} 
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === 'dark' 
                    ? 'bg-blue-700 text-white hover:bg-blue-800' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaIdCard />} Generate
              </button>
            </div>
          </div>
        </div>
        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loadingRequests ? (
              <div className="py-12 text-center text-lg font-semibold">Loading ID card requests...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap ${theme === "dark" ? "text-blue-200 bg-blue-900" : "text-blue-700 bg-blue-50"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Employee ID</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Full Name</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Designation</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Project</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Status</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Request Date</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Actions</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className="px-2 py-1 sticky left-0 z-20"></th>
                    <th className="px-2 py-1">
                      <input 
                        type="text" 
                        value={filters.employeeId || ''} 
                        onChange={e => setFilters({ ...filters, employeeId: e.target.value })} 
                        placeholder="Filter ID" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className="px-2 py-1">
                      <input 
                        type="text" 
                        value={filters.fullName || ''} 
                        onChange={e => setFilters({ ...filters, fullName: e.target.value })} 
                        placeholder="Filter Name" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className="px-2 py-1">
                      <select 
                        value={filters.designation} 
                        onChange={e => setFilters({ ...filters, designation: e.target.value })} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </th>
                    <th className="px-2 py-1">
                      <select 
                        value={filters.project} 
                        onChange={e => setFilters({ ...filters, project: e.target.value })} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </th>
                    <th className="px-2 py-1">
                      <select 
                        value={filters.status} 
                        onChange={e => setFilters({ ...filters, status: e.target.value })} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No ID card requests found</td>
                    </tr>
                  ) : filteredRequests.map((request, idx) => (
                    <tr key={request._id} className={theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"}>
                      <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}`}>{idx + 1}</td>
                      <td className={`px-2 py-1 font-semibold whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{request.employeeId}</td>
                      <td className="px-2 py-1"><div className="truncate" title={request.fullName}>{request.fullName}</div></td>
                      <td className="px-2 py-1"><div className="truncate" title={request.designation}>{request.designation}</div></td>
                      <td className={`px-2 py-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}><div className="truncate" title={request.projectName}>{request.projectName}</div></td>
                      <td className="px-2 py-1 text-center">
                        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>{request.status}</span>
                      </td>
                      <td className={`px-2 py-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {new Date(request.requestDate).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <div className="flex gap-1 justify-center">
                          {request.status === 'Requested' && (
                            <>
                              <button 
                                onClick={() => handleApproveRequest(request._id, 'Approved')} 
                                title="Approve Request"
                                className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                                  theme === 'dark' 
                                    ? 'bg-green-700 text-white hover:bg-green-800 focus:ring-green-400' 
                                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-400'
                                }`}
                              >
                                <FaCheck />
                              </button>
                              <button 
                                onClick={() => handleApproveRequest(request._id, 'Rejected', 'Incomplete')} 
                                title="Reject Request"
                                className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                                  theme === 'dark' 
                                    ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-400' 
                                    : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400'
                                }`}
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          {request.status === 'Approved' && (
                            <button 
                              onClick={() => handleIssueCard(request)} 
                              title="Issue ID Card"
                              className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                                theme === 'dark' 
                                  ? 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-400' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400'
                              }`}
                            >
                              <FaIdCard />
                            </button>
                          )}
                          {request.status === 'Issued' && (
                            <button 
                              onClick={() => handleDownloadIdCard(request)} 
                              title="Download ID Card"
                              className={`px-2 py-1 rounded font-semibold text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                                theme === 'dark' 
                                  ? 'bg-green-700 text-white hover:bg-green-800 focus:ring-green-400' 
                                  : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-400'
                              }`}
                            >
                              <FaDownload />
                            </button>
                          )}
                          {/* View Button (all statuses) */}
                          <button 
                            onClick={async () => {
                              // Try to get QR code and employee details for modal
                              let qrCodeImage = '';
                              try {
                                const qrRes = await fetch(`https://cafm.zenapi.co.in/api/qr-code/generate/${request.employeeId}`, { method: 'POST' });
                                const qrData = await qrRes.json();
                                qrCodeImage = qrData.qrCode?.qrCodeImage || '';
                              } catch {}
                              const employeeDetails = await fetchEmployeeDetails(request.employeeId);
                              setIdCardData({
                                fullName: request.fullName,
                                employeeId: request.employeeId,
                                designation: request.designation,
                                projectName: request.projectName,
                                qrCodeImage,
                                validUntil: request.validUntil || new Date().toISOString(),
                                bloodGroup: employeeDetails?.bloodGroup || request.bloodGroup,
                                employeeImage: employeeDetails?.employeeImage || request.employeeImage
                              });
                              setShowIdCardModal(true);
                            }}
                            title="View ID Card"
                            className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                              theme === 'dark' 
                                ? 'border-gray-500 text-gray-400 bg-gray-800 hover:bg-gray-700 focus:ring-gray-400' 
                                : 'border-gray-500 text-gray-600 bg-white hover:bg-gray-50 focus:ring-gray-400'
                            }`}
                          >
                            <FaEye />
                          </button>
                          {/* Download Button (all statuses) */}
                          <button 
                            onClick={() => handleDownloadIdCard(request)} 
                            title="Download PDF"
                            className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                              theme === 'dark' 
                                ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                            }`}
                          >
                            <FaDownload />
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

      <IDCardModal
        isOpen={showIdCardModal}
        onClose={() => setShowIdCardModal(false)}
        cardData={idCardData}
        theme={theme || 'light'}
      />
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-2 rounded ${theme === 'dark' ? 'bg-red-900/50 text-red-300 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}
          >
            <FaTimesCircle />
            <span>{error}</span>
            <button onClick={() => setError(null)}><FaTimes /></button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-2 rounded ${theme === 'dark' ? 'bg-green-900/50 text-green-300 border-green-800' : 'bg-green-50 text-green-600 border-green-100'}`}
          >
            <FaCheckCircle />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}><FaTimes /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </ManagerDashboardLayout>
  );
}