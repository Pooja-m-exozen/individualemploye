'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiX, FiRefreshCw, FiPlus, FiCalendar, FiClock, FiMessageCircle, FiPhone, FiClock as FiPending } from 'react-icons/fi';

// Types
interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
  pending: number;
}

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
  attachments: string[];
  appliedOn: string;
  lastUpdated: string;
}

interface LeaveHistoryResponse {
  employeeId: string;
  employeeName: string;
  totalLeaves: number;
  leaveBalances: {
    EL: number;
    CL: number;
    SL: number;
    CompOff: number;
  };
  leaveHistory: LeaveHistoryItem[];
}

interface LeaveBalances {
  EL: LeaveBalance;
  SL: LeaveBalance;
  CL: LeaveBalance;
  CompOff: LeaveBalance;
}

interface LeaveBalanceResponse {
  employeeId: string;
  employeeName: string;
  year: number;
  balances: LeaveBalances;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  totalPending: number;
}

interface LeaveRequestForm {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  emergencyContact: string;
  isHalfDay: boolean;
  halfDayType: string | null;
}

// Helper Components
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-8">
    {/* Header Skeleton */}
    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-8 px-6 rounded-2xl shadow-xl mb-8">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-8">
          <div className="space-y-3">
            <div className="h-8 w-48 bg-white/20 rounded-lg"></div>
            <div className="h-4 w-64 bg-white/10 rounded-lg"></div>
          </div>
          <div className="h-12 w-36 bg-white/20 rounded-xl"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-white/20 rounded-xl"></div>
              </div>
              <div className="h-4 w-24 bg-white/20 rounded-lg mb-2"></div>
              <div className="h-8 w-16 bg-white/20 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Leave Balances Section Skeleton */}
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-16 bg-gray-200 rounded-lg"></div>
              <div className="h-6 w-12 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-12 bg-gray-200 rounded"></div>
                <div className="h-4 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-4 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Leave History Section Skeleton */}
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="h-8 w-20 bg-gray-200 rounded-lg"></div>
            <div className="h-8 w-32 bg-gray-200 rounded-lg"></div>
            <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
            <div className="h-8 w-28 bg-gray-200 rounded-lg"></div>
            <div className="h-8 w-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const fadeInUp = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4
    }
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const headerVariants = {
  initial: {
    opacity: 0,
    y: -20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const statCardVariants = {
  initial: {
    opacity: 0,
    scale: 0.9
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4
    }
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2
    }
  }
};

// Updating the StatCard component to use animations
const StatCard = ({ title, value, bgColor, textColor, icon: Icon }: {
  title: string;
  value: number | string;
  bgColor: string;
  textColor: string;
  icon: any;
}) => (
  <motion.div
    variants={statCardVariants}
    initial="initial"
    animate="animate"
    whileHover="hover"
    className={`${bgColor} rounded-2xl p-6 shadow-lg transition-shadow hover:shadow-xl`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 ${textColor} bg-white/10 rounded-xl`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
    <p className="text-3xl font-bold text-white">{value}</p>
  </motion.div>
);

// Main Component
const LeaveManagementPage = () => {
  const [leaveData, setLeaveData] = useState<LeaveBalanceResponse | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveHistoryItem | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [leaveRequestForm, setLeaveRequestForm] = useState<LeaveRequestForm>({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContact: '',
    isHalfDay: false,
    halfDayType: null,
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      await Promise.all([fetchLeaveBalance(), fetchLeaveHistory()]);
    } catch (err) {
      setError('Failed to refresh data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLeaveHistory = async () => {
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/leave/history/EFMS3295');
      if (!response.ok) {
        throw new Error('Failed to fetch leave history');
      }
      const data: LeaveHistoryResponse = await response.json();
      setLeaveHistory(data);
    } catch (err) {
      console.error('Error fetching leave history:', err);
      throw err;
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/leave/balance/EFMS3295');
      if (!response.ok) {
        throw new Error('Failed to fetch leave balance');
      }
      const data: LeaveBalanceResponse = await response.json();
      setLeaveData(data);
    } catch (err) {
      console.error('Error fetching leave balance:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLeaveChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setLeaveRequestForm(prev => ({
        ...prev,
        [name]: checked,
        halfDayType: name === 'isHalfDay' && !checked ? null : prev.halfDayType,
      }));
    } else {
      setLeaveRequestForm(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setSubmittingRequest(true);

    const { leaveType, startDate, endDate, reason, emergencyContact, isHalfDay, halfDayType } = leaveRequestForm;

    // Basic validation
    if (!leaveType || !startDate || !endDate || !reason) {
      setRequestError('Please fill in all required fields (Leave Type, Start Date, End Date, Reason).');
      setSubmittingRequest(false);
      return;
    }

    // Add validation for half-day type if it's a single-day half-day leave
    if (isHalfDay && startDate === endDate && !halfDayType) {
      setRequestError('Please select a Half Day Type (First Half or Second Half) for a single-day half-day leave.');
      setSubmittingRequest(false);
      return;
    }

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    let numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (isHalfDay && startDate === endDate) {
      numberOfDays = 0.5;
    }

    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/leave/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: leaveData?.employeeId,
          leaveType,
          startDate,
          endDate,
          numberOfDays,
          isHalfDay,
          // Only include halfDayType if it is a single-day half-day leave
          halfDayType: (isHalfDay && startDate === endDate) ? halfDayType : null,
          reason,
          emergencyContact,
          attachments: [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit leave request');
      }

      await fetchData();
      setShowRequestModal(false);
      setLeaveRequestForm({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        emergencyContact: '',
        isHalfDay: false,
        halfDayType: null,
      });

    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelLeave = (leave: LeaveHistoryItem) => {
    setSelectedLeave(leave);
    setShowCancelModal(true);
  };

  const submitCancellation = async () => {
    if (!selectedLeave || !cancellationReason.trim()) return;

    try {
      setCancelling(true);
      const response = await fetch(`https://cafm.zenapi.co.in/api/leave/cancel/${selectedLeave.leaveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancellationReason: cancellationReason.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel leave');
      }

      await fetchData();
      setShowCancelModal(false);
      setSelectedLeave(null);
      setCancellationReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel leave request');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status: string): string => {
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <FiCheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <FiPending className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <FiXCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getLeaveTypeColor = (type: string): string => {
    switch (type) {
      case 'EL':
        return 'bg-blue-100 text-blue-800';
      case 'CL':
        return 'bg-purple-100 text-purple-800';
      case 'SL':
        return 'bg-orange-100 text-orange-800';
      case 'CompOff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderCancelModal = () => {
    if (!showCancelModal || !selectedLeave) return null;

      return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all duration-300"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <FiX className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Cancel Leave Request</h3>
              </div>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedLeave(null);
                  setCancellationReason('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Leave Details</h4>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getLeaveTypeColor(selectedLeave.leaveType)}`}>
                    {selectedLeave.leaveType}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(selectedLeave.startDate)}
                    {selectedLeave.startDate !== selectedLeave.endDate && ` - ${formatDate(selectedLeave.endDate)}`}
                    {selectedLeave.isHalfDay && ' (Half Day)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLeave.status)}`}>
                    {getStatusIcon(selectedLeave.status)}
                    {selectedLeave.status}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">Maximum 300 characters</span>
              </div>
              <textarea
                id="cancellationReason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                maxLength={300}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 text-gray-900"
                rows={4}
                placeholder="Please provide a reason for cancellation"
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 flex justify-end gap-4">
            <button
              onClick={() => {
                setShowCancelModal(false);
                setSelectedLeave(null);
                setCancellationReason('');
              }}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitCancellation}
              disabled={!cancellationReason.trim() || cancelling}
              className={`px-6 py-2.5 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform ${
                !cancellationReason.trim() || cancelling
                  ? 'bg-red-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
              }`}
            >
              {cancelling ? (
                <div className="flex items-center">
                  <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
                  Cancelling...
                </div>
              ) : (
                'Confirm Cancellation'
              )}
            </button>
          </div>
        </motion.div>
        </div>
      );
  };

  const renderRequestModal = () => {
    if (!showRequestModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full transform transition-all duration-300 my-8"
        >
          <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FiCalendar className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Apply for Leave</h3>
          </div>
          <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
          >
                <FiX className="w-6 h-6" />
          </button>
            </div>
        </div>

          <form onSubmit={handleSubmitLeaveRequest} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="leaveType"
                  name="leaveType"
                  value={leaveRequestForm.leaveType}
                  onChange={handleRequestLeaveChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900"
                  required
                >
                  <option value="">Select Leave Type</option>
                  <option value="EL">Earned Leave</option>
                  <option value="CL">Casual Leave</option>
                  <option value="SL">Sick Leave</option>
                  <option value="CompOff">Compensatory Off</option>
                </select>
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={leaveRequestForm.startDate}
                  onChange={handleRequestLeaveChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={leaveRequestForm.endDate}
                  onChange={handleRequestLeaveChange}
                  min={leaveRequestForm.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={leaveRequestForm.emergencyContact}
                    onChange={handleRequestLeaveChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900"
                    placeholder="Emergency contact number"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Reason <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">Maximum 500 characters</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 pt-4 pointer-events-none">
                  <FiMessageCircle className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  id="reason"
                  name="reason"
                  value={leaveRequestForm.reason}
                  onChange={handleRequestLeaveChange}
                  rows={4}
                  maxLength={500}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900"
                  placeholder="Please provide a detailed reason for your leave request"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                id="isHalfDay"
                name="isHalfDay"
                type="checkbox"
                checked={leaveRequestForm.isHalfDay}
                onChange={handleRequestLeaveChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-lg transition-all duration-200 cursor-pointer"
              />
              <label htmlFor="isHalfDay" className="text-sm font-medium text-gray-700 cursor-pointer">
                Half Day Leave
              </label>
            </div>

            {leaveRequestForm.isHalfDay && leaveRequestForm.startDate === leaveRequestForm.endDate && (
              <div>
                <label htmlFor="halfDayType" className="block text-sm font-medium text-gray-700 mb-2">
                  Half Day Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="halfDayType"
                  name="halfDayType"
                  value={leaveRequestForm.halfDayType || ''}
                  onChange={handleRequestLeaveChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900"
                  required
                >
                  <option value="">Select Half Day Type</option>
                  <option value="First Half">First Half</option>
                  <option value="Second Half">Second Half</option>
                </select>
                </div>
            )}

            {requestError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-center">
                  <FiAlertCircle className="text-red-500 w-5 h-5 mr-2" />
                  <p className="text-red-800 text-sm">{requestError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRequest}
                className={`px-6 py-2.5 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                  submittingRequest
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
                }`}
              >
                {submittingRequest ? (
                  <div className="flex items-center">
                    <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
                    Submitting...
                  </div>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-6"
        >
          <div className="bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl p-8 text-center max-w-md">
            <FiAlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-semibold mb-2">Oops! Something went wrong</p>
            <p className="text-red-500 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <FiRefreshCw className="w-5 h-5 inline mr-2" /> Try Again
            </motion.button>
        </div>
        </motion.div>
      );
    }

    if (!leaveData || !leaveHistory) return null;

    return (
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="space-y-8"
      >
        <motion.div
          variants={headerVariants}
          className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-8 px-6 rounded-2xl shadow-xl"
        >
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Leave Management</h1>
                <p className="text-blue-100">Track and manage your leave requests efficiently</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRequestModal(true)}
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-medium"
              >
                <FiPlus className="w-5 h-5 mr-2" />
                Request Leave
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="space-y-8">
          {/* Leave Balances Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Leave Balances</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(leaveData.balances).map(([type, balance]) => (
                    <tr key={type} className={`${(type === 'EL' || type === 'SL') ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLeaveTypeColor(type)}`}>
                          {type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-middle">{balance.allocated}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-middle">{balance.used}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-middle">{balance.pending}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-middle">{balance.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leave History Section */}
          <motion.div
            variants={fadeInUp}
            className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Leave History</h2>
              <button 
                onClick={() => fetchData()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FiRefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveHistory.leaveHistory.map((leave) => (
                    <tr key={leave.leaveId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="text-sm text-gray-900">
                          {formatDate(leave.startDate)}
                          {leave.startDate !== leave.endDate && ` - ${formatDate(leave.endDate)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {leave.numberOfDays} {leave.numberOfDays === 1 ? 'day' : 'days'}
                          {leave.isHalfDay && ' (Half Day)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                          {getStatusIcon(leave.status)}
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 align-middle">
                        {formatDate(leave.appliedOn)}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        {leave.status === 'Pending' && (
                          <button
                            onClick={() => handleCancelLeave(leave)}
                            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      {renderContent()}
      {renderRequestModal()}
      {renderCancelModal()}
    </DashboardLayout>
  );
};

export default LeaveManagementPage; 