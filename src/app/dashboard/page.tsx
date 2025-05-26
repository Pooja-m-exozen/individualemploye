'use client';

import React, { useState, useEffect } from 'react';
import { FaIdCard, FaFileAlt, FaUser, FaHome, FaUniversity, FaPhone, FaFileContract, FaBirthdayCake, FaTrophy } from 'react-icons/fa';
import AttendanceAnalytics from '@/components/dashboard/AttendanceAnalytics';

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
    personalizedWish: string;
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
    personalizedWish: string;
  }[];
}

export default function Dashboard() {
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('personal');
  const [birthdays, setBirthdays] = useState<BirthdayResponse | null>(null);
  const [anniversaries, setAnniversaries] = useState<WorkAnniversaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchKycData = async () => {
      try {
        setError(null);
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/EFMS3295');
        if (!response.ok) throw new Error('Failed to fetch KYC data');
        const data = await response.json();
        setKycData(data.kycData);
      } catch (error) {
        console.error('Error fetching KYC data:', error);
        setError('Unable to load user information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    const fetchBirthdays = async () => {
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/birthdays/today');
        if (!response.ok) throw new Error('Failed to fetch birthdays');
        const data = await response.json();
        setBirthdays(data);
      } catch (error) {
        console.error('Error fetching birthdays:', error);
      }
    };

    const fetchAnniversaries = async () => {
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/work-anniversaries/today');
        if (!response.ok) throw new Error('Failed to fetch work anniversaries');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section Skeleton */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 animate-pulse">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/4"></div>
          </div>

          {/* Celebrations Section Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 animate-pulse">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Skeleton */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="flex gap-4 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center transform hover:scale-[1.02] transition-all duration-300">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105"
          >
            Try Again
            <svg className="ml-2 -mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (!kycData) {
    return null;
  }

  const navigationItems = [
    { id: 'personal', label: 'Personal Info', icon: FaUser },
    { id: 'address', label: 'Address', icon: FaHome },
    { id: 'bank', label: 'Bank Details', icon: FaUniversity },
    { id: 'emergency', label: 'Emergency Contact', icon: FaPhone },
    { id: 'documents', label: 'Documents', icon: FaFileContract },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section - Enhanced */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100 overflow-hidden transform hover:scale-[1.01] transition-all duration-300">
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Welcome back, <span className="text-black">{kycData.personalDetails.fullName}</span>
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    {kycData.personalDetails.designation}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-700">{kycData.personalDetails.employeeId}</span>
                </p>
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

        {/* Attendance Analytics Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Attendance Analytics</h2>
          <AttendanceAnalytics />
        </div>

        {/* Celebrations Section - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Birthdays Section */}
          <div className="relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-100 to-purple-100 rounded-2xl transform rotate-1 scale-105 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-fuchsia-200 overflow-hidden 
              hover:shadow-xl transition-all duration-500 h-full flex flex-col group/card
              hover:border-fuchsia-300 hover:-translate-y-1 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-50 via-pink-50 to-purple-50 opacity-0 
                group-hover/card:opacity-100 transition-opacity duration-500" />
              <FloatingParticles />
              <div className="bg-gradient-to-r from-fuchsia-200 via-pink-200 to-purple-200 p-6 relative
                after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-gradient-to-r 
                after:from-fuchsia-400 after:to-purple-400 after:transform after:scale-x-0 
                after:origin-left after:transition-transform after:duration-500
                group-hover/card:after:scale-x-100">
                <h2 className="text-2xl font-bold text-fuchsia-800 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-md transition-all duration-300
                    hover:shadow-fuchsia-200 hover:scale-110 hover:rotate-6">
                    <FaBirthdayCake className="text-2xl text-fuchsia-600 animate-bounce" />
                  </div>
                  <span className="bg-gradient-to-r from-fuchsia-700 to-purple-600 bg-clip-text text-transparent
                    relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 
                    after:bg-gradient-to-r after:from-fuchsia-400 after:to-purple-400
                    after:transform after:scale-x-0 after:origin-left after:transition-transform
                    after:duration-500 group-hover/card:after:scale-x-100">
                    Today's Birthdays
                  </span>
                </h2>
              </div>
              <div className="p-6 flex-1 relative z-10">
                {birthdays?.success && birthdays.data && birthdays.data.length > 0 ? (
                  <div className="space-y-6">
                    {birthdays.data.map((person, index) => (
                      <div
                        key={person.employeeId}
                        className="group/item relative bg-gradient-to-br from-white to-fuchsia-50/30 rounded-xl p-6
                          border border-fuchsia-100 transition-all duration-300
                          hover:border-fuchsia-300 hover:shadow-lg hover:shadow-fuchsia-100/50
                          hover:-translate-y-1 hover:scale-[1.02]"
                        style={{
                          animation: `fadeSlideIn 0.6s ease-out forwards ${index * 0.2}s`,
                          opacity: 0,
                          transform: 'translateY(20px)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/5 to-purple-400/5 
                          rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                        <div className="absolute -inset-px bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-xl 
                          opacity-0 group-hover/item:opacity-10 blur-xl transition-all duration-500" />
                        <div className="relative">
                          <p className="text-fuchsia-800 italic text-lg font-medium leading-relaxed
                            group-hover/item:text-fuchsia-900 transition-colors duration-300">
                            {person.personalizedWish}
                          </p>
                          <div className="flex items-center gap-3 mt-4">
                            <div className="flex gap-1">
                              {[...Array(3)].map((_, i) => (
                                <span
                                  key={i}
                                  className="inline-block transform hover:scale-125 transition-transform cursor-pointer"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                >
                                  🎉
                                </span>
                              ))}
                            </div>
                            <span className="text-fuchsia-400 font-medium bg-fuchsia-50 px-3 py-1 rounded-full
                              transform hover:scale-105 transition-all duration-300 cursor-pointer
                              hover:bg-fuchsia-100 hover:text-fuchsia-600">
                              Make their day special!
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-fuchsia-600 font-semibold text-lg mb-2">No birthdays today</p>
                    <p className="text-fuchsia-400">Check back tomorrow for more celebrations!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Work Anniversaries Section - Enhanced */}
          <div className="relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl transform rotate-1 scale-105 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 overflow-hidden hover:shadow-xl transition-all duration-500 h-full flex flex-col">
              <FloatingParticles />
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6">
                <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <FaTrophy className="text-2xl text-blue-600 animate-pulse" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                    Work Anniversaries
                  </span>
                </h2>
              </div>
              <div className="p-6 flex-1">
                {anniversaries?.success && anniversaries.data && anniversaries.data.length > 0 ? (
                  <div className="space-y-4">
                    {anniversaries.data.map((person, index) => (
                      <div key={person.employeeId} 
                        className="group p-6 bg-gradient-to-br from-white to-blue-50 rounded-xl
                          border border-blue-100 hover:border-blue-300 transition-all duration-500 
                          hover:shadow-lg transform hover:-translate-y-1 relative overflow-hidden"
                        style={{ 
                          animation: `fadeSlideIn 0.6s ease-out forwards ${index * 0.2}s`,
                          opacity: 0,
                          transform: 'translateY(20px)'
                        }}
                      >
                        <div className="absolute -right-20 -top-20 w-40 h-40 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-30 group-hover:opacity-75 transition-opacity duration-500" />
                        <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-gradient-to-tr from-indigo-200 to-blue-200 rounded-full blur-3xl opacity-30 group-hover:opacity-75 transition-opacity duration-500" />
                        <div className="relative">
                          <p className="text-blue-800 italic text-lg font-medium leading-relaxed animate-fadeIn">
                            {person.personalizedWish}
                          </p>
                          <div className="flex items-center gap-2 mt-4 animate-slideUp">
                            <span className="text-blue-600 text-sm">🏆</span>
                            <span className="text-blue-400 text-sm animate-pulse">Milestone achieved!</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <FaTrophy className="text-4xl text-blue-200 mb-4" />
                    <p className="text-blue-600 font-semibold text-lg">No work anniversaries today</p>
                    <p className="text-blue-400 mt-2">Check back tomorrow for more celebrations!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Enhanced */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex flex-wrap gap-2 p-4">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  onMouseEnter={() => setIsHovered(item.id)}
                  onMouseLeave={() => setIsHovered(null)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-sm font-medium
                    ${activeSection === item.id
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg scale-105 hover:shadow-indigo-500/25'
                      : 'hover:bg-white hover:text-indigo-600 hover:shadow-md text-gray-600'
                    }`}
                >
                  <item.icon className={`text-lg ${activeSection === item.id ? 'animate-bounce' : ''} 
                    ${isHovered === item.id ? 'transform scale-110' : ''}`} />
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
                          transition-all duration-300 transform hover:-translate-y-1"
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
    </div>
  );
}

const QuickStatCard = ({ label, value, bgColor, textColor }: { 
  label: string; 
  value: string; 
  bgColor: string;
  textColor: string;
}) => (
  <div className={`p-4 rounded-xl bg-gradient-to-br ${bgColor} border border-white/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
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

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full mix-blend-multiply filter blur-xl animate-float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 40 + 20}px`,
          height: `${Math.random() * 40 + 20}px`,
          background: `hsl(${Math.random() * 60 + 280}, 70%, 70%)`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 10}s`
        }}
      />
    ))}
  </div>
);

// Add these new animations to the styles
const styles = `
  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0) translateX(0);
    }
    25% {
      transform: translateY(-15px) translateX(15px);
    }
    50% {
      transform: translateY(-25px) translateX(-15px);
    }
    75% {
      transform: translateY(-15px) translateX(15px);
    }
  }

  .animate-float {
    animation: float linear infinite;
  }

  @keyframes shimmer {
    from {
      background-position: 0 0;
    }
    to {
      background-position: 200% 0;
    }
  }

  .animate-shimmer {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0) 0%,
      rgba(255,255,255,0.8) 50%,
      rgba(255,255,255,0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 3s infinite;
  }

  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }

  .animate-slideUp {
    animation: slideUp 0.5s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .delay-100 {
    animation-delay: 100ms;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}