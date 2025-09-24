"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaTimes, FaSpinner, FaEye } from "react-icons/fa";

interface LeaveHistoryItem {
  leaveId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  isHalfDay: boolean;
  halfDayType: string | null;
  status: string;
  reason: string;
  emergencyContact: string;
  attachments: unknown[];
  appliedOn: string;
  lastUpdated: string;
  approvalDate?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

interface LeaveBalances {
  EL: number;
  CL: number;
  SL: number;
  CompOff: number;
}

interface LeaveData {
  employeeId: string;
  employeeName: string;
  totalLeaves: number;
  leaveBalances: LeaveBalances;
  leaveHistory: LeaveHistoryItem[];
}

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  theme: "dark" | "light";
}

const LeaveModal: React.FC<LeaveModalProps> = ({ isOpen, onClose, employeeId, theme }) => {
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchLeaveHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/leave/history/${employeeId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leave history: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      setLeaveData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchLeaveHistory();
    }
  }, [isOpen, employeeId, fetchLeaveHistory]);

  const handleViewDetails = (leave: LeaveHistoryItem) => {
    setSelectedLeave(leave);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (leaveType: string) => {
    switch (leaveType) {
      case 'EL':
        return 'bg-blue-100 text-blue-800';
      case 'CL':
        return 'bg-purple-100 text-purple-800';
      case 'SL':
        return 'bg-orange-100 text-orange-800';
      case 'CompOff':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div
        className={`rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden ${
          theme === "dark" ? "bg-gray-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Leave History
              </h2>
              {leaveData && (
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  {leaveData.employeeName} ({leaveData.employeeId})
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
                Loading leave history...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
              <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                {error}
              </div>
              <button
                onClick={fetchLeaveHistory}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          ) : leaveData ? (
            <div className="p-4 space-y-6">
              {/* Leave Balances Summary */}
              <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                <h3 className={`text-lg font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Leave Balances
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {leaveData.leaveBalances.EL}
                    </div>
                    <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      Earned Leave (EL)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {leaveData.leaveBalances.CL}
                    </div>
                    <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      Casual Leave (CL)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {leaveData.leaveBalances.SL}
                    </div>
                    <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      Sick Leave (SL)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {leaveData.leaveBalances.CompOff}
                    </div>
                    <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      Comp Off
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave History Table */}
              <div className="overflow-x-auto">
                <table className={`w-full text-sm border-collapse ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  <thead className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                    <tr>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        Leave Type
                      </th>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        Start Date
                      </th>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        End Date
                      </th>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        Days
                      </th>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        Half Day
                      </th>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        Status
                      </th>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        Applied On
                      </th>
                      <th className={`px-3 py-2 text-left font-semibold border-b ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveData.leaveHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={`px-3 py-8 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          No leave records found
                        </td>
                      </tr>
                    ) : (
                      leaveData.leaveHistory.map((leave) => (
                        <tr key={leave.leaveId} className={`border-b ${theme === "dark" ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50"}`}>
                          <td className={`px-3 py-2`}>
                            <span className={`text-xs px-2 py-1 rounded ${getLeaveTypeColor(leave.leaveType)}`}>
                              {leave.leaveType}
                            </span>
                          </td>
                          <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {new Date(leave.startDate).toLocaleDateString()}
                          </td>
                          <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {new Date(leave.endDate).toLocaleDateString()}
                          </td>
                          <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {leave.numberOfDays}
                          </td>
                          <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {leave.isHalfDay ? leave.halfDayType || 'Half Day' : 'Full Day'}
                          </td>
                          <td className={`px-3 py-2`}>
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(leave.status)}`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className={`px-3 py-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {new Date(leave.appliedOn).toLocaleDateString()}
                          </td>
                          <td className={`px-3 py-2`}>
                            <button
                              onClick={() => handleViewDetails(leave)}
                              className={`px-3 py-1 rounded text-xs ${
                                theme === "dark" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"
                              }`}
                            >
                              <FaEye className="inline mr-1" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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

      {/* Detail Modal */}
      {showDetailModal && selectedLeave && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className={`rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden ${
            theme === "dark" ? "bg-gray-900" : "bg-white"
          }`}>
            <div className={`p-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Leave Details
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className={`text-xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Leave Type:</strong>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getLeaveTypeColor(selectedLeave.leaveType)}`}>
                      {selectedLeave.leaveType}
                    </span>
                  </div>
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Status:</strong>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedLeave.status)}`}>
                      {selectedLeave.status}
                    </span>
                  </div>
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Start Date:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {new Date(selectedLeave.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>End Date:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {new Date(selectedLeave.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Number of Days:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {selectedLeave.numberOfDays}
                    </span>
                  </div>
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Half Day:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {selectedLeave.isHalfDay ? selectedLeave.halfDayType || 'Half Day' : 'Full Day'}
                    </span>
                  </div>
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Applied On:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {new Date(selectedLeave.appliedOn).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Emergency Contact:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {selectedLeave.emergencyContact}
                    </span>
                  </div>
                </div>
                
                <div>
                  <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Reason:</strong>
                  <div className={`mt-1 p-3 rounded ${theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-900"}`}>
                    {selectedLeave.reason}
                  </div>
                </div>

                {selectedLeave.approvalDate && (
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Approval Date:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {new Date(selectedLeave.approvalDate).toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedLeave.approvedBy && (
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Approved By:</strong>
                    <span className={`ml-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {selectedLeave.approvedBy}
                    </span>
                  </div>
                )}

                {selectedLeave.rejectionReason && (
                  <div>
                    <strong className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Rejection Reason:</strong>
                    <div className={`mt-1 p-3 rounded ${theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-50 text-red-800"}`}>
                      {selectedLeave.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveModal;
