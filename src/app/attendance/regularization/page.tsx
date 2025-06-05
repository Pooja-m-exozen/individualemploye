'use client';

import { useState, useEffect } from 'react';
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaHistory, 
  FaCalendarAlt, 
  FaClock, 
  FaEdit, 
  
  FaCheck, 
  
  FaClipboardCheck,
  FaSync,
  
  FaSearch,
  FaChevronDown,
  FaInfo,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface RegularizationRequest {
  date: string;
  punchInTime: string;
  punchOutTime: string;
  reason: string;
  status: string;
}

interface RegularizationHistoryItem {
  date: string;
  status: string;
  punchInTime: string;
  punchOutTime: string;
  reason: string;
  appliedOn: string;
  actionStatus: string;
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

// Pagination Component
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
      <div className="flex items-center text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

function RegularizationContent() {
  const router = useRouter();
  const [regularizationLoading, setRegularizationLoading] = useState(false);
  const [regularizationError, setRegularizationError] = useState<string | null>(null);
  const [regularizationSuccess, setRegularizationSuccess] = useState<string | null>(null);
  const [regularizationForm, setRegularizationForm] = useState<RegularizationRequest>({
    date: '',
    punchInTime: '',
    punchOutTime: '',
    reason: '',
    status: 'Present'
  });
  const [regularizationHistory, setRegularizationHistory] = useState<RegularizationHistoryItem[]>([]);
  const [regularizationHistoryLoading, setRegularizationHistoryLoading] = useState(true);
  const [regularizationHistoryError, setRegularizationHistoryError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchRegularizationHistory();
  }, [router]);

  const fetchRegularizationHistory = async () => {
    try {
      setRegularizationHistoryLoading(true);
      setRegularizationHistoryError(null);

      const employeeId = getEmployeeId();
      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/regularization-history`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch regularization history');
      }

      if (data.success && Array.isArray(data.data?.regularizations)) {
        setRegularizationHistory(data.data.regularizations);
      } else {
        setRegularizationHistory([]);
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch regularization history');
        }
      }
    } catch  {
      setRegularizationHistoryError( 'Failed to fetch regularization history');
      setRegularizationHistory([]);
    } finally {
      setRegularizationHistoryLoading(false);
    }
  };

  const handleRegularizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegularizationLoading(true);
    setRegularizationError(null);
    setRegularizationSuccess(null);

    try {
      // Always call the real API (removed development check)
      const employeeId = getEmployeeId();
      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/regularize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: regularizationForm.date,
          punchInTime: regularizationForm.punchInTime,
          punchOutTime: regularizationForm.punchOutTime,
          reason: regularizationForm.reason,
          status: regularizationForm.status
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRegularizationSuccess(data.message || 'Regularization request submitted successfully!');
        setRegularizationForm({
          date: '',
          punchInTime: '',
          punchOutTime: '',
          reason: '',
          status: 'Present'
        });
        setShowForm(false);
        fetchRegularizationHistory();
      } else {
        throw new Error(data.message || 'Failed to submit regularization request');
      }
    } catch  {
      setRegularizationError('Failed to submit regularization request');
    } finally {
      setRegularizationLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegularizationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

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

  const filteredHistory = regularizationHistory.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.actionStatus.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredHistory.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + recordsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FaClipboardCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Attendance Regularization</h1>
              <p className="text-blue-100 mt-1">Request attendance corrections and track their status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions and Form Section in Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Instructions Section */}
        <div className="rounded-xl shadow-sm border border-gray-200/30 p-6 h-fit bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaInfo className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Instructions</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium">Select Date</h3>
                </div>
                <p className="text-sm text-gray-600 pl-6">Choose the date for which you need to regularize attendance. You can only request for past dates.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <FaClock className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium">Specify Time</h3>
                </div>
                <p className="text-sm text-gray-600 pl-6">Enter your actual punch-in and punch-out times for the selected date.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <FaClipboardCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium">Provide Reason</h3>
                </div>
                <p className="text-sm text-gray-600 pl-6">Give a detailed explanation for the regularization request to help quick approval.</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <FaExclamationCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Important Notes:</h4>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700 list-disc list-inside">
                    <li>Requests must be submitted within 7 days of the attendance date</li>
                    <li>Multiple requests for the same date will be rejected automatically</li>
                    <li>Provide valid supporting documents if required by your manager</li>
                    <li>Check your request status in the history section below</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="rounded-xl shadow-sm border border-gray-200/30 p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaEdit className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">New Request</h2>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 font-medium"
              >
                <FaEdit className="w-4 h-4" />
                New Request
              </button>
            )}
          </div>

          {showForm ? (
            <form onSubmit={handleRegularizationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={regularizationForm.date}
                      onChange={handleInputChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={regularizationForm.status}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
                  >
                    <option value="">Select Status</option>
                    <option value="Present">Present</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Work From Home">Work From Home</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="punchInTime" className="block text-sm font-medium text-gray-700">
                    Punch In Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="time"
                      id="punchInTime"
                      name="punchInTime"
                      value={regularizationForm.punchInTime}
                      onChange={handleInputChange}
                      required
                      className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="punchOutTime" className="block text-sm font-medium text-gray-700">
                    Punch Out Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="time"
                      id="punchOutTime"
                      name="punchOutTime"
                      value={regularizationForm.punchOutTime}
                      onChange={handleInputChange}
                      required
                      className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Reason for Regularization <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={regularizationForm.reason}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
                  placeholder="Please provide a detailed reason for attendance regularization..."
                />
              </div>

              {regularizationError && (
                <FeedbackMessage message={regularizationError} type="error" />
              )}

              {regularizationSuccess && (
                <FeedbackMessage message={regularizationSuccess} type="success" />
              )}

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regularizationLoading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {regularizationLoading ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaCheck className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FaClipboardCheck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Request</h3>
              <p className="text-gray-500 mb-6">Click the New Request button to start a regularization request.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="rounded-xl shadow-sm border border-gray-200/30 overflow-hidden bg-card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaHistory className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Request History</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-40 appearance-none bg-white pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={fetchRegularizationHistory}
                className="p-2 text-gray-600 hover:text-blue-600 transition-all duration-200 rounded-lg hover:bg-gray-50"
                title="Refresh"
              >
                <FaSync className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {regularizationHistoryLoading ? (
          <LoadingSpinner />
        ) : regularizationHistoryError ? (
          <div className="p-8 text-center">
            <FeedbackMessage message={regularizationHistoryError} type="error" />
            <button
              onClick={fetchRegularizationHistory}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-2"
            >
              <FaSync className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FaHistory className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No regularization history found</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search filters'
                : 'Submit a new regularization request to see it here'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedHistory.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.status}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.punchInTime} - {item.punchOutTime}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={item.reason}>
                          {item.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(item.appliedOn).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getStatusBadgeClass(item.actionStatus)
                        }`}>
                          {item.actionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function RegularizationPage() {
  return (
    <DashboardLayout>
      <RegularizationContent />
    </DashboardLayout>
  );
}