"use client";

import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUserCircle, FaCheck, FaTimes, FaClock, FaInfoCircle, FaFilter, FaSearch, FaCalendarDay, FaCalendarWeek, FaCalendarCheck, FaUserClock, FaEllipsisV } from 'react-icons/fa';

interface LeaveRequest {
  id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  leaveType: 'Sick Leave' | 'Casual Leave' | 'Annual Leave' | 'Emergency Leave';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
  totalDays: number;
}

const dummyLeaveRequests: LeaveRequest[] = [
  {
    id: 'LR001',
    employeeId: 'EMP001',
    fullName: 'Alice Johnson',
    designation: 'Software Engineer',
    leaveType: 'Sick Leave',
    startDate: '2024-03-20',
    endDate: '2024-03-22',
    reason: 'Fever and cold symptoms',
    status: 'Pending',
    appliedOn: '2024-03-19',
    totalDays: 3
  },
  {
    id: 'LR002',
    employeeId: 'EMP002',
    fullName: 'Bob Williams',
    designation: 'Project Manager',
    leaveType: 'Annual Leave',
    startDate: '2024-03-25',
    endDate: '2024-03-29',
    reason: 'Family vacation',
    status: 'Approved',
    appliedOn: '2024-03-15',
    totalDays: 5
  },
  {
    id: 'LR003',
    employeeId: 'EMP003',
    fullName: 'Charlie Brown',
    designation: 'UX Designer',
    leaveType: 'Casual Leave',
    startDate: '2024-03-21',
    endDate: '2024-03-21',
    reason: 'Personal work',
    status: 'Pending',
    appliedOn: '2024-03-20',
    totalDays: 1
  },
  {
    id: 'LR004',
    employeeId: 'EMP004',
    fullName: 'Diana Prince',
    designation: 'HR Specialist',
    leaveType: 'Emergency Leave',
    startDate: '2024-03-20',
    endDate: '2024-03-20',
    reason: 'Medical emergency',
    status: 'Approved',
    appliedOn: '2024-03-20',
    totalDays: 1
  }
];

const LeaveRequestsScreen: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLeaveRequests(dummyLeaveRequests);
      setLoading(false);
    }, 1000);
  }, []);

  const handleLeaveAction = (requestId: string, action: 'approve' | 'reject') => {
    setLeaveRequests(prev =>
      prev.map(request =>
        request.id === requestId
          ? { ...request, status: action === 'approve' ? 'Approved' : 'Rejected' }
          : request
      )
    );
  };

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return leaveRequests.filter(request => request.status === status).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'Sick Leave':
        return 'bg-red-50 text-red-600';
      case 'Casual Leave':
        return 'bg-blue-50 text-blue-600';
      case 'Annual Leave':
        return 'bg-green-50 text-green-600';
      case 'Emergency Leave':
        return 'bg-orange-50 text-orange-600';
      default:
        return 'bg-gray-50 text-gray-600';
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
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Leave Requests</h3>
            <p className="text-sm text-gray-600 mt-1">Manage and review employee leave requests</p>
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


        <div className="mt-6 relative">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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
      </div>

      <div className="p-6">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FaCalendarAlt className="mx-auto text-4xl text-gray-400 mb-3" />
            <p className="text-gray-600">No leave requests found.</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRequests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-200 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <FaUserCircle className="text-blue-500 text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-lg">{request.fullName}</h4>
                      <p className="text-sm text-gray-600">{request.designation}</p>
                      <p className="text-xs text-gray-500 mt-1">ID: {request.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">Applied on: {request.appliedOn}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-3">
                      {getLeaveTypeIcon(request.leaveType)}
                      <span className="ml-2 font-medium text-gray-700">Leave Details</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Type:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(request.leaveType)}`}>
                          {request.leaveType}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Duration:</span>
                        <span className="text-sm font-medium text-gray-800">{request.totalDays} day{request.totalDays > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">From:</span>
                        <span className="text-sm font-medium text-gray-800">{request.startDate}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">To:</span>
                        <span className="text-sm font-medium text-gray-800">{request.endDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-yellow-500 mt-1 mr-2" />
                      <div>
                        <p className="font-medium text-gray-700 mb-2">Reason</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{request.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {request.status === 'Pending' && (
                  <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleLeaveAction(request.id, 'reject')}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
                    >
                      <FaTimes className="mr-2" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleLeaveAction(request.id, 'approve')}
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center"
                    >
                      <FaCheck className="mr-2" />
                      Approve
                    </button>
                  </div>
                )}

                {request.status !== 'Pending' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
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