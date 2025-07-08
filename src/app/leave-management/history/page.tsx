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
import { useTheme } from "@/context/ThemeContext";

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
  const { theme } = useTheme();

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

  // Leave Details Modal
  const LeaveDetailsModal = ({ leave, onClose }: { leave: LeaveHistory; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}> 
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>Leave Request Details</h3>
            <button onClick={onClose} className={
              theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
            }>
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Leave Type</h4>
              <p className={`mt-1 text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getLeaveTypeLabel(leave.leaveType)}</p>
            </div>
            <div>
              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Status</h4>
              <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusBadgeClass(leave.status)
              }`}>
                {leave.status}
              </span>
            </div>
            <div>
              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Duration</h4>
              <p className={`mt-1 text-base flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}> 
                <FaCalendarAlt className={theme === 'dark' ? 'text-gray-400' : 'text-gray-400'} />
                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                {leave.isHalfDay && (
                  <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}> 
                    ({leave.halfDayType} Half)
                  </span>
                )}
              </p>
            </div>
            <div>
              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Number of Days</h4>
              <p className={`mt-1 text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}</p>
            </div>
            <div>
              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Applied On</h4>
              <p className={`mt-1 text-base flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                <FaClock className={theme === 'dark' ? 'text-gray-400' : 'text-gray-400'} />
                {new Date(leave.appliedOn).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Emergency Contact</h4>
              <p className={`mt-1 text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{leave.emergencyContact}</p>
            </div>
          </div>
          <div>
            <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Reason</h4>
            <p className={`mt-1 text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{leave.reason}</p>
          </div>
        </div>
        <div className={`p-6 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 max-w-7xl mx-auto space-y-6 py-4 md:py-8">
      {/* Header */}
      <div
        className={`rounded-xl shadow-lg ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-gray-800 to-gray-700'
            : 'bg-gradient-to-r from-blue-600 to-blue-800'
        } px-4 py-5 md:px-8 md:py-8 flex flex-col gap-2 md:gap-0`}
        style={{ marginTop: 0 }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`p-2 md:p-3 ${
              theme === 'dark' ? 'bg-gray-700/50' : 'bg-white/20'
            } backdrop-blur-sm rounded-xl`}>
              <FaHistory className="w-7 h-7 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Leave History</h1>
              <p className={theme === 'dark' ? 'text-gray-300 text-sm' : 'text-blue-100 text-sm'}>
                View and track your leave applications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 mt-2 md:mt-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 md:p-2.5 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700/50 hover:bg-gray-600/50'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title="Toggle Filters"
            >
              <FaFilter className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={fetchLeaveHistory}
              className={`p-2 md:p-2.5 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700/50 hover:bg-gray-600/50'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title="Refresh"
            >
              <FaSync className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {leaveData && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {Object.entries(leaveData.leaveBalances).map(([type, balance]) => (
            <div
              key={type}
              className={`rounded-xl shadow-sm p-4 md:p-6 border flex flex-col justify-between h-full ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs md:text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>{getLeaveTypeLabel(type)}</p>
                  <p className={`text-xl md:text-2xl font-bold mt-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{balance}</p>
                </div>
                <div className={`p-2 md:p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                }`}>
                  <FaCalendarAlt className={
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  } />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters Section */}
      {showFilters && (
        <div className={`rounded-xl shadow-lg border p-4 md:p-6 space-y-4 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs md:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs md:text-sm bg-white"
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs md:text-sm bg-white"
                >
                  <option value="all">All</option>
                  <option value="last30">Last 30 days</option>
                  <option value="last90">Last 90 days</option>
                  <option value="thisYear">This Year</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className={`rounded-xl shadow-lg border overflow-x-auto ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
        style={{ marginTop: 0 }}
      >
        <div className={`p-4 md:p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
            <div className="flex items-center gap-2">
              <FaHistory className="text-blue-600" />
              <span className="font-semibold text-base md:text-lg text-gray-800">Leave Applications</span>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
              {filteredHistory.length > 0 && (
                <span>{filteredHistory.length} record{filteredHistory.length > 1 ? 's' : ''} found</span>
              )}
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
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-2 text-xs md:text-sm"
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
            <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-black'}`}>No leave history found</p>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-black'}`}> 
              Try adjusting your filters or search.
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
            <table className="w-full min-w-[700px] text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 md:px-4 py-2 font-semibold text-gray-700 text-left">LEAVE TYPE</th>
                  <th className="px-2 md:px-4 py-2 font-semibold text-gray-700 text-left">DURATION</th>
                  <th className="px-2 md:px-4 py-2 font-semibold text-gray-700 text-left">DAYS</th>
                  <th className="px-2 md:px-4 py-2 font-semibold text-gray-700 text-left">HALF DAY</th>
                  <th className="px-2 md:px-4 py-2 font-semibold text-gray-700 text-left">STATUS</th>
                  <th className="px-2 md:px-4 py-2 font-semibold text-gray-700 text-left">APPLIED ON</th>
                  <th className="px-2 md:px-4 py-2 font-semibold text-gray-700 text-left">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr
                    key={item.leaveId}
                    className={`border-b last:border-b-0 hover:bg-blue-50/40 transition-colors ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}
                  >
                    <td className={`px-2 md:px-4 py-2 font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{getLeaveTypeLabel(item.leaveType)}</td>
                    <td className={`px-2 md:px-4 py-2 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>
                      <FaCalendarAlt className="inline-block text-gray-400 mr-1" />
                      {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                    </td>
                    <td className={`px-2 md:px-4 py-2 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>{item.numberOfDays}</td>
                    <td className={`px-2 md:px-4 py-2 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>
                      {item.isHalfDay && item.halfDayType ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          {item.halfDayType} Half
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className={`px-2 md:px-4 py-2 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}> 
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className={`px-2 md:px-4 py-2 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}> 
                      <span className="flex items-center gap-1">
                        <FaClock className="text-gray-400" />
                        {new Date(item.appliedOn).toLocaleDateString()}
                      </span>
                    </td>
                    <td className={`px-2 md:px-4 py-2 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>
                      <button
                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                        title="View Details"
                        onClick={() => setSelectedLeave(item)}
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      {item.attachments && item.attachments.length > 0 && (
                        <a
                          href={item.attachments[0].fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                          title="Download Attachment"
                        >
                          <FaDownload className="w-4 h-4" />
                        </a>
                      )}
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