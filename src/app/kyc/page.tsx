'use client';

import { useEffect, useState, useCallback } from 'react';
import { FaSpinner,  FaEye, FaTimes,  FaFileAlt, FaUser, FaPhone, FaIdCard,  FaTimesCircle, FaExclamationCircle, FaCheckCircle,  FaUserCircle, FaBuilding, FaAddressCard, FaQuestionCircle,  FaLightbulb,} from 'react-icons/fa';
import { isAuthenticated,  getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
// import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

// import classNames from 'classnames';

interface KYCResponse {
  message: string;
  kycData: {
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
    _id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    documents: Array<{
      type: string;
      url: string;
      uploadedAt: string;
      _id: string;
    }>;
  };
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ViewKYC() {
  const { theme } = useTheme();
  const router = useRouter();
  const employeeId = getEmployeeId();
  const [kycResponse, setKYCResponse] = useState<KYCResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [completionStatus, setCompletionStatus] = useState({
    personal: false,
    address: false,
    bank: false,
    emergency: false,
    documents: false
  });

  const fetchKYCData = useCallback(async () => {
    try {
      if (!employeeId) {
        throw new Error('Employee ID not found');
      }
      const response = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch KYC data');
      }
      const data = await response.json();
      setKYCResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch KYC data');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchKYCData();
  }, [router, fetchKYCData]);



  // Calculate completion percentage
  const calculateCompletion = () => {
    const sections = Object.values(completionStatus);
    const completed = sections.filter(Boolean).length;
    return Math.round((completed / sections.length) * 100);
  };

  // Check section completion
  useEffect(() => {
    if (kycResponse?.kycData) {
      const { personalDetails, addressDetails, bankDetails, emergencyContact, documents } = kycResponse.kycData;
      
      setCompletionStatus({
        personal: Object.values(personalDetails).every(val => val !== ''),
        address: Object.values(addressDetails.permanentAddress).every(val => val !== '') && 
                Object.values(addressDetails.currentAddress).every(val => val !== ''),
        bank: Object.values(bankDetails).every(val => val !== ''),
        emergency: Object.values(emergencyContact).every(val => val !== ''),
        documents: documents.length > 0
      });
    }
  }, [kycResponse]);

  // Instructions component
  const Instructions = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`rounded-2xl p-6 mb-8 relative border ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
    >
      <button
        onClick={() => setShowInstructions(false)}
        className={`absolute top-4 right-4 ${
          theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <FaTimes className="w-5 h-5" />
      </button>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${
          theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-100'
        }`}>
          <FaLightbulb className={`w-6 h-6 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>KYC Instructions</h3>
          <ul className={`space-y-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <li className="flex items-center gap-2">
              <FaCheckCircle className="w-4 h-4 text-green-500" />
              Complete all sections for full verification
            </li>
            <li className="flex items-center gap-2">
              <FaCheckCircle className="w-4 h-4 text-green-500" />
              Ensure all documents are clear and legible
            </li>
            <li className="flex items-center gap-2">
              <FaCheckCircle className="w-4 h-4 text-green-500" />
              Keep your information up to date
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );

  // Progress Bar component
  const ProgressBar = () => (
    <div className={`rounded-2xl p-6 mb-8 shadow-sm border ${
      theme === 'dark'
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>KYC Completion Status</h3>
        <span className={`text-sm font-medium ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>{calculateCompletion()}% Complete</span>
      </div>
      <div className={`w-full rounded-full h-2.5 ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
          }`}
          style={{ width: `${calculateCompletion()}%` }}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        {Object.entries(completionStatus).map(([section, isComplete]) => (
          <div
            key={section}
            className="flex items-center gap-2"
            data-tooltip-id={`section-${section}`}
          >
            {isComplete ? (
              <FaCheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <FaExclamationCircle className="w-4 h-4 text-yellow-500" />
            )}
            <span className={`text-sm font-medium capitalize ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {section}
            </span>
            <Tooltip id={`section-${section}`}>
              {isComplete ? 'Section completed' : 'Section pending completion'}
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin text-blue-600">
          <FaSpinner className="w-12 h-12" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3 max-w-lg w-full shadow-lg">
          <FaTimesCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!kycResponse?.kycData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-yellow-50 text-yellow-600 p-6 rounded-2xl flex items-center gap-3 max-w-lg w-full shadow-lg">
          <FaExclamationCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-lg font-medium">No KYC data available</p>
        </div>
      </div>
    );
  }

  const { kycData } = kycResponse;
  
  // Fix the TypeScript error by creating a mapping type
  type CompletionStatusKey = 'personal' | 'address' | 'bank' | 'emergency' | 'documents';
  
  // Map navigation items to section keys
  const navigationItems = [
    { icon: FaUserCircle, label: 'Personal Info', id: 0, key: 'personal' as CompletionStatusKey },
    { icon: FaAddressCard, label: 'Address', id: 1, key: 'address' as CompletionStatusKey },
    { icon: FaBuilding, label: 'Bank Details', id: 2, key: 'bank' as CompletionStatusKey },
    { icon: FaPhone, label: 'Emergency Contact', id: 3, key: 'emergency' as CompletionStatusKey },
    { icon: FaFileAlt, label: 'Documents', id: 4, key: 'documents' as CompletionStatusKey },
  ];

  return (
    <div className={`min-h-screen font-sans ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'
    }`}>
      <div className="flex">
        {/* Desktop Navigation Sidebar */}
        <div className={`hidden lg:block w-64 h-screen sticky top-0 border-r ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-6">
            <h2 className={`text-lg font-semibold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              KYC Sections
            </h2>
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedTab(item.id)}
                  className={classNames(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    selectedTab === item.id
                      ? theme === 'dark'
                        ? 'bg-gray-700 text-blue-400'
                        : 'bg-indigo-50 text-indigo-600'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {completionStatus[item.key] && (
                    <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto" style={{height: 'calc(100vh - 64px)'}}>
          {/* KYC Header - Show on all screens */}
          <div>
 <div
  className={`rounded-2xl mt-4 mb-6 p-4 flex items-end gap-3 shadow w-full mx-auto
    max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-[1440px] ${
    theme === 'dark'
      ? 'bg-gradient-to-r from-gray-800 to-gray-700'
      : 'bg-gradient-to-r from-blue-600 to-blue-400'
  }`}
>


              <div
                className={`${
                  theme === 'dark'
                    ? 'bg-gray-700 bg-opacity-50'
                    : 'bg-blue-600 bg-opacity-30'
                } rounded-xl p-2 flex items-center justify-center`}
              >
                <FaIdCard className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5 truncate">View KYC</h1>
                <p className="text-white text-sm sm:text-base opacity-90 truncate">View and manage your KYC verification details</p>
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className="p-4 lg:p-6">
            {/* Instructions and Progress Bar */}
            {showInstructions && <Instructions />}
            <ProgressBar />

            {/* Mobile Tab Navigation (vertical) */}
            <div className="lg:hidden mb-6">
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTab(item.id)}
                    className={classNames(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                      selectedTab === item.id
                        ? theme === 'dark'
                          ? 'bg-gray-700 text-blue-400'
                          : 'bg-indigo-50 text-indigo-600'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {completionStatus[item.key] && (
                      <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content sections */}
            <div className="space-y-6 mt-6">
              <AnimatePresence mode="wait">
                {/* Wrap each section's content with dark theme classes */}
                {selectedTab === 0 && (
                  <motion.div
                    key="personal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-2xl shadow-sm p-4 sm:p-6 border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <h2 className={`text-xl font-bold mb-4 sm:mb-6 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>Personal Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {Object.entries(kycData.personalDetails).map(([key, value]) => 
                        key !== 'employeeImage' && (
                          <div key={key} className="space-y-2">
                            <label className={`text-sm font-medium capitalize ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className={`text-base font-medium ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            } ${key === 'email' || key === 'workType' ? "break-all" : ""}`}>{Array.isArray(value) ? value.join(', ') : value?.toString() || '-'}</p>
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
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                  >
                    {/* Permanent Address */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-4">
                        Permanent Address
                      </h3>
                      <div className="space-y-2 sm:space-y-4">
                        {Object.entries(kycData.addressDetails.permanentAddress).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-200 mt-1">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Current Address */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-4">
                        Current Address
                      </h3>
                      <div className="space-y-2 sm:space-y-4">
                        {Object.entries(kycData.addressDetails.currentAddress).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-200 mt-1">{value}</p>
                          </div>
                        ))}
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
                    className={`rounded-2xl shadow-sm p-6 border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <h2 className={`text-xl font-bold mb-6 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>Bank Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(kycData.bankDetails).map(([key, value]) => (
                        <div key={key}>
                          <label className={`text-sm font-medium capitalize ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <p className={`text-base font-medium mt-1 font-mono ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedTab === 3 && (
                  <motion.div
                    key="emergency"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-2xl shadow-sm p-6 border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <h2 className={`text-xl font-bold mb-6 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>Emergency Contact</h2>
                    <div className="flex flex-col space-y-4">
                      <div className={`p-4 rounded-xl ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <FaUser className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Name</p>
                              <p className="font-medium text-gray-900">
                                {kycData.emergencyContact.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <FaPhone className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Phone</p>
                              <p className="font-medium text-gray-900">
                                {kycData.emergencyContact.phone}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <FaUserCircle className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Relationship</p>
                              <p className="font-medium text-gray-900">
                                {kycData.emergencyContact.relationship}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <FaIdCard className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Aadhar</p>
                              <p className="font-medium text-gray-900">
                                {kycData.emergencyContact.aadhar}
                              </p>
                            </div>
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
                    className={`rounded-2xl shadow-sm p-6 border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Documents</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {kycData.documents.map((doc) => (
                        <div
                          key={doc._id}
                          className={`flex items-start p-4 rounded-xl transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                            <FaFileAlt className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc.type}</h4>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mt-1`}>
                              Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-flex items-center"
                            >
                              <FaEye className="w-4 h-4 mr-1" />
                              View Document
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Help Button */}
      <button
        onClick={() => setShowInstructions(true)}
        className={`fixed bottom-20 right-4 lg:bottom-8 lg:right-8 p-3 rounded-full shadow-lg transition-all z-50 ${
          theme === 'dark'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-indigo-600 hover:bg-indigo-700'
        } text-white`}
      >
        <FaQuestionCircle className="w-6 h-6" />
      </button>
    </div>
  );
}