'use client';

import { useState, useEffect } from 'react';
import { 

  FaCheckCircle, 
  FaExclamationCircle, 
  FaHistory,
  FaSearch,
  FaChevronDown,
  FaSync,
  FaCalendarAlt,
  FaClock,
  FaFilter,
  FaTimes,
  FaEye,
  FaDownload,

} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface LeaveBalance {
  EL: number;
  CL: number;
  SL: number;
  CompOff: number;
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

interface LeaveHistory {
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
  attachments: Attachment[];
  appliedOn: string;
  lastUpdated: string;
}

interface LeaveHistoryResponse {
  employeeId: string;
  employeeName: string;
  totalLeaves: number;
  leaveBalances: LeaveBalance;
  leaveHistory: LeaveHistory[];
}

// Enhanced feedback messages with animation
const FeedbackMessage = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <div className={`flex items-center gap-2 p-4 rounded-xl animate-fade-in ${
    type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
  }`}>
    {type === 'success' ? <FaCheckCircle className="w-5 h-5" /> : <FaExclamationCircle className="w-5 h-5" />}
    <p className="text-sm font-medium">{message}</p>
  </div>
);

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="mt-4 text-center text-gray-600">Loading...</div>
    </div>
  </div>
);

// Status Badge Class Helper
const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Leave Type Label Helper
const getLeaveTypeLabel = (type: string) => {
  switch (type) {
    case 'EL': return 'Earned Leave';
    case 'SL': return 'Sick Leave';
    case 'CL': return 'Casual Leave';
    case 'CompOff': return 'Comp Off';
    default: return type;
  }
};

// Leave Details Modal
const LeaveDetailsModal = ({ leave, onClose }: { leave: LeaveHistory; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Leave Request Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Leave Type</h4>
            <p className="mt-1 text-base font-medium text-gray-900">{getLeaveTypeLabel(leave.leaveType)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Status</h4>
            <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              getStatusBadgeClass(leave.status)
            }`}>
              {leave.status}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Duration</h4>
            <p className="mt-1 text-base text-gray-900 flex items-center gap-2">
              <FaCalendarAlt className="text-gray-400" />
              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
              {leave.isHalfDay && (
                <span className="ml-2 text-sm text-gray-500">
                  ({leave.halfDayType} Half)
                </span>
              )}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Number of Days</h4>
            <p className="mt-1 text-base text-gray-900">{leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Applied On</h4>
            <p className="mt-1 text-base text-gray-900 flex items-center gap-2">
              <FaClock className="text-gray-400" />
              {new Date(leave.appliedOn).toLocaleDateString()}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Emergency Contact</h4>
            <p className="mt-1 text-base text-gray-900">{leave.emergencyContact}</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Reason</h4>
          <p className="mt-1 text-base text-gray-900">{leave.reason}</p>
        </div>
      </div>
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

function LeaveHistoryContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaveData, setLeaveData] = useState<LeaveHistoryResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLeave, setSelectedLeave] = useState<LeaveHistory | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchLeaveHistory();
  }, [router]);

  const fetchLeaveHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }

      const response = await fetch(`https://cafm.zenapi.co.in/api/leave/history/${employeeId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch leave history');
      }

      setLeaveData(data);
    } catch  {
      setError( 'Failed to fetch leave history');
      setLeaveData(null);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilteredHistory = (history: LeaveHistory[]) => {
    const now = new Date();
    switch (dateFilter) {
      case 'last30':
        return history.filter(item => {
          const date = new Date(item.appliedOn);
          return (now.getTime() - date.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        });
      case 'last90':
        return history.filter(item => {
          const date = new Date(item.appliedOn);
          return (now.getTime() - date.getTime()) <= 90 * 24 * 60 * 60 * 1000;
        });
      case 'thisYear':
        return history.filter(item => {
          const date = new Date(item.appliedOn);
          return date.getFullYear() === now.getFullYear();
        });
      default:
        return history;
    }
  };

  const filteredHistory = leaveData ? getDateFilteredHistory(leaveData.leaveHistory).filter(item => {
    const matchesSearch = searchQuery === '' || 
      getLeaveTypeLabel(item.leaveType).toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  }) : [];

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FaHistory className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Leave History</h1>
              <p className="text-blue-100 mt-1">View and track your leave applications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2.5 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors rounded-lg"
              title="Toggle Filters"
            >
              <FaFilter className="w-5 h-5" />
            </button>
            <button
              onClick={fetchLeaveHistory}
              className="p-2.5 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors rounded-lg"
              title="Refresh"
            >
              <FaSync className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {leaveData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(leaveData.leaveBalances).map(([type, balance]) => (
            <div key={type} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{getLeaveTypeLabel(type)}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{balance}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaFilter className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none bg-white pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full appearance-none bg-white pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="last90">Last 90 Days</option>
                  <option value="thisYear">This Year</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FaHistory className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Leave Applications</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {filteredHistory.length} {filteredHistory.length === 1 ? 'record' : 'records'} found
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-8 text-center">
            <FeedbackMessage message={error} type="error" />
            <button
              onClick={fetchLeaveHistory}
              className="mt-4 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-2"
            >
              <FaSync className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="p-3 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FaHistory className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-800">No leave history found</p>
            <p className="text-sm mt-1 text-gray-500">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your search filters'
                : 'Submit a new leave request to see it here'}
            </p>
            {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Half Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied On
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((item) => (
                  <tr key={item.leaveId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{getLeaveTypeLabel(item.leaveType)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3 text-gray-400" />
                          {new Date(item.startDate).toLocaleDateString()}
                          {item.startDate !== item.endDate && (
                            <> - {new Date(item.endDate).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.numberOfDays}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.isHalfDay ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {item.halfDayType}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusBadgeClass(item.status)
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <FaClock className="w-3 h-3 text-gray-400" />
                          {new Date(item.appliedOn).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedLeave(item)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
                          title="View Details"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
                          title="Download"
                        >
                          <FaDownload className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Details Modal */}
      {selectedLeave && (
        <LeaveDetailsModal
          leave={selectedLeave}
          onClose={() => setSelectedLeave(null)}
        />
      )}
    </div>
  );
}

export default function LeaveHistoryPage() {
  return (
    <DashboardLayout>
      <LeaveHistoryContent />
    </DashboardLayout>
  );
}