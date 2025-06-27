import React, { useState, useEffect } from "react";
import { FaUser, FaMapMarkerAlt, FaIdCard,  FaTimes, FaFileAlt, FaPhone, FaUserCircle, FaBuilding, FaAddressCard, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className={`rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden
        ${theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-2xl
          ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3
                ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-500 bg-opacity-30'}`}
              >
                <FaIdCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">View KYC Details</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>{kycData.personalDetails.fullName} - {kycData.personalDetails.employeeId}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold focus:outline-none">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`px-6 py-4 border-b
          ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-100'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>KYC Completion Status</h3>
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>{calculateCompletion()}% Complete</span>
          </div>
          <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-200'}`}>
            <div
              className={`h-2 rounded-full transition-all duration-500 ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-600'}`}
              style={{ width: `${calculateCompletion()}%` }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3">
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
        <div className="flex h-[calc(90vh-200px)]">
          {/* Side Navigation */}
          <div className={`w-64 p-4 border-r
            ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
          >
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = selectedTab === item.id;
                const isCompleted = completionStatus[item.key as keyof typeof completionStatus];
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors
                      ${isActive
                        ? theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-600'
                        : isCompleted
                          ? theme === 'dark' ? 'text-green-400 hover:bg-gray-800' : 'text-green-600 hover:bg-blue-50'
                          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'}
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? (theme === 'dark' ? 'text-blue-200' : 'text-blue-600') : isCompleted ? 'text-green-500' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                    {isCompleted && <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {selectedTab === 0 && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <FaUser className="text-blue-600 w-5 h-5" />
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-900'}`}>Personal Information</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>Employee personal details</p>
                    </div>
                  </div>

                  {/* Profile Image */}
                  <div className="flex items-center gap-6 mb-6">
                    <div className={`relative w-20 h-20 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
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
                    <div>
                      <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{kycData.personalDetails.fullName}</h4>
                      <p className={`text-base ${theme === 'dark' ? 'text-blue-200' : 'text-gray-600'}`}>{kycData.personalDetails.designation}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-gray-500'}`}>{kycData.personalDetails.employeeId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(kycData.personalDetails).map(([key, value]) => 
                      key !== 'employeeImage' && (
                        <div key={key} className="space-y-2">
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
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'} mb-4`}>Permanent Address</h4>
                      <div className="space-y-4">
                        {Object.entries(kycData.addressDetails.permanentAddress).map(([key, value]) => (
                          <div key={key}>
                            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'} capitalize`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Current Address */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'} mb-4`}>Current Address</h4>
                      <div className="space-y-4">
                        {Object.entries(kycData.addressDetails.currentAddress).map(([key, value]) => (
                          <div key={key}>
                            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-500'} capitalize`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>{value}</p>
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

                  <div className="bg-gray-50 rounded-xl p-6">
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