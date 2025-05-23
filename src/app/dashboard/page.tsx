'use client';

import React, { useState, useEffect } from 'react';
import { FaIdCard, FaFileAlt, FaUser, FaHome, FaUniversity, FaPhone, FaFileContract, FaBirthdayCake, FaTrophy } from 'react-icons/fa';

interface Address {
  state: string;
  city: string;
  street: string;
  postalCode: string;
}

interface PersonalDetails {
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
}

interface BankDetails {
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  aadhar: string;
}

interface Document {
  type: string;
  url: string;
  uploadedAt: string;
  _id: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
}

interface KYCData {
  personalDetails: PersonalDetails;
  addressDetails: {
    permanentAddress: Address;
    currentAddress: Address;
  };
  bankDetails: BankDetails;
  identificationDetails: {
    identificationType: string;
    identificationNumber: string;
  };
  emergencyContact: EmergencyContact;
  _id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  documents: Document[];
}

interface BirthdayResponse {
  success: boolean;
  message: string;
  data?: {
    fullName: string;
    employeeId: string;
    designation: string;
    employeeImage: string;
  }[];
}

interface WorkAnniversaryResponse {
  success: boolean;
  message: string;
  data?: {
    fullName: string;
    employeeId: string;
    designation: string;
    employeeImage: string;
    yearsOfService: number;
  }[];
}

export default function Dashboard() {
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('personal');
  const [birthdays, setBirthdays] = useState<BirthdayResponse | null>(null);
  const [anniversaries, setAnniversaries] = useState<WorkAnniversaryResponse | null>(null);
  
  useEffect(() => {
    const fetchKycData = async () => {
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/EFMS3295');
        const data = await response.json();
        setKycData(data.kycData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching KYC data:', error);
        setLoading(false);
      }
    };

    const fetchBirthdays = async () => {
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/birthdays/today');
        const data = await response.json();
        setBirthdays(data);
      } catch (error) {
        console.error('Error fetching birthdays:', error);
      }
    };

    const fetchAnniversaries = async () => {
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/work-anniversaries/today');
        const data = await response.json();
        setAnniversaries(data);
      } catch (error) {
        console.error('Error fetching work anniversaries:', error);
      }
    };

    fetchKycData();
    fetchBirthdays();
    fetchAnniversaries();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-xl text-blue-600">Loading user information...</div>
      </div>
    );
  }

  if (!kycData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Unable to load user information. Please try again later.</div>
      </div>
    );
  }

  const navigationItems = [
    { id: 'personal', label: 'Personal Info', icon: FaUser },
    { id: 'address', label: 'Address', icon: FaHome },
    { id: 'bank', label: 'Bank Details', icon: FaUniversity },
    { id: 'emergency', label: 'Emergency Contact', icon: FaPhone },
    { id: 'documents', label: 'Documents', icon: FaFileContract },
  ];

  return (
    <div className="space-y-8 p-2">
      {/* Welcome Section - Enhanced */}
      <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
                Welcome back, {kycData.personalDetails.fullName}
              </h1>
              <p className="text-gray-600">{kycData.personalDetails.designation} • {kycData.personalDetails.employeeId}</p>
            </div>
            <div className="flex gap-4">
              <QuickStatCard
                label="Work Type"
                value={kycData.personalDetails.workType}
                bgColor="from-blue-50 to-indigo-50"
                textColor="text-indigo-700"
              />
              <QuickStatCard
                label="Experience"
                value={kycData.personalDetails.experience}
                bgColor="from-purple-50 to-violet-50"
                textColor="text-violet-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Celebrations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Birthdays Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-rose-100 via-pink-50 to-rose-50 p-6">
            <h2 className="text-2xl font-bold text-rose-800 flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <FaBirthdayCake className="text-2xl text-rose-600" />
              </div>
              <span className="bg-gradient-to-r from-rose-700 to-pink-600 bg-clip-text text-transparent">
                Today's Birthdays
              </span>
            </h2>
          </div>
          <div className="p-6">
            {birthdays?.success && birthdays.data && birthdays.data.length > 0 ? (
              <div className="space-y-4">
                {birthdays.data.map((person) => (
                  <div key={person.employeeId} 
                    className="flex items-center gap-4 p-4 bg-gradient-to-br from-white to-rose-50 rounded-xl
                      border border-rose-100 hover:border-rose-300 transition-all duration-300 hover:shadow-md transform hover:-translate-y-1"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-pink-300 rounded-full blur opacity-40"></div>
                      <img
                        src={person.employeeImage}
                        alt={person.fullName}
                        className="relative w-16 h-16 rounded-full object-cover border-[3px] border-white shadow-md"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{person.fullName}</h3>
                      <p className="text-rose-600 font-medium">{person.designation}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="animate-bounce inline-block px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-medium">
                        🎂 Today
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-rose-600 font-semibold text-lg">No birthdays today</p>
              </div>
            )}
          </div>
        </div>

        {/* Work Anniversaries Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4">
            <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-3">
              <div className="p-3 bg-white rounded-xl shadow-md">
                <FaTrophy className="text-2xl text-blue-600" />
              </div>
              <span>Work Anniversaries</span>
            </h2>
          </div>
          <div className="p-6">
            {anniversaries?.success && anniversaries.data && anniversaries.data.length > 0 ? (
              <div className="space-y-4">
                {anniversaries.data.map((person) => (
                  <div key={person.employeeId} 
                    className="flex items-center gap-4 p-4 bg-gradient-to-br from-white to-blue-50 rounded-xl
                      border border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-md transform hover:-translate-y-1"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-300 rounded-full blur opacity-40"></div>
                      <img
                        src={person.employeeImage}
                        alt={person.fullName}
                        className="relative w-16 h-16 rounded-full object-cover border-[3px] border-white shadow-md"
                      />
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs px-2 py-0.5 rounded-full border border-white shadow-sm">
                        {person.yearsOfService}Y
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{person.fullName}</h3>
                      <p className="text-blue-600 font-medium">{person.designation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-blue-600 font-semibold text-lg">No work anniversaries today</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Enhanced */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-wrap gap-2 p-4">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-sm font-medium
                  ${activeSection === item.id
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg scale-105 hover:shadow-indigo-500/25'
                    : 'hover:bg-white hover:text-indigo-600 hover:shadow-md text-gray-600'
                  }`}
              >
                <item.icon className={`text-lg ${activeSection === item.id ? 'animate-bounce' : ''}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
          {activeSection === 'personal' && (
            <div className="space-y-8">
              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(kycData.personalDetails).map(([key, value]) => {
                  if (['employeeImage', 'languages', 'fullName', 'designation', 'employeeId', 'workType'].includes(key)) return null;
                  return (
                    <div key={key} 
                      className="group bg-gradient-to-br from-white to-gray-50/50 rounded-xl p-6 border border-gray-100 
                        hover:border-indigo-200 hover:shadow-lg hover:bg-white
                        transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                          <GetIconForField field={key} className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </label>
                          <p className="text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">
                            {Array.isArray(value) ? value.join(', ') : value}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'address' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(['currentAddress', 'permanentAddress'] as const).map((addressType) => (
                <div key={addressType} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className={`p-4 ${
                    addressType === 'currentAddress' 
                      ? 'bg-gradient-to-r from-emerald-400/10 to-teal-400/10'
                      : 'bg-gradient-to-r from-amber-400/10 to-orange-400/10'
                  }`}>
                    <h3 className="text-lg font-bold text-gray-900">
                      {addressType === 'currentAddress' ? 'Current Address' : 'Permanent Address'}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {Object.entries(kycData.addressDetails[addressType] as Address).map(([key, value]) => (
                      <div key={key} className="group bg-gray-50/50 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300">
                        <label className="block text-sm font-bold text-gray-900 mb-1">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                        <p className="text-gray-900 font-semibold text-lg group-hover:text-indigo-600 transition-colors">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'bank' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-2xl p-6 border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(kycData.bankDetails).map(([key, value]) => (
                    <div key={key} className="group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-900 mb-1">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                      <p className="text-gray-900 font-semibold text-lg group-hover:text-blue-600 transition-colors">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'emergency' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-rose-400/10 to-red-400/10 rounded-2xl p-6 border border-rose-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(kycData.emergencyContact).map(([key, value]) => (
                    <div key={key} className="group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-900 mb-1">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                      <p className="text-gray-900 font-semibold text-lg group-hover:text-rose-600 transition-colors">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'documents' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kycData.documents.map((doc) => (
                  <div key={doc._id} 
                    className="group bg-white rounded-xl p-6 border border-gray-200 hover:bg-gray-50/50
                      hover:border-violet-200 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-violet-100 rounded-xl group-hover:bg-violet-200 transition-colors">
                        <FaFileAlt className="text-xl text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors capitalize mb-1">
                          {doc.type}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        {doc.originalName && (
                          <p className="text-xs text-gray-400 truncate mt-2">{doc.originalName}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-violet-600 
                        bg-violet-50 rounded-lg hover:bg-violet-100 transition-all duration-300 w-full justify-center"
                    >
                      View Document
                      <svg className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-1" 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const QuickStatCard = ({ label, value, bgColor, textColor }: { 
  label: string; 
  value: string; 
  bgColor: string;
  textColor: string;
}) => (
  <div className={`p-4 rounded-xl bg-gradient-to-br ${bgColor} border border-white/50 hover:shadow-lg transition-all duration-300`}>
    <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
    <p className={`text-lg font-bold ${textColor}`}>{value}</p>
  </div>
);

const GetIconForField = ({ field, className }: { field: string; className?: string }) => {
  const icons: { [key: string]: React.ElementType } = {
    email: FaIdCard,
    phoneNumber: FaPhone,
    dob: FaBirthdayCake,
    // Add more icon mappings as needed
  };
  const IconComponent = icons[field] || FaUser;
  return <IconComponent className={className} />;
};