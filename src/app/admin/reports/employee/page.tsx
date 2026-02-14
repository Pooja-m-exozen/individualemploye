"use client";

import React, { useEffect, useState } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaIdCard, FaUser, FaSpinner, FaSearch, FaTimesCircle, FaTrash, FaUsers, FaDownload, FaEye, FaTimes } from "react-icons/fa";
import EditKYCModal from "@/components/dashboard/EditKYCModal";
import ViewKYCModal from "@/components/dashboard/ViewKYCModal";
import { useTheme } from "@/context/ThemeContext";
import Image from 'next/image';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [search] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [statusFilter] = useState("All Status");
  const [designationFilter] = useState("All Designations");
  const [newJoiners, setNewJoiners] = useState<NewJoiner[]>([]);
  const [newJoinersLoading, setNewJoinersLoading] = useState(false);
  const [newJoinersError, setNewJoinersError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState(30);
  const [modal, setModal] = useState<null | { type: 'joiner' | 'view' | 'edit', data: KYCForm | null }>(null);
  const [newJoinersSearch, setNewJoinersSearch] = useState("");
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

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
    })
    .sort((a, b) => {
      const aValue = a.personalDetails.fullName.toLowerCase();
      const bValue = b.personalDetails.fullName.toLowerCase();
      return aValue.localeCompare(bValue);
    });

  // Paginate only the filtered results
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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

  const handleDownloadEmployeePDF = async (kycData: KYCForm) => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const doc = new jsPDF();
      const { personalDetails, addressDetails, bankDetails, identificationDetails, emergencyContact } = kycData;

      const getImageDataUri = (url: string): Promise<string | null> => {
        return new Promise(async (resolve) => {
          try {
            // Use our new API route to fetch the image, which handles CORS.
            const fetchUrl = url.startsWith('http') 
              ? `/v1/employee/api/proxy-image?url=${encodeURIComponent(url)}` 
              : url;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
              console.error(`Failed to fetch image from proxy: ${response.statusText}`);
              resolve(null);
              return;
            }
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error(`Error fetching image for PDF from ${url}:`, error);
            resolve(null);
          }
        });
      };

      // Header
      const logoDataUri = await getImageDataUri('/v1/employee/exozen_logo1.png');
      if (logoDataUri) {
        doc.addImage(logoDataUri, 'PNG', 15, 10, 30, 8);
      }

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Employee KYC Document", 105, 20, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(15, 25, 195, 25);
      
      const employeeImageDataUri = await getImageDataUri(personalDetails.employeeImage);
      if (employeeImageDataUri) {
        doc.addImage(employeeImageDataUri, 'JPEG', 150, 30, 40, 40);
        doc.rect(150, 30, 40, 40); // image border
      }
      
      // Left-hand side summary
      let yPos = 40;
      doc.setFontSize(10);
      const addSummaryField = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 15, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 50, yPos);
        yPos += 7;
      };

      addSummaryField("Full Name:", personalDetails.fullName);
      addSummaryField("Employee ID:", personalDetails.employeeId);
      addSummaryField("Project Name:", personalDetails.projectName);
      addSummaryField("Designation:", personalDetails.designation);
      addSummaryField("Date of Joining:", new Date(personalDetails.dateOfJoining).toLocaleDateString());
      
      const tableStartY = 80; // Adjusted start Y for the first table

      const createTable = (title: string, data: Record<string, string | string[] | number>, startY?: number) => {
        const tableData = Object.entries(data).map(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
          const valueText = Array.isArray(value) ? value.join(', ') : String(value);
          return [formattedKey, valueText];
        });

        autoTable(doc, {
          startY: startY || ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10 : 80),
          head: [[{ content: title, colSpan: 2, styles: { halign: 'left', fillColor: [40, 140, 153], textColor: [255, 255, 255] } }]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [22, 160, 133] },
          columnStyles: { 
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' }
          },
        });
      };

      const { 
        ...restOfPersonalDetails 
      } = personalDetails;
      createTable("Personal Details", restOfPersonalDetails, tableStartY);
      createTable("Address Details (Permanent)", addressDetails.permanentAddress);
      createTable("Address Details (Current)", addressDetails.currentAddress);
      createTable("Bank Details", bankDetails);
      createTable("Identification Details", identificationDetails);
      createTable("Emergency Contact", emergencyContact);
      
      let finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || tableStartY;

      // Acknowledgement
      finalY += 10;
      if (finalY > 240) { doc.addPage(); finalY = 20; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("Acknowledgement", 15, finalY);
      finalY += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      const acknowledgementText = "I hereby declare that the information provided is true and correct to the best of my knowledge and belief. I understand that any false information may lead to disciplinary action, including termination of employment.";
      const splitText = doc.splitTextToSize(acknowledgementText, 180);
      doc.text(splitText, 15, finalY);
      finalY += (splitText.length * 3) + 15;

      // Signatures
      if (finalY > 250) { doc.addPage(); finalY = 40; }
      const signatureY = finalY;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.line(15, signatureY + 15, 75, signatureY + 15);
      doc.text("Employee Signature", 25, signatureY + 20);
      doc.line(130, signatureY + 15, 190, signatureY + 15);
      doc.text("Authorized Signatory", 135, signatureY + 20);
      doc.text("(Exozen Pvt. Ltd.)", 138, signatureY + 25);

      doc.save(`KYC-Details-${personalDetails.employeeId}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Please check the console for details.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-0 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
          <div className="flex items-center gap-6">
            <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
              <FaIdCard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Employee Report</h1>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <select
              value={projectFilter}
              onChange={e => { setProjectFilter(e.target.value); setCurrentPage(1); }}
              className={`px-1 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              {["All Projects", ...projectList.map(p => p.projectName)].map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Employee Report Table */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 mt-6`}>
          <div className="relative">
            <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}> 
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tl-xl tracking-tight cursor-pointer select-none">
                      Employee
                    </th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight cursor-pointer select-none">
                      Designation
                    </th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight cursor-pointer select-none">
                      Project
                    </th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight cursor-pointer select-none">
                      Status
                    </th>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tr-xl tracking-tight text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs">Loading employees...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={5} className="text-center text-red-500 py-8 text-xs">{error}</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs">No employees found</td></tr>
                  ) : (
                    paginated.map((form, idx) => (
                      <tr key={form._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className="px-3 py-2 text-xs whitespace-nowrap font-bold flex items-center gap-3">
                          {form.personalDetails.employeeImage ? (
                            <Image
                              src={form.personalDetails.employeeImage}
                              alt={form.personalDetails.fullName}
                              width={32}
                              height={32}
                              className="rounded-full border border-blue-200 dark:border-blue-800"
                            />
                          ) : (
                            <FaUser className="w-8 h-8 text-gray-400" />
                          )}
                          <span className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>{form.personalDetails.fullName}</span>
                        </td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{form.personalDetails.designation}</td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{form.personalDetails.projectName}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                            ${form.status && form.status.toLowerCase().trim() === "approved"
                              ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800')
                              : form.status && form.status.toLowerCase().trim() === "pending"
                                ? (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                                : form.status && form.status.toLowerCase().trim() === "rejected"
                                  ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800')
                                  : (theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800')
                            }`}>
                            {form.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setModal({ type: 'view', data: form })}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                              title="View Details"
                            >
                              <FaEye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDownloadEmployeePDF(form)}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                              title="Download PDF"
                            >
                              <FaDownload className="w-3 h-3" />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this KYC record? This action cannot be undone.')) {
                                  try {
                                    await fetch(`https://cafm.zenapi.co.in/api/kyc/${form.personalDetails.employeeId}`, { method: 'DELETE' });
                                    setKYCForms(prev => prev.filter(f => f._id !== form._id));
                                  } catch {
                                    // Handle error
                                  }
                                }
                              }}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-red-800 text-white hover:bg-red-900' : 'bg-red-600 text-white hover:bg-red-700'}`}
                              title="Delete KYC"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 gap-1 flex-wrap">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-2 py-1 rounded font-medium text-xs transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                Prev
              </button>
              {/* Page numbers with ellipsis */}
              {(() => {
                const pageButtons = [];
                let start = Math.max(1, currentPage - 1);
                let end = Math.min(totalPages, currentPage + 1);
                if (currentPage === 1) end = Math.min(totalPages, 3);
                if (currentPage === totalPages) start = Math.max(1, totalPages - 2);
                if (start > 1) {
                  pageButtons.push(
                    <button key={1} onClick={() => setCurrentPage(1)} className={`px-2 py-1 rounded font-semibold text-xs border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentPage === 1 ? (theme === 'dark' ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-blue-600 text-white border-blue-600 shadow-lg') : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100')}`}>1</button>
                  );
                  if (start > 2) pageButtons.push(<span key="start-ellipsis" className="px-1 text-xs">…</span>);
                }
                for (let i = start; i <= end; i++) {
                  if (i === 1 || i === totalPages) continue;
                  pageButtons.push(
                    <button key={i} onClick={() => setCurrentPage(i)} className={`px-2 py-1 rounded font-semibold text-xs border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentPage === i ? (theme === 'dark' ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-blue-600 text-white border-blue-600 shadow-lg') : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100')}`}>{i}</button>
                  );
                }
                if (end < totalPages) {
                  if (end < totalPages - 1) pageButtons.push(<span key="end-ellipsis" className="px-1 text-xs">…</span>);
                  pageButtons.push(
                    <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={`px-2 py-1 rounded font-semibold text-xs border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentPage === totalPages ? (theme === 'dark' ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-blue-600 text-white border-blue-600 shadow-lg') : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100')}`}>{totalPages}</button>
                  );
                }
                return pageButtons;
              })()}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-2 py-1 rounded font-medium text-xs transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                Next
              </button>
            </div>
          )}
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
                  }
                  setModal(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </AdminDashboardLayout>
  );
}