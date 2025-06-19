"use client";

import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUserCircle, FaCheck, FaTimes, FaClock, FaInfoCircle, FaFilter, FaSearch, FaCalendarDay, FaCalendarWeek, FaCalendarCheck, FaUserClock, FaEllipsisV } from 'react-icons/fa';
import { useTheme } from "@/context/ThemeContext";

interface KYCDetails {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
}

interface LeaveRequest {
  leaveId?: string;
  employeeId: string;
  employeeImage?: string;
  fullName: string;
  designation: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  appliedOn?: string;
  numberOfDays: number;
}

const LeaveRequestsScreen: React.FC = () => {
  const { theme } = useTheme ? useTheme() : { theme: 'light' };
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchEmployeesAndLeaves = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();
        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter((form: any) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: any) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation || "N/A",
            }));

          // Fetch leave history for all employees in parallel
          const allLeaves = await Promise.all(
            filteredEmployees.map(async (emp: KYCDetails) => {
              try {
                const res = await fetch(`https://cafm.zenapi.co.in/api/leave/history/${emp.employeeId}`);
                const historyData = await res.json();
                if (Array.isArray(historyData.leaveHistory)) {
                  return historyData.leaveHistory.map((leave: any) => ({
                    ...leave,
                    employeeId: emp.employeeId,
                    employeeImage: emp.employeeImage,
                    fullName: emp.fullName,
                    designation: emp.designation,
                  }));
                }
                return [];
              } catch {
                return [];
              }
            })
          );
          setLeaveRequests(allLeaves.flat());
        }
      } catch (error) {
        setLeaveRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeesAndLeaves();
  }, []);

  const handleLeaveAction = (requestId: string, action: 'approve' | 'reject') => {
    setLeaveRequests(prev =>
      prev.map(request =>
        request.leaveId === requestId
          ? { ...request, status: action === 'approve' ? 'Approved' : 'Rejected' }
          : request
      )
    );
  };

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch =
      request.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || request.status?.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return leaveRequests.filter(request => request.status === status).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return theme === 'light' ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-900 text-yellow-100';
      case 'Approved':
        return theme === 'light' ? 'bg-green-100 text-green-800' : 'bg-green-900 text-green-100';
      case 'Rejected':
        return theme === 'light' ? 'bg-red-100 text-red-800' : 'bg-red-900 text-red-100';
      default:
        return theme === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-gray-700 text-gray-100';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'Sick Leave':
      case 'SL':
        return theme === 'light' ? 'bg-red-50 text-red-600' : 'bg-red-900 text-red-100';
      case 'Casual Leave':
      case 'CL':
        return theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-900 text-blue-100';
      case 'Annual Leave':
      case 'EL':
        return theme === 'light' ? 'bg-green-50 text-green-600' : 'bg-green-900 text-green-100';
      case 'Emergency Leave':
        return theme === 'light' ? 'bg-orange-50 text-orange-600' : 'bg-orange-900 text-orange-100';
      default:
        return theme === 'light' ? 'bg-gray-50 text-gray-600' : 'bg-gray-700 text-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <FaClock className="text-yellow-500" />;
      case 'Approved':
        return <FaCheck className="text-green-500" />;
      case 'Rejected':
        return <FaTimes className="text-red-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'Sick Leave':
        return <FaCalendarDay className="text-red-500" />;
      case 'Casual Leave':
        return <FaCalendarWeek className="text-blue-500" />;
      case 'Annual Leave':
        return <FaCalendarCheck className="text-green-500" />;
      case 'Emergency Leave':
        return <FaUserClock className="text-orange-500" />;
      default:
        return <FaCalendarAlt className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaClock className="animate-spin text-blue-500 text-4xl" />
        <p className="ml-3 text-lg text-gray-600">Loading leave requests...</p>
      </div>
    );
  }

  return (
    <div className={`p-0 md:p-0 border-b-0 ${theme === 'light' ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'} min-h-screen`}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div>
          <h3 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Leave Requests</h3>
          <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>Manage and review employee leave requests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
          >
            <FaFilter className="mr-2" />
            Filters
          </button>
        </div>
      </div>

      <div className={`mt-6 relative ${theme === 'light' ? '' : ''}`}>
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${theme === 'light' ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'}`}
            style={{ minHeight: '40px', fontSize: '15px' }}
          />
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-transparent rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFilter === 'all'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({leaveRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFilter === 'pending'
                  ? 'bg-yellow-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending ({getStatusCount('Pending')})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFilter === 'approved'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Approved ({getStatusCount('Approved')})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFilter === 'rejected'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Rejected ({getStatusCount('Rejected')})
            </button>
          </div>
        </div>
      )}

      <div className="p-0 md:p-0">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FaCalendarAlt className="mx-auto text-4xl text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-300">No leave requests found.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRequests.map((request) => (
              <div 
                key={request.leaveId || request.employeeId + request.startDate + request.leaveType} 
                className="rounded-lg p-6 hover:shadow-lg transition-all duration-200 border border-gray-100 dark:border-gray-700 bg-transparent"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-4">
                    <div className={`p-0.5 rounded-full border-2 ${theme === 'light' ? 'border-blue-200 bg-white' : 'border-blue-900 bg-gray-900'} shadow-sm flex items-center justify-center`} style={{ width: 48, height: 48 }}>
                      {request.employeeImage ? (
                        <img src={request.employeeImage} alt={request.fullName} className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <FaUserCircle className="text-blue-500 text-3xl" />
                      )}
                    </div>
                    <div>
                      <h4 className={`font-semibold text-lg ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>{request.fullName}</h4>
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>{request.designation}</p>
                      <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>ID: {request.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>{request.status}</span>
                    </div>
                    {request.appliedOn && (
                      <span className={`text-xs mt-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Applied on: {request.appliedOn}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className={`p-4 rounded-lg border transition-all duration-200 ${theme === 'light' ? 'border-gray-100 bg-white' : 'border-gray-700 bg-gray-800'}`}>
                    <div className="flex items-center mb-3">
                      <p className={`ml-2 font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>Leave Details</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>Type:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(request.leaveType)}`}>{request.leaveType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>Duration:</span>
                        <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>{request.numberOfDays} day{request.numberOfDays > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>From:</span>
                        <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>{request.startDate.split('T')[0]}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>To:</span>
                        <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>{request.endDate.split('T')[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg border transition-all duration-200 ${theme === 'light' ? 'border-gray-100 bg-white' : 'border-gray-700 bg-gray-800'}`}>
                    <div className="flex items-start">
                      <FaInfoCircle className="text-yellow-500 mt-1 mr-2" />
                      <div>
                        <p className={`font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>Reason</p>
                        <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>{request.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {request.status !== 'Approved' && (
                  <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleLeaveAction(request.leaveId || '', 'reject')}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
                    >
                      <FaTimes className="mr-2" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleLeaveAction(request.leaveId || '', 'approve')}
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center"
                    >
                      <FaCheck className="mr-2" />
                      Approve
                    </button>
                  </div>
                )}

                {(request.status === 'Approved' || request.status === 'Rejected') && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className={`flex items-center text-sm ${request.status === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>
                      {request.status === 'Approved' ? (
                        <FaCheck className="mr-2" />
                      ) : (
                        <FaTimes className="mr-2" />
                      )}
                      <span>Request {request.status.toLowerCase()}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestsScreen; 