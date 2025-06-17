"use client";

import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaCalendarCheck, FaClock, FaMapMarkerAlt, FaCheck, FaTimes, FaExclamationTriangle, FaCalendarAlt, FaUserTie, FaInfoCircle, FaFilter, FaSearch } from 'react-icons/fa';

interface DummyAttendanceRecord {
  employeeId: string;
  fullName: string;
  designation: string;
  date: string;
  punchIn: string;
  punchOut: string;
  punchInLocation: string;
  punchOutLocation: string;
  status: 'Present' | 'Absent' | 'Late';
}

interface RegularizationRequest {
  id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestType: 'Late Arrival' | 'Early Leave' | 'Absence';
  requestedTime?: string;
}

const dummyAttendanceData: DummyAttendanceRecord[] = [
  {
    employeeId: 'EMP001',
    fullName: 'Alice Johnson',
    designation: 'Software Engineer',
    date: '2023-10-26',
    punchIn: '09:00 AM',
    punchOut: '05:00 PM',
    punchInLocation: 'Office Main Gate',
    punchOutLocation: 'Office Main Gate',
    status: 'Present',
  },
  {
    employeeId: 'EMP002',
    fullName: 'Bob Williams',
    designation: 'Project Manager',
    date: '2023-10-26',
    punchIn: '09:15 AM',
    punchOut: '05:30 PM',
    punchInLocation: 'Remote - Home',
    punchOutLocation: 'Remote - Home',
    status: 'Late',
  },
  {
    employeeId: 'EMP003',
    fullName: 'Charlie Brown',
    designation: 'UX Designer',
    date: '2023-10-26',
    punchIn: '08:45 AM',
    punchOut: '04:45 PM',
    punchInLocation: 'Office - Design Studio',
    punchOutLocation: 'Office - Design Studio',
    status: 'Present',
  },
  {
    employeeId: 'EMP004',
    fullName: 'Diana Prince',
    designation: 'HR Specialist',
    date: '2023-10-26',
    punchIn: '',
    punchOut: '',
    punchInLocation: '',
    punchOutLocation: '',
    status: 'Absent',
  },
];

const dummyRegularizationRequests: RegularizationRequest[] = [
  {
    id: 'REQ001',
    employeeId: 'EMP001',
    fullName: 'Alice Johnson',
    designation: 'Software Engineer',
    date: '2023-10-26',
    reason: 'Traffic delay due to road construction',
    status: 'Pending',
    requestType: 'Late Arrival',
    requestedTime: '10:00 AM'
  },
  {
    id: 'REQ002',
    employeeId: 'EMP003',
    fullName: 'Charlie Brown',
    designation: 'UX Designer',
    date: '2023-10-26',
    reason: 'Medical appointment',
    status: 'Pending',
    requestType: 'Early Leave',
    requestedTime: '03:00 PM'
  }
];

const AttendanceScreen: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<DummyAttendanceRecord[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'regularization'>('attendance');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
      setAttendanceRecords(dummyAttendanceData);
      setRegularizationRequests(dummyRegularizationRequests);
      setLoading(false);
    }, 1000);
  }, []);

  const handleRegularizationAction = (requestId: string, action: 'approve' | 'reject') => {
    setRegularizationRequests(prev => 
      prev.map(request => 
        request.id === requestId 
          ? { ...request, status: action === 'approve' ? 'Approved' : 'Rejected' }
          : request
      )
    );
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'Late Arrival':
        return <FaClock className="text-yellow-500" />;
      case 'Early Leave':
        return <FaClock className="text-blue-500" />;
      case 'Absence':
        return <FaCalendarAlt className="text-red-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredRequests = regularizationRequests.filter(request => {
    const matchesSearch = request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return regularizationRequests.filter(request => request.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaClock className="animate-spin text-blue-500 text-4xl" />
        <p className="ml-3 text-lg text-gray-600">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'attendance'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Attendance Records
          </button>
          <button
            onClick={() => setActiveTab('regularization')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'regularization'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Regularization Requests
            {regularizationRequests.filter(r => r.status === 'Pending').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {regularizationRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'attendance' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attendanceRecords.map((record) => (
              <div key={record.employeeId} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4 border-b pb-4">
                  <FaUserCircle className="text-4xl text-blue-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{record.fullName}</h3>
                    <p className="text-sm text-gray-600">{record.designation}</p>
                  </div>
                  <span 
                    className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                      record.status === 'Present' ? 'bg-green-100 text-green-800' :
                      record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <FaCalendarCheck className="mr-2 text-blue-500" />
                    <span className="font-medium">Date:</span> {record.date}
                  </div>
                  {record.punchIn && (
                    <div className="flex items-center text-gray-700">
                      <FaClock className="mr-2 text-green-500" />
                      <span className="font-medium">Punch-In:</span> {record.punchIn}
                    </div>
                  )}
                  {record.punchInLocation && (
                    <div className="flex items-start text-gray-700">
                      <FaMapMarkerAlt className="mr-2 text-green-500 mt-1" />
                      <span className="font-medium">Location:</span> {record.punchInLocation}
                    </div>
                  )}
                  {record.punchOut && (
                    <div className="flex items-center text-gray-700">
                      <FaClock className="mr-2 text-red-500" />
                      <span className="font-medium">Punch-Out:</span> {record.punchOut}
                    </div>
                  )}
                  {record.punchOutLocation && (
                    <div className="flex items-start text-gray-700">
                      <FaMapMarkerAlt className="mr-2 text-red-500 mt-1" />
                      <span className="font-medium">Location:</span> {record.punchOutLocation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Regularization Requests</h3>
                <p className="text-sm text-gray-600 mt-1">Manage and review attendance regularization requests</p>
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

            <div className="mt-4 relative">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      statusFilter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    All ({regularizationRequests.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      statusFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Pending ({getStatusCount('Pending')})
                  </button>
                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      statusFilter === 'approved'
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Approved ({getStatusCount('Approved')})
                  </button>
                  <button
                    onClick={() => setStatusFilter('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      statusFilter === 'rejected'
                        ? 'bg-red-500 text-white'
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
                <p className="text-gray-600">No regularization requests found.</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="bg-white rounded-lg p-6 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-50 p-3 rounded-full">
                          <FaUserTie className="text-blue-500 text-xl" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 text-lg">{request.fullName}</h4>
                          <p className="text-sm text-gray-600">{request.designation}</p>
                          <p className="text-xs text-gray-500 mt-1">ID: {request.employeeId}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        <span className="text-xs text-gray-500 mt-2">{request.date}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          {getRequestTypeIcon(request.requestType)}
                          <span className="ml-2 font-medium text-gray-700">{request.requestType}</span>
                        </div>
                        {request.requestedTime && (
                          <div className="flex items-center text-sm text-gray-600">
                            <FaClock className="mr-2 text-gray-400" />
                            <span>Requested Time: {request.requestedTime}</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start">
                          <FaExclamationTriangle className="text-yellow-500 mt-1 mr-2" />
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Reason</p>
                            <p className="text-sm text-gray-600">{request.reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {request.status === 'Pending' && (
                      <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleRegularizationAction(request.id, 'reject')}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
                        >
                          <FaTimes className="mr-2" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleRegularizationAction(request.id, 'approve')}
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
      )}
    </div>
  );
};

export default AttendanceScreen;