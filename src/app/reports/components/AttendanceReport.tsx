import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaFilePdf, FaCalendar, FaChevronLeft,  } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Image from 'next/image';
import { calculateHoursUtc, transformAttendanceRecord } from '../../utils/attendanceUtils';
import {
    RawAttendanceRecord as BaseRawAttendanceRecord,
    TransformedAttendanceRecord
} from '../../types/attendance';
import { startOfMonth, endOfMonth, format as formatDateFns } from 'date-fns';

interface GoogleMapsAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

interface GoogleMapsGeocodeResult {
    address_components: GoogleMapsAddressComponent[];
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    place_id: string;
    types: string[];
}

interface GoogleMapsGeocodingResponse {
    status: string;
    results: GoogleMapsGeocodeResult[];
    error_message?: string;
}

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
    appliedOn: string;
    lastUpdated: string;
}

interface LocationDetail {
    latitude: number;
    longitude: number;
    address: string | null;
}

// Extend the base interface and add location details
interface ExtendedRawAttendanceRecord extends BaseRawAttendanceRecord {
    punchInLocation?: LocationDetail;
    punchOutLocation?: LocationDetail;
}

interface AttendanceReportProps {
    loading: boolean;
    attendanceData: ExtendedRawAttendanceRecord[];
    selectedMonth: number;
    selectedYear: number;
    handleMonthChange: (month: number) => void;
    handleYearChange: (year: number) => void;
    handleViewRecord: (record: ExtendedRawAttendanceRecord) => void;
    handleBack: () => void;
    fetchReportData: () => Promise<void>;
    formatDate: (dateString: string) => string;
    employeeId: string;
    theme: 'light' | 'dark';  // Add this line
}

interface RegularizationRecord {
  _id: string;
  date: string;
  isRegularized: boolean;
  regularizationStatus: string;
  remarks: string;
  status: string;
  originalStatus: string;
  punchInTime: string;
  punchOutTime: string;
  regularizationDate: string;
  regularizationReason: string;
  regularizedBy: string;
}

interface MonthlySummary {
  totalDays: number;
  presentDays: number;
  regularizedPresentDays: number;
  halfDays: number;
  partiallyAbsentDays: number;
  weekOffs: number;
  holidays: number;
  el: number;
  sl: number;
  cl: number;
  compOff: number;
  lop: number;
}

const formatHoursToHoursAndMinutes = (hoursDecimal: string): string => {
    if (hoursDecimal === '0' || hoursDecimal === 'N/A') return 'N/A';
    const hours = Math.floor(parseFloat(hoursDecimal));
    const minutes = Math.round((parseFloat(hoursDecimal) - hours) * 60);
    return `${hours}h ${minutes}m`;
};

const formatTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    // If it's already in HH:mm:ss or HH:mm format
    const timeMatch = dateString.match(/(\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
        return timeMatch[1];
    }
    const timeMatchShort = dateString.match(/(\d{2}:\d{2})/);
    if (timeMatchShort) {
        return timeMatchShort[1];
    }
    // Try parsing as a full date string
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        // If the time is 00:00:00, treat as missing
        const h = date.getHours();
        const m = date.getMinutes();
        const s = date.getSeconds();
        if (h === 0 && m === 0 && s === 0) return '-';
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return '-';
};

const AttendanceReport: React.FC<AttendanceReportProps> = ({
    // loading,
    attendanceData,
    selectedMonth,
    selectedYear,
    handleMonthChange,
    handleYearChange,
    handleBack,
    formatDate,
    employeeId,
    theme
}) => {
    const [selectedRecord, setSelectedRecord] = useState<ExtendedRawAttendanceRecord | null>(null);
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
    const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
    const [inLocationAddress, setInLocationAddress] = useState<string | null>(null);
    const [outLocationAddress, setOutLocationAddress] = useState<string | null>(null);
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);

    // Date range state
    const [dateFrom, setDateFrom] = useState<string>(() => formatDateFns(startOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState<string>(() => formatDateFns(endOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd'));

    // Update date range when month/year changes
    useEffect(() => {
      setDateFrom(formatDateFns(startOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd'));
      setDateTo(formatDateFns(endOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd'));
    }, [selectedMonth, selectedYear]);

    // Filter and sort records by date range
    const filteredRecords = attendanceData.map((record: ExtendedRawAttendanceRecord): ExtendedRawAttendanceRecord =>
        record
    ).filter(record => {
        const d = new Date(record.date);
        return d >= new Date(dateFrom) && d <= new Date(dateTo);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    const downloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            filteredRecords.map(record => ({
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

    const getDayType = (date: string, year: number, month: number, projectName?: string) => {
        const dateStr = date.split('T')[0];
        const d = new Date(dateStr);
        // Special rule for 'Arvind Technical' and 'Exozen - Ops'
        if (
            projectName &&
            (
                projectName.trim().toLowerCase() === 'arvind technical' ||
                projectName.trim().toLowerCase() === 'exozen - ops'
            )
        ) {
            if (d.getDay() === 0) {
                return 'Sunday';
            }
            // For these projects, all Saturdays are working days
            return 'Working Day';
        }
        // Default logic for other projects
        if (governmentHolidays.includes(dateStr)) {
            return governmentHolidayMap[dateStr] || 'Holiday';
        }
        if (d.getDay() === 0) {
            return 'Sunday';
        }
        if (d.getDay() === 6) { // Saturday
            const weekNumber = Math.ceil((d.getDate() + (new Date(year, month - 1, 1).getDay())) / 7);
            if (weekNumber === 2) {
                return '2nd Saturday';
            } else if (weekNumber === 4) {
                return '4th Saturday';
            }
        }
        return 'Working Day';
    };

 const enrichWithLocations = (data: ExtendedRawAttendanceRecord[]): ExtendedRawAttendanceRecord[] => {
  return data.map(record => ({
    ...record,
    punchInLocation: record.punchInLatitude && record.punchInLongitude
      ? {
          latitude: record.punchInLatitude,
          longitude: record.punchInLongitude,
          address: null
        }
      : undefined,
    punchOutLocation: record.punchOutLatitude && record.punchOutLongitude
      ? {
          latitude: record.punchOutLatitude,
          longitude: record.punchOutLongitude,
          address: null
        }
      : undefined
  }));
};


    // Replace the reverseGeocode function in this block with the enhanced version
    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        console.log('Geocoding request for:', { lat, lng });
        const GOOGLE_MAPS_API_KEY = 'AIzaSyCqvcEKoqwRG5PBDIVp-MjHyjXKT3s4KY4';
       
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
            console.log('Geocoding URL:', url);

            const response = await fetch(url);
            const data: GoogleMapsGeocodingResponse = await response.json();
           
            console.log('Geocoding response:', data);

            if (data.status === 'OK' && data.results?.[0]) {
                // Extract detailed address components
                const result = data.results[0];
                const addressComponents = {
                    streetNumber: '',
                    route: '',
                    locality: '',
                    area: '',
                    city: '',
                    state: '',
                    country: ''
                };

                result.address_components.forEach((component: GoogleMapsAddressComponent) => {
                    if (component.types.includes('street_number')) addressComponents.streetNumber = component.long_name;
                    if (component.types.includes('route')) addressComponents.route = component.long_name;
                    if (component.types.includes('locality')) addressComponents.locality = component.long_name;
                    if (component.types.includes('sublocality')) addressComponents.area = component.long_name;
                    if (component.types.includes('administrative_area_level_2')) addressComponents.city = component.long_name;
                    if (component.types.includes('administrative_area_level_1')) addressComponents.state = component.long_name;
                    if (component.types.includes('country')) addressComponents.country = component.long_name;
                });

                console.log('Parsed address components:', addressComponents);

                // Format address string
                const formattedAddress = [
                    [addressComponents.streetNumber, addressComponents.route].filter(Boolean).join(' '),
                    addressComponents.area,
                    addressComponents.locality,
                    addressComponents.city,
                    addressComponents.state,
                    addressComponents.country
                ].filter(Boolean).join(', ');

                console.log('Formatted address:', formattedAddress);
                return formattedAddress;
            }
           
            console.warn('No results found for location:', { lat, lng });
            return 'Location not found';
        } catch (error) {
            console.error('Geocoding error:', error);
            return 'Error fetching location';
        }
    };

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
                    // Filter leave history for selected month and year
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
            .catch(() => {
                setLeaveHistory([]);
            });
    }, [employeeId, selectedMonth, selectedYear]);

    // Update the useEffect for fetching locations
    useEffect(() => {
        const fetchLocations = async () => {
            console.log('Selected record for location:', selectedRecord);

            if (selectedRecord) {
                try {
                    if (selectedRecord.punchInLocation?.latitude && selectedRecord.punchInLocation?.longitude) {
                        console.log('Fetching punch-in location:', selectedRecord.punchInLocation);
                        const inAddress = await reverseGeocode(
                            selectedRecord.punchInLocation.latitude,
                            selectedRecord.punchInLocation.longitude
                        );
                        console.log('Punch-in address found:', inAddress);
                        setInLocationAddress(inAddress);
                    }

                    if (selectedRecord.punchOutLocation?.latitude && selectedRecord.punchOutLocation?.longitude) {
                        console.log('Fetching punch-out location:', selectedRecord.punchOutLocation);
                        const outAddress = await reverseGeocode(
                            selectedRecord.punchOutLocation.latitude,
                            selectedRecord.punchOutLocation.longitude
                        );
                        console.log('Punch-out address found:', outAddress);
                        setOutLocationAddress(outAddress);
                    }
                } catch (error) {
                    console.error('Error in location fetching:', error);
                    setInLocationAddress('Error fetching location');
                    setOutLocationAddress('Error fetching location');
                }
            } else {
                setInLocationAddress(null);
                setOutLocationAddress(null);
            }
        };
        fetchLocations();
    }, [selectedRecord]);

    // Add this new helper function
    const isLeaveDate = (date: string): string | null => {
        const target = new Date(date).toDateString();
        for (const leave of leaveHistory) {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const status = leave.status.toLowerCase();

            if (status === 'approved') {
                const current = new Date(start);
                while (current <= end) {
                    if (current.toDateString() === target) {
                        return leave.leaveType; // SL, CL, EL, etc.
                    }
                    current.setDate(current.getDate() + 1);
                }
            }
        }
        return null;
    };

    // Update the getAttendanceStatus function
    const getAttendanceStatus = (record: ExtendedRawAttendanceRecord, dayType: string) => {
        const leaveType = isLeaveDate(record.date);
        if (leaveType) {
            return leaveType + ' Leave';
        }
        // Special comp off logic for 'Arvind Technical'
        const isArvind = record.projectName && record.projectName.trim().toLowerCase() === 'arvind technical';
        if (isArvind) {
            if (dayType === 'Sunday' && record.punchInTime && record.punchOutTime) {
                const inTime = record.punchInUtc || record.punchInTime;
                const outTime = record.punchOutUtc || record.punchOutTime;
                const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
                if (hoursWorked >= 4) {
                    return 'Comp Off';
                }
            }
        } else {
            // For other projects, comp off for working on holidays/2nd/4th Sat/Sunday
            if (dayType !== 'Working Day' && record.punchInTime && record.punchOutTime) {
                const inTime = record.punchInUtc || record.punchInTime;
                const outTime = record.punchOutUtc || record.punchOutTime;
                const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
                if (hoursWorked >= 4) {
                    return 'Comp Off';
                }
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
        doc.addImage("/v1/employee/exozen_logo1.png", 'PNG', 15, yPosition, 25, 8);
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
        const tableColumn = ["Date", "Check In", "Check Out", "Hours Worked", "Shortage Hours", "Day Type", "Status"];
        const tableRows = filteredRecords.map((record: ExtendedRawAttendanceRecord) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
            const status = getAttendanceStatus(record, dayType);
            let hoursWorked = '-';
            let hoursWorkedNum = 0;
            let shortage = '-';
            if (record.punchInTime && record.punchOutTime) {
                const inTime = record.punchInUtc || record.punchInTime;
                const outTime = record.punchOutUtc || record.punchOutTime;
                hoursWorkedNum = parseFloat(calculateHoursUtc(inTime, outTime));
                hoursWorked = formatHoursToHoursAndMinutes(hoursWorkedNum.toString());
                shortage = hoursWorkedNum < 9 ? formatShortage(hoursWorkedNum) : '-';
            } else if (dayType !== 'Working Day') {
                hoursWorked = '-';
            }

            return [
                formatDate(record.date),
                formatTime(record.punchInTime),
                formatTime(record.punchOutTime),
                hoursWorked,
                shortage,
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
                0: { cellWidth: 22 }, // Date
                1: { cellWidth: 20 }, // Check In
                2: { cellWidth: 20 }, // Check Out
                3: { cellWidth: 22 }, // Hours Worked
                4: { cellWidth: 22 }, // Shortage Hours
                5: { cellWidth: 22 }, // Day Type
                6: { cellWidth: 22 }  // Status
            }
        });

        // Second page - Monthly Summary
        doc.addPage();
        // Use monthlySummary from API if available
        if (monthlySummary) {
          autoTable(doc, {
            head: [[
              'Total Days',
              'Present Days',
              'Regularized Present',
              'Half Days',
              'Partially Absent',
              'Total Weekoff',
              'Holidays',
              'EL',
              'SL',
              'CL',
              'Comp Off',
              'LOP'
            ]],
            body: [[
              monthlySummary.totalDays,
              monthlySummary.presentDays,
              monthlySummary.regularizedPresentDays,
              monthlySummary.halfDays,
              monthlySummary.partiallyAbsentDays,
              monthlySummary.weekOffs,
              monthlySummary.holidays,
              monthlySummary.el,
              monthlySummary.sl,
              monthlySummary.cl,
              monthlySummary.compOff,
              monthlySummary.lop
            ]],
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 15 },
              1: { cellWidth: 15 },
              2: { cellWidth: 15 },
              3: { cellWidth: 15 },
              4: { cellWidth: 18 },
              5: { cellWidth: 15 },
              6: { cellWidth: 15 },
              7: { cellWidth: 15 },
              8: { cellWidth: 15 },
              9: { cellWidth: 20 },
              10: { cellWidth: 15 }
            },
            margin: { left: 10, right: 10 }
          });
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

          // Add Overall Summary section
          doc.setFontSize(11);
          doc.setTextColor(41, 128, 185);
          doc.text('Overall Summary', 12, yPosition);
          yPosition += 8;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const totalPayableDays = monthlySummary.presentDays + monthlySummary.regularizedPresentDays + (monthlySummary.halfDays / 2) + monthlySummary.weekOffs + monthlySummary.el + monthlySummary.cl + monthlySummary.sl;
          const attendancePercentage = monthlySummary.totalDays > 0 ? ((totalPayableDays / monthlySummary.totalDays) * 100).toFixed(2) : '0.00';
          doc.text(`Total Days: ${monthlySummary.totalDays}`, 12, yPosition);
          yPosition += 7;
          doc.text(`Total Payable Days: ${totalPayableDays}`, 12, yPosition);
          yPosition += 7;
          doc.text(`Attendance Percentage: ${attendancePercentage}%`, 12, yPosition);
        } else {
          // Calculate summary from attendance records and leave history
          let presentDays = 0;
          let halfDays = 0;
          let partiallyAbsentDays = 0;
          let weekOffs = 0;
          let holidays = 0;
          let el = 0;
          let sl = 0;
          let cl = 0;
          let compOffGained = 0;
          let compOffLeaveUsed = 0;
          let lop = 0;

          // Helper: is this a week off day?
          const isWeekOffDay = (date: string, year: number, month: number, projectName?: string) => {
            const dayType = getDayType(date, year, month, projectName);
            return dayType === 'Sunday' || dayType === '2nd Saturday' || dayType === '4th Saturday';
          };

          // Build a set of all week off dates in the month
          const weekOffDates = new Set<string>();
          for (let d = 1; d <= new Date(selectedYear, selectedMonth, 0).getDate(); d++) {
            const dateStr = new Date(selectedYear, selectedMonth - 1, d).toISOString().split('T')[0];
            if (isWeekOffDay(dateStr, selectedYear, selectedMonth)) {
              weekOffDates.add(dateStr);
            }
          }

          // Track which week off dates the employee worked on
          const workedWeekOffDates = new Set<string>();

          filteredRecords.forEach((record) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
            const status = getAttendanceStatus(record, dayType);
            const dateStr = record.date.split('T')[0];
            if (status === 'Present') presentDays++;
            else if (status === 'Half Day') halfDays += 0.5;
            else if (status === 'Partially Absent') partiallyAbsentDays++;
            else if (status === 'Comp Off') {
              compOffGained++;
              // If worked on week off, mark as worked
              if (isWeekOffDay(record.date, selectedYear, selectedMonth, record.projectName ?? undefined)) {
                workedWeekOffDates.add(dateStr);
              }
            }
            else if (status === 'Absent') lop++;
            // Holidays
            if (dayType === 'Holiday') holidays++;
            // Comp Off Leave Used
            if (status === 'CompOff Leave') compOffLeaveUsed++;
          });

          // Weekoff: only those week off dates where employee did NOT work
          weekOffs = Array.from(weekOffDates).filter(date => !workedWeekOffDates.has(date)).length;

          // Count EL, SL, CL from leaveHistory for the selected month
          leaveHistory.forEach((leave) => {
            if (leave.leaveType === 'EL') el += leave.numberOfDays;
            if (leave.leaveType === 'SL') sl += leave.numberOfDays;
            if (leave.leaveType === 'CL') cl += leave.numberOfDays;
          });

          // LOP: add Partially Absent as LOP if required
          lop += partiallyAbsentDays;

          // Calculate Total Payable Days (exclude LOP/Absent days)
          let totalPayableDays = presentDays + halfDays + weekOffs + holidays + el + cl + sl + compOffLeaveUsed + compOffGained - lop;
          if (totalPayableDays < 0) totalPayableDays = 0;
          // Note: LOP is now subtracted from totalPayableDays

          autoTable(doc, {
            head: [[
              'Total Days',
              'Present Days',
              'Half Days',
              'Partially Absent',
              'Total Weekoff',
              'Holidays',
              'EL',
              'SL',
              'CL',
              'Comp Off (Gained)',
              'Comp Off Leave (Used)',
              'LOP'
            ]],
            body: [[
              filteredRecords.length,
              presentDays,
              halfDays,
              partiallyAbsentDays,
              weekOffs,
              holidays,
              el,
              sl,
              cl,
              compOffGained,
              compOffLeaveUsed,
              lop
            ]],
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 15 },
              1: { cellWidth: 15 },
              2: { cellWidth: 15 },
              3: { cellWidth: 15 },
              4: { cellWidth: 18 },
              5: { cellWidth: 15 },
              6: { cellWidth: 15 },
              7: { cellWidth: 15 },
              8: { cellWidth: 15 },
              9: { cellWidth: 20 },
              10: { cellWidth: 15 }
            },
            margin: { left: 10, right: 10 }
          });

          // Add spacing after summary table
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);

          // Summary text
          const totalWorkingDays = filteredRecords.length;
          // Attendance Percentage (keep as is)
          const attendancePercentage = totalWorkingDays > 0 ? ((totalPayableDays / totalWorkingDays) * 100).toFixed(2) : '0.00';
          let totalPayableText = `Total Payable Days: ${totalPayableDays}`;
          if (compOffGained > 0) {
            totalPayableText += ` (Comp Off Gained: ${compOffGained})`;
          }
          doc.text([
              `Total Working Days: ${totalWorkingDays} days`,
              totalPayableText,
              `Attendance Percentage: ${attendancePercentage}%`
          ], 12, yPosition, { lineHeightFactor: 1.5 });
          yPosition += 15 * 1;
        }

        // Add extra spacing after summary text before leave table
        yPosition += 15;

        // Add Leave Balance section on same page, but check for overflow
        if (leaveBalance && leaveBalance.balances) {
          // If not enough space, add a new page
          if (yPosition + 40 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            yPosition = 20;
          }
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
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 18, halign: 'center' },
              2: { cellWidth: 18, halign: 'center' },
              3: { cellWidth: 18, halign: 'center' },
              4: { cellWidth: 18, halign: 'center' }
            },
            margin: { left: 10, right: 10 }
          });
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
          // If the summary line would overflow, move to next page
          if (yPosition + 8 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            yPosition = 20;
          }
          doc.setFontSize(9);
          doc.text(`Total Allocated: ${leaveBalance.totalAllocated}   Total Used: ${leaveBalance.totalUsed}   Total Remaining: ${leaveBalance.totalRemaining}   Total Pending: ${leaveBalance.totalPending}`, 12, yPosition);
          yPosition += 8;
        }

        // Add Leave History section after leave balance, check for overflow
        if (leaveHistory.length > 0) {
            if (yPosition + 40 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                yPosition = 20;
            }
            doc.setFontSize(11);
            doc.setTextColor(41, 128, 185);
            doc.text('Leave History', 12, yPosition);
            yPosition += 8;

            const leaveHistoryHead = [['Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason']];
            const leaveHistoryRows = leaveHistory.map(leave => [
                leave.leaveType,
                new Date(leave.startDate).toLocaleDateString(),
                new Date(leave.endDate).toLocaleDateString(),
                leave.numberOfDays + (leave.isHalfDay ? ' (Half)' : ''),
                leave.status,
                leave.reason.substring(0, 20) + (leave.reason.length > 20 ? '...' : '')
            ]);

            autoTable(doc, {
                head: leaveHistoryHead,
                body: leaveHistoryRows,
                startY: yPosition,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 18 },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 22 },
                    3: { cellWidth: 12 },
                    4: { cellWidth: 18 },
                    5: { cellWidth: 40 }
                },
                margin: { left: 10, right: 10 }
            });
            yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }

        // Get the final Y position after all tables
        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        const pageHeight = doc.internal.pageSize.getHeight();
        // Calculate required space for note + signature
        let noteY = finalY + 20;
        let signatureY = noteY + 18;
        // If not enough space, add a new page and reset Y positions
        if (signatureY + 20 > pageHeight) {
            doc.addPage();
            noteY = 30; // some top margin
            signatureY = noteY + 18;
        }
        // Add note below the leave history table with proper spacing
        doc.setFontSize(10);
        doc.setFont('bold');
        doc.setTextColor(200, 0, 0);
        const noteLabel = 'Note:';
        doc.setTextColor(0, 0, 0);
        const noteText = 'Please ensure that the total working hours per day are at least 8 hours.';
        doc.text(`${noteLabel} ${noteText}`, 12, noteY);

        // Signature lines
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(30, signatureY, 90, signatureY);
        doc.line(120, signatureY, 180, signatureY);
        doc.setFontSize(9);
        doc.text('Authorized Signature', 30, signatureY + 6);
        doc.text('Employee Signature', 120, signatureY + 6);

        doc.save(`attendance_report_${selectedMonth}_${selectedYear}.pdf`);
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

    // Add this function to extract time in HH:mm:ss from ISO string
    const extractTime = (dateString: string | null) => {
      if (!dateString) return '-';
      const match = dateString.match(/T(\d{2}:\d{2}:\d{2})/);
      return match ? match[1] : '-';
    };

    // In your component's main render logic, process the attendance data
    const processedData = enrichWithLocations(attendanceData);

    // Helper to batch fetch addresses for all records
    const fetchAllAddresses = async (records: ExtendedRawAttendanceRecord[]) => {
      const getAddress = async (lat?: number, lng?: number) => {
        if (!lat || !lng) return 'N/A';
        return await reverseGeocode(lat, lng);
      };
      const results = await Promise.all(records.map(async (record) => {
        const punchInAddress = record.punchInLocation?.latitude && record.punchInLocation?.longitude
          ? await getAddress(record.punchInLocation.latitude, record.punchInLocation.longitude)
          : 'N/A';
        const punchOutAddress = record.punchOutLocation?.latitude && record.punchOutLocation?.longitude
          ? await getAddress(record.punchOutLocation.latitude, record.punchOutLocation.longitude)
          : 'N/A';
        return {
          ...record,
          punchInResolvedAddress: punchInAddress,
          punchOutResolvedAddress: punchOutAddress,
        };
      }));
      return results;
    };

    // Export Location Report (PDF)
    const downloadLocationPDF = async () => {
      // Filter records for the selected month/year
      const filteredRecords = processedData.filter(record => {
        const dateObj = new Date(record.date);
        return dateObj.getMonth() === selectedMonth - 1 && dateObj.getFullYear() === selectedYear;
      });
      // Fetch addresses for all records
      const recordsWithAddresses = await fetchAllAddresses(filteredRecords);
      // Now generate the PDF using recordsWithAddresses
      const doc = new jsPDF();
      let locYPosition = 15;
      // Add Exozen logo (top left)
      try {
        doc.addImage('/v1/employee/exozen_logo1.png', 'PNG', 15, locYPosition, 25, 8);
      } catch {
        // If image fails, continue without breaking
      }
      // Adjust text position to the right of the logo
      doc.setFontSize(12);
      doc.setTextColor(41, 128, 185);
      doc.text(`Attendance Location Report - ${months[selectedMonth - 1]} ${selectedYear}`, 45, locYPosition + 4);
      doc.setFontSize(10);
      doc.setTextColor(41, 128, 185);
      doc.text(`Employee ID: ${employeeId}`, 45, locYPosition + 8);
      locYPosition += 15;
      const locationTableHead = [
        ['Date', 'Check-in Location', 'Check-out Location']
      ];
      const locationTableRows = recordsWithAddresses.map(record => [
        formatDate(record.date),
        record.punchInResolvedAddress,
        record.punchOutResolvedAddress
      ]);
      autoTable(doc, {
        head: locationTableHead,
        body: locationTableRows,
        startY: locYPosition,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 70 },
          2: { cellWidth: 70 }
        },
        margin: { left: 15 }
      });
      doc.save(`location_report_${selectedMonth}_${selectedYear}.pdf`);
    };

    // Add this function after downloadLocationPDF
    const downloadRegularizationHistoryPDF = async () => {
      if (!employeeId) return;
      // Fetch regularization history
      const apiUrl = `https://cafm.zenapi.co.in/api/attendance/${employeeId}/regularization-history?`;
      try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        const monthName = months[selectedMonth - 1];
        if (!data.success || !data.data || !Array.isArray(data.data.regularizations)) {
          // Show PDF with message if no data
          const doc = new jsPDF();
          doc.setFontSize(14);
          doc.setTextColor(41, 128, 185);
          doc.text(`Regularization History Report - ${monthName} ${selectedYear}`, 15, 20);
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text('No regularization history found.', 15, 35);
          doc.save(`regularization_history_${monthName}_${selectedYear}.pdf`);
          return;
        }
        // Filter for current selected month and year
        const regularizations = (data.data.regularizations as RegularizationRecord[]).filter((r: RegularizationRecord) => {
          const date = new Date(r.date);
          return date.getMonth() === selectedMonth - 1 && date.getFullYear() === selectedYear;
        });
        const doc = new jsPDF();
        let yPosition = 15;
        // Add Exozen logo (top left)
        try {
          doc.addImage('/v1/employee/exozen_logo1.png', 'PNG', 15, yPosition, 25, 8);
        } catch {}
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.text(`Regularization History Report - ${monthName} ${selectedYear}`, 45, yPosition + 4);
        doc.setFontSize(10);
        doc.setTextColor(41, 128, 185);
        doc.text(`Employee ID: ${employeeId}`, 45, yPosition + 8);
        yPosition += 15;
        if (regularizations.length === 0) {
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text('No regularization history found for the selected month.', 15, yPosition + 10);
          doc.save(`regularization_history_${monthName}_${selectedYear}.pdf`);
          return;
        }
        // Table header
        const tableHead = [[
          'Date',
          'Punch In',
          'Punch Out',
          'Status',
          'Original Status',
          'Regularized',
          'Reg. Status',
          'Reg. Date',
          'Reason',
          'By',
          'Remarks'
        ]];
        // Table rows
        const tableRows = regularizations.map((r: RegularizationRecord) => [
          r.date ? new Date(r.date).toLocaleDateString() : '-',
          extractTime(r.punchInTime),
          extractTime(r.punchOutTime),
          r.status || '-',
          r.originalStatus || '-',
          r.isRegularized ? 'Yes' : 'No',
          r.regularizationStatus || '-',
          r.regularizationDate ? new Date(r.regularizationDate).toLocaleString() : '-',
          r.regularizationReason || '-',
          r.regularizedBy || '-',
          r.remarks || '-'
        ]);
        autoTable(doc, {
          head: tableHead,
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
            0: { cellWidth: 18 }, // Date
            1: { cellWidth: 15 }, // Punch In
            2: { cellWidth: 15 }, // Punch Out
            3: { cellWidth: 18 }, // Status
            4: { cellWidth: 18 }, // Original Status
            5: { cellWidth: 15 }, // Regularized
            6: { cellWidth: 18 }, // Reg. Status
            7: { cellWidth: 25 }, // Reg. Date
            8: { cellWidth: 25 }, // Reason
            9: { cellWidth: 15 }, // By
            10: { cellWidth: 20 } // Remarks
          },
          margin: { left: 10, right: 10 }
        });
        doc.save(`regularization_history_${monthName}_${selectedYear}.pdf`);
      } catch {
        // Show PDF with error message
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text(`Regularization History Report - ${months[selectedMonth - 1]} ${selectedYear}`, 15, 20);
        doc.setFontSize(11);
        doc.setTextColor(200, 0, 0);
        doc.text('Failed to download regularization history PDF.', 15, 35);
        doc.save(`regularization_history_${months[selectedMonth - 1]}_${selectedYear}.pdf`);
      }
    };

    // Fetch monthly summary from API (employee-specific endpoint)
    useEffect(() => {
        if (!employeeId || !selectedMonth || !selectedYear) return;
        fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-summary?month=${selectedMonth}&year=${selectedYear}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.summary) {
                    setMonthlySummary(data.data.summary);
                } else {
                    setMonthlySummary(null);
                }
            })
            .catch(() => setMonthlySummary(null));
    }, [employeeId, selectedMonth, selectedYear]);

    // Helper to format shortage hours
    const formatShortage = (hoursWorked: number): string => {
      if (isNaN(hoursWorked) || hoursWorked >= 9) return '-';
      const shortage = 9 - hoursWorked;
      const h = Math.floor(shortage);
      const m = Math.round((shortage - h) * 60);
      return `${h}h ${m}m`;
    };

    return (
        <div className={`space-y-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            {/* Header */}
            <div className={`${
                theme === 'dark'
                    ? 'bg-white/10'
                    : 'bg-blue-600'
            } text-white p-8 rounded-xl shadow-lg`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 ${
                            theme === 'dark'
                                ? 'bg-white/10'
                                : 'bg-white/20'
                        } backdrop-blur-sm rounded-xl`}>
                            <FaFileExcel className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Attendance Report</h1>
                            <p className={`${
                                theme === 'dark'
                                    ? 'text-blue-200'
                                    : 'text-blue-100'
                            } mt-1`}>View and download your attendance records</p>
                        </div>
                    </div>
                    <button
                        onClick={handleBack}
                        className={`flex items-center gap-2 px-4 py-2 ${
                            theme === 'dark'
                                ? 'bg-white/5 hover:bg-white/10'
                                : 'bg-white/10 hover:bg-white/20'
                        } backdrop-blur-sm rounded-lg transition-colors text-white`}
                    >
                        <FaChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className={`flex flex-wrap gap-4 items-center justify-between p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                <div className="flex gap-4">
                    <div className="relative">
                        <FaCalendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                        <select
                            value={selectedMonth}
                            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                            className={`pl-10 pr-4 py-2 border rounded-lg appearance-none ${
                                            theme === 'dark'
                                                ? 'bg-gray-800 border-gray-600 text-gray-200'
                                                : 'bg-white border-gray-200 text-gray-900'
                                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
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
               
                <div className="flex gap-4 items-center">
                  <label className="text-sm font-medium">From:</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1 rounded border" />
                  <label className="text-sm font-medium">To:</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1 rounded border" />
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
                  <button
                    onClick={downloadLocationPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaFilePdf className="w-4 h-4" />
                    Export Location Report (PDF)
                  </button>
                  <button
                    onClick={downloadRegularizationHistoryPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <FaFilePdf className="w-4 h-4" />
                    Export Regularization History (PDF)
                  </button>
                </div>
              </div>

            {/* Attendance Table */}
            <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Date
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Project
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Check In
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Check Out
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Hours Worked
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Shortage Hours
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Day Type
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Status
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredRecords.map((record: ExtendedRawAttendanceRecord, index) => {
                        const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                        let hoursWorkedNum = 0;
                        let hoursWorkedStr = '-';
                        let shortage = '-';
                        if (record.punchInTime && record.punchOutTime) {
                            // Use raw UTC values if available, else fallback to punchInTime/punchOutTime
                            const inTime = record.punchInUtc || record.punchInTime;
                            const outTime = record.punchOutUtc || record.punchOutTime;
                            hoursWorkedNum = parseFloat(calculateHoursUtc(inTime, outTime));
                            hoursWorkedStr = formatHoursToHoursAndMinutes(hoursWorkedNum.toString());
                            shortage = hoursWorkedNum < 9 ? formatShortage(hoursWorkedNum) : '-';
                        } else if (dayType !== 'Working Day') {
                            hoursWorkedStr = '-';
                        }
                        return (
                            <tr
                                key={record._id || index}
                                className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                            >
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {formatDate(record.date)}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {record.projectName || 'N/A'}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {formatTime(record.punchInTime)}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {formatTime(record.punchOutTime)}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {hoursWorkedStr}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {shortage}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {dayType}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        (() => {
                                            const status = getAttendanceStatus(record, dayType);
                                            switch (status) {
                                                case 'Present': return 'bg-green-100 text-green-800';
                                                case 'Half Day': return 'bg-yellow-100 text-yellow-800';
                                                case 'Comp Off': return 'bg-purple-100 text-purple-800';
                                                case 'Holiday': return 'bg-blue-100 text-blue-800';
                                                default: return status.includes('Leave') ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800';
                                            }
                                        })()
                                    }`}>
                                        {(() => {
                                            return getAttendanceStatus(record, dayType);
                                        })()}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                    <button
                                        onClick={() => setSelectedRecord(record)}
                                        className="text-blue-600 hover:underline"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal for viewing record details */}
              {selectedRecord && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                  <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
                    <button
                      onClick={() => setSelectedRecord(null)}
                      className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                      aria-label="Close"
                    >
                      &times;
                    </button>
                    <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                      Attendance Record Details
                    </h2>
                    <div className="space-y-4">
                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Date:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {formatDate(selectedRecord.date)}
                        </span>
                      </div>
                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Project Name:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {selectedRecord.projectName || 'N/A'}
                        </span>
                      </div>
                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Designation:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {selectedRecord.designation || 'N/A'}
                        </span>
                      </div>
                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch In Time:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {formatTime(selectedRecord.punchInTime)}
                        </span>
                      </div>
                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch Out Time:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {formatTime(selectedRecord.punchOutTime)}
                        </span>
                      </div>

                      {/* Punch In Location Details */}
                      <div className={`flex flex-col border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                          Punch In Details:
                        </span>
                        <div className="ml-4 space-y-2">
                            <div className="flex justify-between">
                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Time:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                                    {formatTime(selectedRecord.punchInTime)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                                <span className={`text-right max-w-[70%] ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {selectedRecord.punchInLocation
                                        ? (inLocationAddress || 'Fetching location...')
                                        : 'Location not available'}
                                </span>
                            </div>
                        </div>
                      </div>

                      {/* Punch Out Location Details */}
                      <div className={`flex flex-col border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                          Punch Out Details:
                        </span>
                        <div className="ml-4 space-y-2">
                            <div className="flex justify-between">
                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Time:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                                    {formatTime(selectedRecord.punchOutTime)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                                <span className={`text-right max-w-[70%] ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {selectedRecord.punchOutLocation
                                        ? (outLocationAddress || 'Fetching location...')
                                        : 'Location not available'}
                                </span>
                            </div>
                        </div>
                      </div>

                      {/* Attendance Photos section remains unchanged */}
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
        </div>
      );
};

export default AttendanceReport;