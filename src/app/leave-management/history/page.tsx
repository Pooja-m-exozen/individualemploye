'use client';

import { useState, useEffect } from 'react';
import { 
  FaExclamationCircle, 
  FaHistory,
  FaSearch,
  FaChevronDown,
  FaSync,
  FaCalendarAlt,
  FaClock,
  FaTimes,
  FaEye,
  FaDownload,
  FaPlus,
  FaFileAlt,
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
  const [selectedLeave, setSelectedLeave] = useState<LeaveHistory | null>(null);
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


  const filteredHistory = leaveData ? leaveData.leaveHistory.filter(item => {
    const matchesSearch = searchQuery === '' || 
      getLeaveTypeLabel(item.leaveType).toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  }) : [];


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
    <div className="max-w-7xl mx-auto space-y-8 py-8">
      {/* Search and Status Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 ml-8 justify-between">
        <div className="flex gap-4">
          <div className="md:w-64">
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Search</label>
            <div className="relative">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
            </div>
          </div>
          <div className="md:w-48">
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <FaChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'} pointer-events-none`} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <button
            onClick={() => router.push('/leave-management/request')}
            className={`px-4 py-2 rounded-lg font-semibold border text-sm flex items-center gap-2 transition-colors ${
              theme === 'dark' 
                ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50' 
                : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            <FaPlus className="w-4 h-4" />
            Request Leave
          </button>
           <button
             onClick={() => router.push('/leave-management/view')}
             className={`px-3 py-2 rounded-lg font-semibold border text-sm flex items-center gap-1 transition-colors ${
               theme === 'dark' 
                 ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50' 
                 : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
             }`}
           >
             <FaFileAlt className="w-3 h-3" />
             View Leave
           </button>
        </div>
      </div>

      {/* Leave Applications Table */}
      <div className="overflow-x-auto w-full ml-8">
        <table className="min-w-[1200px] text-sm table-auto border-collapse border border-blue-400">
          <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
            <tr>
              <th className={`px-4 py-3 text-left font-bold sticky left-0 z-20 whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`} style={{ width: 60 }}>#</th>
              <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Leave Type</th>
              <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Duration</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Days</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Half Day</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Status</th>
              <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Applied On</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={`px-4 py-12 text-center border border-blue-400 ${theme === "dark" ? "text-gray-300 bg-slate-800" : "text-gray-600 bg-white"}`}>
                  <div className="flex items-center justify-center">
                    <FaSync className="animate-spin text-blue-500 w-4 h-4 mr-2" />
                    Loading leave history...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className={`px-4 py-12 text-center border border-blue-400 ${theme === "dark" ? "text-gray-300 bg-slate-800" : "text-gray-600 bg-white"}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center text-red-600">
                      <FaExclamationCircle className="w-4 h-4 mr-2" />
                      {error}
                    </div>
                    <button
                      onClick={fetchLeaveHistory}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-2 text-sm"
                    >
                      <FaSync className="w-3 h-3" />
                      Try Again
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={8} className={`px-4 py-12 text-center border border-blue-400 ${theme === "dark" ? "text-gray-300 bg-slate-800" : "text-gray-600 bg-white"}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <FaHistory className="w-6 h-6 text-gray-400 mr-2" />
                      No leave history found
                    </div>
                    <p className="text-sm text-gray-500">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your search filters'
                        : 'Submit a new leave request to see it here'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredHistory.map((item, idx) => (
              <tr key={item.leaveId} className={`${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-gray-50"} transition-colors duration-200`}>
                <td className={`px-4 py-3 text-left font-mono text-sm border border-blue-400 ${theme === "dark" ? "bg-slate-800 text-gray-300" : "bg-white text-gray-600"}`} style={{ width: 60 }}>
                  {idx + 1}
                </td>
                <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                  <span className="block whitespace-pre-wrap break-words leading-5" title={getLeaveTypeLabel(item.leaveType)}>
                    {getLeaveTypeLabel(item.leaveType)}
                  </span>
                </td>
                <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                  <span className="block whitespace-pre-wrap break-words leading-5" title={`${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`}>
                    <div className="flex items-center gap-1">
                      <FaCalendarAlt className={`w-3 h-3 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                      {new Date(item.startDate).toLocaleDateString()}
                      {item.startDate !== item.endDate && (
                        <> - {new Date(item.endDate).toLocaleDateString()}</>
                      )}
                    </div>
                  </span>
                </td>
                <td className={`px-4 py-3 text-center border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                  <span className="block whitespace-pre-wrap break-words leading-5" title={item.numberOfDays.toString()}>
                    {item.numberOfDays}
                  </span>
                </td>
                <td className={`px-4 py-3 text-center border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                  <span className="block whitespace-pre-wrap break-words leading-5">
                    {item.isHalfDay ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        theme === "dark" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"
                      }`}>
                        {item.halfDayType}
                      </span>
                    ) : (
                      <span className={`${theme === "dark" ? "text-gray-400" : "text-gray-400"}`}>-</span>
                    )}
                  </span>
                </td>
                <td className={`px-4 py-3 text-center border border-blue-400`}>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    item.status.toLowerCase() === 'approved' ? (theme === "dark" ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800') :
                    item.status.toLowerCase() === 'rejected' ? (theme === "dark" ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800') :
                    item.status.toLowerCase() === 'pending' ? (theme === "dark" ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800') :
                    (theme === "dark" ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800')
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                  <span className="block whitespace-pre-wrap break-words leading-5" title={new Date(item.appliedOn).toLocaleDateString()}>
                    <div className="flex items-center gap-1">
                      <FaClock className={`w-3 h-3 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                      {new Date(item.appliedOn).toLocaleDateString()}
                    </div>
                  </span>
                </td>
                <td className={`px-4 py-3 text-center border border-blue-400`}>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setSelectedLeave(item)}
                      className={`px-3 py-1 text-xs font-semibold border rounded transition-colors ${
                        theme === "dark" 
                          ? "bg-blue-800 text-white border-blue-400 hover:bg-blue-700" 
                          : "bg-blue-50 text-blue-700 border-blue-400 hover:bg-blue-100"
                      }`}
                      title="View Details"
                    >
                      <FaEye className="w-3 h-3 inline mr-1" />
                      View
                    </button>
                    <button
                      className={`p-2 text-xs font-semibold border rounded transition-colors ${
                        theme === "dark" 
                          ? "bg-blue-800 text-white border-blue-400 hover:bg-blue-700" 
                          : "bg-blue-50 text-blue-700 border-blue-400 hover:bg-blue-100"
                      }`}
                      title="Download"
                    >
                      <FaDownload className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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