'use client';

import { useEffect, useState } from 'react';
import { KYCRecord } from '@/types/kyc';
import { getAllKYCRecords, getKYCByEmail } from '@/services/kyc';
import { format } from 'date-fns';
import { FaSpinner, FaSearch, FaEye, FaTimes, FaFilter } from 'react-icons/fa';
import { isAuthenticated, isEmployee, getUserRole } from '@/services/auth';
import { useRouter } from 'next/navigation';

export default function KYCViewPage() {
  const router = useRouter();
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<KYCRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField] = useState('verificationDate');
  const [sortOrder] = useState('desc');
  const recordsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchKYCRecords();
  }, [router]);

  const fetchKYCRecords = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const userRole = getUserRole();
      
      let response;
      if (userRole === 'Employee' && userEmail) {
        // For employees, fetch only their own KYC
        const kycRecord = await getKYCByEmail(userEmail);
        response = { kycForms: kycRecord ? [kycRecord] : [] };
        // If it's an employee viewing their own record, show it in full page view
        if (kycRecord) {
          setSelectedRecord(kycRecord);
        }
      } else {
        // For admin, fetch all KYC records
        response = await getAllKYCRecords();
      }
      
      setKycRecords(response.kycForms);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching KYC records:', error);
      setLoading(false);
    }
  };

  const filteredRecords = kycRecords
    .filter(record => {
      const matchesSearch = record.personalDetails.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.personalDetails.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterStatus === 'all') return matchesSearch;
      return matchesSearch && record.status === filterStatus;
    })
    .sort((a, b) => {
      if (sortField === 'verificationDate') {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      return 0;
    });

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Infographics summary counts
  const totalCount = filteredRecords.length;
  const approvedCount = filteredRecords.filter(r => r.status === 'Approved').length;
  const pendingCount = filteredRecords.filter(r => r.status === 'Pending').length;
  const rejectedCount = filteredRecords.filter(r => r.status === 'Rejected').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
        <p className="text-black">Loading KYC records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
          <p className="font-semibold">{error}</p>
          <button 
            onClick={fetchKYCRecords}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const KycDetailsModal = ({ record, onClose }: { record: KYCRecord; onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState('personal');

    const tabs = [
      { id: 'personal', label: 'Personal Info' },
      { id: 'address', label: 'Address' },
      { id: 'bank', label: 'Bank Details' },
    ];

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-5xl w-full mx-auto shadow-2xl transform transition-all overflow-hidden max-h-[90vh] flex flex-col border border-gray-200">
          {/* Modal Header with Employee Image */}
          <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10 flex flex-col gap-2">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full border-4 border-white shadow-md bg-gray-100 flex items-center justify-center overflow-hidden">
                  {record.personalDetails.employeeImage ? (
                    <img 
                      src={record.personalDetails.employeeImage} 
                      alt={record.personalDetails.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {record.personalDetails.fullName.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">{record.personalDetails.fullName}</h2>
                  <p className="text-sm text-gray-500 font-medium">Employee ID: {record.personalDetails.employeeId}</p>
                  <p className="text-sm text-gray-500">Designation: {record.personalDetails.designation}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FaTimes className="text-gray-400 w-5 h-5 hover:text-gray-600" />
              </button>
            </div>
            <div className="flex gap-2 bg-gray-50 rounded-lg px-2 py-1 shadow-sm border border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white text-gray-700 hover:bg-blue-50 border border-transparent hover:border-blue-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-8 space-y-8 overflow-y-auto bg-gray-50 flex-1">
            {activeTab === 'personal' && (
              <div className="space-y-8">
                {/* Personal Details Section */}
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-5 w-1 bg-blue-500 rounded-full"></span>
                    <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Full Name</p>
                        <p className="text-base text-gray-900">{record.personalDetails.fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Employee ID</p>
                        <p className="text-base text-gray-900">{record.personalDetails.employeeId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Email</p>
                        <p className="text-base text-gray-900">{record.personalDetails.email}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Phone Number</p>
                        <p className="text-base text-gray-900">{record.personalDetails.phoneNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Designation</p>
                        <p className="text-base text-gray-900">{record.personalDetails.designation}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Date of Joining</p>
                        <p className="text-base text-gray-900">{format(new Date(record.personalDetails.dateOfJoining), 'PP')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-5 w-1 bg-red-500 rounded-full"></span>
                    <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Name</p>
                      <p className="text-base text-gray-900">{record.emergencyContact.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Relationship</p>
                      <p className="text-base text-gray-900">{record.emergencyContact.relationship}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Phone</p>
                      <p className="text-base text-gray-900">{record.emergencyContact.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-5 w-1 bg-green-500 rounded-full"></span>
                  <h3 className="text-lg font-semibold text-gray-900">Address Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-4 w-1 bg-green-500 rounded-full"></span>
                      <h4 className="text-base font-semibold text-gray-700">Permanent Address</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">{record.addressDetails.permanentAddress.street}</p>
                      <p className="text-sm text-gray-700">{record.addressDetails.permanentAddress.city}, {record.addressDetails.permanentAddress.state}</p>
                      <p className="text-sm text-gray-700">PIN: {record.addressDetails.permanentAddress.postalCode}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-4 w-1 bg-blue-500 rounded-full"></span>
                      <h4 className="text-base font-semibold text-gray-700">Current Address</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">{record.addressDetails.currentAddress.street}</p>
                      <p className="text-sm text-gray-700">{record.addressDetails.currentAddress.city}, {record.addressDetails.currentAddress.state}</p>
                      <p className="text-sm text-gray-700">PIN: {record.addressDetails.currentAddress.postalCode}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-5 w-1 bg-purple-500 rounded-full"></span>
                  <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Bank Name</p>
                    <p className="text-base text-gray-900">{record.bankDetails.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Branch Name</p>
                    <p className="text-base text-gray-900">{record.bankDetails.branchName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Account Number</p>
                    <p className="text-base text-gray-900">{record.bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">IFSC Code</p>
                    <p className="text-base text-gray-900">{record.bankDetails.ifscCode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Badge and Last Updated */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl shadow border border-gray-100 mt-2">
              <div>
                <span className={`px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold rounded-full 
                  ${record.status === 'Approved' ? 'bg-green-50 text-green-700' : 
                    record.status === 'Pending' ? 'bg-yellow-50 text-yellow-700' : 
                    'bg-red-50 text-red-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${
                    record.status === 'Approved' ? 'bg-green-500' : 
                    record.status === 'Pending' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}></span>
                  {record.status}
                </span>
              </div>
              <p className="text-sm text-gray-400 font-medium">
                Last Updated: {format(new Date(record.updatedAt), 'PPpp')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* EMPLOYEE: Show only KYC details, nothing else */}
        {isEmployee() && selectedRecord ? (
          <div className="w-full max-w-[98vw] mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-10 mt-0 mb-4 min-h-[80vh] flex flex-col justify-center" style={{ minHeight: '80vh', height: 'auto' }}>
            {/* Header Row - clean, no email */}
            <div className="flex flex-row items-center justify-between gap-8 mb-6">
              {/* Left: Employee image, name, ID, designation */}
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full border-4 border-blue-300 shadow bg-gray-100 flex items-center justify-center overflow-hidden">
                  {selectedRecord.personalDetails.employeeImage ? (
                    <img
                      src={selectedRecord.personalDetails.employeeImage}
                      alt={selectedRecord.personalDetails.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {selectedRecord.personalDetails.fullName.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-3xl font-extrabold text-gray-900 leading-tight">{selectedRecord.personalDetails.fullName}</span>
                  <span className="text-lg font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded mt-1">
                    {selectedRecord.personalDetails.employeeId}
                  </span>
                  <span className="text-lg text-gray-700 font-semibold mt-1">{selectedRecord.personalDetails.designation}</span>
                </div>
              </div>
              {/* Right: Status and last updated */}
              <div className="flex flex-col items-end gap-2">
                <span className={`px-4 py-2 rounded-full text-lg font-bold shadow
                  ${selectedRecord.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    selectedRecord.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'}`}>
                  {selectedRecord.status}
                </span>
                <span className="text-base text-gray-500">
                  {format(new Date(selectedRecord.updatedAt), 'PPpp')}
                </span>
              </div>
            </div>

            {/* Details Grid - large and full width */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Details */}
              <div className="bg-blue-50 p-8 rounded-2xl border border-blue-200 flex flex-col gap-3 shadow-md min-h-[180px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-blue-500">
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
                  </span>
                  <h2 className="text-xl font-bold text-blue-900">Personal Details</h2>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 text-lg">Phone Number</div>
                  <div className="text-gray-900 text-xl">{selectedRecord.personalDetails.phoneNumber}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 text-lg">Date of Joining</div>
                  <div className="text-gray-900 text-xl">{format(new Date(selectedRecord.personalDetails.dateOfJoining), 'PP')}</div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-red-50 p-8 rounded-2xl border border-red-200 flex flex-col gap-3 shadow-md min-h-[180px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-red-500">
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' /></svg>
                  </span>
                  <h2 className="text-xl font-bold text-red-900">Emergency Contact</h2>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 text-lg">Name</div>
                  <div className="text-gray-900 text-xl">{selectedRecord.emergencyContact.name}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 text-lg">Relationship</div>
                  <div className="text-gray-900 text-xl">{selectedRecord.emergencyContact.relationship}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 text-lg">Phone</div>
                  <div className="text-gray-900 text-xl">{selectedRecord.emergencyContact.phone}</div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="bg-green-50 p-8 rounded-2xl border border-green-200 flex flex-col gap-3 shadow-md min-h-[180px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-green-500">
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M13 5v6h6m-6 0H7m6 0v6m0 0H7m6 0h6' /></svg>
                  </span>
                  <h2 className="text-xl font-bold text-green-900">Permanent Address</h2>
                </div>
                <div className="text-gray-900 text-xl">{selectedRecord.addressDetails.permanentAddress.street}</div>
                <div className="text-gray-900 text-xl">{selectedRecord.addressDetails.permanentAddress.city}, {selectedRecord.addressDetails.permanentAddress.state}</div>
                <div className="text-gray-900 text-xl">PIN: {selectedRecord.addressDetails.permanentAddress.postalCode}</div>
              </div>

              {/* Current Address */}
              <div className="bg-blue-50 p-8 rounded-2xl border border-blue-200 flex flex-col gap-3 shadow-md min-h-[180px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-blue-500">
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 12.414a2 2 0 00-2.828 0l-4.243 4.243a8 8 0 1111.314 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
                  </span>
                  <h2 className="text-xl font-bold text-blue-900">Current Address</h2>
                </div>
                <div className="text-gray-900 text-xl">{selectedRecord.addressDetails.currentAddress.street}</div>
                <div className="text-gray-900 text-xl">{selectedRecord.addressDetails.currentAddress.city}, {selectedRecord.addressDetails.currentAddress.state}</div>
                <div className="text-gray-900 text-xl">PIN: {selectedRecord.addressDetails.currentAddress.postalCode}</div>
              </div>

              {/* Bank Details (full width) */}
              <div className="bg-purple-50 p-8 rounded-2xl border border-purple-200 md:col-span-2 flex flex-col gap-3 shadow-md min-h-[180px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-purple-500">
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h2a2 2 0 012 2v6a2 2 0 01-2 2H3m0-10V6a2 2 0 012-2h14a2 2 0 012 2v4m-18 0h18' /></svg>
                  </span>
                  <h2 className="text-xl font-bold text-purple-900">Bank Details</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-semibold text-gray-700 text-lg">Bank Name</div>
                    <div className="text-gray-900 text-xl">{selectedRecord.bankDetails.bankName}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 text-lg">Branch Name</div>
                    <div className="text-gray-900 text-xl">{selectedRecord.bankDetails.branchName}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 text-lg">Account Number</div>
                    <div className="text-gray-900 text-xl">{selectedRecord.bankDetails.accountNumber}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 text-lg">IFSC Code</div>
                    <div className="text-gray-900 text-xl">{selectedRecord.bankDetails.ifscCode}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ADMIN: Show header, filter, infographics, and table */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 mb-1">KYC Management</h1>
                  <p className="text-gray-500 text-base">View and manage employee KYC records</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full sm:w-44 pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-600 bg-white hover:border-blue-300 transition-colors text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="Approved">✅ Approved</option>
                      <option value="Pending">⏳ Pending</option>
                      <option value="Rejected">❌ Rejected</option>
                    </select>
                    <FaFilter className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                  <div className="relative flex-grow sm:flex-grow-0">
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-600 placeholder-gray-400 bg-white hover:border-blue-300 transition-colors text-sm"
                    />
                    <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>
              </div>
              {/* Infographics summary bar */}
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg shadow-sm">
                  <span className="text-blue-600 text-lg font-bold"><FaFilter /></span>
                  <span className="text-base font-semibold text-gray-700">Total</span>
                  <span className="text-lg font-bold text-gray-900">{totalCount}</span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-base font-semibold text-green-700">Approved</span>
                  <span className="text-lg font-bold text-gray-900">{approvedCount}</span>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span className="text-base font-semibold text-yellow-700">Pending</span>
                  <span className="text-lg font-bold text-gray-900">{pendingCount}</span>
                </div>
                <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-base font-semibold text-red-700">Rejected</span>
                  <span className="text-lg font-bold text-gray-900">{rejectedCount}</span>
                </div>
              </div>
            </div>

            {/* Table Section (only for admin) */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-100 border-y border-blue-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1
                            ${record.status === 'Approved' 
                              ? 'bg-green-50 text-green-700 border border-green-200' 
                              : record.status === 'Pending'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              record.status === 'Approved' 
                                ? 'bg-green-500' 
                                : record.status === 'Pending'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}></span>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base shadow-sm border border-blue-200">
                              {record.personalDetails.employeeImage ? (
                                <img src={record.personalDetails.employeeImage} alt={record.personalDetails.fullName} className="h-full w-full object-cover rounded-full" />
                              ) : (
                                <span>{record.personalDetails.fullName.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 leading-tight">{record.personalDetails.fullName}</p>
                              <p className="text-xs text-gray-500 font-medium">{record.personalDetails.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">{record.personalDetails.email}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">{format(new Date(record.updatedAt), 'dd MMM yyyy')}</p>
                          <p className="text-xs text-gray-400">{format(new Date(record.updatedAt), 'HH:mm')}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 shadow-sm transition-colors gap-2 group-hover:bg-blue-100"
                          >
                            <FaEye className="w-4 h-4" /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-500">
                    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
                  </p>
                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-sm border border-blue-100
                          ${currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 hover:bg-blue-50'}
                        `}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal remains unchanged, only for admin */}
        {selectedRecord && !isEmployee() && (
          <KycDetailsModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        )}
      </div>
    </div>
  );
}
