'use client';

import { useState, useEffect } from 'react';
import { 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaCalendarAlt, 
  FaFileAlt,
  FaInfoCircle,
  FaUpload,
  FaTrash,
  FaClock,
  FaArrowLeft
} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from "@/context/ThemeContext";

interface LeaveRequest {
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  isHalfDay: boolean;
  halfDayType: string | null;
  emergencyContact: string;
  attachments?: File[];
}

interface LeaveBalance {
  EL: number;
  CL: number;
  SL: number;
  CompOff: number;
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

function RequestLeaveContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, setLeaveBalances] = useState<LeaveBalance | null>(null);
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest>({
    startDate: '',
    endDate: '',
    leaveType: 'EL',
    reason: '',
    isHalfDay: false,
    halfDayType: null,
    emergencyContact: '',
    attachments: []
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [daysCount, setDaysCount] = useState<number>(0);
  const { theme } = useTheme();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchLeaveBalances();
  }, [router]);

  useEffect(() => {
    if (leaveRequest.startDate && leaveRequest.endDate) {
      const start = new Date(leaveRequest.startDate);
      const end = new Date(leaveRequest.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDaysCount(diffDays);
    } else {
      setDaysCount(0);
    }
  }, [leaveRequest.startDate, leaveRequest.endDate]);

  const fetchLeaveBalances = async () => {
    try {
      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }

      const response = await fetch(`https://cafm.zenapi.co.in/api/leave/history/${employeeId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch leave balances');
      }

      setLeaveBalances(data.leaveBalances);
    } catch (error: unknown) {
      console.error('Error fetching leave balances:', error instanceof Error ? error.message : error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare the request body as per API
      const requestBody = {
        employeeId: getEmployeeId(),
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        reason: leaveRequest.reason,
        isHalfDay: leaveRequest.isHalfDay,
        halfDayType: leaveRequest.halfDayType,
        emergencyContact: leaveRequest.emergencyContact,
        attachments: [] // handle attachments if needed
      };
      const response = await fetch('https://cafm.zenapi.co.in/api/leave/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.message && data.leave) {
        setSuccess('Leave request submitted successfully!');
        setLeaveRequest({
          startDate: '',
          endDate: '',
          leaveType: 'EL',
          reason: '',
          isHalfDay: false,
          halfDayType: null,
          emergencyContact: '',
          attachments: []
        });
        setSelectedFiles([]);
      } else {
        throw new Error(data.message || 'Failed to submit leave request');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit leave request';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLeaveRequest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      setLeaveRequest(prev => ({
        ...prev,
        attachments: files
      }));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className={`flex items-center justify-between mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/leave-management/history')}
            className={`p-2 rounded-lg border transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Request Leave</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Submit and track your leave applications</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/leave-management/history')}
          className={`px-4 py-2 rounded-lg font-semibold border text-sm transition-colors ${
            theme === 'dark' 
              ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50' 
              : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
          }`}
        >
          Close Leave Request
        </button>
      </div>


      {/* Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className={`rounded-lg p-4 border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Start Date
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={leaveRequest.startDate}
                      onChange={handleInputChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className={`pl-10 w-full rounded-lg px-4 py-2.5 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-200 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={leaveRequest.endDate}
                      onChange={handleInputChange}
                      required
                      min={leaveRequest.startDate || new Date().toISOString().split('T')[0]}
                      className={`pl-10 w-full rounded-lg px-4 py-2.5 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-200 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                {daysCount > 0 && (
                  <div className={`rounded-lg p-3 flex items-center gap-2 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    <FaInfoCircle className={
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    } />
                    <p className="text-sm">
                      Duration: <span className="font-medium">{daysCount} day{daysCount > 1 ? 's' : ''}</span>
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <select
                    id="leaveType"
                    name="leaveType"
                    value={leaveRequest.leaveType}
                    onChange={handleInputChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="EL">Earned Leave</option>
                    <option value="SL">Sick Leave</option>
                    <option value="CL">Casual Leave</option>
                    <option value="CompOff">Comp Off</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Leave
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={leaveRequest.reason}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-200 text-black'
                    }`}
                    placeholder="Please provide a detailed reason for your leave request..."
                  />
                </div>

                <div>
                  <label htmlFor="isHalfDay" className="block text-sm font-medium text-gray-700 mb-2">Is Half Day?</label>
                  <select
                    id="isHalfDay"
                    name="isHalfDay"
                    value={leaveRequest.isHalfDay ? 'true' : 'false'}
                    onChange={e => setLeaveRequest(prev => ({ ...prev, isHalfDay: e.target.value === 'true' }))}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>

                {leaveRequest.isHalfDay && (
                  <div>
                    <label htmlFor="halfDayType" className="block text-sm font-medium text-gray-700 mb-2">Half Day Type</label>
                    <select
                      id="halfDayType"
                      name="halfDayType"
                      value={leaveRequest.halfDayType || ''}
                      onChange={e => setLeaveRequest(prev => ({ ...prev, halfDayType: e.target.value }))}
                      className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="">Select Type</option>
                      <option value="First Half">First Half</option>
                      <option value="Second Half">Second Half</option>
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={leaveRequest.emergencyContact}
                    onChange={handleInputChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    placeholder="Enter emergency contact number"
                  />
                </div>

                {/* File upload section */}
                <div className={`flex justify-center px-4 py-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <div className="space-y-2 text-center">
                    <FaUpload className={`mx-auto h-8 w-8 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <label htmlFor="attachments" className={`cursor-pointer font-medium ${
                        theme === 'dark' ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                      }`}>
                        Upload files
                        <input
                          id="attachments"
                          name="attachments"
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>PDF, PNG, JPG up to 10MB each</p>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <FaFileAlt className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {error && <FeedbackMessage message={error} type="error" />}
                {success && <FeedbackMessage message={success} type="success" />}

                <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-3 py-0.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                        theme === 'dark'
                          ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {loading ? (
                        <span>Submitting...</span>
                      ) : (
                        <span>Submit Request</span>
                      )}
                    </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-1">
          <div className={`rounded-lg p-4 border space-y-4 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              <FaInfoCircle className="text-blue-600" />
              Leave Request Guidelines
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                }`}>
                  <FaCalendarAlt className={
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  } />
                </div>
                <div>
                  <h4 className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>Advance Notice</h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Submit requests at least 3 days in advance for planned leaves.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                }`}>
                  <FaClock className={
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  } />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Processing Time</h4>
                  <p className="text-sm text-gray-600">Requests are typically processed within 24-48 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                }`}>
                  <FaFileAlt className={
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  } />
                </div>
                <div>
                  <h4 className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>Documentation</h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Attach relevant documents for sick leave or emergency leave requests.</p>
                </div>
              </div>
            </div>

            <div className={`border-t pt-4 ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                For any queries regarding leave policies or requests, please contact HR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestLeavePage() {
  return (
    <DashboardLayout>
      <RequestLeaveContent />
    </DashboardLayout>
  );
}