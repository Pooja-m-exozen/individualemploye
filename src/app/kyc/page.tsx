'use client';

import { useEffect, useState } from 'react';
import { KYCRecord, KYCDocument } from '@/types/kyc';
import { getAllKYCRecords, updateKYCCompliance, verifyDocument, uploadKYCDocuments } from '@/services/kyc';
import { format } from 'date-fns';
import { FaSpinner, FaSearch, FaEye, FaTimes, FaFilter } from 'react-icons/fa';
import { isAuthenticated, isEmployee } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/services/api';

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
  const [verifyingDocument, setVerifyingDocument] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  const handleDocumentVerification = async (employeeId: string, documentId: string) => {
    setVerifyingDocument(documentId);
    setDocumentError(null);
    try {
      const response = await verifyDocument(employeeId, documentId, { status: 'Verified' });
      if (response.success) {
        const updatedRecord = response.data;
        setKycRecords(prevRecords =>
          prevRecords.map(r =>
            r._id === updatedRecord._id ? updatedRecord : r
          )
        );
        setSelectedRecord(prev => prev?._id === updatedRecord._id ? updatedRecord : prev);
      } else {
        setDocumentError(response.message || 'Failed to verify document');
      }
    } catch (error) {
      setDocumentError('Failed to verify document');
    } finally {
      setVerifyingDocument(null);
    }
  };

  const handleDocumentUpload = async (employeeId: string, documents: FormData) => {
    setUploadingDocuments(true);
    setUploadError(null);
    try {
      const result = await uploadKYCDocuments(documents);
      
      if (result.success) {
        const updatedRecord = result.data.kyc;
        setKycRecords(prevRecords =>
          prevRecords.map(r =>
            r._id === updatedRecord._id ? updatedRecord : r
          )
        );
        setSelectedRecord(prev => prev?._id === updatedRecord._id ? updatedRecord : prev);
      } else {
        throw new Error(result.message || 'Failed to upload documents');
      }
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload documents');
      if (error.message.includes('Token is not valid')) {
        router.push('/login');
      }
    } finally {
      setUploadingDocuments(false);
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

  const DocumentViewer = ({ document }: { document: KYCDocument }) => {
    const isPDF = document.documentPath.toLowerCase().endsWith('.pdf');
    const isImage = document.documentPath.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/i);

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">{document.documentType} Document</h3>
            <div className="flex items-center gap-2">
              <a
                href={document.documentPath}
                download={document.documentName}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              <button
                onClick={() => setIsViewerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {isPDF ? (
              <iframe
                src={document.documentPath}
                className="w-full h-[calc(90vh-8rem)]"
                title={document.documentName}
              />
            ) : isImage ? (
              <img
                src={document.documentPath}
                alt={document.documentName}
                className="max-w-full max-h-[calc(90vh-8rem)] mx-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-image.png';
                  e.currentTarget.alt = 'Failed to load image';
                }}
              />
            ) : (
              <div className="text-center py-8">
                <p>Document preview not available</p>
                <p className="text-sm text-gray-500">Please download to view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DocumentCard = ({ doc, employeeId }: { doc: KYCDocument; employeeId: string }) => {
    const isEmployeeUser = isEmployee();

    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full 
              ${doc.verificationStatus === 'Verified' 
                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20' 
                : 'bg-amber-100 text-amber-800 ring-1 ring-amber-600/20'}`}>
              {doc.verificationStatus}
            </span>
          </div>
          <h4 className="text-base font-medium text-gray-900">{doc.documentType || doc.type}</h4>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-medium">Number:</span> {doc.documentNumber}
          </p>
          {getVerificationDate(doc) && (
            <p className="text-sm text-gray-400 mt-2">
              <span className="font-medium">Verified:</span> {format(new Date(getVerificationDate(doc)!), 'PPp')}
            </p>
          )}
          {doc.verificationNotes && (
            <p className="text-sm text-gray-500 mt-2 italic bg-gray-50 p-2 rounded-lg">
              "{doc.verificationNotes}"
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Only show verify button for admin */}
            {!isEmployeeUser && doc.verificationStatus !== 'Verified' && (
              <button
                onClick={() => handleDocumentVerification(employeeId, doc._id)}
                disabled={verifyingDocument === doc._id}
                className={`inline-flex items-center px-3 py-1.5 rounded-md
                  ${verifyingDocument === doc._id 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'} transition-colors`}
              >
                {verifyingDocument === doc._id ? (
                  <>
                    <FaSpinner className="animate-spin h-4 w-4 mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verify Document
                  </>
                )}
              </button>
            )}
            {/* Always show view document button */}
            <button
              onClick={() => {
                setSelectedDocument(doc);
                setIsViewerOpen(true);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Document
            </button>
            <a
              href={doc.documentPath}
              download={doc.documentName}
              className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
          {documentError && verifyingDocument === doc._id && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
              {documentError}
            </div>
          )}
        </div>
      </div>
    );
  };

  const DocumentUploadForm = ({ employeeId }: { employeeId: string }) => {
    const [documents, setDocuments] = useState<File[]>([]);
    const [documentTypes, setDocumentTypes] = useState<string[]>([]);
    const [documentNumbers, setDocumentNumbers] = useState<string[]>([]);
    const [remarks, setRemarks] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData();
      
      documents.forEach((file, index) => {
        formData.append('documents', file);
        formData.append('documentTypes', documentTypes[index] || '');
        formData.append('documentNumbers', documentNumbers[index] || '');
      });
      formData.append('remarks', remarks);
      formData.append('employeeId', employeeId); // Add employeeId to FormData

      handleDocumentUpload(employeeId, formData);
    };

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Documents</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, PNG, JPG or GIF (MAX. 10MB)</p>
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setDocuments(files);
                    setDocumentTypes(new Array(files.length).fill(''));
                    setDocumentNumbers(new Array(files.length).fill(''));
                  }}
                />
              </label>
            </div>

            {documents.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Selected Documents</h4>
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                          <input
                            type="text"
                            placeholder="e.g., Passport, ID Card"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            value={documentTypes[index] || ''}
                            onChange={(e) => {
                              const newTypes = [...documentTypes];
                              newTypes[index] = e.target.value;
                              setDocumentTypes(newTypes);
                            }}
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
                          <input
                            type="text"
                            placeholder="Enter document number"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            value={documentNumbers[index] || ''}
                            onChange={(e) => {
                              const newNumbers = [...documentNumbers];
                              newNumbers[index] = e.target.value;
                              setDocumentNumbers(newNumbers);
                            }}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex items-center mt-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 012 0v4a1 1 0 102 0V7a1 1 0 00-6 0v4a1 1 0 01-2 0V7a1 1 0 00-2 0v4a5 5 0 0010 0V7a3 3 0 00-3-3H8z" clipRule="evenodd" />
                        </svg>
                        {doc.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                placeholder="Add any additional notes or remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => {
                setDocuments([]);
                setDocumentTypes([]);
                setDocumentNumbers([]);
                setRemarks('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear All
            </button>
            <button
              type="submit"
              disabled={uploadingDocuments || documents.length === 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                uploadingDocuments || documents.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {uploadingDocuments ? (
                <span className="flex items-center">
                  <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Uploading...
                </span>
              ) : (
                'Upload Documents'
              )}
            </button>
          </div>

          {uploadError && (
            <div className="mt-2 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
              <div className="flex items-center">
                <FaTimes className="flex-shrink-0 mr-2" />
                <span>{uploadError}</span>
              </div>
            </div>
          )}
        </form>
      </div>
    );
  };

  const KycDetailsModal = ({ record, onClose }: { record: KYCRecord; onClose: () => void }) => {
    const isEmployeeUser = isEmployee();

    return (
      <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full mx-auto shadow-2xl transform transition-all overflow-hidden max-h-[90vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-gray-800 to-gray-900 sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-semibold text-white">KYC Details</h2>
              <p className="text-sm text-gray-400 mt-1">ID: {record._id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              title="Close"
            >
              <FaTimes className="text-gray-400 w-5 h-5 hover:text-gray-200" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6 overflow-y-auto bg-white">
            {/* Compliance Status - Only for Admin */}
            {!isEmployeeUser && (
              <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Status</h3>
                <div className="flex items-center gap-4">
                  <select
                    value={record.complianceStatus}
                    onChange={(e) => handleStatusUpdate(record, e.target.value)}
                    disabled={updating}
                    className="pl-4 pr-10 py-2.5 border bg-white border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-base"
                  >
                    <option value="Passed">✅ Passed</option>
                    <option value="Pending">⏳ Pending</option>
                    <option value="Failed">❌ Failed</option>
                  </select>
                  {updating && (
                    <span className="flex items-center gap-2 text-blue-600">
                      <FaSpinner className="animate-spin" />
                      <span className="text-sm">Updating...</span>
                    </span>
                  )}
                  {updateError && (
                    <span className="text-red-500 text-sm flex items-center gap-2">
                      <FaTimes />
                      <span>{updateError}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Documents Section */}
            <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                <div className="text-sm text-gray-500">
                  {record.documents.filter(d => d.verificationStatus === 'Verified').length} of {record.documents.length} Verified
                </div>
              </div>

              {/* Document Upload Form - Only for Admin */}
              {!isEmployeeUser && <DocumentUploadForm employeeId={record.employeeId} />}

              {/* Document Cards */}
              <div className="grid gap-4 sm:grid-cols-2 mt-6">
                {record.documents.map(doc => (
                  <DocumentCard key={doc._id} doc={doc} employeeId={record.employeeId} />
                ))}
              </div>
            </div>

            {/* Verification Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Verified By</h3>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-base font-medium text-blue-800">
                      {(record.verifiedBy || 'NA').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-base text-gray-900">{record.verifiedBy || 'Not Assigned'}</p>
                    <p className="text-sm text-gray-400">Verification Officer</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Last Updated</h3>
                <div className="space-y-2">
                  <p className="text-base text-gray-900">
                    {format(new Date(record.updatedAt), 'PPpp')}
                  </p>
                  <p className="text-sm text-gray-400">
                    {format(new Date(record.updatedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    
  );
};

  return (
    <div className="p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
              KYC Management
            </h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full sm:w-44 pl-10 pr-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white hover:border-blue-500 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="Passed">✅ Passed</option>
                  <option value="Pending">⏳ Pending</option>
                  <option value="Failed">❌ Failed</option>
                </select>
                <FaFilter className="absolute left-3 top-3.5 text-gray-400" />
              </div>
              <div className="relative flex-grow sm:flex-grow-0">
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 bg-white hover:border-blue-500 transition-colors"
                />
                <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
              </div>
            </div>
          </div>

          {currentRecords.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-3">
                <FaSearch className="text-4xl text-gray-300" />
                <p className="text-gray-500 text-lg">No KYC records found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full">
                <table className="w-full table-fixed">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                    <tr>
                      <th className="w-[15%] px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="w-[25%] px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Verified By</th>
                      <th className="w-[25%] px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Verification Date</th>
                      <th className="w-[20%] px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Notes</th>
                      <th className="w-[15%] px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {currentRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={`px-4 py-1.5 inline-flex text-sm font-medium rounded-full 
                            ${record.complianceStatus === 'Passed' ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20' : 
                              record.complianceStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20' : 
                              'bg-red-100 text-red-800 ring-1 ring-red-600/20'}`}>
                            {record.complianceStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800">
                                {(record.verifiedBy || 'NA').substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="ml-3 text-sm text-gray-900 truncate">{record.verifiedBy || 'Not Assigned'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.verificationDate ? format(new Date(record.verificationDate), 'dd MMM yyyy HH:mm') : 'Pending'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="truncate">
                            {record.complianceNotes || record.remarks || 'No notes'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 ease-in-out transform group-hover:scale-105"
                          >
                            <FaEye className="mr-1.5 w-4 h-4" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedRecord && (
                <KycDetailsModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
              )}

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
                </p>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
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
      {isViewerOpen && selectedDocument && (
        <DocumentViewer document={selectedDocument} />
      )}
    </div>
  );
}
