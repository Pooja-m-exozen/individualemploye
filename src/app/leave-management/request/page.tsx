'use client';

import { useState, useEffect } from 'react';
import { 

  FaCheckCircle, 
  FaExclamationCircle, 
  FaCalendarAlt, 
  FaFileAlt,
  FaCheck,
  FaPlus,
  FaInfoCircle,
  FaUpload,
  FaTrash,
  FaClock
} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

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
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance | null>(null);
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FaPlus className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Request Leave</h1>
              <p className="text-blue-100 mt-1">Submit and track your leave applications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {leaveBalances && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(leaveBalances).map(([type, balance]) => (
            <div key={type} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {type === 'EL' ? 'Earned Leave' :
                     type === 'SL' ? 'Sick Leave' :
                     type === 'CL' ? 'Casual Leave' :
                     'Comp Off'}
                  </p>
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

      {/* Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="pl-10 w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                      className="pl-10 w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>

                {daysCount > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
                    <FaInfoCircle className="text-blue-600" />
                    <p className="text-sm text-blue-700">
                      Duration: <span className="font-semibold">{daysCount} day{daysCount > 1 ? 's' : ''}</span>
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
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Enter emergency contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments (Optional)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                    <div className="space-y-1 text-center">
                      <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="attachments" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload files</span>
                          <input
                            id="attachments"
                            name="attachments"
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB each</p>
                    </div>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FaFileAlt className="text-gray-400" />
                          <span className="text-sm text-gray-600">{file.name}</span>
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

                <div className="flex justify-end">
                <button
  type="submit"
  disabled={loading}
  className="bg-blue-500 text-white font-bold px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50"
>
  <FaCheck className="w-3 h-3" />
  Submit Request
</button>



                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FaInfoCircle className="text-blue-600" />
              Leave Request Guidelines
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Advance Notice</h4>
                  <p className="text-sm text-gray-600">Submit requests at least 3 days in advance for planned leaves.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FaClock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Processing Time</h4>
                  <p className="text-sm text-gray-600">Requests are typically processed within 24-48 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FaFileAlt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Documentation</h4>
                  <p className="text-sm text-gray-600">Attach relevant documents for sick leave or emergency leave requests.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
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