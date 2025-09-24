"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaTimes, FaSpinner } from "react-icons/fa";

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
}

interface UniformData {
  employeeDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
  };
  uniformHistory: UniformHistoryItem[];
  summary: {
    totalRequests: number;
    nextSetCount: number;
    lastRequestDate: string;
    currentStatus: string;
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
    </div>
  );
};

export default UniformModal;
