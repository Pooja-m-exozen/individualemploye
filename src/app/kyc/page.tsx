'use client';

import { useEffect, useState } from 'react';
import { KYCRecord } from '@/types/kyc';
import { getAllKYCRecords, getKYCByEmail, kycService } from '@/services/kyc';
import { format } from 'date-fns';
import { FaSpinner, FaSearch, FaEye, FaTimes, FaFilter, FaEdit, FaFileAlt } from 'react-icons/fa';
import { isAuthenticated, isEmployee, getUserRole } from '@/services/auth';
import { useRouter } from 'next/navigation';

interface Document {
  type: string;
  url: string;
  uploadedAt: string;
  _id: string;
}

interface DocumentsResponse {
  message: string;
  documents: Document[];
}

export default function KYCViewPage() {
  const router = useRouter();
  const [kycRecord, setKycRecord] = useState<KYCRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<KYCRecord | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchKYCRecord();
    fetchDocuments();
  }, [router]);

  const fetchKYCRecord = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setError('User email not found');
        setLoading(false);
        return;
      }

      const record = await getKYCByEmail(userEmail);
      setKycRecord(record);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching KYC record:', error);
      setError('Failed to fetch KYC record');
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/kyc/EFMS3295/documents');
      const data: DocumentsResponse = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleEdit = (record: KYCRecord) => {
    setEditingRecord(record);
  };

  const handleSaveEdit = async (updatedRecord: KYCRecord) => {
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/kyc/${updatedRecord.personalDetails.employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord),
      });

      const data = await response.json();
      if (data.message === "KYC form updated successfully") {
        setKycRecord(data.updatedKYC);
      setEditingRecord(null);
        // Show success message
        alert('KYC information updated successfully');
      } else {
        throw new Error('Failed to update KYC information');
      }
    } catch (error) {
      console.error('Error updating KYC:', error);
      alert('Failed to update KYC information. Please try again.');
    }
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleCloseDocument = () => {
    setSelectedDocument(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null); // Clear previous errors on new file selection
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('document', selectedFile);
    // You might need to append other data like user ID or document type
    // formData.append('employeeId', kycRecord.personalDetails.employeeId);

    try {
      // TODO: Replace with your actual document upload API endpoint
      const response = await fetch('/api/upload-document', { 
        method: 'POST',
        body: formData,
        // Note: Do not set Content-Type header for FormData, the browser does it automatically
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      // Assuming the API returns the newly uploaded document details
      const result = await response.json();
      // Assuming the API response has a similar structure to the documents fetched previously
      // You might need to adjust this based on your actual API response structure
      const newDocument: Document = result.document; // Adjust based on API response

      setDocuments([...documents, newDocument]); // Add the new document to the list
      setSelectedFile(null); // Clear the selected file input
      alert('Document uploaded successfully!');

    } catch (error: any) {
      console.error('Error uploading document:', error);
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
        <p className="text-black">Loading KYC record...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
          <p className="font-semibold">{error}</p>
          <button 
            onClick={fetchKYCRecord}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!kycRecord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No KYC Record Found</h2>
          <p className="text-gray-600 mb-4">You haven't submitted your KYC information yet.</p>
          <button 
            onClick={() => router.push('/kyc/submit')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Submit KYC Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-0 px-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen font-sans">
      <div className="mx-auto pt-0 pb-2 px-0 sm:px-0 lg:px-0">
        <div className="w-full bg-white shadow-xl border border-gray-100 pt-0 px-4 pb-8 sm:px-4 sm:pb-10 flex flex-col gap-10">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-gray-200">
            {/* Left: Employee image, name, ID, designation */}
            {/* Removed employee image, name, ID, designation as requested */}
            {/* Right: Status and last updated */}
            <div className="flex flex-col items-start sm:items-end gap-3 ml-auto justify-center">
              {kycRecord.status === 'Approved' ? (
                 <div className="flex items-center gap-2">
                   <span className="w-5 h-5 bg-green-500 rounded-full block shadow-sm"></span>
                   <span className="text-lg font-bold text-green-700">Approved</span>
                 </div>
              ) : (
                <>
                  <span className={`px-6 py-2.5 rounded-xl text-lg font-bold shadow-sm
                    ${kycRecord.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      'bg-red-50 text-red-700 border border-red-200'}`}>
                    {kycRecord.status}
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                    Last updated: {format(new Date(kycRecord.updatedAt), 'PPpp')}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Details */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-blue-600 bg-blue-50 p-3.5 rounded-xl flex-shrink-0 border border-blue-100">
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
                </span>
                <h2 className="text-2xl font-bold text-blue-900">Personal Details</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-1">Date of Birth</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.personalDetails.dob}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-1">Phone Number</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.personalDetails.phoneNumber}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-1">Date of Joining</div>
                  <div className="text-gray-900 text-lg font-semibold">{format(new Date(kycRecord.personalDetails.dateOfJoining), 'PP')}</div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-2xl border border-red-100 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-red-600 bg-red-50 p-3.5 rounded-xl flex-shrink-0 border border-red-100">
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' /></svg>
                </span>
                <h2 className="text-2xl font-bold text-red-900">Emergency Contact</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-1">Name</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.emergencyContact.name}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-1">Relationship</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.emergencyContact.relationship}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-1">Phone</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.emergencyContact.phone}</div>
                </div>
              </div>
            </div>

            {/* Permanent Address */}
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-green-600 bg-green-50 p-3.5 rounded-xl flex-shrink-0 border border-green-100">
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M13 5v6h6m-6 0H7m6 0v6m0 0H7m6 0h6' /></svg>
                </span>
                <h2 className="text-2xl font-bold text-green-900">Permanent Address</h2>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100">
                <div className="text-gray-900 text-lg font-semibold space-y-2">
                  <div>{kycRecord.addressDetails.permanentAddress.street}</div>
                  <div>{kycRecord.addressDetails.permanentAddress.city}, {kycRecord.addressDetails.permanentAddress.state}</div>
                  <div className="text-blue-600">PIN: {kycRecord.addressDetails.permanentAddress.postalCode}</div>
                </div>
              </div>
            </div>

            {/* Current Address */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-blue-600 bg-blue-50 p-3.5 rounded-xl flex-shrink-0 border border-blue-100">
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 12.414a2 2 0 00-2.828 0l-4.243 4.243a8 8 0 1111.314 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
                </span>
                <h2 className="text-2xl font-bold text-blue-900">Current Address</h2>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100">
                <div className="text-gray-900 text-lg font-semibold space-y-2">
                  <div>{kycRecord.addressDetails.currentAddress.street}</div>
                  <div>{kycRecord.addressDetails.currentAddress.city}, {kycRecord.addressDetails.currentAddress.state}</div>
                  <div className="text-blue-600">PIN: {kycRecord.addressDetails.currentAddress.postalCode}</div>
                </div>
              </div>
            </div>

            {/* Bank Details (full width) */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100 md:col-span-2 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-purple-600 bg-purple-50 p-3.5 rounded-xl flex-shrink-0 border border-purple-100">
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h2a2 2 0 012 2v6a2 2 0 01-2 2H3m0-10V6a2 2 0 012-2h14a2 2 0 012 2v4m-18 0h18' /></svg>
                </span>
                <h2 className="text-2xl font-bold text-purple-900">Bank Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-2">Bank Name</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.bankDetails.bankName}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-2">Branch Name</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.bankDetails.branchName}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-2">Account Number</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.bankDetails.accountNumber}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                  <div className="font-medium text-gray-500 text-sm mb-2">IFSC Code</div>
                  <div className="text-gray-900 text-lg font-semibold">{kycRecord.bankDetails.ifscCode}</div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-100 md:col-span-2 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 bg-gray-50 p-3.5 rounded-xl flex-shrink-0 border border-gray-100">
                    <FaFileAlt className="w-7 h-7" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
                    <p className="text-gray-500 text-sm mt-1">View and manage your uploaded documents</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                  Last updated: {documents.length > 0 ? format(new Date(documents[documents.length - 1].uploadedAt), 'PP') : 'N/A'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <div 
                    key={doc._id} 
                    className="group bg-white p-6 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 flex flex-col gap-4 cursor-pointer"
                    onClick={() => handleViewDocument(doc)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-grow">
                        <div className={`p-3.5 rounded-xl ${
                          doc.type === 'aadhar' ? 'bg-green-50 text-green-600 border border-green-100' :
                          doc.type === 'profilePhoto' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}>
                          <FaFileAlt className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-lg capitalize truncate">{doc.type}</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(doc.uploadedAt), 'PP')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDocument(doc)}
                      className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium border border-blue-100"
                    >
                      <FaEye className="w-4 h-4" />
                      View Document
                    </button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                    <FaFileAlt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No documents uploaded yet.</p>
                  </div>
                )}
              </div>

              {/* Document Upload Section */}
              <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-4">
                <label className="block text-sm font-medium text-gray-700">Upload New Document:</label>
                <div className="flex-grow flex items-center gap-4">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-900 border border-gray-200 rounded-xl cursor-pointer bg-gray-50 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-300"
                  />
                   {selectedFile && <span className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{selectedFile.name}</span>}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="animate-spin w-4 h-4" /> Uploading...
                    </>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </div>
               {uploadError && (
                <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{uploadError}</div>
              )}
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={() => handleEdit(kycRecord)}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 gap-3 shadow-md"
            >
              <FaEdit className="w-5 h-5" /> Edit KYC Information
            </button>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full mx-auto shadow-2xl transform transition-all overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedDocument.type === 'aadhar' ? 'bg-green-100 text-green-600' :
                  selectedDocument.type === 'profilePhoto' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  <FaFileAlt className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white capitalize">{selectedDocument.type}</h2>
                  <p className="text-sm text-blue-100">
                    Uploaded on {format(new Date(selectedDocument.uploadedAt), 'PPpp')}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseDocument} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <FaTimes className="text-white w-5 h-5 hover:text-gray-100" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50">
              <div className="relative aspect-w-16 aspect-h-9 rounded-xl overflow-hidden shadow-lg border border-gray-200">
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.type}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-8 flex justify-center">
                <a
                  href={selectedDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-lg font-semibold shadow-md"
                >
                  <FaEye className="w-5 h-5" />
                  Open Document in New Tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full mx-auto shadow-2xl transform transition-all overflow-hidden max-h-[90vh] flex flex-col border border-gray-200">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Edit KYC Information</h2>
              <button onClick={() => setEditingRecord(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <FaTimes className="text-white w-5 h-5 hover:text-gray-100" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit(editingRecord);
              }} className="space-y-8">
                {/* Personal Details Section */}
                <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-xl shadow-sm border border-blue-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FaFileAlt className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-blue-900">Personal Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="text"
                        value={editingRecord.personalDetails.dob}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          personalDetails: {
                            ...editingRecord.personalDetails,
                            dob: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="text"
                        value={editingRecord.personalDetails.phoneNumber}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          personalDetails: {
                            ...editingRecord.personalDetails,
                            phoneNumber: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                      <input
                        type="text"
                        value={editingRecord.personalDetails.bloodGroup}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          personalDetails: {
                            ...editingRecord.personalDetails,
                            bloodGroup: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter blood group"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                      <select
                        value={editingRecord.personalDetails.maritalStatus}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          personalDetails: {
                            ...editingRecord.personalDetails,
                            maritalStatus: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-900 transition-colors"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-xl shadow-sm border border-red-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <FaFileAlt className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-red-900">Emergency Contact</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={editingRecord.emergencyContact.name}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          emergencyContact: {
                            ...editingRecord.emergencyContact,
                            name: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter emergency contact name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="text"
                        value={editingRecord.emergencyContact.phone}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          emergencyContact: {
                            ...editingRecord.emergencyContact,
                            phone: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter emergency contact phone"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                      <input
                        type="text"
                        value={editingRecord.emergencyContact.relationship}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          emergencyContact: {
                            ...editingRecord.emergencyContact,
                            relationship: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter relationship"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Details Section */}
                <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-xl shadow-sm border border-purple-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FaFileAlt className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-purple-900">Bank Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={editingRecord.bankDetails.bankName}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          bankDetails: {
                            ...editingRecord.bankDetails,
                            bankName: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                      <input
                        type="text"
                        value={editingRecord.bankDetails.branchName}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          bankDetails: {
                            ...editingRecord.bankDetails,
                            branchName: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter branch name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={editingRecord.bankDetails.accountNumber}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          bankDetails: {
                            ...editingRecord.bankDetails,
                            accountNumber: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={editingRecord.bankDetails.ifscCode}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          bankDetails: {
                            ...editingRecord.bankDetails,
                            ifscCode: e.target.value
                          }
                        })}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-gray-900 placeholder-gray-400 transition-colors"
                        placeholder="Enter IFSC code"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-6 py-3 text-sm font-semibold rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}