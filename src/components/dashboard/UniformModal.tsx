"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaTimes, FaSpinner, FaDownload, FaFilePdf, FaFileImage, FaFileWord, FaFileExcel } from "react-icons/fa";

interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: string;
  _id: string;
}

interface UniformHistoryItem {
  setCount: number;
  requestDate: string;
  approvalStatus: string;
  issuedStatus: string;
  uniformType: string[];
  size: Record<string, string>;
  qty: number;
  remarks: string;
  replacementType: string;
  replacedEmployeeId: string | null;
  dcNumber?: string;
  issuedDate?: string | null;
  issuedBy?: string | null;
  dcInfo?: {
    dcNumber: string;
    dcDate: string;
    customer: string;
    remarks: string;
    items: Array<{
      itemId: string;
      quantity: number;
      size: string;
      employeeId: string;
      uniformType: string;
      _id: string;
    }>;
    createdAt: string;
    attachments?: Attachment[];
    _id?: string; // Add DC ID field
  };
}

interface UniformData {
  employeeDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
  };
  uniformHistory: UniformHistoryItem[];
  dcStatus?: {
    hasDC: boolean;
    totalDCs: number;
    latestDC: {
      _id: string;
      dcNumber: string;
      dcDate: string;
      customer: string;
      remarks: string;
      items: Array<{
        itemId: string;
        quantity: number;
        size: string;
        employeeId: string;
        uniformType: string;
        _id: string;
      }>;
      createdAt: string;
    };
    allDCs: Array<{
      _id: string;
      dcNumber: string;
      dcDate: string;
      customer: string;
      remarks: string;
      items: Array<{
        itemId: string;
        quantity: number;
        size: string;
        employeeId: string;
        uniformType: string;
        _id: string;
      }>;
      createdAt: string;
    }>;
    message: string;
  };
  summary: {
    totalRequests: number;
    nextSetCount: number;
    lastRequestDate: string;
    currentStatus: string;
    hasDC?: boolean;
    totalDCs?: number;
    latestDCNumber?: string;
    allDCNumbers?: string[];
  };
}

interface UniformModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  theme: "dark" | "light";
}

const UniformModal: React.FC<UniformModalProps> = ({ isOpen, onClose, employeeId, theme }) => {
  const [uniformData, setUniformData] = useState<UniformData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDC, setSelectedDC] = useState<UniformHistoryItem['dcInfo'] | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Function to fetch DC ID by DC number
  const fetchDCIdByNumber = useCallback(async (dcNumber: string): Promise<string | null> => {
    try {
      const response = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc');
      if (response.ok) {
        const result = await response.json();
        const dc = result.dcs?.find((dc: any) => dc.dcNumber === dcNumber);
        return dc?._id || null;
      }
    } catch (err) {
      console.error('Error fetching DC ID:', err);
    }
    return null;
  }, []);

  // Function to fetch attachments for a DC
  const fetchAttachments = useCallback(async (dcId: string) => {
    console.log('Fetching attachments for DC ID:', dcId);
    setLoadingAttachments(true);
    try {
      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/outward-dc/${dcId}/attachments`);
      console.log('Attachments API response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Attachments API response:', result);
        if (result.success) {
          setAttachments(result.attachments || []);
        }
      } else {
        console.error('Attachments API error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  }, []);

  // Function to get file icon based on mimetype
  const getFileIcon = (mimetype: string) => {
    if (mimetype.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (mimetype.includes('image')) return <FaFileImage className="text-green-500" />;
    if (mimetype.includes('word') || mimetype.includes('document')) return <FaFileWord className="text-blue-500" />;
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return <FaFileExcel className="text-green-600" />;
    return <FaFilePdf className="text-gray-500" />;
  };

  // Function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchUniformHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/uniforms/${employeeId}/uniform-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch uniform history');
      }
      const result = await response.json();
      if (result.success) {
        setUniformData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch uniform data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchUniformHistory();
    }
  }, [isOpen, employeeId, fetchUniformHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div
        className={`rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-hidden ${
          theme === "dark" ? "bg-gray-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Uniform History
              </h2>
              {uniformData && (
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  {uniformData.employeeDetails.fullName} ({uniformData.employeeDetails.employeeId})
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className={`text-xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[calc(90vh-100px)]">
          {/* DC Summary */}
          {uniformData && (
            <div className={`p-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-50"}`}>
                  <div className={`text-sm font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                    Total Requests
                  </div>
                  <div className={`text-xl font-bold ${theme === "dark" ? "text-blue-100" : "text-blue-800"}`}>
                    {uniformData.summary.totalRequests}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-green-900/30" : "bg-green-50"}`}>
                  <div className={`text-sm font-medium ${theme === "dark" ? "text-green-300" : "text-green-600"}`}>
                    DCs Created
                  </div>
                  <div className={`text-xl font-bold ${theme === "dark" ? "text-green-100" : "text-green-800"}`}>
                    {uniformData.summary.totalDCs || uniformData.dcStatus?.totalDCs || 0}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-purple-900/30" : "bg-purple-50"}`}>
                  <div className={`text-sm font-medium ${theme === "dark" ? "text-purple-300" : "text-purple-600"}`}>
                    Latest DC
                  </div>
                  <div className={`text-lg font-bold ${theme === "dark" ? "text-purple-100" : "text-purple-800"}`}>
                    {uniformData.summary.latestDCNumber || uniformData.dcStatus?.latestDC?.dcNumber || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-xl text-blue-500 mr-3" />
              <span className={`text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Loading uniform history...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
              <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                {error}
              </div>
              <button
                onClick={fetchUniformHistory}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          ) : uniformData ? (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm border-collapse ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                <thead className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                  <tr>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Set Count
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Request Date
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Uniform Items
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Sizes
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Items Count/Qty
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Approval
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Issued
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      Type
                    </th>
                    <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                      DC Number
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uniformData.uniformHistory.map((item, index) => (
                    <tr key={index} className={`border-b ${theme === "dark" ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50"}`}>
                      <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {item.setCount}
                      </td>
                      <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {new Date(item.requestDate).toLocaleDateString()}
                      </td>
                      <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        <div className="space-y-1">
                          {item.uniformType.map((type, idx) => (
                            <div key={idx} className="text-xs">
                              • {type}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        <div className="space-y-1">
                          {Object.entries(item.size).map(([itemType, size]) => (
                            <div key={itemType} className="text-xs">
                              {itemType}: {size || 'N/A'}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {item.qty}
                      </td>
                      <td className={`px-3 py-2`}>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.approvalStatus === 'Approved' 
                            ? 'bg-green-100 text-green-800' 
                            : item.approvalStatus === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.approvalStatus}
                        </span>
                      </td>
                      <td className={`px-3 py-2`}>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.issuedStatus === 'Issued' 
                            ? 'bg-green-100 text-green-800' 
                            : item.issuedStatus === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.issuedStatus}
                        </span>
                      </td>
                      <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {item.replacementType}
                      </td>
                      <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {item.dcNumber ? (
                          <button
                            onClick={async () => {
                              if (item.dcInfo) {
                                setSelectedDC(item.dcInfo);
                                console.log('Looking for DC:', item.dcInfo.dcNumber);
                                
                                // Fetch DC ID using the DC number
                                const dcId = await fetchDCIdByNumber(item.dcInfo.dcNumber);
                                console.log('Found DC ID:', dcId);
                                
                                if (dcId) {
                                  fetchAttachments(dcId);
                                } else {
                                  console.log('DC ID not found for DC:', item.dcInfo.dcNumber);
                                  setAttachments([]);
                                }
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                              item.dcNumber 
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.dcNumber}
                          </button>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                            N/A
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded font-semibold ${
                theme === "dark"
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* DC Details Modal */}
      {selectedDC && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
          <div className={`rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden ${
            theme === "dark" ? "bg-gray-900" : "bg-white"
          }`}>
            {/* Header */}
            <div className={`p-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  DC Details - {selectedDC.dcNumber}
                </h3>
                <button
                  onClick={() => {
                    setSelectedDC(null);
                    setAttachments([]);
                  }}
                  className={`text-xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-auto max-h-[60vh]">
              <div className="space-y-4">
                {/* DC Info */}
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h4 className={`font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    DC Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>DC Number:</span>
                      <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{selectedDC.dcNumber}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>DC Date:</span>
                      <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {new Date(selectedDC.dcDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Customer:</span>
                      <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{selectedDC.customer}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Created:</span>
                      <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {new Date(selectedDC.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {selectedDC.remarks && (
                    <div className="mt-2">
                      <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Remarks:</span>
                      <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{selectedDC.remarks}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h4 className={`font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Items ({selectedDC.items.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDC.items.map((item, index) => (
                      <div key={index} className={`p-2 rounded ${theme === "dark" ? "bg-gray-700" : "bg-white"}`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {item.uniformType}
                          </span>
                          <div className="text-sm">
                            <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              Qty: {item.quantity} | Size: {item.size}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h4 className={`font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Attached Files ({attachments.length})
                  </h4>
                  {loadingAttachments ? (
                    <div className="flex items-center justify-center py-4">
                      <FaSpinner className="animate-spin text-blue-500 mr-2" />
                      <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                        Loading attachments...
                      </span>
                    </div>
                  ) : attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map((attachment, index) => (
                        <div key={index} className={`p-3 rounded border ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getFileIcon(attachment.mimetype)}
                              <div>
                                <div className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                  {attachment.originalName}
                                </div>
                                <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                  {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                // Create download link
                                const link = document.createElement('a');
                                link.href = `https://inventory.zenapi.co.in/api/inventory/outward-dc/${selectedDC?._id}/attachments/${attachment._id}/download`;
                                link.download = attachment.originalName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className={`p-2 rounded hover:bg-opacity-80 transition-colors ${
                                theme === "dark" 
                                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                  : "bg-blue-500 hover:bg-blue-600 text-white"
                              }`}
                              title="Download file"
                            >
                              <FaDownload className="text-sm" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      No attachments found for this DC
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedDC(null);
                    setAttachments([]);
                  }}
                  className={`px-4 py-2 rounded font-semibold ${
                    theme === "dark"
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniformModal;
