import React, { useState } from 'react';
import { FaFileExcel, FaFilePdf, FaChevronLeft, FaCalendarAlt, } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from "@/context/ThemeContext";

interface LeaveBalance {
  EL: number;
  CL: number;
  SL: number;
  CompOff: number;
}

interface LeaveRecord {
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
  appliedOn: string;
  lastUpdated: string;
}

// interface LeaveHistoryResponse {
//   success: boolean;
//   leaveHistory: Array<{
//     startDate: string;
//     leaveType: string;
//     numberOfDays: number;
//     isHalfDay: boolean;
//     halfDayType?: string;
//     status: string;
//     reason: string;
//   }>;
// }

interface LeaveReportProps {
  loading: boolean;
  leaveData: {
    employeeId: string;
    employeeName: string;
    totalLeaves: number;
    leaveBalances: LeaveBalance;
    leaveHistory: LeaveRecord[];
  } | null;
  handleBack: () => void;
  formatDate: (date: string) => string;
}

interface LeaveHistoryData {
  success: boolean;
  leaveHistory: Array<{
    startDate: string;
    leaveType: string;
    numberOfDays: number;
    isHalfDay: boolean;
    halfDayType?: string;
    status: string;
    reason: string;
  }>;
}

const LeaveReport: React.FC<LeaveReportProps> = ({
  loading,
  leaveData,
  handleBack,
  formatDate,
}) => {
  const { theme } = useTheme();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const downloadExcel = () => {
    if (!leaveData?.leaveHistory) return;

    const worksheet = XLSX.utils.json_to_sheet(
      leaveData.leaveHistory.map(record => ({
        'Employee Name': record.employeeName,
        'Leave Type': record.leaveType,
        'Start Date': formatDate(record.startDate),
        'End Date': formatDate(record.endDate),
        'Number of Days': record.numberOfDays,
        'Half Day': record.isHalfDay ? 'Yes' : 'No',
        'Status': record.status,
        'Reason': record.reason,
        'Applied On': formatDate(record.appliedOn),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
    XLSX.writeFile(workbook, `leave_report_${selectedYear}.xlsx`);
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    let yPosition = 25;

    // Set title
    doc.setFontSize(20);
    doc.text(`Leave Report - ${selectedYear}`, 14, 15);

    // Draw main attendance table first
    const tableColumn = ["Employee Name", "Leave Type", "Start Date", "End Date", "Days", "Status"];
    const tableRows = leaveData?.leaveHistory.map(record => [
      record.employeeName,
      record.leaveType,
      formatDate(record.startDate),
      formatDate(record.endDate),
      record.numberOfDays,
      record.status,
    ]) || [];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPosition,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      didDrawPage: (data) => {
        yPosition = (data.cursor?.y ?? yPosition) + 10;
      }
    });

    // Add leave history table
    if (leaveData?.employeeId) {
      try {
        const leaveHistoryRes = await fetch(
          `https://cafm.zenapi.co.in/api/leave/history/${leaveData.employeeId}`
        );
        const leaveHistoryData: LeaveHistoryData = await leaveHistoryRes.json();

        if (leaveHistoryData.success && leaveHistoryData.leaveHistory.length > 0) {
          // Add "Leave History" subtitle with some spacing
          doc.setFontSize(12);
          doc.setTextColor(41, 128, 185);
          doc.text('Leave History', 14, yPosition);

          // Leave history table headers and data
          const leaveHeaders = [['Date', 'Leave Type', 'Duration', 'Status', 'Reason']];
          const leaveRows = leaveHistoryData.leaveHistory.map(leave => [
            new Date(leave.startDate).toLocaleDateString(),
            leave.leaveType,
            leave.isHalfDay ? `${leave.numberOfDays} (${leave.halfDayType})` : leave.numberOfDays,
            leave.status,
            leave.reason
          ]);

          // Draw leave history table with proper spacing
          autoTable(doc, {
            head: leaveHeaders,
            body: leaveRows,
            startY: yPosition + 5,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 25 },
              2: { cellWidth: 30 },
              3: { cellWidth: 25 },
              4: { cellWidth: 'auto' }
            }
          });
        }
      } catch (error) {
        console.error('Error fetching leave history:', error);
      }
    }

    doc.save(`leave_report_${selectedYear}.pdf`);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl shadow-lg p-4 sm:p-6 md:p-8 ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-gray-800 to-gray-700'
          : 'bg-gradient-to-r from-blue-600 to-blue-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FaCalendarAlt className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Leave Report</h1>
              <p className="text-white mt-1 text-sm sm:text-base">View and manage your leave records</p>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg transition-colors text-white text-sm sm:text-base"
          >
            <FaChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {leaveData && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`rounded-xl p-3 sm:p-4 ${
            theme === 'dark' ? 'bg-gray-800 text-purple-300' : 'bg-purple-50 text-purple-600'
          }`}>
            <div className="text-xs sm:text-sm font-medium">Earned Leave (EL)</div>
            <div className={`text-xl sm:text-2xl font-bold ${
              theme === 'dark' ? 'text-purple-200' : 'text-purple-800'
            }`}>{leaveData.leaveBalances.EL}</div>
          </div>
          <div className={`rounded-xl p-3 sm:p-4 ${
            theme === 'dark' ? 'bg-gray-800 text-blue-300' : 'bg-blue-50 text-blue-600'
          }`}>
            <div className="text-xs sm:text-sm font-medium">Casual Leave (CL)</div>
            <div className={`text-xl sm:text-2xl font-bold ${
              theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
            }`}>{leaveData.leaveBalances.CL}</div>
          </div>
          <div className={`rounded-xl p-3 sm:p-4 ${
            theme === 'dark' ? 'bg-gray-800 text-green-300' : 'bg-green-50 text-green-600'
          }`}>
            <div className="text-xs sm:text-sm font-medium">Sick Leave (SL)</div>
            <div className={`text-xl sm:text-2xl font-bold ${
              theme === 'dark' ? 'text-green-200' : 'text-green-800'
            }`}>{leaveData.leaveBalances.SL}</div>
          </div>
          <div className={`rounded-xl p-3 sm:p-4 ${
            theme === 'dark' ? 'bg-gray-800 text-orange-300' : 'bg-orange-50 text-orange-600'
          }`}>
            <div className="text-xs sm:text-sm font-medium">Comp Off</div>
            <div className={`text-xl sm:text-2xl font-bold ${
              theme === 'dark' ? 'text-orange-200' : 'text-orange-800'
            }`}>{leaveData.leaveBalances.CompOff}</div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className={`flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between p-3 sm:p-4 rounded-xl ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <div className="flex gap-3 w-full sm:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
          >
            <FaFileExcel className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            <FaFilePdf className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Leave History Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${
            theme === 'dark' ? 'border-blue-400' : 'border-blue-500'
          }`}></div>
        </div>
      ) : leaveData?.leaveHistory && leaveData.leaveHistory.length > 0 ? (
        <div className={`rounded-xl shadow-sm overflow-x-auto border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="min-w-[320px] w-full">
            <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Leave Type
                  </th>
                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Duration
                  </th>
                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Days
                  </th>
                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Reason
                  </th>
                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Applied On
                  </th>
                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {leaveData.leaveHistory.map((record) => (
                  <tr key={record.leaveId} className={
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }>
                    <td className={`px-3 sm:px-6 py-3 whitespace-nowrap font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {record.leaveType}
                    </td>
                    <td className={`px-3 sm:px-6 py-3 whitespace-nowrap text-gray-500`}>
                      {formatDate(record.startDate)} - {formatDate(record.endDate)}
                    </td>
                    <td className={`px-3 sm:px-6 py-3 whitespace-nowrap text-gray-500`}>
                      {record.numberOfDays} {record.isHalfDay && '(Half Day)'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-gray-500 max-w-xs truncate">
                      {record.reason}
                    </td>
                    <td className={`px-3 sm:px-6 py-3 whitespace-nowrap text-gray-500`}>
                      {formatDate(record.appliedOn)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`text-center py-12 rounded-xl ${
          theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
        }`}>
          <p>No leave records found for the selected year</p>
        </div>
      )}
    </div>
  );
};

export default LeaveReport;