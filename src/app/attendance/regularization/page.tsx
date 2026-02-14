'use client';

import { useState, useEffect } from 'react';
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaHistory, 
  FaEdit, 
  FaCheck, 
  FaClipboardCheck,
  FaSync,
  FaSearch,
  FaInfo,
  FaChevronLeft,
  FaChevronRight,
  FaArrowLeft
} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from "@/context/ThemeContext";

interface RegularizationRequest {
  date: string;
  punchInTime: string;
  punchOutTime: string;
  reason: string;
  status: string;
}

interface RegularizationHistoryItem {
  regularizationReason: string | undefined;
  regularizationDate: string; // changed from any to string
  date: string;
  status: string;
  punchInTime: string;
  punchOutTime: string;
  reason: string;
  appliedOn: string;
  actionStatus: string;
}

// Simplified feedback messages
const FeedbackMessage = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <div className={`flex items-center gap-2 p-3 rounded-lg border ${
    type === 'success' 
      ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700' 
      : 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700'
  }`}>
    {type === 'success' ? (
      <FaCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    ) : (
      <FaExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
    )}
    <p className={`text-sm ${
      type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
    }`}>
      {message}
    </p>
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
  const { theme } = useTheme();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchRegularizationHistory();
  }, [router]);

  // Fetch regularization history for the logged-in employee only
  const fetchRegularizationHistory = async () => {
    try {
      setRegularizationHistoryLoading(true);
      setRegularizationHistoryError(null);

      const employeeId = getEmployeeId();
      if (!employeeId) {
        setRegularizationHistoryError('No employee ID found. Please log in again.');
        setRegularizationHistory([]);
        return;
      }

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
      setRegularizationHistoryError('Failed to fetch regularization history');
      setRegularizationHistory([]);
    } finally {
      setRegularizationHistoryLoading(false);
    }
  };

  // Submit regularization request for the logged-in employee
  const handleRegularizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegularizationLoading(true);
    setRegularizationError(null);
    setRegularizationSuccess(null);

    try {
      const employeeId = getEmployeeId();
      if (!employeeId) {
        setRegularizationError('No employee ID found. Please log in again.');
        setRegularizationLoading(false);
        return;
      }
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

  const filteredHistory = regularizationHistory.filter(item => {
    const matchesSearch = searchQuery === '' ||
      (item.date && item.date.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.status && item.status.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (item.actionStatus && item.actionStatus.toLowerCase() === statusFilter.toLowerCase());

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

  function extractTime(dateStr: string): string {
    // Try to match HH:mm from the string
    const match = dateStr.match(/(\d{2}:\d{2})/);
    return match ? match[1] : '';
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8">
      {/* Header Section */}
      <div className={`p-6 mb-6 border rounded-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/attendance/view')}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Back to View Attendance"
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <FaClipboardCheck className="text-xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Attendance Regularization</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Request attendance corrections</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/attendance/view')}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              theme === 'dark' 
                ? 'bg-blue-700 hover:bg-blue-600 text-blue-200' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
            }`}
          >
            Close Regularization
          </button>
        </div>
      </div>

      {/* Instructions and Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instructions Section */}
        <div className={`p-4 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <FaInfo className={`w-4 h-4 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Instructions</h2>
          </div>
          
          <div className="space-y-4">
            {/* Step-by-step instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  1
                </div>
                <div>
                  <h3 className={`font-medium mb-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Select the Date</h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>Choose the specific date for which you need to correct your attendance record.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  2
                </div>
                <div>
                  <h3 className={`font-medium mb-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Enter Correct Times</h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>Provide your actual punch-in and punch-out times for that day.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  3
                </div>
                <div>
                  <h3 className={`font-medium mb-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Explain the Reason</h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>Provide a detailed explanation for why the attendance needs to be corrected.</p>
                </div>
              </div>
            </div>

            {/* Important guidelines */}
            <div className={`p-3 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-2">
                <FaExclamationCircle className={`w-4 h-4 mt-0.5 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <div>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>Important Guidelines</h4>
                  <ul className={`space-y-1 text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <li>• Submit your request within <strong>7 days</strong> of the attendance date</li>
                    <li>• Only <strong>one request per date</strong> is allowed</li>
                    <li>• Provide a <strong>detailed reason</strong> to help with quick approval</li>
                    <li>• Check your request status in the <strong>history section</strong> below</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className={`p-4 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          {/* Form Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaEdit className={`w-4 h-4 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h2 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>New Request</h2>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                New Request
              </button>
            )}
          </div>

          {/* Form Inputs */}
          {showForm ? (
            <form onSubmit={handleRegularizationSubmit} className="space-y-4">
              {/* Form input fields with dark theme */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={regularizationForm.date}
                    onChange={handleInputChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full rounded-lg px-3 py-2 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="status" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={regularizationForm.status}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-lg px-3 py-2 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">Select Status</option>
                    <option value="Present">Present</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Work From Home">Work From Home</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="punchInTime" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Punch In Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="punchInTime"
                    name="punchInTime"
                    value={regularizationForm.punchInTime}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-lg px-3 py-2 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="punchOutTime" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Punch Out Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="punchOutTime"
                    name="punchOutTime"
                    value={regularizationForm.punchOutTime}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-lg px-3 py-2 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className={`block text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Reason for Regularization <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={regularizationForm.reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className={`w-full rounded-lg px-3 py-2 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'bg-white border-gray-300 text-gray-900'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Please provide a detailed reason for attendance regularization..."
                />
              </div>

              {regularizationError && (
                <FeedbackMessage message={regularizationError} type="error" />
              )}

              {regularizationSuccess && (
                <FeedbackMessage message={regularizationSuccess} type="success" />
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`px-4 py-2 border rounded-lg transition-colors font-medium ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regularizationLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
            <div className={`text-center py-8 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
              }`}>
                <FaClipboardCheck className={`w-6 h-6 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>No Active Request</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Click the New Request button to start a regularization request.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className={`p-4 border rounded-lg overflow-hidden ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="pb-4 border-b border-gray-200 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <FaHistory className={`w-4 h-4 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Request History</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full sm:w-48 pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder:text-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button
                onClick={fetchRegularizationHistory}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
                title="Refresh"
              >
                <FaSync className="w-4 h-4" />
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
              <table className="w-full text-sm table-auto border-collapse border border-blue-400">
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      Date
                    </th>
                    <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      Time
                    </th>
                    <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      Reason
                    </th>
                    <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((item, index) => (
                    <tr key={index} className={`${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-gray-50"} transition-colors duration-200`}>
                      <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                        <span className="block whitespace-pre-wrap break-words leading-5" title={item.date ? new Date(item.date).toLocaleDateString() : ''}>
                          {item.date ? new Date(item.date).toLocaleDateString() : ''}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                        <span className="block whitespace-pre-wrap break-words leading-5" title={(item.punchInTime ? extractTime(item.punchInTime) : '') + ' - ' + (item.punchOutTime ? extractTime(item.punchOutTime) : '')}>
                          {(item.punchInTime ? extractTime(item.punchInTime) : '') + ' - ' + (item.punchOutTime ? extractTime(item.punchOutTime) : '')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                        <span className="block whitespace-pre-wrap break-words leading-5" title={item.regularizationReason || ''}>
                          {item.regularizationReason || ''}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center border border-blue-400`}>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          item.status?.toLowerCase() === 'approved' ? (theme === "dark" ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800') :
                          item.status?.toLowerCase() === 'rejected' ? (theme === "dark" ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800') :
                          item.status?.toLowerCase() === 'pending' ? (theme === "dark" ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800') :
                          (theme === "dark" ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800')
                        }`}>
                          {item.status}
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