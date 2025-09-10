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

// Google Maps interfaces removed - now using Nominatim (OpenStreetMap)





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





interface AttendanceReportProps {
    loading: boolean;
    attendanceData: BaseRawAttendanceRecord[];
    selectedMonth: number;
    selectedYear: number;
    handleMonthChange: (month: number) => void;
    handleYearChange: (year: number) => void;
    handleViewRecord: (record: BaseRawAttendanceRecord) => void;
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
  weekOffsWorked?: number;
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
    const [selectedRecord, setSelectedRecord] = useState<TransformedAttendanceRecord | null>(null);
    const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
    const [inLocationAddress, setInLocationAddress] = useState<string | null>(null);
    const [outLocationAddress, setOutLocationAddress] = useState<string | null>(null);
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
    const [fromDateForPDF, setFromDateForPDF] = useState<string>('');
    const [toDateForPDF, setToDateForPDF] = useState<string>('');

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const governmentHolidayMap: { [key: string]: string } = {
        // 2024 Holidays
        '2024-01-26': 'Republic Day',
        '2024-03-25': 'Holi',
        '2024-04-09': 'Ram Navami',
        '2024-05-01': 'Labor Day',
        '2024-08-08': 'Varmahalski Holiday',
        '2024-08-15': 'Independence Day',
        '2024-08-27': 'Ganesha Chaturthi',
        '2024-10-02': 'Gandhi Jayanti',
        '2024-11-14': 'Diwali',
        '2024-12-25': 'Christmas',
        
        // 2025 Holidays
        '2025-01-26': 'Republic Day',
        '2025-03-14': 'Holi',
        '2025-04-09': 'Ram Navami',
        '2025-05-01': 'Labor Day',
        '2025-08-08': 'Varmahalski Holiday',
        '2025-08-15': 'Independence Day',
        '2025-08-27': 'Ganesha Chaturthi',
        '2025-10-02': 'Gandhi Jayanti',
        '2025-11-03': 'Diwali',
        '2025-12-25': 'Christmas',
        
        // 2026 Holidays
        '2026-01-26': 'Republic Day',
        '2026-03-03': 'Holi',
        '2026-03-29': 'Ram Navami',
        '2026-05-01': 'Labor Day',
        '2026-08-08': 'Varmahalski Holiday',
        '2026-08-15': 'Independence Day',
        '2026-08-27': 'Ganesha Chaturthi',
        '2026-10-02': 'Gandhi Jayanti',
        '2026-10-23': 'Diwali',
        '2026-12-25': 'Christmas',
        
        // 2027 Holidays
        '2027-01-26': 'Republic Day',
        '2027-03-22': 'Holi',
        '2027-03-18': 'Ram Navami',
        '2027-05-01': 'Labor Day',
        '2027-08-08': 'Varmahalski Holiday',
        '2027-08-15': 'Independence Day',
        '2027-08-27': 'Ganesha Chaturthi',
        '2027-10-02': 'Gandhi Jayanti',
        '2027-11-12': 'Diwali',
        '2027-12-25': 'Christmas',
        
        // 2028 Holidays
        '2028-01-26': 'Republic Day',
        '2028-03-10': 'Holi',
        '2028-04-06': 'Ram Navami',
        '2028-05-01': 'Labor Day',
        '2028-08-08': 'Varmahalski Holiday',
        '2028-08-15': 'Independence Day',
        '2028-08-27': 'Ganesha Chaturthi',
        '2028-10-02': 'Gandhi Jayanti',
        '2028-10-30': 'Diwali',
        '2028-12-25': 'Christmas',
    };

    const governmentHolidays = Object.keys(governmentHolidayMap);



    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + 2 - i);

    // Transform attendanceData using the shared logic
    const processedAttendanceData = attendanceData.map((record: BaseRawAttendanceRecord): TransformedAttendanceRecord => {
        // Debug logging for August 15
        if (record.date.includes('08-15') || record.date.includes('2025-08-15')) {
            console.log('Processing August 15 record:', {
                originalDate: record.date,
                splitDate: record.date.split('T')[0],
                isHoliday: governmentHolidays.includes(record.date.split('T')[0]),
                holidayName: governmentHolidayMap[record.date.split('T')[0]]
            });
        }
        return transformAttendanceRecord(record);
    });



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

    const getDayType = (date: string, year: number, month: number, projectName?: string) => {
        // Handle different date formats
        let dateStr = date;
        if (date.includes('T')) {
            dateStr = date.split('T')[0];
        } else if (date.includes(' ')) {
            dateStr = date.split(' ')[0];
        }
        
        const d = new Date(dateStr);
        
        // Debug logging for August holidays
        if (dateStr.includes('08-08') || dateStr.includes('08-15')) {
            console.log('Checking August holiday:', {
                dateStr,
                year,
                month,
                projectName,
                isHoliday: governmentHolidays.includes(dateStr),
                holidayName: governmentHolidayMap[dateStr],
                fullDate: date,
                splitDate: date.split('T')[0],
                normalizedDate: dateStr
            });
        }
        
        // Check for government holidays FIRST (before any other logic)
        if (governmentHolidays.includes(dateStr)) {
            console.log('Found holiday:', dateStr, governmentHolidayMap[dateStr]);
            return governmentHolidayMap[dateStr] || 'Holiday';
        }
        
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

    // Replace the reverseGeocode function with Nominatim (free alternative)
    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        // Validate coordinates
        if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.warn('Invalid coordinates:', { lat, lng });
            return 'Invalid coordinates';
        }

        console.log('Geocoding request for:', { lat, lng });
       
        try {
            // Using Nominatim (OpenStreetMap) - completely free, no API key required
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&zoom=18`;
            console.log('Geocoding URL:', url);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'EmployeeManagementApp/1.0' // Required by Nominatim
                }
            });

            if (!response.ok) {
                console.warn(`Nominatim API error: ${response.status} ${response.statusText}`);
                return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }

            const data = await response.json();
            console.log('Geocoding response:', data);

            if (data && data.display_name) {
                // Extract address components from Nominatim response
                const address = data.address || {};
                
                // Build a readable address from available components
                const addressParts = [
                    address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
                    address.suburb || address.neighbourhood,
                    address.city || address.town || address.village,
                    address.state,
                    address.country
                ].filter(Boolean);

                const formattedAddress = addressParts.join(', ') || data.display_name;
                
                console.log('Formatted address:', formattedAddress);
                return formattedAddress;
            } else if (data && data.error) {
                console.warn('Nominatim error:', data.error);
                return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
           
            console.warn('No results found for location:', { lat, lng });
            return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        } catch (error) {
            console.error('Geocoding error:', error);
            return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
    };



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
    const getAttendanceStatus = (record: TransformedAttendanceRecord, dayType: string) => {
        const leaveType = isLeaveDate(record.date);
        if (leaveType) {
            return leaveType + ' Leave';
        }

        // Check if this is a government holiday FIRST (highest priority)
        const dateStr = record.date.split('T')[0];
        // Also try to handle different date formats
        let normalizedDate = dateStr;
        if (record.date.includes('T')) {
            normalizedDate = record.date.split('T')[0];
        } else if (record.date.includes(' ')) {
            normalizedDate = record.date.split(' ')[0];
        } else {
            normalizedDate = record.date;
        }
        
        if (governmentHolidays.includes(normalizedDate)) {
            console.log('Government holiday detected:', normalizedDate, governmentHolidayMap[normalizedDate]);
            // If it's a government holiday and employee worked, check for Comp Off
            if (record.punchInTime && record.punchOutTime) {
                const inTime = record.punchInUtc || record.punchInTime;
                const outTime = record.punchOutUtc || record.punchOutTime;
                const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
                console.log(`  Holiday work check: ${inTime} to ${outTime} = ${hoursWorked} hours`);
                if (hoursWorked >= 4) {
                    console.log(`  -> Returning Comp Off for holiday work`);
                    return 'Comp Off';
                } else {
                    console.log(`  -> Not enough hours (${hoursWorked} < 4), returning Holiday`);
                }
            } else {
                console.log(`  -> No punch in/out times, returning Holiday`);
            }
            // If no work done on holiday, return Holiday
            return 'Holiday';
        }

        // Normalize project name
        const project = record.projectName ? record.projectName.trim().toLowerCase() : '';
        const isArvind = project === 'arvind technical';
        const isExozenOps = project === 'exozen - ops';
        const isExozenIT = project === 'exozen - it';
        const isExozenFMS = project === 'exozen - fms';

        if (isArvind) {
            // For Arvind Technical, only allow Comp Off for working on Sunday
            if (dayType === 'Sunday' && record.punchInTime && record.punchOutTime) {
                const inTime = record.punchInUtc || record.punchInTime;
                const outTime = record.punchOutUtc || record.punchOutTime;
                const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
                if (hoursWorked >= 4) {
                    return 'Comp Off';
                }
            }
        } else if (isExozenOps) {
            // For Exozen - Ops, all Saturdays are working days, so no Comp Off for 2nd/4th Sat
            // Do NOT give Comp Off for 2nd/4th Saturday, only for holidays and Sundays
            if ((dayType === 'Holiday' || dayType === 'Sunday') && record.punchInTime && record.punchOutTime) {
                const inTime = record.punchInUtc || record.punchInTime;
                const outTime = record.punchOutUtc || record.punchOutTime;
                const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
                if (hoursWorked >= 4) {
                    return 'Comp Off';
                }
            }
        } else if (isExozenIT || isExozenFMS) {
            // For Exozen-IT and Exozen-FMS, give Comp Off for working on holidays, 2nd/4th Sat, or Sunday
            if (dayType !== 'Working Day' && record.punchInTime && record.punchOutTime) {
                const inTime = record.punchInUtc || record.punchInTime;
                const outTime = record.punchOutUtc || record.punchOutTime;
                const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
                if (hoursWorked >= 4) {
                    return 'Comp Off';
                }
            }
        } else {
            // For other projects, comp off for working on holidays, 2nd/4th Sat, or Sunday
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

    // Integrate date range into the main downloadPDF function
    const downloadPDF = async () => {
        const doc = new jsPDF();
        let yPosition = 15;

        // If a date range is selected, filter records for that range; otherwise, use the full month
        let filteredRecords: TransformedAttendanceRecord[];
        let reportTitle = `Attendance Report - ${months[selectedMonth - 1]} ${selectedYear}`;
        let singlePage = false;
        if (fromDateForPDF && toDateForPDF) {
            const fromDateObj = new Date(fromDateForPDF);
            const toDateObj = new Date(toDateForPDF);
            if (fromDateObj > toDateObj) {
                alert("From date cannot be after To date.");
                return;
            }
            filteredRecords = processedAttendanceData.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= fromDateObj && recordDate <= toDateObj;
            });
            if (filteredRecords.length === 0) {
                alert("No attendance data found for selected date range.");
                return;
            }
            reportTitle = `Attendance Report - ${fromDateForPDF} to ${toDateForPDF}`;
            singlePage = true;
        } else {
            filteredRecords = processedAttendanceData.filter(record => {
                const dateObj = new Date(record.date);
                const isInMonth = dateObj.getMonth() === selectedMonth - 1 && dateObj.getFullYear() === selectedYear;
                
                // Debug specific dates
                const dateStr = record.date.split('T')[0];
                if (dateStr.includes('2025-08-08') || dateStr.includes('2025-08-15') || dateStr.includes('2025-08-27') || dateStr.includes('2025-08-31')) {
                  console.log('Filtering check for', dateStr, ':', {
                    originalDate: record.date,
                    dateObj: dateObj.toISOString(),
                    month: dateObj.getMonth(),
                    year: dateObj.getFullYear(),
                    selectedMonth: selectedMonth,
                    selectedYear: selectedYear,
                    isInMonth
                  });
                }
                
                return isInMonth;
            });
        }

        // First page - Header and Attendance Table
        doc.addImage("/v1/employee/exozen_logo1.png", 'PNG', 15, yPosition, 25, 8);
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text(reportTitle, 45, yPosition + 4);
        doc.setFontSize(9);
        doc.text(`Employee ID: ${employeeId}`, 45, yPosition + 8);

        yPosition += 12;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition, 195, yPosition);
        yPosition += 5;

        // Attendance table on first page
        const tableColumn = ["Date", "Check In", "Check Out", "Hours Worked", "Shortage Hours", "Day Type", "Status"];
        // Helper function to safely calculate hours
        const safeCalculateHoursUtc = (inTime?: string | null, outTime?: string | null): string => {
            if (!inTime || !outTime) return '0';
            return calculateHoursUtc(inTime, outTime);
        };

        const tableRows = filteredRecords.map((record: TransformedAttendanceRecord) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName || undefined);
            const status = getAttendanceStatus(record, dayType);
            let hoursWorked = 'Incomplete';
            let hoursWorkedNum = 0;
            if (record.punchInUtc && record.punchOutUtc) {
                hoursWorkedNum = parseFloat(safeCalculateHoursUtc(record.punchInUtc, record.punchOutUtc));
                hoursWorked = formatHoursToHoursAndMinutes(hoursWorkedNum.toString());
            } else if (dayType !== 'Working Day') {
                hoursWorked = '-';
            }
            const shortage = hoursWorkedNum && hoursWorkedNum < 9 ? formatShortage(hoursWorkedNum) : '-';

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
            styles: { 
                fontSize: 8, 
                cellPadding: 2,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
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
            },
            pageBreak: singlePage ? 'avoid' : 'auto',
            margin: { top: 20, right: 15, bottom: 20, left: 15 },
            tableWidth: 'auto',
            showHead: 'everyPage',
            didDrawPage: (data) => {
                // Add header on each page
                if (data.pageNumber > 1) {
                    doc.setFontSize(11);
                    doc.setTextColor(41, 128, 185);
                    doc.text(reportTitle, 15, 10);
                    doc.setFontSize(9);
                    doc.text(`Employee ID: ${employeeId}`, 15, 15);
                }
            }
        });

        // If a date range is selected, do not add more pages (single page only)
        if (singlePage) {
            doc.save(`attendance_${fromDateForPDF}_to_${toDateForPDF}.pdf`);
            return;
        }

        // Get the final Y position after the attendance table
        const attendanceTableFinalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        
        // Check if we need a new page for the summary
        const summaryPageHeight = doc.internal.pageSize.getHeight();
        const requiredSpaceForSummary = 80; // Approximate space needed for summary
        
        if (attendanceTableFinalY + requiredSpaceForSummary > summaryPageHeight - 20) {
            doc.addPage();
            yPosition = 15;
        } else {
            yPosition = attendanceTableFinalY + 5;
        }
        
        // Calculate Comp Off count from attendance records regardless of API data
        let calculatedCompOffGained = 0;
        console.log('=== CALCULATING COMP OFF FROM RECORDS ===');
        console.log('Total filtered records to process:', filteredRecords.length);
        filteredRecords.forEach((record) => {
          const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
          const status = getAttendanceStatus(record, dayType);
          const dateStr = record.date.split('T')[0];
          
          console.log(`Record ${dateStr}: Status = ${status}, DayType = ${dayType}`);
          
          if (status === 'Comp Off') {
            calculatedCompOffGained++;
            console.log(`  -> Comp Off found! Total count now: ${calculatedCompOffGained}`);
          }
        });
        console.log('=== FINAL CALCULATED COMP OFF GAINED:', calculatedCompOffGained, '===');

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
              'Week Offs Worked',
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
              monthlySummary.weekOffsWorked || 0,
              monthlySummary.holidays,
              monthlySummary.el,
              monthlySummary.sl,
              monthlySummary.cl,
              calculatedCompOffGained, // Use calculated value instead of API value
              monthlySummary.lop
            ]],
            startY: yPosition,
            theme: 'grid',
            styles: { 
              fontSize: 7, 
              cellPadding: 2, 
              halign: 'center',
              overflow: 'linebreak'
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: 255, 
              fontSize: 7, 
              fontStyle: 'bold' 
            },
            columnStyles: {
              0: { cellWidth: 15 },
              1: { cellWidth: 15 },
              2: { cellWidth: 15 },
              3: { cellWidth: 15 },
              4: { cellWidth: 18 },
              5: { cellWidth: 15 },
              6: { cellWidth: 18 },
              7: { cellWidth: 15 },
              8: { cellWidth: 15 },
              9: { cellWidth: 15 },
              10: { cellWidth: 15 },
              11: { cellWidth: 15 },
              12: { cellWidth: 15 }
            },
            margin: { top: 10, left: 10, right: 10, bottom: 10 },
            pageBreak: 'auto'
          });
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

          // Add Overall Summary section
          doc.setFontSize(11);
          doc.setTextColor(41, 128, 185);
          doc.text('Overall Summary', 12, yPosition);
          yPosition += 5;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const totalPayableDays = Math.ceil(
            monthlySummary.presentDays + 
            monthlySummary.regularizedPresentDays + 
            (monthlySummary.halfDays / 2) + 
            monthlySummary.partiallyAbsentDays + 
            monthlySummary.weekOffs + 
            (monthlySummary.weekOffsWorked || 0) + 
            monthlySummary.el + 
            monthlySummary.cl + 
            monthlySummary.sl + 
            calculatedCompOffGained + // Use calculated value instead of API value
            monthlySummary.holidays
          );
          
          console.log('=== TOTAL PAYABLE DAYS CALCULATION ===');
          console.log('Present Days:', monthlySummary.presentDays);
          console.log('Regularized Present:', monthlySummary.regularizedPresentDays);
          console.log('Half Days:', monthlySummary.halfDays / 2);
          console.log('Partially Absent:', monthlySummary.partiallyAbsentDays);
          console.log('Week Offs:', monthlySummary.weekOffs);
          console.log('Week Offs Worked:', monthlySummary.weekOffsWorked || 0);
          console.log('EL:', monthlySummary.el);
          console.log('CL:', monthlySummary.cl);
          console.log('SL:', monthlySummary.sl);
          console.log('Comp Off Gained:', calculatedCompOffGained);
          console.log('Holidays:', monthlySummary.holidays);
          console.log('TOTAL PAYABLE DAYS:', totalPayableDays);
          
          // Cap totalPayableDays to not exceed totalDays
          const cappedPayableDays = Math.min(totalPayableDays, monthlySummary.totalDays);
          const attendancePercentage = monthlySummary.totalDays > 0 ? Math.min(((cappedPayableDays / monthlySummary.totalDays) * 100), 100).toFixed(2) : '0.00';
          doc.text(`Total Days: ${monthlySummary.totalDays}`, 12, yPosition);
          yPosition += 7;
          doc.text(`Total Payable Days: ${cappedPayableDays % 1 === 0 ? cappedPayableDays.toString() : cappedPayableDays.toFixed(2)}`, 12, yPosition);
          yPosition += 7;
          if (calculatedCompOffGained > 0) {
            doc.text(`Comp Off Gained (Holiday Work): ${calculatedCompOffGained}`, 12, yPosition);
            yPosition += 7;
          }
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

          console.log('Processing', filteredRecords.length, 'records for month', selectedMonth, 'year', selectedYear);
          
          // Debug: Check if specific dates are in filtered records
          const specificDates = ['2025-08-08', '2025-08-15', '2025-08-27', '2025-08-31'];
          specificDates.forEach(date => {
            const found = filteredRecords.find(record => record.date.split('T')[0] === date);
            console.log(`Record for ${date}:`, found ? 'FOUND' : 'NOT FOUND');
            if (found) {
              console.log('  Details:', {
                originalDate: found.date,
                projectName: found.projectName,
                punchIn: found.punchInTime,
                punchOut: found.punchOutTime
              });
            }
          });
          
          filteredRecords.forEach((record) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
            const status = getAttendanceStatus(record, dayType);
            const dateStr = record.date.split('T')[0];
            
            // Debug logging for specific dates
            if (dateStr.includes('2025-08-08') || dateStr.includes('2025-08-15') || dateStr.includes('2025-08-27') || dateStr.includes('2025-08-31')) {
              console.log('Debug specific date:', {
                originalDate: record.date,
                dateStr,
                dayType,
                status,
                projectName: record.projectName,
                punchIn: record.punchInTime,
                punchOut: record.punchOutTime
              });
            }
            
            // Debug logging for Comp Off records
            if (status === 'Comp Off') {
              console.log('Comp Off found:', {
                date: dateStr,
                dayType,
                projectName: record.projectName,
                punchIn: record.punchInTime,
                punchOut: record.punchOutTime
              });
            }
            
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
          });
          
          console.log('Total Comp Off Gained:', compOffGained);
          console.log('All records and their statuses:');
          filteredRecords.forEach((record) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
            const status = getAttendanceStatus(record, dayType);
            const dateStr = record.date.split('T')[0];
            console.log(`${dateStr}: ${status} (${dayType})`);
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
          let totalPayableDays = Math.ceil(
            presentDays + halfDays + weekOffs + holidays + el + cl + sl + compOffGained - lop
          );
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
              lop
            ]],
            startY: yPosition,
            theme: 'grid',
            styles: { 
              fontSize: 7, 
              cellPadding: 2, 
              halign: 'center',
              overflow: 'linebreak'
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: 255, 
              fontSize: 7, 
              fontStyle: 'bold' 
            },
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
            margin: { top: 10, left: 10, right: 10, bottom: 10 },
            pageBreak: 'auto'
          });

          // Add minimal spacing after summary table
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);

          // Summary text
          const totalWorkingDays = filteredRecords.length;
          
          // Cap totalPayableDays to not exceed totalWorkingDays
          const cappedPayableDays = Math.min(totalPayableDays, totalWorkingDays);
          const attendancePercentage = totalWorkingDays > 0 ? Math.min(((cappedPayableDays / totalWorkingDays) * 100), 100).toFixed(2) : '0.00';
          
          const summaryLines = [
              `Total Working Days: ${totalWorkingDays} days`,
              `Total Payable Days: ${cappedPayableDays % 1 === 0 ? cappedPayableDays.toString() : cappedPayableDays.toFixed(2)}`
          ];
          
          if (compOffGained > 0) {
            summaryLines.push(`Comp Off Gained (Holiday Work): ${compOffGained}`);
          }
          
          summaryLines.push(`Attendance Percentage: ${attendancePercentage}%`);
          
          doc.text(summaryLines, 12, yPosition, { lineHeightFactor: 1.2 });
          yPosition += 8;
        }

        // Add minimal spacing after summary text before leave history
        yPosition += 5;

        // Add Leave History section always, check for overflow
        const pageHeight = doc.internal.pageSize.getHeight();
        const requiredSpaceForLeaveHistory = 80; // Approximate space needed for leave history
        
        if (yPosition + requiredSpaceForLeaveHistory > pageHeight - 20) {
            doc.addPage();
            yPosition = 15;
        }
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('Leave History', 12, yPosition);
        yPosition += 5;

        const leaveHistoryHead = [['Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason']];
        let leaveHistoryRows = [];
        
        if (leaveHistory && leaveHistory.length > 0) {
            leaveHistoryRows = leaveHistory.map(leave => [
                leave.leaveType,
                new Date(leave.startDate).toLocaleDateString(),
                new Date(leave.endDate).toLocaleDateString(),
                leave.numberOfDays + (leave.isHalfDay ? ' (Half)' : ''),
                leave.status,
                leave.reason.substring(0, 20) + (leave.reason.length > 20 ? '...' : '')
            ]);
        } else {
            // Show "No leave history found" message
            leaveHistoryRows = [['No leave history found', '', '', '', '', '']];
        }

        autoTable(doc, {
            head: leaveHistoryHead,
            body: leaveHistoryRows,
            startY: yPosition,
            theme: 'grid',
            styles: { 
              fontSize: 7, 
              cellPadding: 2,
              overflow: 'linebreak'
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: 255 
            },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 22 },
                2: { cellWidth: 22 },
                3: { cellWidth: 12 },
                4: { cellWidth: 18 },
                5: { cellWidth: 40 }
            },
            margin: { top: 10, left: 10, right: 10, bottom: 10 },
            pageBreak: 'auto'
        });
        yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

        // Get the final Y position after all tables
        const allTablesFinalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        const signaturePageHeight = doc.internal.pageSize.getHeight();
        // Calculate required space for note + signature (approximately 40 units)
        const requiredSpaceForSignature = 40;
        let noteY = allTablesFinalY + 10;
        let signatureY = noteY + 12;
        
        // If not enough space, add a new page and reset Y positions
        if (noteY + requiredSpaceForSignature > signaturePageHeight - 20) {
            doc.addPage();
            noteY = 20; // minimal top margin
            signatureY = noteY + 12;
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
    // Location data is now processed in transformAttendanceRecord, so no need for enrichWithLocations
    const processedData: TransformedAttendanceRecord[] = processedAttendanceData;

    // Helper to batch fetch addresses for all records
    const fetchAllAddresses = async (records: TransformedAttendanceRecord[]) => {
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
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          overflow: 'linebreak'
        },
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
        margin: { top: 20, left: 15, right: 15, bottom: 20 },
        pageBreak: 'auto',
        showHead: 'everyPage',
        didDrawPage: (data) => {
          // Add header on each page
          if (data.pageNumber > 1) {
            doc.setFontSize(12);
            doc.setTextColor(41, 128, 185);
            doc.text(`Attendance Location Report - ${months[selectedMonth - 1]} ${selectedYear}`, 15, 10);
            doc.setFontSize(10);
            doc.text(`Employee ID: ${employeeId}`, 15, 15);
          }
        }
      });
      doc.save(`location_report_${selectedMonth}_${selectedYear}.pdf`);
    };

    // Export Location Report (Excel)
    const downloadLocationExcel = async () => {
      // Filter records for the selected month/year
      const filteredRecords = processedData.filter(record => {
        const dateObj = new Date(record.date);
        return dateObj.getMonth() === selectedMonth - 1 && dateObj.getFullYear() === selectedYear;
      });
      
      // Fetch addresses for all records
      const recordsWithAddresses = await fetchAllAddresses(filteredRecords);
      
      // Prepare data for Excel export - same fields as PDF
      const excelData = recordsWithAddresses.map(record => ({
        'Date': formatDate(record.date),
        'Check-in Location': record.punchInResolvedAddress || 'N/A',
        'Check-out Location': record.punchOutResolvedAddress || 'N/A'
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const columnWidths = [
        { wch: 12 }, // Date
        { wch: 60 }, // Check-in Location
        { wch: 60 }  // Check-out Location
      ];
      worksheet['!cols'] = columnWidths;

      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Location Report');
      
      // Save the file
      XLSX.writeFile(workbook, `location_report_${selectedMonth}_${selectedYear}.xlsx`);
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
          styles: { 
            fontSize: 8, 
            cellPadding: 2,
            overflow: 'linebreak'
          },
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
          margin: { top: 20, left: 10, right: 10, bottom: 20 },
          pageBreak: 'auto',
          showHead: 'everyPage',
          didDrawPage: (data) => {
            // Add header on each page
            if (data.pageNumber > 1) {
              doc.setFontSize(12);
              doc.setTextColor(41, 128, 185);
              doc.text(`Regularization History Report - ${monthName} ${selectedYear}`, 15, 10);
              doc.setFontSize(10);
              doc.text(`Employee ID: ${employeeId}`, 15, 15);
            }
          }
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
                {/* Month & Year Selector */}
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
                {/* Date Pickers for Date-Range PDF Export */}
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-gray-500">From:</label>
                  <input
                    type="date"
                    value={fromDateForPDF}
                    onChange={(e) => setFromDateForPDF(e.target.value)}
                    className="px-2 py-1 border rounded-lg text-sm"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <label className="text-sm text-gray-500">To:</label>
                  <input
                    type="date"
                    value={toDateForPDF}
                    onChange={(e) => setToDateForPDF(e.target.value)}
                    className="px-2 py-1 border rounded-lg text-sm"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {/* Export Buttons with Prompts */}
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
                        onClick={downloadLocationExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <FaFileExcel className="w-4 h-4" />
                        Export Location Report (Excel)
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
                    {processedData.map((record: TransformedAttendanceRecord, index) => {
                        const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName || undefined);
                        let hoursWorkedNum = 0;
                        let hoursWorkedStr = '';
                        if (record.punchInTime && record.punchOutTime) {
                            hoursWorkedNum = parseFloat(calculateHoursUtc(record.punchInUtc || record.punchInTime, record.punchOutUtc || record.punchOutTime));
                            hoursWorkedStr = formatHoursToHoursAndMinutes(hoursWorkedNum.toString());
                        } else if (dayType !== 'Working Day') {
                            hoursWorkedStr = '-';
                        } else {
                            hoursWorkedStr = 'Incomplete';
                        }
                        const shortage = hoursWorkedNum && hoursWorkedNum < 9 ? formatShortage(hoursWorkedNum) : '-';
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