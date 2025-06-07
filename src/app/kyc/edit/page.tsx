'use client';

import { useState, useEffect } from 'react';
import { FaUser, FaMapMarkerAlt, FaIdCard, FaSpinner, FaSave, FaExclamationCircle, FaCheckCircle, FaArrowLeft, FaMoneyCheckAlt,  FaPhoneVolume,  FaInfoCircle } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

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

const initialKYCData: KYCData = {
  personalDetails: {
    employeeId: '',
    projectName: '',
    fullName: '',
    fathersName: '',
    mothersName: '',
    gender: '',
    dob: '',
    phoneNumber: '',
    designation: '',
    dateOfJoining: '',
    nationality: '',
    religion: '',
    maritalStatus: '',
    bloodGroup: '',
    uanNumber: '',
    esicNumber: '',
    experience: '',
    educationalQualification: '',
    languages: [],
    employeeImage: '',
    email: '',
    workType: '',
  },
  addressDetails: {
    permanentAddress: {
      state: '',
      city: '',
      street: '',
      postalCode: '',
    },
    currentAddress: {
      state: '',
      city: '',
      street: '',
      postalCode: '',
    },
  },
  bankDetails: {
    bankName: '',
    branchName: '',
    accountNumber: '',
    ifscCode: '',
  },
  identificationDetails: {
    identificationType: '',
    identificationNumber: '',
  },
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
    aadhar: '',
  },
  documents: [],
  status: '',
};

const validateAndTransformKYCData = (data: Partial<KYCData>): KYCData => {
  return {
    personalDetails: {
      employeeId: data?.personalDetails?.employeeId || '',
      projectName: data?.personalDetails?.projectName || '',
      fullName: data?.personalDetails?.fullName || '',
      fathersName: data?.personalDetails?.fathersName || '',
      mothersName: data?.personalDetails?.mothersName || '',
      gender: data?.personalDetails?.gender || '',
      dob: data?.personalDetails?.dob || '',
      phoneNumber: data?.personalDetails?.phoneNumber || '',
      designation: data?.personalDetails?.designation || '',
      dateOfJoining: data?.personalDetails?.dateOfJoining || '',
      nationality: data?.personalDetails?.nationality || '',
      religion: data?.personalDetails?.religion || '',
      maritalStatus: data?.personalDetails?.maritalStatus || '',
      bloodGroup: data?.personalDetails?.bloodGroup || '',
      uanNumber: data?.personalDetails?.uanNumber || '',
      esicNumber: data?.personalDetails?.esicNumber || '',
      experience: data?.personalDetails?.experience || '',
      educationalQualification: data?.personalDetails?.educationalQualification || '',
      languages: data?.personalDetails?.languages || [],
      employeeImage: data?.personalDetails?.employeeImage || '',
      email: data?.personalDetails?.email || '',
      workType: data?.personalDetails?.workType || '',
    },
    addressDetails: {
      permanentAddress: {
        state: data?.addressDetails?.permanentAddress?.state || '',
        city: data?.addressDetails?.permanentAddress?.city || '',
        street: data?.addressDetails?.permanentAddress?.street || '',
        postalCode: data?.addressDetails?.permanentAddress?.postalCode || '',
      },
      currentAddress: {
        state: data?.addressDetails?.currentAddress?.state || '',
        city: data?.addressDetails?.currentAddress?.city || '',
        street: data?.addressDetails?.currentAddress?.street || '',
        postalCode: data?.addressDetails?.currentAddress?.postalCode || '',
      },
    },
    bankDetails: {
      bankName: data?.bankDetails?.bankName || '',
      branchName: data?.bankDetails?.branchName || '',
      accountNumber: data?.bankDetails?.accountNumber || '',
      ifscCode: data?.bankDetails?.ifscCode || '',
    },
    identificationDetails: {
      identificationType: data?.identificationDetails?.identificationType || '',
      identificationNumber: data?.identificationDetails?.identificationNumber || '',
    },
    emergencyContact: {
      name: data?.emergencyContact?.name || '',
      phone: data?.emergencyContact?.phone || '',
      relationship: data?.emergencyContact?.relationship || '',
      aadhar: data?.emergencyContact?.aadhar || '',
    },
    documents: data?.documents || [],
    status: data?.status || '',
  };
};

export default function EditKYC() {
  const router = useRouter();
  const { theme } = useTheme();
  const [kycData, setKYCData] = useState<KYCData>(initialKYCData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  const sections = [
    { id: 'personal', title: 'Personal Information', icon: FaUser },
    { id: 'address', title: 'Address Details', icon: FaMapMarkerAlt },
    { id: 'bank', title: 'Bank Information', icon: FaMoneyCheckAlt },
    { id: 'emergency', title: 'Emergency Contact', icon: FaPhoneVolume },
    { id: 'documents', title: 'Documents', icon: FaIdCard },
  ];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchKYCData();
  }, [router]);

  const fetchKYCData = async () => {
    try {
      const employeeId = getEmployeeId();
      if (!employeeId) throw new Error('Employee ID not found. Please login again.');
      const response = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch KYC data');
      }
      const data = await response.json();
      
      // Format date strings to YYYY-MM-DD format for input[type="date"]
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          // Try parsing DD-MM-YYYY format
          const [day, month, year] = dateString.split('-');
          if (day && month && year) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return '';
        }
        return date.toISOString().split('T')[0];
      };

      // Transform the data
      const transformedData = {
        ...initialKYCData,
        ...data.kycData,
        personalDetails: {
          ...initialKYCData.personalDetails,
          ...data.kycData.personalDetails,
          dob: formatDate(data.kycData.personalDetails.dob),
          dateOfJoining: formatDate(data.kycData.personalDetails.dateOfJoining),
        },
        addressDetails: {
          ...initialKYCData.addressDetails,
          ...data.kycData.addressDetails,
        },
        bankDetails: {
          ...initialKYCData.bankDetails,
          ...data.kycData.bankDetails,
        },
        identificationDetails: {
          ...initialKYCData.identificationDetails,
          ...data.kycData.identificationDetails,
        },
        emergencyContact: {
          ...initialKYCData.emergencyContact,
          ...data.kycData.emergencyContact,
        },
        documents: data.kycData.documents || [],
        status: data.kycData.status || '',
      };

      setKYCData(transformedData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch KYC data');
      setKYCData(initialKYCData); // Set to initial state on error
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    switch (activeSection) {
      case 'personal':
        return (
          kycData.personalDetails.fullName &&
          kycData.personalDetails.gender &&
          kycData.personalDetails.dob &&
          kycData.personalDetails.phoneNumber &&
          kycData.personalDetails.email &&
          kycData.personalDetails.designation
        );
      case 'address':
        return (
          kycData.addressDetails.permanentAddress.street &&
          kycData.addressDetails.permanentAddress.city &&
          kycData.addressDetails.permanentAddress.state &&
          kycData.addressDetails.permanentAddress.postalCode &&
          kycData.addressDetails.currentAddress.street &&
          kycData.addressDetails.currentAddress.city &&
          kycData.addressDetails.currentAddress.state &&
          kycData.addressDetails.currentAddress.postalCode
        );
      case 'bank':
        return (
          kycData.bankDetails.bankName &&
          kycData.bankDetails.branchName &&
          kycData.bankDetails.accountNumber &&
          kycData.bankDetails.ifscCode
        );
      case 'emergency':
        return (
          kycData.emergencyContact.name &&
          kycData.emergencyContact.phone &&
          kycData.emergencyContact.relationship
        );
      case 'documents':
        return kycData.documents.length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all sections before submission
    const allSectionsValid = sections
      .map(section => section.id)
      .every(sectionId => {
        setActiveSection(sectionId);
        return isFormValid();
      });

    if (!allSectionsValid) {
      setError('Please complete all required fields in each section');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const employeeId = getEmployeeId();
      if (!employeeId) throw new Error('Employee ID not found. Please login again.');
      const response = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kycData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update KYC information');
      }

      setSuccess('KYC information updated successfully!');
      setCompletedSections(sections.map(section => section.id));
      
      // Update local state with validated response data
      const transformedData = validateAndTransformKYCData(data);
      setKYCData(transformedData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update KYC information');
    } finally {
      setSaving(false);
    }
  };

  const handleNextSection = () => {
    if (isFormValid()) {
      const currentIndex = sections.findIndex(s => s.id === activeSection);
      if (currentIndex < sections.length - 1) {
        setActiveSection(sections[currentIndex + 1].id);
        if (!completedSections.includes(activeSection)) {
          setCompletedSections([...completedSections, activeSection]);
        }
      }
    } else {
      setError('Please fill in all required fields before proceeding');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'
    }`}>
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
            <h1 className="text-3xl font-bold text-white">Edit KYC</h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-blue-100'}`}>
              Update and manage your KYC information
            </p>
          </div>
        </div>
      </div>

      {/* Instructions Panel */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`max-w-7xl mx-auto px-4 py-4 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
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
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>KYC Information Guidelines</h2>
              <ul className={`mt-2 space-y-2 text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-black'
              }`}>
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                  }`}></span>
                  <span className="font-medium">Fill in all required fields marked with an asterisk (*).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                  }`}></span>
                  <span className="font-medium">Ensure all documents are clear and legible before uploading.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                  }`}></span>
                  <span className="font-medium">Double-check your bank details to avoid payment issues.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Side Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className={`rounded-2xl p-4 sticky top-8 ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            } border`}>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const isActive = activeSection === section.id;
                  const isCompleted = completedSections.includes(section.id);
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                        isActive
                          ? theme === 'dark'
                            ? 'bg-gray-700 text-blue-400'
                            : 'bg-blue-50 text-blue-600'
                          : isCompleted
                          ? theme === 'dark'
                            ? 'text-green-400 hover:bg-gray-700'
                            : 'text-green-600 hover:bg-gray-50'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <section.icon className={`w-5 h-5 ${
                        isActive 
                          ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          : isCompleted
                          ? 'text-green-500'
                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                      }`} />
                      <span className="font-medium">{section.title}</span>
                      {isCompleted && (
                        <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </nav>
              
              <div className={`mt-6 pt-6 border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                    Completion Status
                  </span>
                  <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>
                    {Math.round((completedSections.length / sections.length) * 100)}%
                  </span>
                </div>
                <div className={`mt-2 h-2 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                } rounded-full overflow-hidden`}>
                  <div
                    className={`h-full ${
                      theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
                    } rounded-full transition-all duration-500`}
                    style={{ width: `${(completedSections.length / sections.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="space-y-6">
              {/* Back Button and Title */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/kyc')}
                  className={`p-2 rounded-xl transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Edit KYC Information</h1>
                  <p className={
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }>Update your personal and identity information</p>
                </div>
              </div>

              {/* Form Sections */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {activeSection === 'personal' && (
                    <motion.div
                      key="personal"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`rounded-2xl p-6 md:p-8 border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Personal Details Form */}
                      <div className="space-y-6">
                        {/* Profile Image */}
                        <div className="flex items-center gap-6">
                          <div className={`relative w-24 h-24 rounded-full overflow-hidden ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                          }`}>
                            {kycData.personalDetails.employeeImage ? (
                              <Image
                                src={kycData.personalDetails.employeeImage}
                                alt="Profile"
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <FaUser className={`w-full h-full p-4 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Employee ID */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Employee ID
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.employeeId}
                              disabled
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Project Name */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Project Name
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.projectName}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    projectName: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Full Name */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.fullName}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    fullName: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Father&apos;s Name */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Father&apos;s Name
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.fathersName}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    fathersName: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Mother&apos;s Name */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Mother&apos;s Name
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.mothersName}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    mothersName: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Gender */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Gender *
                            </label>
                            <select
                              value={kycData.personalDetails.gender}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    gender: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Date of Birth */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Date of Birth *
                            </label>
                            <input
                              type="date"
                              value={kycData.personalDetails.dob}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    dob: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Phone Number */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              value={kycData.personalDetails.phoneNumber}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    phoneNumber: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Email */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Email *
                            </label>
                            <input
                              type="email"
                              value={kycData.personalDetails.email}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    email: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Designation */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Designation *
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.designation}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    designation: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Date of Joining */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Date of Joining
                            </label>
                            <input
                              type="date"
                              value={kycData.personalDetails.dateOfJoining}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    dateOfJoining: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Additional Fields */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Nationality
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.nationality}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    nationality: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Religion */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Religion
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.religion}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    religion: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Marital Status */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Marital Status
                            </label>
                            <select
                              value={kycData.personalDetails.maritalStatus}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    maritalStatus: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="">Select Status</option>
                              <option value="Single">Single</option>
                              <option value="Married">Married</option>
                              <option value="Divorced">Divorced</option>
                              <option value="Widowed">Widowed</option>
                            </select>
                          </div>

                          {/* Blood Group */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Blood Group
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.bloodGroup}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    bloodGroup: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Work Type */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Work Type
                            </label>
                            <select
                              value={kycData.personalDetails.workType}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    workType: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="">Select Work Type</option>
                              <option value="office">Office</option>
                              <option value="remote">Remote</option>
                              <option value="hybrid">Hybrid</option>
                            </select>
                          </div>

                          {/* Experience */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Experience
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.experience}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    experience: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          {/* Educational Qualification */}
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Educational Qualification
                            </label>
                            <input
                              type="text"
                              value={kycData.personalDetails.educationalQualification}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  personalDetails: {
                                    ...kycData.personalDetails,
                                    educationalQualification: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Languages */}
                        <div>
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          } mb-2`}>
                            Languages
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {kycData.personalDetails.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'address' && (
                    <motion.div
                      key="address"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`rounded-2xl p-6 md:p-8 border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Permanent Address */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FaMapMarkerAlt className="text-blue-600" />
                          Permanent Address
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Street *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.permanentAddress.street}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    permanentAddress: {
                                      ...kycData.addressDetails.permanentAddress,
                                      street: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              City *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.permanentAddress.city}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    permanentAddress: {
                                      ...kycData.addressDetails.permanentAddress,
                                      city: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              State *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.permanentAddress.state}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    permanentAddress: {
                                      ...kycData.addressDetails.permanentAddress,
                                      state: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Postal Code *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.permanentAddress.postalCode}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    permanentAddress: {
                                      ...kycData.addressDetails.permanentAddress,
                                      postalCode: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Current Address */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FaMapMarkerAlt className="text-blue-600" />
                          Current Address
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Street *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.currentAddress.street}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    currentAddress: {
                                      ...kycData.addressDetails.currentAddress,
                                      street: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              City *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.currentAddress.city}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    currentAddress: {
                                      ...kycData.addressDetails.currentAddress,
                                      city: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              State *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.currentAddress.state}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    currentAddress: {
                                      ...kycData.addressDetails.currentAddress,
                                      state: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Postal Code *
                            </label>
                            <input
                              type="text"
                              value={kycData.addressDetails.currentAddress.postalCode}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  addressDetails: {
                                    ...kycData.addressDetails,
                                    currentAddress: {
                                      ...kycData.addressDetails.currentAddress,
                                      postalCode: e.target.value,
                                    },
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'bank' && (
                    <motion.div
                      key="bank"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`rounded-2xl p-6 md:p-8 border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FaMoneyCheckAlt className="text-blue-600" />
                          Bank Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Bank Name *
                            </label>
                            <input
                              type="text"
                              value={kycData.bankDetails.bankName}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  bankDetails: {
                                    ...kycData.bankDetails,
                                    bankName: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Branch Name *
                            </label>
                            <input
                              type="text"
                              value={kycData.bankDetails.branchName}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  bankDetails: {
                                    ...kycData.bankDetails,
                                    branchName: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Account Number *
                            </label>
                            <input
                              type="text"
                              value={kycData.bankDetails.accountNumber}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  bankDetails: {
                                    ...kycData.bankDetails,
                                    accountNumber: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              IFSC Code *
                            </label>
                            <input
                              type="text"
                              value={kycData.bankDetails.ifscCode}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  bankDetails: {
                                    ...kycData.bankDetails,
                                    ifscCode: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'emergency' && (
                    <motion.div
                      key="emergency"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`rounded-2xl p-6 md:p-8 border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FaPhoneVolume className="text-blue-600" />
                          Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Contact Name *
                            </label>
                            <input
                              type="text"
                              value={kycData.emergencyContact.name}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  emergencyContact: {
                                    ...kycData.emergencyContact,
                                    name: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              value={kycData.emergencyContact.phone}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  emergencyContact: {
                                    ...kycData.emergencyContact,
                                    phone: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Relationship *
                            </label>
                            <input
                              type="text"
                              value={kycData.emergencyContact.relationship}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  emergencyContact: {
                                    ...kycData.emergencyContact,
                                    relationship: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              Aadhar Number
                            </label>
                            <input
                              type="text"
                              value={kycData.emergencyContact.aadhar}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  emergencyContact: {
                                    ...kycData.emergencyContact,
                                    aadhar: e.target.value,
                                  },
                                })
                              }
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'documents' && (
                    <motion.div
                      key="documents"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`rounded-2xl p-6 md:p-8 border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FaIdCard className="text-blue-600" />
                          Documents
                        </h3>

                        {/* Identification Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              ID Type *
                            </label>
                            <select
                              value={kycData.identificationDetails.identificationType}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  identificationDetails: {
                                    ...kycData.identificationDetails,
                                    identificationType: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="">Select ID Type</option>
                              <option value="Aadhar">Aadhar</option>
                              <option value="PAN">PAN</option>
                              <option value="Passport">Passport</option>
                              <option value="Driving License">Driving License</option>
                            </select>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            } mb-2`}>
                              ID Number *
                            </label>
                            <input
                              type="text"
                              value={kycData.identificationDetails.identificationNumber}
                              onChange={(e) =>
                                setKYCData({
                                  ...kycData,
                                  identificationDetails: {
                                    ...kycData.identificationDetails,
                                    identificationNumber: e.target.value,
                                  },
                                })
                              }
                              required
                              className={`w-full px-4 py-2 rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Uploaded Documents List */}
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Uploaded Documents</h4>
                          {kycData.documents.length > 0 ? (
                            <div className="space-y-4">
                              {kycData.documents.map((doc) => (
                                <div
                                  key={doc._id}
                                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <FaIdCard className="text-blue-600" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {doc.type}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Uploaded on &apos;
                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  >
                                    View
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation and Submit */}
                <div className="flex items-center justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = sections.findIndex(s => s.id === activeSection);
                      if (currentIndex > 0) {
                        setActiveSection(sections[currentIndex - 1].id);
                      }
                    }}
                    className={`px-6 py-2 transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    disabled={activeSection === sections[0].id}
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-4">
                    {activeSection !== sections[sections.length - 1].id ? (
                      <button
                        type="button"
                        onClick={handleNextSection}
                        className={`px-8 py-3 rounded-xl text-white font-medium transition-all ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={saving}
                        className={`px-8 py-3 rounded-xl text-white font-medium transition-all ${
                          saving
                            ? theme === 'dark'
                              ? 'bg-blue-500/50 cursor-not-allowed'
                              : 'bg-blue-400 cursor-not-allowed'
                            : theme === 'dark'
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <FaSpinner className="animate-spin" />
                            Saving Changes...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FaSave />
                            Save Changes
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-3 p-4 rounded-xl ${
                      theme === 'dark'
                        ? 'bg-red-900/50 text-red-300 border border-red-800'
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}
                  >
                    <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-3 p-4 rounded-xl ${
                      theme === 'dark'
                        ? 'bg-green-900/50 text-green-300 border border-green-800'
                        : 'bg-green-50 text-green-600 border border-green-100'
                    }`}
                  >
                    <FaCheckCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}