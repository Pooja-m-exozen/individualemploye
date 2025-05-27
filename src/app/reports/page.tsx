'use client'
import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaCalendarAlt, FaSearch, FaDownload, FaEye, FaFilter, FaArrowLeft, FaFileExcel, FaCalendar } from 'react-icons/fa';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';

interface LeaveBalance {
  EL: number;
  CL: number;
  SL: number;
  CompOff: number;
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
  attachments: any[];
  appliedOn: string;
  lastUpdated: string;
  cancellationReason?: string;
}

interface LeaveReport {
  employeeId: string;
  employeeName: string;
  totalLeaves: number;
  leaveBalances: LeaveBalance;
  leaveHistory: LeaveHistory[];
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  projectName?: string;
  designation?: string;
  date: string;
  punchInTime?: string;
  punchInPhoto?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  punchOutTime?: string;
  punchOutPhoto?: string;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  status: string;
}

interface AttendanceReport {
  message: string;
  attendance: AttendanceRecord[];
}

const ReportsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [leaveData, setLeaveData] = useState<LeaveReport | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<'attendance' | 'leave' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveHistory | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const reportType = searchParams?.get('type');
    if (reportType === 'attendance' || reportType === 'leave') {
      setActiveReport(reportType);
      if (reportType === 'attendance') {
        fetchReportData('attendance', selectedMonth, selectedYear);
      } else {
        fetchReportData('leave');
      }
    } else {
      setActiveReport(null);
    }
  }, [searchParams]);

  const fetchReportData = async (type: 'attendance' | 'leave', month?: number, year?: number) => {
    setLoading(true);
    try {
      if (type === 'leave') {
        const response = await fetch('https://cafm.zenapi.co.in/api/leave/history/EFMS3295');
        const data = await response.json();
        setLeaveData(data);
      } else {
        const monthToFetch = month || selectedMonth;
        const yearToFetch = year || selectedYear;
        const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=EFMS3295&month=${monthToFetch}&year=${yearToFetch}`);
        const data = await response.json();
        if (data.message === 'No attendance records found for the specified employee and month.') {
          setAttendanceData({ message: data.message, attendance: [] });
        } else if (data.message && data.attendance) {
          setAttendanceData(data);
        } else {
          console.error('Invalid attendance data format', data);
          setAttendanceData(null);
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = (type: 'attendance' | 'leave') => {
    router.push(`/reports?type=${type}`);
  };

  const handleBack = () => {
    router.push('/reports');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const handleDownloadExcel = (type: 'attendance' | 'leave') => {
    if (type === 'attendance' && attendanceData) {
      const data = attendanceData.attendance.map(record => ({
        Date: formatDate(record.date),
        Status: record.status,
        Project: record.projectName || '-',
        Designation: record.designation || '-',
        'Punch In': record.punchInTime ? formatTime(record.punchInTime) : '-',
        'Punch Out': record.punchOutTime ? formatTime(record.punchOutTime) : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
      XLSX.writeFile(wb, `Attendance_Report_${selectedMonth}_${selectedYear}.xlsx`);
    } else if (type === 'leave' && leaveData) {
      const leaveHistory = leaveData.leaveHistory.map(leave => ({
        'Leave Type': leave.leaveType,
        'Start Date': formatDate(leave.startDate),
        'End Date': formatDate(leave.endDate),
        'Number of Days': leave.numberOfDays,
        Status: leave.status,
        Reason: leave.reason,
        'Applied On': formatDate(leave.appliedOn)
      }));

      const leaveBalances = Object.entries(leaveData.leaveBalances).map(([type, balance]) => ({
        'Leave Type': type,
        Balance: balance
      }));

      const ws1 = XLSX.utils.json_to_sheet(leaveHistory);
      const ws2 = XLSX.utils.json_to_sheet(leaveBalances);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Leave History');
      XLSX.utils.book_append_sheet(wb, ws2, 'Leave Balances');
      XLSX.writeFile(wb, `Leave_Report_${leaveData.employeeName}.xlsx`);
    }
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    fetchReportData('attendance', month, selectedYear);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    fetchReportData('attendance', selectedMonth, year);
  };

  const handleViewRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const handleViewLeave = (leave: LeaveHistory) => {
    setSelectedLeave(leave);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
    setSelectedLeave(null);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const reportTypes = [
    {
      title: 'Attendance Reports',
      description: 'View attendance statistics and patterns',
      icon: <FaCalendarAlt className="text-3xl text-blue-600" />,
      type: 'attendance' as const,
      stats: '24 reports'
    },
    {
      title: 'Leave Reports',
      description: 'Analyze leave patterns and balances',
      icon: <FaFileAlt className="text-3xl text-green-600" />,
      type: 'leave' as const,
      stats: '18 reports'
    }
  ];

  const Modal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {selectedRecord ? 'Attendance Details' : 'Leave Details'}
              </h3>
              {selectedRecord && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedRecord.date)}
                </p>
              )}
            </div>
            <button
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Status Card */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedRecord.status}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedRecord.status === 'Present' 
                      ? 'bg-green-100 text-green-800'
                      : selectedRecord.status === 'Absent'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedRecord.status}
                  </span>
                </div>
              </div>

              {/* Punch Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Punch In */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FaCalendarAlt className="text-blue-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Punch In</h4>
                  </div>
                  {selectedRecord.punchInTime ? (
                    <>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        {formatTime(selectedRecord.punchInTime)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(selectedRecord.punchInTime)}
                      </p>
                      {selectedRecord.punchInPhoto && (
                        <div className="mt-3">
                          <img
                            src={selectedRecord.punchInPhoto}
                            alt="Punch In"
                            className="w-full h-48 object-cover rounded-lg shadow-sm"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No punch in record</p>
                  )}
                </div>

                {/* Punch Out */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <FaCalendarAlt className="text-green-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Punch Out</h4>
                  </div>
                  {selectedRecord.punchOutTime ? (
                    <>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        {formatTime(selectedRecord.punchOutTime)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(selectedRecord.punchOutTime)}
                      </p>
                      {selectedRecord.punchOutPhoto && (
                        <div className="mt-3">
                          <img
                            src={selectedRecord.punchOutPhoto}
                            alt="Punch Out"
                            className="w-full h-48 object-cover rounded-lg shadow-sm"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No punch out record</p>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {(selectedRecord.projectName || selectedRecord.designation) && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Additional Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedRecord.projectName && (
                      <div>
                        <p className="text-sm text-gray-600">Project</p>
                        <p className="text-gray-900 font-medium">{selectedRecord.projectName}</p>
                      </div>
                    )}
                    {selectedRecord.designation && (
                      <div>
                        <p className="text-sm text-gray-600">Designation</p>
                        <p className="text-gray-900 font-medium">{selectedRecord.designation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (activeReport) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header Section with Download Button */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  {activeReport === 'attendance' ? 'Attendance Report' : 'Leave Report'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {activeReport === 'attendance' 
                    ? 'View detailed attendance records and statistics'
                    : 'View leave history and balances'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownloadExcel(activeReport)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
              disabled={loading}
            >
              <FaFileExcel className="text-lg" />
              Download Excel
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading report data...</p>
            </div>
          ) : activeReport === 'attendance' && attendanceData ? (
            <div className="space-y-6">
              {/* Month/Year Selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FaCalendar className="text-gray-400" />
                      <select
                        value={selectedMonth}
                        onChange={(e) => handleMonthChange(Number(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm"
                      >
                        {months.map((month, index) => (
                          <option key={month} value={index + 1} className="text-gray-900">
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm"
                    >
                      {years.map((year) => (
                        <option key={year} value={year} className="text-gray-900">
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                      Total Records: {attendanceData.attendance.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Table or No Records Message */}
              {attendanceData && attendanceData.attendance.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Designation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Punch In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Punch Out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendanceData.attendance.map((record) => (
                          <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatDate(record.date)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                record.status === 'Present' 
                                  ? 'bg-green-100 text-green-800'
                                  : record.status === 'Absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{record.projectName || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{record.designation || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{record.punchInTime ? formatTime(record.punchInTime) : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{record.punchOutTime ? formatTime(record.punchOutTime) : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button 
                                onClick={() => handleViewRecord(record)}
                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1 transition-colors"
                              >
                                <FaEye className="text-sm" /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (attendanceData && attendanceData.message === 'No attendance records found for the specified employee and month.') ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
                  <div className="flex flex-col items-center gap-4">
                    <FaCalendarAlt className="text-4xl text-gray-400" />
                    <p className="text-gray-600 text-lg">{attendanceData.message}</p>
                  </div>
                </div>
              ) : attendanceData === null ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
                  <div className="flex flex-col items-center gap-4">
                    <FaFileAlt className="text-4xl text-red-400" />
                    <p className="text-red-600 text-lg">Error fetching attendance data.</p>
                    <button 
                      onClick={() => fetchReportData('attendance', selectedMonth, selectedYear)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : activeReport === 'leave' && leaveData ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Leave Report</h2>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Employee: {leaveData.employeeName}
                    </div>
                    <div className="h-6 w-px bg-gray-300"></div>
                    <div className="text-sm text-gray-600">
                      Total Leaves: {leaveData.totalLeaves}
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave Balances */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Leave Balances</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(leaveData.leaveBalances).map(([type, balance]) => (
                    <div key={type} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
                      <div className="text-sm text-gray-600">{type}</div>
                      <div className="text-2xl font-bold text-gray-800">{balance}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave History */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied On
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveData.leaveHistory.map((leave) => (
                      <tr key={leave.leaveId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{leave.leaveType}</div>
                          <div className="text-xs text-gray-500">{leave.reason}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {leave.numberOfDays} {leave.isHalfDay ? 'Half Day' : 'Days'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            leave.status === 'Approved' 
                              ? 'bg-green-100 text-green-800'
                              : leave.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(leave.appliedOn)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            onClick={() => handleViewLeave(leave)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <FaEye className="text-sm" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
        <Modal />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
            <p className="text-gray-600 mt-1">Access and manage all your reports in one place</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <FaFilter /> Filters
          </button>
        </div>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report) => (
            <button
              key={report.title}
              onClick={() => handleReportClick(report.type)}
              className="group block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                  {report.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {report.description}
                  </p>
                  <span className="text-xs text-gray-500">{report.stats}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage; 