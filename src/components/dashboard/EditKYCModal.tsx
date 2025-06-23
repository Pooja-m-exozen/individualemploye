import React, { useState, useEffect } from "react";
import { FaUser, FaMapMarkerAlt, FaIdCard, FaSpinner, FaSave, FaExclamationCircle, FaCheckCircle, FaMoneyCheckAlt, FaPhoneVolume, FaInfoCircle, FaTimes } from "react-icons/fa";
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

interface EditKYCModalProps {
  open: boolean;
  onClose: () => void;
  kycData: any;
  onSave: (data: any) => void;
}

const EditKYCModal: React.FC<EditKYCModalProps> = ({ open, onClose, kycData, onSave }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<KYCData>(kycData);
  const [activeSection, setActiveSection] = useState('personal');
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sections = [
    { id: 'personal', title: 'Personal Information', icon: FaUser },
    { id: 'address', title: 'Address Details', icon: FaMapMarkerAlt },
    { id: 'bank', title: 'Bank Information', icon: FaMoneyCheckAlt },
    { id: 'emergency', title: 'Emergency Contact', icon: FaPhoneVolume },
    { id: 'documents', title: 'Documents', icon: FaIdCard },
  ];

  useEffect(() => {
    if (kycData) {
      setFormData(kycData);
    }
  }, [kycData]);

  const isFormValid = () => {
    switch (activeSection) {
      case 'personal':
        return (
          formData.personalDetails.fullName &&
          formData.personalDetails.gender &&
          formData.personalDetails.dob &&
          formData.personalDetails.phoneNumber &&
          formData.personalDetails.email &&
          formData.personalDetails.designation
        );
      case 'address':
        return (
          formData.addressDetails.permanentAddress.street &&
          formData.addressDetails.permanentAddress.city &&
          formData.addressDetails.permanentAddress.state &&
          formData.addressDetails.permanentAddress.postalCode &&
          formData.addressDetails.currentAddress.street &&
          formData.addressDetails.currentAddress.city &&
          formData.addressDetails.currentAddress.state &&
          formData.addressDetails.currentAddress.postalCode
        );
      case 'bank':
        return (
          formData.bankDetails.bankName &&
          formData.bankDetails.branchName &&
          formData.bankDetails.accountNumber &&
          formData.bankDetails.ifscCode
        );
      case 'emergency':
        return (
          formData.emergencyContact.name &&
          formData.emergencyContact.phone &&
          formData.emergencyContact.relationship
        );
      case 'documents':
        return formData.documents.length > 0;
      default:
        return true;
    }
  };

  // Helper to check if a string is non-empty
  const isFilled = (val: any) => val !== undefined && val !== null && val !== '';

  // Validate all fields in all sections
  const isAllFieldsValid = () => {
    const pd = formData.personalDetails;
    const ad = formData.addressDetails;
    const bd = formData.bankDetails;
    const ec = formData.emergencyContact;
    const id = formData.identificationDetails;
    return (
      isFilled(pd.employeeId) &&
      isFilled(pd.projectName) &&
      isFilled(pd.fullName) &&
      isFilled(pd.fathersName) &&
      isFilled(pd.mothersName) &&
      isFilled(pd.gender) &&
      isFilled(pd.dob) &&
      isFilled(pd.phoneNumber) &&
      isFilled(pd.designation) &&
      isFilled(pd.dateOfJoining) &&
      isFilled(pd.nationality) &&
      isFilled(pd.religion) &&
      isFilled(pd.maritalStatus) &&
      isFilled(pd.bloodGroup) &&
      isFilled(pd.uanNumber) &&
      isFilled(pd.esicNumber) &&
      isFilled(pd.experience) &&
      isFilled(pd.educationalQualification) &&
      Array.isArray(pd.languages) && pd.languages.length > 0 &&
      isFilled(pd.employeeImage) &&
      isFilled(pd.email) &&
      isFilled(pd.workType) &&
      isFilled(ad.permanentAddress.state) &&
      isFilled(ad.permanentAddress.city) &&
      isFilled(ad.permanentAddress.street) &&
      isFilled(ad.permanentAddress.postalCode) &&
      isFilled(ad.currentAddress.state) &&
      isFilled(ad.currentAddress.city) &&
      isFilled(ad.currentAddress.street) &&
      isFilled(ad.currentAddress.postalCode) &&
      isFilled(bd.bankName) &&
      isFilled(bd.branchName) &&
      isFilled(bd.accountNumber) &&
      isFilled(bd.ifscCode) &&
      isFilled(id.identificationType) &&
      isFilled(id.identificationNumber) &&
      isFilled(ec.name) &&
      isFilled(ec.phone) &&
      isFilled(ec.relationship) &&
      isFilled(ec.aadhar) &&
      Array.isArray(formData.documents) && formData.documents.length > 0 &&
      isFilled(formData.status)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!isAllFieldsValid()) {
      setError('Please complete all required fields in the KYC form.');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      setSuccess('KYC information updated successfully!');
      setCompletedSections(sections.map(section => section.id));
      setTimeout(() => {
        onClose();
      }, 2000);
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

  if (!open) return null;

  const themeStyles = theme === 'dark'
    ? {
        modalOverlay: 'bg-black bg-opacity-80',
        modalBg: 'bg-gray-900',
        headerBg: 'bg-gradient-to-r from-gray-800 to-gray-700',
        iconBg: 'bg-gray-700 bg-opacity-30',
        headerText: 'text-xl font-bold text-white',
        panelBg: 'px-6 py-4 bg-gray-800 border-b border-gray-700',
        sideNavBg: 'w-64 bg-gray-800 border-r border-gray-700 p-4',
        sectionTitle: 'text-lg font-semibold text-white',
        sectionDesc: 'text-sm text-gray-300',
        label: 'block text-sm font-medium text-gray-200 mb-2',
        inputBg: 'bg-gray-800 text-white',
      }
    : {
        modalOverlay: 'bg-black bg-opacity-40',
        modalBg: 'bg-white',
        headerBg: 'bg-gradient-to-r from-blue-600 to-blue-500',
        iconBg: 'bg-blue-500 bg-opacity-30',
        headerText: 'text-xl font-bold text-black',
        panelBg: 'px-6 py-4 bg-blue-50 border-b border-blue-100',
        sideNavBg: 'w-64 bg-gray-50 border-r border-gray-200 p-4',
        sectionTitle: 'text-lg font-semibold text-black',
        sectionDesc: 'text-sm text-black',
        label: 'block text-sm font-medium text-black mb-2',
        inputBg: 'bg-gray-50',
      };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${themeStyles.modalOverlay}`}
    >
      <div
        className={`${themeStyles.modalBg} rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden`}
      >
        {/* Header */}
        <div className={`${themeStyles.headerBg} px-6 py-4 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`${themeStyles.iconBg} rounded-xl p-3`}>
                <FaIdCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`${themeStyles.headerText}`}>Edit KYC</h2>
                <p className="text-blue-100 text-sm">Update employee information</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold focus:outline-none">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className={`${themeStyles.panelBg}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FaInfoCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-800">KYC Information Guidelines</h3>
              <ul className="mt-1 space-y-1 text-xs text-blue-700">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-600"></span>
                  <span>Fill in all required fields marked with an asterisk (*).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-600"></span>
                  <span>Ensure all documents are clear and legible before uploading.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-600"></span>
                  <span>Double-check your bank details to avoid payment issues.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Side Navigation */}
          <div className={`${themeStyles.sideNavBg}`}> 
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
                        ? 'bg-blue-50 text-blue-600'
                        : isCompleted
                        ? 'text-green-600 hover:bg-blue-50'
                        : 'text-gray-600 hover:bg-blue-50'
                    }`}
                  >
                    <section.icon className={`w-5 h-5 ${
                      isActive 
                        ? 'text-blue-600'
                        : isCompleted
                        ? 'text-green-500'
                        : 'text-gray-400'
                    }`} />
                    <span className="font-medium text-sm">{section.title}</span>
                    {isCompleted && (
                      <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Completion</span>
                <span className="text-blue-600 font-semibold">
                  {Math.round((completedSections.length / sections.length) * 100)}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${(completedSections.length / sections.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {activeSection === 'personal' && (
                  <motion.div
                    key="personal"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* Personal Details Form */}
                    <div className="space-y-6">
                      {/* Profile Image */}
                      <div className="flex items-center gap-6">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                          {formData.personalDetails.employeeImage ? (
                            <Image
                              src={formData.personalDetails.employeeImage}
                              alt="Profile"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <FaUser className="w-full h-full p-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className={`${themeStyles.sectionTitle}`}>Personal Information</h3>
                          <p className={`${themeStyles.sectionDesc}`}>Update employee personal details</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Employee ID */}
                        <div>
                          <label className={`${themeStyles.label}`}>Employee ID</label>
                          <input
                            type="text"
                            value={formData.personalDetails.employeeId}
                            disabled
                            className={`w-full px-4 py-2 rounded-lg border ${themeStyles.inputBg} border-gray-300 text-gray-500`}
                          />
                        </div>

                        {/* Project Name */}
                        <div>
                          <label className={`${themeStyles.label}`}>Project Name</label>
                          <input
                            type="text"
                            value={formData.personalDetails.projectName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  projectName: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Full Name */}
                        <div>
                          <label className={`${themeStyles.label}`}>Full Name *</label>
                          <input
                            type="text"
                            value={formData.personalDetails.fullName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  fullName: e.target.value,
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Gender */}
                        <div>
                          <label className={`${themeStyles.label}`}>Gender *</label>
                          <select
                            value={formData.personalDetails.gender}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  gender: e.target.value,
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Date of Birth */}
                        <div>
                          <label className={`${themeStyles.label}`}>Date of Birth *</label>
                          <input
                            type="date"
                            value={formData.personalDetails.dob}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  dob: e.target.value,
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className={`${themeStyles.label}`}>Phone Number *</label>
                          <input
                            type="tel"
                            value={formData.personalDetails.phoneNumber}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  phoneNumber: e.target.value,
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className={`${themeStyles.label}`}>Email *</label>
                          <input
                            type="email"
                            value={formData.personalDetails.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  email: e.target.value,
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Designation */}
                        <div>
                          <label className={`${themeStyles.label}`}>Designation *</label>
                          <input
                            type="text"
                            value={formData.personalDetails.designation}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  designation: e.target.value,
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Date of Joining */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date of Joining
                          </label>
                          <input
                            type="date"
                            value={formData.personalDetails.dateOfJoining}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  dateOfJoining: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Additional Fields */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nationality
                          </label>
                          <input
                            type="text"
                            value={formData.personalDetails.nationality}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  nationality: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Religion
                          </label>
                          <input
                            type="text"
                            value={formData.personalDetails.religion}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  religion: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Marital Status
                          </label>
                          <select
                            value={formData.personalDetails.maritalStatus}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  maritalStatus: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Blood Group
                          </label>
                          <input
                            type="text"
                            value={formData.personalDetails.bloodGroup}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  bloodGroup: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Work Type
                          </label>
                          <select
                            value={formData.personalDetails.workType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  workType: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Work Type</option>
                            <option value="office">Office</option>
                            <option value="remote">Remote</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Experience
                          </label>
                          <input
                            type="text"
                            value={formData.personalDetails.experience}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  experience: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Educational Qualification
                          </label>
                          <input
                            type="text"
                            value={formData.personalDetails.educationalQualification}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                personalDetails: {
                                  ...formData.personalDetails,
                                  educationalQualification: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Languages */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Languages
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {formData.personalDetails.languages.map((lang, index) => (
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
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <FaMapMarkerAlt className="text-blue-600 w-5 h-5" />
                      <div>
                        <h3 className={`${themeStyles.sectionTitle}`}>Address Details</h3>
                        <p className={`${themeStyles.sectionDesc}`}>Update permanent and current addresses</p>
                      </div>
                    </div>

                    {/* Permanent Address */}
                    <div className="space-y-4">
                      <h4 className={`${themeStyles.sectionTitle} text-md`}>Permanent Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`${themeStyles.label}`}>Street *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.permanentAddress.street}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  permanentAddress: {
                                    ...formData.addressDetails.permanentAddress,
                                    street: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className={`${themeStyles.label}`}>City *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.permanentAddress.city}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  permanentAddress: {
                                    ...formData.addressDetails.permanentAddress,
                                    city: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className={`${themeStyles.label}`}>State *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.permanentAddress.state}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  permanentAddress: {
                                    ...formData.addressDetails.permanentAddress,
                                    state: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className={`${themeStyles.label}`}>Postal Code *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.permanentAddress.postalCode}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  permanentAddress: {
                                    ...formData.addressDetails.permanentAddress,
                                    postalCode: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Current Address */}
                    <div className="space-y-4">
                      <h4 className={`${themeStyles.sectionTitle} text-md`}>Current Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`${themeStyles.label}`}>Street *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.currentAddress.street}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  currentAddress: {
                                    ...formData.addressDetails.currentAddress,
                                    street: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className={`${themeStyles.label}`}>City *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.currentAddress.city}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  currentAddress: {
                                    ...formData.addressDetails.currentAddress,
                                    city: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className={`${themeStyles.label}`}>State *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.currentAddress.state}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  currentAddress: {
                                    ...formData.addressDetails.currentAddress,
                                    state: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className={`${themeStyles.label}`}>Postal Code *</label>
                          <input
                            type="text"
                            value={formData.addressDetails.currentAddress.postalCode}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                addressDetails: {
                                  ...formData.addressDetails,
                                  currentAddress: {
                                    ...formData.addressDetails.currentAddress,
                                    postalCode: e.target.value,
                                  },
                                },
                              })
                            }
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <FaMoneyCheckAlt className="text-blue-600 w-5 h-5" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Bank Information</h3>
                        <p className="text-sm text-gray-600">Update bank account details</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`${themeStyles.label}`}>Bank Name *</label>
                        <input
                          type="text"
                          value={formData.bankDetails.bankName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bankDetails: {
                                ...formData.bankDetails,
                                bankName: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className={`${themeStyles.label}`}>Branch Name *</label>
                        <input
                          type="text"
                          value={formData.bankDetails.branchName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bankDetails: {
                                ...formData.bankDetails,
                                branchName: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className={`${themeStyles.label}`}>Account Number *</label>
                        <input
                          type="text"
                          value={formData.bankDetails.accountNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bankDetails: {
                                ...formData.bankDetails,
                                accountNumber: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className={`${themeStyles.label}`}>IFSC Code *</label>
                        <input
                          type="text"
                          value={formData.bankDetails.ifscCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bankDetails: {
                                ...formData.bankDetails,
                                ifscCode: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
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
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <FaPhoneVolume className="text-blue-600 w-5 h-5" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                        <p className="text-sm text-gray-600">Update emergency contact information</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`${themeStyles.label}`}>Contact Name *</label>
                        <input
                          type="text"
                          value={formData.emergencyContact.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...formData.emergencyContact,
                                name: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className={`${themeStyles.label}`}>Phone Number *</label>
                        <input
                          type="tel"
                          value={formData.emergencyContact.phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...formData.emergencyContact,
                                phone: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className={`${themeStyles.label}`}>Relationship *</label>
                        <input
                          type="text"
                          value={formData.emergencyContact.relationship}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...formData.emergencyContact,
                                relationship: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Aadhar Number
                        </label>
                        <input
                          type="text"
                          value={formData.emergencyContact.aadhar}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...formData.emergencyContact,
                                aadhar: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
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
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <FaIdCard className="text-blue-600 w-5 h-5" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                        <p className="text-sm text-gray-600">View uploaded documents and identification details</p>
                      </div>
                    </div>

                    {/* Identification Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`${themeStyles.label}`}>ID Type *</label>
                        <select
                          value={formData.identificationDetails.identificationType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              identificationDetails: {
                                ...formData.identificationDetails,
                                identificationType: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select ID Type</option>
                          <option value="Aadhar">Aadhar</option>
                          <option value="PAN">PAN</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                        </select>
                      </div>

                      <div>
                        <label className={`${themeStyles.label}`}>ID Number *</label>
                        <input
                          type="text"
                          value={formData.identificationDetails.identificationNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              identificationDetails: {
                                ...formData.identificationDetails,
                                identificationNumber: e.target.value,
                              },
                            })
                          }
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">Uploaded Documents</h4>
                      {formData.documents.length > 0 ? (
                        <div className="space-y-4">
                          {formData.documents.map((doc) => (
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
                                    Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation and Submit */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1].id);
                    }
                  }}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  disabled={activeSection === sections[0].id}
                >
                  Previous
                </button>

                <div className="flex items-center gap-4">
                  {activeSection !== sections[sections.length - 1].id ? (
                    <button
                      type="button"
                      onClick={handleNextSection}
                      className="px-8 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={saving}
                      className={`px-8 py-3 rounded-xl text-white font-medium transition-all ${
                        saving
                          ? 'bg-blue-400 cursor-not-allowed'
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
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 mt-4"
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
                  className="flex items-center gap-3 p-4 rounded-xl bg-green-50 text-green-600 border border-green-100 mt-4"
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
  );
};

export default EditKYCModal;