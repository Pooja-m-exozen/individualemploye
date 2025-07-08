import React, { useState, useEffect } from "react";
import { FaUser, FaMapMarkerAlt, FaIdCard,  FaTimes, FaFileAlt, FaPhone, FaUserCircle, FaBuilding, FaAddressCard, FaCheckCircle, FaExclamationCircle, FaDownload, FaSpinner } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

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

interface ViewKYCModalProps {
  open: boolean;
  onClose: () => void;
  kycData: KYCData;
}

const ViewKYCModal: React.FC<ViewKYCModalProps> = ({ open, onClose, kycData }) => {
  const { theme } = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [completionStatus, setCompletionStatus] = useState({
    personal: false,
    address: false,
    bank: false,
    emergency: false,
    documents: false
  });

  // Check section completion
  useEffect(() => {
    if (kycData) {
      const { personalDetails, addressDetails, bankDetails, emergencyContact, documents } = kycData;
      
      setCompletionStatus({
        personal: Object.values(personalDetails).every(val => val !== ''),
        address: Object.values(addressDetails.permanentAddress).every(val => val !== '') && 
                Object.values(addressDetails.currentAddress).every(val => val !== ''),
        bank: Object.values(bankDetails).every(val => val !== ''),
        emergency: Object.values(emergencyContact).every(val => val !== ''),
        documents: documents.length > 0
      });
    }
  }, [kycData]);

  const handleDownload = async () => {
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

  // Calculate completion percentage
  const calculateCompletion = () => {
    const sections = Object.values(completionStatus);
    const completed = sections.filter(Boolean).length;
    return Math.round((completed / sections.length) * 100);
  };

  // Navigation items
  const navigationItems = [
    { icon: FaUserCircle, label: 'Personal Info', id: 0, key: 'personal' },
    { icon: FaAddressCard, label: 'Address', id: 1, key: 'address' },
    { icon: FaBuilding, label: 'Bank Details', id: 2, key: 'bank' },
    { icon: FaPhone, label: 'Emergency Contact', id: 3, key: 'emergency' },
    { icon: FaFileAlt, label: 'Documents', id: 4, key: 'documents' },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-full sm:max-w-6xl max-h-[95vh] overflow-hidden
        ${theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}
      >
        {/* Header */}
        <div className={`px-4 sm:px-6 py-4 rounded-t-2xl
          ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3
                ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-500 bg-opacity-30'}`}
              >
                <FaIdCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">View KYC Details</h2>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>{kycData.personalDetails.fullName} - {kycData.personalDetails.employeeId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="text-white hover:text-gray-200 text-xl font-bold focus:outline-none p-2 rounded-full hover:bg-black/20 disabled:opacity-50"
                title="Download as PDF"
              >
                {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
              </button>
              <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold focus:outline-none">
                <FaTimes />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`px-4 sm:px-6 py-4 border-b
          ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-100'}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-1 sm:gap-0">
            <h3 className={`text-xs sm:text-sm font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>KYC Completion Status</h3>
            <span className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>{calculateCompletion()}% Complete</span>
          </div>
          <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-200'}`}> 
            <div
              className={`h-2 rounded-full transition-all duration-500 ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-600'}`}
              style={{ width: `${calculateCompletion()}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
            {Object.entries(completionStatus).map(([section, isComplete]) => (
              <div key={section} className="flex items-center gap-1">
                {isComplete ? (
                  <FaCheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <FaExclamationCircle className="w-3 h-3 text-yellow-500" />
                )}
                <span className={`text-xs font-medium capitalize ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>{section}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row h-[calc(95vh-180px)]">
          {/* Side Navigation */}
          <div className={`w-full md:w-64 p-2 sm:p-4 border-b md:border-b-0 md:border-r
            ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}
            flex md:block overflow-x-auto md:overflow-visible`}
          >
            <nav className="flex md:flex-col gap-2 md:gap-1 w-full">
              {navigationItems.map((item) => {
                const isActive = selectedTab === item.id;
                const isCompleted = completionStatus[item.key as keyof typeof completionStatus];
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTab(item.id)}
                    className={`flex-1 md:w-full flex items-center gap-2 md:gap-3 px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-left transition-colors min-w-[120px] md:min-w-0
                      ${isActive
                        ? theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-600'
                        : isCompleted
                          ? theme === 'dark' ? 'text-green-400 hover:bg-gray-800' : 'text-green-600 hover:bg-blue-50'
                          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'}
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? (theme === 'dark' ? 'text-blue-200' : 'text-blue-600') : isCompleted ? 'text-green-500' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className="font-medium text-xs sm:text-sm">{item.label}</span>
                    {isCompleted && <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-6">
            <AnimatePresence mode="wait">
              {selectedTab === 0 && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-start justify-between gap-6 mb-6">
                    {/* Left side details */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <FaUser className="text-blue-600 w-5 h-5" />
                        <div>
                          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>Personal Information</h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Employee personal details</p>
                        </div>
                      </div>
                      <div className="space-y-3 pt-2">
                          <div className="flex">
                              <p className={`w-32 font-medium text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Full Name</p>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.personalDetails.fullName}</p>
                          </div>
                          <div className="flex">
                              <p className={`w-32 font-medium text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Employee ID</p>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.personalDetails.employeeId}</p>
                          </div>
                          <div className="flex">
                              <p className={`w-32 font-medium text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Phone Number</p>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.personalDetails.phoneNumber}</p>
                          </div>
                           <div className="flex">
                              <p className={`w-32 font-medium text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Project Name</p>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.personalDetails.projectName}</p>
                          </div>
                          <div className="flex">
                              <p className={`w-32 font-medium text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Designation</p>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.personalDetails.designation}</p>
                          </div>
                          <div className="flex">
                              <p className={`w-32 font-medium text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Date of Joining</p>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{new Date(kycData.personalDetails.dateOfJoining).toLocaleDateString()}</p>
                          </div>
                      </div>
                    </div>
                    {/* Right side image */}
                    <div className="flex-shrink-0">
                        <div className={`relative w-48 h-48 rounded-lg overflow-hidden border-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-white shadow-md'}`}>
                        {kycData.personalDetails.employeeImage ? (
                            <Image
                            src={kycData.personalDetails.employeeImage}
                            alt="Profile"
                            fill
                            className="object-cover"
                            />
                        ) : (
                            <FaUser className={`w-full h-full p-4 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-400'}`} />
                        )}
                        </div>
                    </div>
                  </div>
                  <hr className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} />

                  {/* Rest of the details */}
                  <div className="pt-4">
                    <h4 className={`text-md font-semibold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'}`}>Additional Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(kycData.personalDetails).filter(([key]) => ![
                          'employeeImage', 'fullName', 'employeeId', 'projectName', 'designation', 'dateOfJoining', 'phoneNumber'
                      ].includes(key)).map(([key, value]) => 
                        (
                          <div key={key} className="space-y-1">
                            <label className={`text-sm font-medium capitalize ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {Array.isArray(value) ? value.join(', ') : value?.toString() || '-'}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTab === 1 && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <FaMapMarkerAlt className="text-blue-600 w-5 h-5" />
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>Address Details</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Permanent and current addresses</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Permanent Address */}
                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
                      <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'} mb-4`}>Permanent Address</h4>
                      <div className="space-y-4">
                        {Object.entries(kycData.addressDetails.permanentAddress).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-2">
                            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'} capitalize`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Current Address */}
                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
                      <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'} mb-4`}>Current Address</h4>
                      <div className="space-y-4">
                        {Object.entries(kycData.addressDetails.currentAddress).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-2">
                            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'} capitalize`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTab === 2 && (
                <motion.div
                  key="bank"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <FaBuilding className="text-blue-600 w-5 h-5" />
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>Bank Details</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Bank account information</p>
                    </div>
                  </div>

                  <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(kycData.bankDetails).map(([key, value]) => (
                        <div key={key}>
                          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'} capitalize`}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1 font-mono`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTab === 3 && (
                <motion.div
                  key="emergency"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <FaPhone className="text-blue-600 w-5 h-5" />
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>Emergency Contact</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Emergency contact information</p>
                    </div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
                    <div className="flex flex-wrap items-center gap-6">
                      {/* Name */}
                      <div className="flex items-center gap-3">
                        <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} w-12 h-12 rounded-full flex items-center justify-center`}>
                          <FaUser className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Name</p>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.emergencyContact.name}</p>
                        </div>
                      </div>
                      {/* Phone */}
                      <div className="flex items-center gap-3">
                        <div className={`${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'} w-12 h-12 rounded-full flex items-center justify-center`}>
                          <FaPhone className={`w-6 h-6 ${theme === 'dark' ? 'text-green-200' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <p className={`text-sm ${theme === 'dark' ? 'text-green-200' : 'text-gray-500'}`}>Phone</p>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.emergencyContact.phone}</p>
                        </div>
                      </div>
                      {/* Relationship */}
                      <div className="flex items-center gap-3">
                        <div className={`${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'} w-12 h-12 rounded-full flex items-center justify-center`}>
                          <FaUserCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-200' : 'text-purple-600'}`} />
                        </div>
                        <div>
                          <p className={`text-sm ${theme === 'dark' ? 'text-purple-200' : 'text-gray-500'}`}>Relationship</p>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.emergencyContact.relationship}</p>
                        </div>
                      </div>
                      {/* Aadhar */}
                      <div className="flex items-center gap-3">
                        <div className={`${theme === 'dark' ? 'bg-orange-900' : 'bg-orange-100'} w-12 h-12 rounded-full flex items-center justify-center`}>
                          <FaIdCard className={`w-6 h-6 ${theme === 'dark' ? 'text-orange-200' : 'text-orange-600'}`} />
                        </div>
                        <div>
                          <p className={`text-sm ${theme === 'dark' ? 'text-orange-200' : 'text-gray-500'}`}>Aadhar</p>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.emergencyContact.aadhar}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTab === 4 && (
                <motion.div
                  key="documents"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <FaFileAlt className="text-blue-600 w-5 h-5" />
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>Documents</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Uploaded documents and identification</p>
                    </div>
                  </div>

                  {/* Identification Details */}
                  <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6 mb-6`}>
                    <h4 className={`text-md font-semibold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'}`}>Identification Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>ID Type</label>
                        <p className={`text-base font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.identificationDetails.identificationType}</p>
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>ID Number</label>
                        <p className={`text-base font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.identificationDetails.identificationNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div>
                    <h4 className={`text-md font-semibold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'}`}>Uploaded Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {kycData.documents.map((doc) => (
                        <div key={doc._id} className={`flex items-start p-4 rounded-xl transition-colors
                          ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} w-10 h-10 rounded-lg flex items-center justify-center mr-4`}>
                            <FaFileAlt className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-500'}`} />
                          </div>
                          <div>
                            <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc.type}</h4>
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'}`}>Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm mt-2 inline-flex items-center transition-colors
                                ${theme === 'dark' ? 'text-blue-300 hover:text-blue-400' : 'text-blue-600 hover:text-blue-700'}`}
                            >
                              View Document
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewKYCModal;