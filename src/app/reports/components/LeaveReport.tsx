import React, { useState } from 'react';
import { FaFileExcel, FaFilePdf, FaChevronLeft, FaCalendarAlt, } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface LeaveHistoryResponse {
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FaCalendarAlt className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Leave Report</h1>
              <p className="text-blue-100 mt-1">View and manage your leave records</p>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <FaChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {leaveData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="text-purple-600 text-sm font-medium">Earned Leave (EL)</div>
            <div className="text-2xl font-bold text-purple-800">{leaveData.leaveBalances.EL}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="text-blue-600 text-sm font-medium">Casual Leave (CL)</div>
            <div className="text-2xl font-bold text-blue-800">{leaveData.leaveBalances.CL}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="text-green-600 text-sm font-medium">Sick Leave (SL)</div>
            <div className="text-2xl font-bold text-green-800">{leaveData.leaveBalances.SL}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl">
            <div className="text-orange-600 text-sm font-medium">Comp Off</div>
            <div className="text-2xl font-bold text-orange-800">{leaveData.leaveBalances.CompOff}</div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaFileExcel className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FaFilePdf className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Leave History Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : leaveData?.leaveHistory && leaveData.leaveHistory.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveData.leaveHistory.map((record) => (
                  <tr key={record.leaveId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.leaveType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.startDate)} - {formatDate(record.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.numberOfDays} {record.isHalfDay && '(Half Day)'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {record.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.appliedOn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">No leave records found for the selected year</p>
        </div>
      )}
    </div>
  );
};

export default LeaveReport;