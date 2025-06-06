import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaFilePdf, FaCalendar, FaChevronLeft, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaPercentage } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Image from 'next/image';
import { calculateHoursUtc, transformAttendanceRecord } from '../../utils/attendanceUtils';
import { 
    RawAttendanceRecord, 
    TransformedAttendanceRecord, 
    MonthSummaryResponse
} from '../../types/attendance';

interface LeaveBalance {
    allocated: number;
    used: number;
    remaining: number;
    pending: number;
}

interface LeaveBalanceResponse {
    employeeId: string;
    employeeName: string;
    year: number;
    balances: {
        EL: LeaveBalance;
        SL: LeaveBalance;
        CL: LeaveBalance;
        CompOff: LeaveBalance;
    };
    totalAllocated: number;
    totalUsed: number;
    totalRemaining: number;
    totalPending: number;
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

interface AttendanceReportProps {
    loading: boolean;
    attendanceData: RawAttendanceRecord[];
    selectedMonth: number;
    selectedYear: number;
    handleMonthChange: (month: number) => void;
    handleYearChange: (year: number) => void;
    handleViewRecord: (record: RawAttendanceRecord) => void;
    handleBack: () => void;
    fetchReportData: () => Promise<void>;
    formatDate: (dateString: string) => string;
    employeeId: string;
}

const AttendanceReport: React.FC<AttendanceReportProps> = ({
    loading,
    attendanceData,
    selectedMonth,
    selectedYear,
    handleMonthChange,
    handleYearChange,
    handleBack,
    formatDate,
    employeeId,
}) => {
    const [selectedRecord, setSelectedRecord] = useState<RawAttendanceRecord | null>(null);
    const [summary, setSummary] = useState<MonthSummaryResponse['data'] | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const governmentHolidayMap: { [key: string]: string } = {
        '2024-01-26': 'Republic Day',
        '2024-03-25': 'Holi',
        '2024-04-09': 'Ram Navami',
        '2024-05-01': 'Labor Day',
        '2024-08-15': 'Independence Day',
        '2024-10-02': 'Gandhi Jayanti',
        '2024-11-14': 'Diwali',
        '2024-12-25': 'Christmas',
        '2025-05-01': 'Labor Day',
    };

    const governmentHolidays = Object.keys(governmentHolidayMap);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + 2 - i);

    // Transform attendanceData using the shared logic
    const processedAttendanceData = attendanceData.map((record: RawAttendanceRecord): TransformedAttendanceRecord => 
        transformAttendanceRecord(record)
    );

    const downloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            attendanceData.map(record => ({
                Date: formatDate(record.date),
                'Project Name': record.projectName,
                Designation: record.designation,
                'Check In': formatTime(record.punchInTime),
                'Check Out': formatTime(record.punchOutTime),
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
        XLSX.writeFile(workbook, `attendance_report_${selectedMonth}_${selectedYear}.xlsx`);
    };

    const getDayType = (date: string, year: number, month: number) => {
        const dateStr = date.split('T')[0];
        const d = new Date(dateStr);
        
        // Check for government holidays first
        if (governmentHolidays.includes(dateStr)) {
            return governmentHolidayMap[dateStr] || 'Holiday';
        }
        
        // Check for Sunday
        if (d.getDay() === 0) {
            return 'Sunday';
        }
        
        // Check for second and fourth Saturdays
        if (d.getDay() === 6) { // If it's Saturday
            const weekNumber = Math.ceil((d.getDate() + (new Date(year, month - 1, 1).getDay())) / 7);
            if (weekNumber === 2) {
                return '2nd Saturday';
            } else if (weekNumber === 4) {
                return '4th Saturday';
            }
        }
        
        return 'Working Day';
    };

    // Add this new helper function
    const getAttendanceStatus = (record: RawAttendanceRecord, dayType: string) => {
        // Check if there's any punch in/out on a holiday
        if (dayType !== 'Working Day' && record.punchInTime && record.punchOutTime) {
            // Use regular punchInTime/punchOutTime if UTC values are not available
            const inTime = record.punchInUtc || record.punchInTime;
            const outTime = record.punchOutUtc || record.punchOutTime;
            const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
            if (hoursWorked >= 4) {
                return 'Comp Off';
            }
        }

        // Regular day status calculation
        if (record.punchInTime && record.punchOutTime) {
            const inTime = record.punchInUtc || record.punchInTime;
            const outTime = record.punchOutUtc || record.punchOutTime;
            const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
            if (hoursWorked >= 7) {
                return 'Present';
            } else if (hoursWorked >= 4.0) {
                return 'Half Day';
            }
        }

        return dayType !== 'Working Day' ? 'Holiday' : 'Absent';
    };

    const downloadPDF = async () => {
        const doc = new jsPDF();
        let yPosition = 15;

        // First page - Header and Attendance Table
        doc.addImage("/exozen_logo1.png", 'PNG', 15, yPosition, 25, 8);
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text(`Attendance Report - ${months[selectedMonth - 1]} ${selectedYear}`, 45, yPosition + 4);
        doc.setFontSize(9);
        doc.text(`Employee ID: ${employeeId}`, 45, yPosition + 8);

        yPosition += 12;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition, 195, yPosition);
        yPosition += 5;

        // Attendance table on first page
        const tableColumn = ["Date", "Project", "Check In", "Check Out", "Hours Worked", "Day Type", "Status"];
        const filteredRecords = processedAttendanceData.filter(record => {
            const dateObj = new Date(record.date);
            return dateObj.getMonth() === selectedMonth - 1 && dateObj.getFullYear() === selectedYear;
        });

        const tableRows = filteredRecords.map(record => {
            // const dateStr = record.date.split('T')[0];
            const dayType = getDayType(record.date, selectedYear, selectedMonth);
            const status = getAttendanceStatus(record, dayType);
            let hoursWorked = 'N/A';
            
            // Calculate hours worked
            if (record.punchInUtc && record.punchOutUtc) {
                const hours = calculateHoursUtc(record.punchInUtc, record.punchOutUtc);
                hoursWorked = hours !== '0' ? formatHoursToHoursAndMinutes(hours) : 'N/A';
            }

            return [
                formatDate(record.date),
                record.projectName || 'N/A',
                formatTime(record.punchInTime),
                formatTime(record.punchOutTime),
                hoursWorked,
                dayType,
                status
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 35 },
                6: { cellWidth: 25 }
            }
        });

        // Second page - Monthly Summary
        doc.addPage();
        yPosition = 15;

        // Add Monthly Summary header
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.text('Monthly Summary Report', 15, yPosition);
        yPosition += 20;

        // Monthly Summary Table
        autoTable(doc, {
            head: [[
                'Total Days',
                'Present Days',
                'Half Days',
                'Partially Absent',
                'Week Offs',
                'Holidays',
                'EL',
                'SL',
                'CL',
                'Comp Off',
                'LOP'
            ]],
            body: [[
                summary?.summary.totalDays ?? 0,
                summary?.summary.presentDays ?? 0,
                summary?.summary.halfDays ?? 0,
                summary?.summary.partiallyAbsentDays ?? 0,
                summary?.summary.weekOffs ?? 0,
                summary?.summary.holidays ?? 0,
                summary?.summary.el ?? 0,
                summary?.summary.sl ?? 0,
                summary?.summary.cl ?? 0,
                summary?.summary.compOff ?? 0,
                summary?.summary.lop ?? 0
            ]],
            startY: yPosition,
            theme: 'grid',
            styles: { 
                fontSize: 8,
                cellPadding: 4,
                halign: 'center'
            },
            headStyles: { 
                fillColor: [41, 128, 185], 
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 17.5 },
                1: { cellWidth: 17.5 },
                2: { cellWidth: 17.5 },
                3: { cellWidth: 17.5 },
                4: { cellWidth: 17.5 },
                5: { cellWidth: 17.5 },
                6: { cellWidth: 17.5 },
                7: { cellWidth: 17.5 },
                8: { cellWidth: 17.5 },
                9: { cellWidth: 17.5 },
                10: { cellWidth: 17.5 }
            },
            margin: { left: 15 }
        });

        // Summary text
        yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        if (summary) {
            const workingDays = summary.summary.totalDays - (summary.summary.weekOffs + summary.summary.holidays);
            const presentDaysWithLeaves = summary.summary.presentDays + (summary.summary.halfDays / 2) + 
                summary.summary.el + summary.summary.sl + summary.summary.cl;
            const attendancePercentage = ((presentDaysWithLeaves / workingDays) * 100).toFixed(2);
            
            doc.text([
                `Total Working Days: ${workingDays} days`,
                `Total Present Days (including leaves): ${presentDaysWithLeaves} days`,
                `Attendance Percentage: ${attendancePercentage}%`
            ], 15, yPosition, { lineHeightFactor: 1.5 });
        }

        // Add Leave Balance section on same page
        yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 40;
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.text('Leave Balance', 15, yPosition);
        yPosition += 10;

        if (leaveBalance && leaveBalance.balances) {
          const leaveTableHead = [['Leave Type', 'Allocated', 'Used', 'Remaining', 'Pending']];
          const leaveTableRows = Object.entries(leaveBalance.balances).map(([type, values]) => {
            const v = values as { allocated: number; used: number; remaining: number; pending: number };
            return [type, v.allocated, v.used, v.remaining, v.pending];
          });
          autoTable(doc, {
            head: leaveTableHead,
            body: leaveTableRows,
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 30, halign: 'center' },
              3: { cellWidth: 30, halign: 'center' },
              4: { cellWidth: 30, halign: 'center' }
            },
            margin: { left: 15 }
          });
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
          doc.setFontSize(10);
          doc.text(`Total Allocated: ${leaveBalance.totalAllocated}   Total Used: ${leaveBalance.totalUsed}   Total Remaining: ${leaveBalance.totalRemaining}   Total Pending: ${leaveBalance.totalPending}`, 15, yPosition);
          yPosition += 10;
        }

        // Move signature section to bottom of page
        const pageHeight = doc.internal.pageSize.getHeight();
        const signatureY = pageHeight - 40;

        // Add note above signatures
        const noteY = signatureY - 24;
        doc.setFontSize(11);
        doc.setFont('bold');
        doc.setTextColor(200, 0, 0);
        const noteLabel = 'Note:';
        doc.setTextColor(0, 0, 0);
        const noteText = 'Please ensure that the total working hours per day are at least 8 hours.';
        doc.text(`${noteLabel} ${noteText}`, 15, noteY);

        // Signature lines
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(25, signatureY, 85, signatureY);
        doc.line(125, signatureY, 185, signatureY);
        doc.setFontSize(10);
        doc.text('Authorized Signature', 25, signatureY + 6);
        doc.text('Employee Signature', 125, signatureY + 6);

        doc.save(`attendance_report_${selectedMonth}_${selectedYear}.pdf`);
    };

    // Add this helper function before downloadPDF
    const formatHoursToHoursAndMinutes = (hoursDecimal: string): string => {
        if (hoursDecimal === '0' || hoursDecimal === 'N/A') return 'N/A';
        const hours = Math.floor(parseFloat(hoursDecimal));
        const minutes = Math.round((parseFloat(hoursDecimal) - hours) * 60);
        return `${hours}h ${minutes}m`;
    };

    // Add this helper function after getLeaveTypeForDate
    const filterLeaveHistoryByMonth = (leaveHistory: LeaveRecord[], month: number, year: number) => {
        return leaveHistory.filter(leave => {
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);
            const targetDate = new Date(year, month - 1);
            
            // Check if any part of the leave falls in the selected month
            return (
                (startDate.getMonth() === month - 1 && startDate.getFullYear() === year) ||
                (endDate.getMonth() === month - 1 && endDate.getFullYear() === year) ||
                (startDate <= targetDate && endDate >= new Date(year, month, 0))
            );
        });
    };

    useEffect(() => {
        if (!employeeId || !selectedMonth || !selectedYear) return;
        setSummaryLoading(true);
        setSummaryError(null);
        
        fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-summary?month=${selectedMonth}&year=${selectedYear}`)
          .then(res => res.json())
          .then((data: MonthSummaryResponse) => {
            if (data.success) {
              setSummary(data.data);
            } else {
              setSummary(null);
              setSummaryError('Failed to fetch summary');
            }
          })
          .catch(() => {
            setSummary(null);
            setSummaryError('Failed to fetch summary');
          })
          .finally(() => setSummaryLoading(false));
    }, [employeeId, selectedMonth, selectedYear]);

    useEffect(() => {
        if (!employeeId) return;
        fetch(`https://cafm.zenapi.co.in/api/leave/balance/${employeeId}`)
          .then(res => res.json())
          .then(data => setLeaveBalance(data))
          .catch(() => setLeaveBalance(null));
    }, [employeeId]);

    useEffect(() => {
        if (!employeeId || !selectedMonth || !selectedYear) return;
        fetch(`https://cafm.zenapi.co.in/api/leave/history/${employeeId}`)
          .then(res => res.json())
          .then(data => {
            if (data.leaveHistory) {
              filterLeaveHistoryByMonth(
                data.leaveHistory,
                selectedMonth,
                selectedYear
              );
            }
          })
          .catch(() => {
            // Error handling
          });
    }, [employeeId, selectedMonth, selectedYear]);

    const formatTime = (dateString: string | null): string => {
        if (!dateString) return 'N/A';
        const match = dateString.match(/T(\d{2}:\d{2}:\d{2})/);
        return match ? match[1] : dateString;
    };

    return (
        <div className="space-y-6 bg-white rounded-xl shadow-sm p-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <FaFileExcel className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Attendance Report</h1>
                  <p className="text-blue-100 mt-1">View and download your attendance records</p>
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

          {/* Summary Stats */}
          {summaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-200 rounded-lg w-12 h-12"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : summaryError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              <p className="flex items-center gap-2">
                <FaTimesCircle className="w-5 h-5" />
                {summaryError}
              </p>
            </div>
          ) : summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Present Days</h3>
                    <p className="text-2xl font-bold text-gray-900">{summary.summary.presentDays + (summary.summary.halfDays / 2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FaCheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Half Days</h3>
                    <p className="text-2xl font-bold text-gray-900">{summary.summary.halfDays}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <FaTimesCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">LOP Days</h3>
                    <p className="text-2xl font-bold text-gray-900">{summary.summary.lop}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FaPercentage className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Attendance Rate</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {((summary.summary.presentDays + (summary.summary.halfDays / 2)) / 
                        (summary.summary.totalDays - summary.summary.weekOffs - summary.summary.holidays) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Actions */}
          <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex gap-4">
              <div className="relative">
                <FaCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  className="pl-10 pr-4 py-2 border rounded-lg appearance-none bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map((month, index) => (
                    <option key={index + 1} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="px-4 py-2 border rounded-lg appearance-none bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map((year) => (
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

          {/* Attendance Table */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : attendanceData.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.map((record: RawAttendanceRecord, index) => (
                      <tr 
                        key={record._id || index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.projectName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.punchInTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.punchOutTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.punchInTime && record.punchOutTime ? (
                            record.punchInUtc && record.punchOutUtc ? (
                              formatHoursToHoursAndMinutes(calculateHoursUtc(record.punchInUtc, record.punchOutUtc))
                            ) : 'N/A'
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.punchInTime && record.punchOutTime ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {record.punchInTime && record.punchOutTime ? 'Present' : 'Absent'}
                            </span>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            (() => {
                                const dayType = getDayType(record.date, selectedYear, selectedMonth);
                                const status = getAttendanceStatus(record, dayType);
                                switch (status) {
                                    case 'Present':
                                        return 'bg-green-100 text-green-800';
                                    case 'Half Day':
                                        return 'bg-yellow-100 text-yellow-800';
                                    case 'Comp Off':
                                        return 'bg-purple-100 text-purple-800';
                                    case 'Holiday':
                                        return 'bg-blue-100 text-blue-800';
                                    default:
                                        return 'bg-red-100 text-red-800';
                                }
                            })()
                          }`}>
                            {(() => {
                                const dayType = getDayType(record.date, selectedYear, selectedMonth);
                                return getAttendanceStatus(record, dayType);
                            })()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal for viewing record details */}
              {selectedRecord && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                  <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full relative animate-fade-in">
                    <button
                      onClick={() => setSelectedRecord(null)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                      aria-label="Close"
                    >
                      &times;
                    </button>
                    <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Attendance Record Details</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-gray-500">Date:</span>
                        <span className="text-gray-900">{formatDate(selectedRecord.date)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-gray-500">Project Name:</span>
                        <span className="text-gray-900">{selectedRecord.projectName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-gray-500">Designation:</span>
                        <span className="text-gray-900">{selectedRecord.designation || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-gray-500">Punch In Time:</span>
                        <span className="text-gray-900">{formatTime(selectedRecord.punchInTime)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-gray-500">Punch Out Time:</span>
                        <span className="text-gray-900">{formatTime(selectedRecord.punchOutTime)}</span>
                      </div>
                      <div className="flex flex-col items-start border-b pb-2">
                        <span className="font-medium text-gray-500 mb-1">Attendance Photos:</span>
                        <div className="grid grid-cols-2 gap-4 w-full">
                          {selectedRecord.punchInPhoto && (
                            <div>
                              <span className="text-sm text-gray-500 block mb-1">Punch In:</span>
                              <Image 
                                src={selectedRecord.punchInPhoto} 
                                alt="Punch In"
                                width={200}
                                height={200}
                                className="rounded-lg"
                              />
                            </div>
                          )}
                          {selectedRecord.punchOutPhoto && (
                            <div>
                              <span className="text-sm text-gray-500 block mb-1">Punch Out:</span>
                              <Image 
                                src={selectedRecord.punchOutPhoto} 
                                alt="Punch Out"
                                width={200}
                                height={200}
                                className="rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">No attendance records found for the selected period.</p>
            </div>
          )}
        </div>
      );
};

export default AttendanceReport;
