'use client';

import { useEffect, useState } from 'react';
import { KYCRecord, KYCDocument } from '@/types/kyc';
import { getAllKYCRecords, updateKYCCompliance } from '@/services/kyc';
import { format } from 'date-fns';
import { FaSpinner, FaSearch, FaEye, FaTimes, FaFilter } from 'react-icons/fa';
import { isAuthenticated } from '@/services/auth';
import { useRouter } from 'next/navigation';

export default function KYCViewPage() {
  const router = useRouter();
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<KYCRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('verificationDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
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
      const response = await getAllKYCRecords();
      setKycRecords(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch KYC records');
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (record: KYCRecord, newStatus: string) => {
    setUpdating(true);
    setUpdateError(null);
    try {
      const response = await updateKYCCompliance(record.employeeId, newStatus);
      if (response.success) {
        const updatedRecord = response.data;
        setKycRecords(prevRecords => 
          prevRecords.map(r => 
            r._id === updatedRecord._id ? updatedRecord : r
          )
        );
        setSelectedRecord(prev => prev?._id === updatedRecord._id ? updatedRecord : prev);
        setUpdating(false);
      } else {
        setUpdateError(response.message || 'Failed to update status');
      }
    } catch (error) {
      setUpdateError('Failed to update compliance status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredRecords = kycRecords
    .filter(record => {
      const matchesSearch = record._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.documents.some(doc => doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (filterStatus === 'all') return matchesSearch;
      return matchesSearch && record.complianceStatus === filterStatus;
    })
    .sort((a, b) => {
      if (sortField === 'verificationDate') {
        const dateA = a.verificationDate ? new Date(a.verificationDate).getTime() : new Date(a.updatedAt).getTime();
        const dateB = b.verificationDate ? new Date(b.verificationDate).getTime() : new Date(b.updatedAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      return 0;
    });

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

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

  const getVerificationDate = (doc: KYCDocument): string | null => {
    if (doc.verificationDate) return doc.verificationDate;
    if (doc.verifiedAt) return doc.verifiedAt;
    return null;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-black">KYC Records</h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="all" className="text-black">All Status</option>
                  <option value="Passed" className="text-black">Passed</option>
                  <option value="Pending" className="text-black">Pending</option>
                  <option value="Failed" className="text-black">Failed</option>
                </select>
                <FaFilter className="absolute left-2 top-3 text-black" />
              </div>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-black" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder-black"
                />
              </div>
            </div>
          </div>

          {currentRecords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-black">No KYC records found</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Verified By</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Verification Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full 
                            ${record.complianceStatus === 'Passed' ? 'bg-green-100 text-green-800' : 
                              record.complianceStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {record.complianceStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800">
                                {(record.verifiedBy || 'NA').substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="ml-3 text-sm text-black">{record.verifiedBy || 'Not Assigned'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {record.verificationDate ? format(new Date(record.verificationDate), 'dd MMM yyyy HH:mm') : 'Pending'}
                        </td>
                        <td className="px-6 py-4 text-sm text-black">
                          <div className="max-w-xs truncate">
                            {record.complianceNotes || record.remarks || 'No notes'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <FaEye className="mr-2" /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl max-w-3xl w-full mx-auto shadow-2xl transform transition-all">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                      <h2 className="text-xl font-semibold text-black">KYC Details</h2>
                      <button
                        onClick={() => setSelectedRecord(null)}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <FaTimes className="text-gray-600" />
                      </button>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-black mb-2">ID</h3>
                          <p className="text-sm font-mono bg-white p-2 rounded border border-gray-200 text-black">{selectedRecord._id}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                          <div className="flex items-center space-x-4">
                            <select
                              value={selectedRecord.complianceStatus}
                              onChange={(e) => handleStatusUpdate(selectedRecord, e.target.value)}
                              disabled={updating}
                              className="pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                            >
                              <option value="Passed">Passed</option>
                              <option value="Pending">Pending</option>
                              <option value="Failed">Failed</option>
                            </select>
                            {updating && <FaSpinner className="animate-spin text-blue-600" />}
                          </div>
                          {updateError && (
                            <p className="text-red-500 text-sm mt-2">{updateError}</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 mb-3">Documents</h3>
                        <div className="space-y-3">
                          {selectedRecord.documents.map(doc => (
                            <div key={doc._id} className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{doc.documentType || doc.type}</p>
                                  <p className="text-sm text-gray-600 mt-1">Number: {doc.documentNumber}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {doc.verifiedBy && `Verified by ${doc.verifiedBy}`}
                                    {getVerificationDate(doc) && ` on ${format(new Date(getVerificationDate(doc)!), 'PPp')}`}
                                  </p>
                                  {doc.verificationNotes && (
                                    <p className="text-xs text-gray-600 mt-1 italic">"{doc.verificationNotes}"</p>
                                  )}
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full 
                                  ${doc.verificationStatus === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {doc.verificationStatus}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Verified By</h3>
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800">
                                {(selectedRecord.verifiedBy || 'NA').substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="ml-3 text-sm text-gray-900">{selectedRecord.verifiedBy || 'Not Assigned'}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
                          <p className="text-sm text-gray-900">
                            {format(new Date(selectedRecord.updatedAt), 'PPpp')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-black">
                  Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
                </p>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
