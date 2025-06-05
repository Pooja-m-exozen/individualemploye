import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaFilePdf, FaCalendar, FaChevronLeft, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaPercentage } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Image from 'next/image';
import { isHoliday, formatUtcTime, calculateHoursUtc, transformAttendanceRecord } from '../../utils/attendanceUtils';

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  projectName: string;
  designation: string;
  date: string;
  punchInTime: string;
  punchOutTime: string;
  punchInPhoto: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  status?: string;
}

interface LeaveBalance {
  EL: number;
  CL: number;
  SL: number;
  CompOff: number;
}

interface LeaveRecord {
  leaveId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: string;
  reason: string;
}

interface AttendanceReportProps {
  loading: boolean;
  attendanceData: AttendanceRecord[];
  selectedMonth: number;
  selectedYear: number;
  handleMonthChange: (month: number) => void;
  handleYearChange: (year: number) => void;
  handleViewRecord: (record: AttendanceRecord) => void;
  handleBack: () => void;
  fetchReportData: () => Promise<void>;
  formatDate: (dateString: string) => string;
  employeeId: string;
}

interface MonthlySummary {
  daysInMonth: number;
  presentDays: number;
  weekoffDays: number;
  leaveBreakdown: {
    SL: number;
    CL: number;
    EL: number;
    CompOff: number;
  };
  halfDays: number;
  lopDays: number;
  totalCount: number;
  discrepancy: boolean;
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
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);

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

  const isWeekend = (date: string) => {
    const day = new Date(date).getDay();
    return day === 0; // Only Sunday is weekend
  };

  // Helper to get all second and fourth Saturdays for a given month/year
  const getSecondAndFourthSaturdays = (year: number, month: number) => {
    const saturdays: string[] = [];
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month - 1, day);
      if (date.getMonth() !== month - 1) break;
      if (date.getDay() === 6) { // Saturday
        count++;
        if (count === 2 || count === 4) {
          saturdays.push(date.toISOString().split('T')[0]);
        }
      }
    }
    return saturdays;
  };

  const isSecondOrFourthSaturday = (date: string, year: number, month: number) => {
    const dateStr = date.split('T')[0];
    const secondFourthSaturdays = getSecondAndFourthSaturdays(year, month);
    return secondFourthSaturdays.includes(dateStr);
  };

  const isSunday = (date: string) => {
    return new Date(date).getDay() === 0;
  };

  const isHoliday = (date: string) => {
    const dateStr = date.split('T')[0];
    return governmentHolidays.includes(dateStr);
  };

  const calculateAttendanceStatus = (hoursWorked: number): string => {
    if (hoursWorked >= 7) {
      return 'Present';
    } else if (hoursWorked >= 4.5 && hoursWorked < 7) {
      return 'Half Day';
    } else {
      return 'Absent';
    }
  };

  const getDayStatus = (date: string, year: number, month: number) => {
    if (isHoliday(date)) return 'Holiday';
    if (isSunday(date)) return 'Holiday';
    if (isSecondOrFourthSaturday(date, year, month)) return 'Holiday';
    return 'Working Day';
  };

  const getAttendanceStatus = (record: AttendanceRecord | undefined, dayStatus: string) => {
    if (dayStatus === 'Holiday') {
      return 'Holiday';
    }
    if (!record) {
      return 'Absent';
    }

    if (record.punchInTime && record.punchOutTime) {
      const hoursWorked = parseFloat(calculateHoursUtc(record.punchInTime, record.punchOutTime));
      return calculateAttendanceStatus(hoursWorked);
    }

    return 'Absent';
  };

  // Helper to get status code for PDF/calendar
  const getStatusCode = (record: AttendanceRecord | undefined, dayStatus: string) => {
    if (dayStatus === 'Holiday') return 'H';
    if (!record) return 'A';
    if (record.status === 'Present' || (record.punchInTime && record.punchOutTime)) return 'P';
    if (record.punchInTime && !record.punchOutTime) return 'P'; // Treat half day as present for code
    return 'A';
  };

  // Transform attendanceData using the shared logic
  const processedAttendanceData = attendanceData.map(transformAttendanceRecord);

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
    if (governmentHolidays.includes(dateStr)) {
      // Map specific holidays to their names
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
      if (governmentHolidayMap[dateStr as string]) {
        return governmentHolidayMap[dateStr as string];
      }
    }
    if (isSunday(date)) return 'Sunday';
    if (isSecondOrFourthSaturday(date, year, month)) {
      const dateObj = new Date(date);
      const weekNumber = Math.ceil(dateObj.getDate() / 7);
      return `${weekNumber === 2 ? '2nd' : '4th'} Saturday`;
    }
    return 'Working Day';
  };

  const getEnhancedMonthlySummary = (): MonthlySummary => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const filteredRecords = processedAttendanceData.filter(record => {
      const dateObj = new Date(record.date);
      return dateObj.getMonth() === selectedMonth - 1 && dateObj.getFullYear() === selectedYear;
    });

    let presentDays = 0;
    let weekoffDays = 0;
    let halfDays = 0;
    let lopDays = 0;

    filteredRecords.forEach(record => {
      const dateStr = record.date.split('T')[0];
      if (isHoliday(dateStr) || isSunday(dateStr) || 
          isSecondOrFourthSaturday(dateStr, selectedYear, selectedMonth)) {
        weekoffDays++;
        return;
      }

      if (record.punchInTime && record.punchOutTime) {
        const hoursWorked = parseFloat(calculateHoursUtc(record.punchInTime, record.punchOutTime));
        if (hoursWorked >= 8) {
          presentDays++;
        } else if (hoursWorked >= 4.5) {
          halfDays++;
          presentDays -= 0.5; // Subtract 0.5 from present days for half day
        } else {
          lopDays++;
        }
      } else {
        lopDays++;
      }
    });

    const totalCount = presentDays + weekoffDays + lopDays;

    return {
      daysInMonth,
      presentDays,
      weekoffDays,
      leaveBreakdown: {
        SL: 0,
        CL: 0,
        EL: 0,
        CompOff: 0
      },
      halfDays,
      lopDays,
      totalCount,
      discrepancy: totalCount !== daysInMonth
    };
  };

  const getLeaveBreakdownFromHistory = () => {
    const breakdown = { SL: 0, CL: 0, EL: 0, CompOff: 0 };
    let halfDayLeave = 0;
    leaveHistory.forEach(leave => {
      if (leave.status === 'Approved') {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (
          let d = new Date(start);
          d <= end;
          d.setDate(d.getDate() + 1)
        ) {
          if (
            d.getMonth() === selectedMonth - 1 &&
            d.getFullYear() === selectedYear
          ) {
            const type = leave.leaveType as keyof typeof breakdown;
            if (breakdown.hasOwnProperty(type)) {
              if (leave.isHalfDay) {
                breakdown[type] += 0.5;
                halfDayLeave += 0.5;
              } else {
                breakdown[type]++;
              }
            }
          }
        }
      }
    });
    return { ...breakdown, halfDayLeave };
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

    // Attendance table
    const tableColumn = ["Date", "Project", "Check In", "Check Out", "Hours Worked", "Day Type", "Status"];
    const filteredRecords = processedAttendanceData.filter(record => {
      const dateObj = new Date(record.date);
      return dateObj.getMonth() === selectedMonth - 1 && dateObj.getFullYear() === selectedYear;
    });

    const tableRows = filteredRecords.map(record => {
      const dateStr = record.date.split('T')[0];
      let dayType = '';
      let status = '';
      let hoursWorked = 'N/A';
      
      // Calculate hours worked
      if (record.punchInUtc && record.punchOutUtc) {
        const hours = calculateHoursUtc(record.punchInUtc, record.punchOutUtc);
        hoursWorked = hours !== '0' ? hours + ' hrs' : 'N/A';
        
        // Calculate status based on hours worked
        const hoursNum = parseFloat(hours);
        if (hoursNum >= 7) {
          status = 'Present';
        } else if (hoursNum >= 4.5) {
          status = 'Half Day';
        } else {
          status = 'Absent';
        }
      } else {
        status = 'Absent';
      }

      // Determine day type
      if (governmentHolidayMap[dateStr]) {
        dayType = governmentHolidayMap[dateStr];
        status = 'Holiday';
      } else {
        const dateObj = new Date(record.date);
        const day = dateObj.getDay();
        if (day === 0) {
          dayType = 'Sunday';
          status = 'Holiday';
        } else if (day === 6) {
          const weekNumber = Math.ceil(dateObj.getDate() / 7);
          if (weekNumber === 2) {
            dayType = '2nd Saturday';
            status = 'Holiday';
          } else if (weekNumber === 4) {
            dayType = '4th Saturday';
            status = 'Holiday';
          } else {
            dayType = 'Working Day';
          }
        } else {
          dayType = 'Working Day';
        }
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

    // Start second page
    doc.addPage();
    yPosition = 15;

    // Add Monthly Summary section
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text('Attendance Monthly Summary', 15, yPosition);
    yPosition += 20;

    // Render the summary table in the PDF with smaller font and single row
    const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const presentDays = summary?.presentDays ?? summary?.summary?.daysPresent ?? 0;
    const absentDays = summary?.absentDays ?? summary?.summary?.daysAbsent ?? 0;
    const leaveBreakdown = getLeaveBreakdownFromHistory();
    const totalLeaveDays = (leaveBreakdown['SL'] ?? 0) + (leaveBreakdown['CL'] ?? 0) + (leaveBreakdown['EL'] ?? 0) + (leaveBreakdown['CompOff'] ?? 0);
    const halfDayLeave = leaveBreakdown.halfDayLeave || 0;
    
    // Calculate combined weekoff and holiday count
    const weekoffAndHolidayCount = Array.from({ length: totalDaysInMonth }, (_, i) => {
      const currentDate = new Date(selectedYear, selectedMonth - 1, i + 1);
      const dateStr = currentDate.toISOString();
      return isSunday(dateStr) || 
             isSecondOrFourthSaturday(dateStr, selectedYear, selectedMonth) ||
             isHoliday(dateStr);
    }).filter(Boolean).length;

    const absentOrLOP = Math.max(absentDays - totalLeaveDays, 0);

    autoTable(doc, {
      head: [[
        'Total Days',
        'Present',
        'Weekoff/Holiday',
        'SL',
        'CL',
        'EL',
        'CompOff',
        'Absent/LOP'
      ]],
      body: [[
        totalDaysInMonth,
        presentDays,
        weekoffAndHolidayCount,
        leaveBreakdown['SL'] ?? 0,
        leaveBreakdown['CL'] ?? 0,
        leaveBreakdown['EL'] ?? 0,
        leaveBreakdown['CompOff'] ?? 0,
        absentOrLOP
      ]],
      startY: yPosition,
      theme: 'grid',
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255,
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 }
      },
      margin: { left: 15 },
      tableWidth: 180
    });
    yPosition = (doc as any).lastAutoTable.finalY + 8;
    // Add discrepancy or match message
    doc.setFontSize(10);
    if (summary.discrepancy) {
      doc.setTextColor(200, 0, 0);
      doc.text(`Discrepancy: Total (${summary.totalCount}) does not match days in month (${summary.daysInMonth})!`, 15, yPosition);
    } else {
      doc.setTextColor(0, 150, 0);
      doc.text('Summary matches total days in month.', 15, yPosition);
    }
    yPosition += 10;

    // Move to the bottom of the page for signatures
    const pageHeight = doc.internal.pageSize.getHeight();
    let signatureY = pageHeight - 40;

    // Add the note just above the signature lines, centered and split into two lines if needed
    const noteY = signatureY - 24;
    doc.setFontSize(11);
    // 'Note:' in bold red
    doc.setFont('bold');
    doc.setTextColor(200, 0, 0);
    const noteLabel = 'Note:';
    // The rest in bold black
    doc.setFont('bold');
    doc.setTextColor(0, 0, 0);
    const noteText1 = 'The total working hours recorded are below the required minimum.';
    const noteText2 = 'Please ensure that the total working hours per day are at least 8 hours.';
    // Calculate widths for centering
    const pageWidth = doc.internal.pageSize.getWidth();
    const noteLabelWidth = doc.getTextWidth(noteLabel + ' ');
    const noteText1Width = doc.getTextWidth(noteText1);
    const noteText2Width = doc.getTextWidth(noteText2);
    // Center the first line
    const totalLine1Width = noteLabelWidth + noteText1Width;
    const noteX1 = (pageWidth - totalLine1Width) / 2;
    // Center the second line
    const noteX2 = (pageWidth - noteText2Width) / 2;
    // Draw first line
    doc.setFont('bold');
    doc.setTextColor(200, 0, 0);
    doc.text(noteLabel, noteX1, noteY);
    doc.setTextColor(0, 0, 0);
    doc.text(noteText1, noteX1 + noteLabelWidth, noteY);
    // Draw second line
    doc.text(noteText2, noteX2, noteY + 8);
    doc.setFont('normal');

    // Signature lines
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    // Authorized Signature line
    doc.line(25, signatureY, 85, signatureY);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Authorized Signature', 25, signatureY + 6);
    // Employee Signature line
    doc.line(125, signatureY, 185, signatureY);
    doc.text('Employee Signature', 125, signatureY + 6);

    // Add Leave Balance section
    yPosition = (doc as any).lastAutoTable.finalY + 20; // Adjust yPosition after summary table or signatures if they were added
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
      yPosition = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Total Allocated: ${leaveBalance.totalAllocated}   Total Used: ${leaveBalance.totalUsed}   Total Remaining: ${leaveBalance.totalRemaining}   Total Pending: ${leaveBalance.totalPending}`, 15, yPosition);
      yPosition += 10;
    }

    // Add Leave History section
    // Ensure leaveHistory is fetched and filtered by month before this section
    const filteredLeaveHistory = leaveHistory.filter(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const targetDate = new Date(selectedYear, selectedMonth - 1);
      return (
        (startDate.getMonth() === selectedMonth - 1 && startDate.getFullYear() === selectedYear) ||
        (endDate.getMonth() === selectedMonth - 1 && endDate.getFullYear() === selectedYear) ||
        (startDate <= targetDate && endDate >= new Date(selectedYear, selectedMonth, 0))
      );
    });

    if (filteredLeaveHistory.length > 0) {
      yPosition = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.setTextColor(41, 128, 185);
      doc.text(`Leave History - ${months[selectedMonth - 1]} ${selectedYear}`, 14, yPosition);
      yPosition += 10;

      const leaveHeaders = [['Date', 'Leave Type', 'Days', 'Half Day', 'Type', 'Status', 'Reason']];
      const leaveRows = filteredLeaveHistory.map(leave => [
        `${new Date(leave.startDate).toLocaleDateString()}${leave.startDate !== leave.endDate ? ` - ${new Date(leave.endDate).toLocaleDateString()}` : ''}`,
        leave.leaveType,
        leave.numberOfDays,
        leave.isHalfDay ? 'Yes' : 'No',
        leave.isHalfDay ? (leave.halfDayType || 'N/A') : '-',
        leave.status,
        leave.reason || 'N/A'
      ]);

      autoTable(doc, {
        head: leaveHeaders,
        body: leaveRows,
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 20 },
          2: { cellWidth: 15 },
          3: { cellWidth: 15 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 'auto' }
        },
        margin: { left: 15 }
      });
    }

    doc.save(`attendance_report_${selectedMonth}_${selectedYear}.pdf`);
  };

  // Add this helper function after getLeaveTypeForDate
  const filterLeaveHistoryByMonth = (leaveHistory: any[], month: number, year: number) => {
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
    fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-stats?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => res.json())
      .then(data => {
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
          const filteredHistory = filterLeaveHistoryByMonth(
            data.leaveHistory,
            selectedMonth,
            selectedYear
          );
          setLeaveHistory(filteredHistory);
        } else {
          setLeaveHistory([]);
        }
      })
      .catch(() => setLeaveHistory([]));
  }, [employeeId, selectedMonth, selectedYear]);

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const match = dateString.match(/T(\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : dateString;
  };

  const getLeaveTypeForDate = (dateStr: string) => {
    const leave = leaveHistory.find(lh => {
      const start = new Date(lh.startDate);
      const end = new Date(lh.endDate);
      const d = new Date(dateStr);
      return d >= start && d <= end && !lh.isHalfDay && lh.status === 'Approved';
    });
    return leave ? leave.leaveType : null;
  };

  // Helper to calculate weekoff/holiday count for the selected month
  const getWeekoffHolidayCount = () => {
    let count = 0;
    const daysInMonth = summary.daysInMonth || 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedYear, selectedMonth - 1, day);
      const dateStr = currentDate.toISOString().split('T')[0];
      if (
        isHoliday(dateStr) ||
        isSunday(dateStr) ||
        isSecondOrFourthSaturday(dateStr, selectedYear, selectedMonth)
      ) {
        count++;
      }
    }
    return count;
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
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaCalendarAlt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Working Days</h3>
                <p className="text-2xl font-bold text-gray-900">{summary.workingDays || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Present Days</h3>
                <p className="text-2xl font-bold text-gray-900">{summary.presentDays || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <FaTimesCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Absent Days</h3>
                <p className="text-2xl font-bold text-gray-900">{summary.absentDays || 0}</p>
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
                  {summary.workingDays ? ((summary.presentDays / summary.workingDays) * 100).toFixed(1) : 0}%
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
                {attendanceData.map((record, index) => (
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
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {record.punchInTime && record.punchOutTime ? 'Present' : 'Absent'}
                        </span>
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
                        record.status === 'Present' 
                          ? 'bg-green-100 text-green-800'
                          : record.status === 'Half Day'
                          ? 'bg-yellow-100 text-yellow-800'
                          : record.status === 'Absent'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
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
                  {selectedRecord.punchInPhoto && (
                    <div className="flex flex-col items-start border-b pb-2">
                      <span className="font-medium text-gray-500 mb-1">Punch In Photo:</span>
                      <Image 
                        src={selectedRecord.punchInPhoto} 
                        alt="Punch In" 
                        width={300}
                        height={200}
                        className="rounded shadow object-contain"
                      />
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedRecord.status === 'Present'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedRecord.status || (selectedRecord.punchInTime && selectedRecord.punchOutTime ? 'Present' : 'Absent')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500">No attendance records found for the selected month and year.</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;