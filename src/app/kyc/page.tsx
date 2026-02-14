'use client';

import { useEffect, useState, useCallback } from 'react';
import { FaSpinner, FaEye, FaTimesCircle, FaSearch } from 'react-icons/fa';
import { isAuthenticated,  getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import EditKYCModal from '@/components/dashboard/EditKYCModal';

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
      monthlySalary: string;
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

export default function ViewKYC() {
  const { theme } = useTheme();
  const router = useRouter();
  const employeeId = getEmployeeId();
  const [kycResponse, setKYCResponse] = useState<KYCResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showColsMenu, setShowColsMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Column visibility state
  type VisibleCols = {
    rownum: boolean;
    personalDetails: boolean;
    permanentAddress: boolean;
    currentAddress: boolean;
    bankDetails: boolean;
    emergencyContact: boolean;
    documents: boolean;
  };
  
  const [visibleCols, setVisibleCols] = useState<VisibleCols>({
    rownum: true,
    personalDetails: true,
    permanentAddress: true,
    currentAddress: true,
    bankDetails: true,
    emergencyContact: true,
    documents: true,
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

  // Column toggle function
  const toggleColumn = (key: keyof VisibleCols) => {
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));
  };



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
          <FaTimesCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-lg font-medium">No KYC data available</p>
        </div>
      </div>
    );
  }

  const { kycData } = kycResponse;
  





 

  // const getFileExtension = (url: string) => {
  //   return url.split('.').pop() || '';
  // };

  return (
    <div className={`min-h-screen font-sans ${
      theme === 'dark' 
        ? 'bg-gray-900' 
        : 'bg-gray-50'
    }`}>
      <div className="p-4 lg:p-6">
        {/* Toolbar Section */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee name, ID, designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-200 text-black"
                }`}
              />
                </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-blue-700"}`}
              >
                Edit KYC
              </button>
              <button
                onClick={() => router.push('/kyc/upload')}
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-blue-700"}`}
              >
                Upload Document
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowColsMenu((p) => !p)}
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-blue-700"}`}
                >
                  Columns
                </button>
                {showColsMenu && (
                  <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg p-3 border z-40 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-black"}`}>
                    {(Object.keys(visibleCols) as Array<keyof VisibleCols>).map((key) => (
                      <label key={key} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                        <input type="checkbox" checked={visibleCols[key]} onChange={() => toggleColumn(key)} />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>


        {/* KYC Data Table - Consistent Style */}
        <div className="overflow-x-auto w-full">
          <table className="min-w-[1400px] text-sm table-auto border-collapse border border-blue-400">
            <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
              <tr>
                {visibleCols.rownum && (
                  <th className={`px-4 py-3 text-left font-bold sticky left-0 z-20 whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`} style={{ width: 60 }}>#</th>
                )}
                
                  {/* Personal Information Headers */}
                {visibleCols.personalDetails && Object.entries(kycData.personalDetails).map(([key]) => 
                    key !== 'employeeImage' && (
                    <th key={`personal-header-${key}`} className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    )
                  )}
                  
                  {/* Permanent Address Headers */}
                {visibleCols.permanentAddress && Object.entries(kycData.addressDetails.permanentAddress).map(([key]) => (
                  <th key={`permanent-header-${key}`} className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      Permanent {key.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                  
                  {/* Current Address Headers */}
                {visibleCols.currentAddress && Object.entries(kycData.addressDetails.currentAddress).map(([key]) => (
                  <th key={`current-header-${key}`} className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      Current {key.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                  
                  {/* Bank Details Headers */}
                {visibleCols.bankDetails && Object.entries(kycData.bankDetails).map(([key]) => (
                  <th key={`bank-header-${key}`} className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                  
                  {/* Emergency Contact Headers */}
                {visibleCols.emergencyContact && Object.entries(kycData.emergencyContact).map(([key]) => (
                  <th key={`emergency-header-${key}`} className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      Emergency {key.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                  
                  {/* Documents Headers */}
                {visibleCols.documents && kycData.documents.map((doc) => (
                  <th key={`doc-header-${doc._id}`} className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      {doc.type}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
              <tr className={`${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-gray-50"} transition-colors duration-200`}>
                {visibleCols.rownum && (
                  <td className={`px-4 py-3 text-left font-mono text-sm border border-blue-400 ${theme === "dark" ? "bg-slate-800 text-gray-300" : "bg-white text-gray-600"}`} style={{ width: 60 }}>
                    1
                  </td>
                )}
                
                  {/* Personal Information Values */}
                {visibleCols.personalDetails && Object.entries(kycData.personalDetails).map(([key, value]) => 
                    key !== 'employeeImage' && (
                    <td key={`personal-value-${key}`} className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"} ${key === 'email' || key === 'workType' ? "break-all" : ""} ${key === 'monthlySalary' ? 'font-mono' : ''}`}>
                        {key === 'monthlySalary' && value ? 
                          `₹${Number(value).toLocaleString('en-IN')}` : 
                          Array.isArray(value) ? value.join(', ') : 
                          key === 'designation' ? (value?.toString() || '-').trim() :
                          value?.toString() || '-'
                        }
                      </td>
                    )
                  )}
                  
                  {/* Permanent Address Values */}
                {visibleCols.permanentAddress && Object.entries(kycData.addressDetails.permanentAddress).map(([key, value]) => (
                  <td key={`permanent-value-${key}`} className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={value}>{value}</span>
                  </td>
                  ))}
                  
                  {/* Current Address Values */}
                {visibleCols.currentAddress && Object.entries(kycData.addressDetails.currentAddress).map(([key, value]) => (
                  <td key={`current-value-${key}`} className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={value}>{value}</span>
                  </td>
                  ))}
                  
                  {/* Bank Details Values */}
                {visibleCols.bankDetails && Object.entries(kycData.bankDetails).map(([key, value]) => (
                  <td key={`bank-value-${key}`} className={`px-4 py-3 text-left border border-blue-400 font-mono ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={value}>{value}</span>
                  </td>
                  ))}
                  
                  {/* Emergency Contact Values */}
                {visibleCols.emergencyContact && Object.entries(kycData.emergencyContact).map(([key, value]) => (
                  <td key={`emergency-value-${key}`} className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={value}>{value}</span>
                  </td>
                  ))}
                  
                  {/* Documents Values */}
                {visibleCols.documents && kycData.documents.map((doc) => (
                  <td key={`doc-value-${doc._id}`} className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                      <div className="flex items-center gap-3">
                      <span className="text-xs">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-xs transition-colors ${
                          theme === "dark" 
                            ? "text-blue-300 hover:text-blue-200" 
                            : "text-blue-600 hover:text-blue-700"
                        }`}
                        >
                          <FaEye className="w-3 h-3" />
                          View
                        </a>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      {/* Edit KYC Modal */}
      {kycResponse?.kycData && (
        <EditKYCModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          kycData={kycResponse.kycData}
          onSave={(updatedData) => {
            setKYCResponse(prev => prev ? { 
              ...prev, 
              kycData: {
                ...updatedData,
                personalDetails: {
                  ...updatedData.personalDetails,
                  monthlySalary: prev.kycData.personalDetails.monthlySalary
                },
                createdAt: prev.kycData.createdAt,
                updatedAt: prev.kycData.updatedAt,
                status: prev.kycData.status,
                _id: prev.kycData._id
              }
            } : null);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}