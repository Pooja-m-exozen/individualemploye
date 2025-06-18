"use client";

import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaCalendarCheck, FaClock, FaMapMarkerAlt, FaCheck, FaTimes, FaExclamationTriangle, FaCalendarAlt, FaUserTie, FaInfoCircle, FaFilter, FaSearch } from 'react-icons/fa';

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
  projectName: string;
}

interface AttendanceRecord {
  employeeId: string;
  projectName: string;
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  status: string;
}

interface RegularizationRequest {
  requestId: string;
  employeeId: string;
  fullName: string;
  projectName: string;
  date: string;
  reason: string;
  status: string;
}

const AttendanceScreen: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'regularization'>('attendance');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch employee attendance data
  const fetchEmployeeAttendance = async (employeeId: string): Promise<AttendanceRecord | null> => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const response = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-summary?month=${month}&year=${year}`
      );
      const data = await response.json();

      if (data.success && data.data.summary) {
        const summary = data.data.summary;
        return {
          employeeId,
          projectName: "Exozen - Ops",
          date: currentDate,
          punchInTime: summary.firstPunchIn || null,
          punchOutTime: summary.lastPunchOut || null,
          status: summary.presentDays > 0 ? "Present" : "Absent"
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching attendance for employee ${employeeId}:`, error);
      return null;
    }
  };

  // Fetch employees and their attendance
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          const exozenEmployees = data.kycForms
            .filter((form: any) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: any) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              projectName: form.personalDetails.projectName,
            }));

          setEmployees(exozenEmployees);

          const attendancePromises = exozenEmployees.map((emp: { employeeId: string; }) => fetchEmployeeAttendance(emp.employeeId));
          const attendanceResults = await Promise.all(attendancePromises);
          const validAttendance = attendanceResults.filter((record): record is AttendanceRecord => record !== null);
          setAttendanceRecords(validAttendance);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch regularization requests
  useEffect(() => {
    const fetchRegularizationRequests = async () => {
      try {
        const promises = employees.map(async (employee) => {
          const response = await fetch(
            `https://cafm.zenapi.co.in/api/attendance/${employee.employeeId}/monthly-stats?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`
          );
          const data = await response.json();
          
          if (data.success && data.data.punctualityIssues?.lateArrivals > 0) {
            return {
              requestId: `REQ-${employee.employeeId}-${Date.now()}`,
              employeeId: employee.employeeId,
              fullName: employee.fullName,
              projectName: employee.projectName,
              date: new Date().toISOString().split('T')[0],
              reason: "Late Arrival",
              status: "Pending"
            };
          }
          return null;
        });

        const results = await Promise.all(promises);
        setRegularizationRequests(results.filter(req => req !== null));
      } catch (error) {
        console.error("Error fetching regularization requests:", error);
      }
    };

    if (employees.length > 0) {
      fetchRegularizationRequests();
    }
  }, [employees]);

  const handleRegularizationAction = (requestId: string, action: 'approve' | 'reject') => {
    setRegularizationRequests(prev => 
      prev.map(request => 
        request.requestId === requestId 
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

  const renderAttendanceCard = (record: AttendanceRecord) => {
    const employee = employees.find(emp => emp.employeeId === record.employeeId);
    if (!employee) return null;

    return (
      <div key={record.employeeId} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center mb-4 border-b pb-4">
          {employee.employeeImage ? (
            <img src={employee.employeeImage} alt={employee.fullName} className="w-12 h-12 rounded-full mr-3" />
          ) : (
            <FaUserCircle className="text-4xl text-blue-500 mr-3" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{employee.fullName}</h3>
            <p className="text-sm text-gray-600">{employee.designation}</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
            record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {record.status}
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center text-gray-700">
            <FaCalendarCheck className="mr-2 text-blue-500" />
            <span className="font-medium">Date:</span> {record.date}
          </div>
          {record.punchInTime && (
            <div className="flex items-center text-gray-700">
              <FaClock className="mr-2 text-green-500" />
              <span className="font-medium">Punch-In:</span> {record.punchInTime}
            </div>
          )}
          {record.punchOutTime && (
            <div className="flex items-center text-gray-700">
              <FaClock className="mr-2 text-red-500" />
              <span className="font-medium">Punch-Out:</span> {record.punchOutTime}
            </div>
          )}
        </div>
      </div>
    );
  };

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
            {attendanceRecords.map(record => renderAttendanceCard(record))}
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
                    key={request.requestId} 
                    className="bg-white rounded-lg p-6 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-50 p-3 rounded-full">
                          <FaUserTie className="text-blue-500 text-xl" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 text-lg">{request.fullName}</h4>
                          <p className="text-sm text-gray-600">{request.projectName}</p>
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
                          {getRequestTypeIcon(request.reason)}
                          <span className="ml-2 font-medium text-gray-700">{request.reason}</span>
                        </div>
                        {request.status === 'Pending' && (
                          <div className="flex items-center text-sm text-gray-600">
                            <FaClock className="mr-2 text-gray-400" />
                            <span>Requested Time: {request.date}</span>
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
                          onClick={() => handleRegularizationAction(request.requestId, 'reject')}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
                        >
                          <FaTimes className="mr-2" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleRegularizationAction(request.requestId, 'approve')}
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