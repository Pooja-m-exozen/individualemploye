import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaFilePdf, FaCalendar, FaChevronLeft,  } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Image from 'next/image';
import { calculateHoursUtc, transformAttendanceRecord } from '../../utils/attendanceUtils';
import { 
    RawAttendanceRecord as BaseRawAttendanceRecord,
    TransformedAttendanceRecord, 
    MonthSummaryResponse
} from '../../types/attendance';

// Google Maps interfaces removed - now using Nominatim (OpenStreetMap)

// Unused leave balance interfaces removed





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

// Types kept minimal; unused interfaces removed

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
    const [summary] = useState<MonthSummaryResponse['data'] | null>(null);
    const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
    const [inLocationAddress, setInLocationAddress] = useState<string | null>(null);
    const [outLocationAddress, setOutLocationAddress] = useState<string | null>(null);
    const [fromDateForPDF, setFromDateForPDF] = useState<string>("");
    const [toDateForPDF, setToDateForPDF] = useState<string>("");

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
    const processedAttendanceData = attendanceData.map((record: ExtendedRawAttendanceRecord): TransformedAttendanceRecord => 
        transformAttendanceRecord(record)
    );

    // Add missing helper to attach location placeholders from raw lat/lng
    interface WithRawLatLng {
        punchInLatitude?: number;
        punchInLongitude?: number;
        punchOutLatitude?: number;
        punchOutLongitude?: number;
    }
    const enrichWithLocations = <T extends ExtendedRawAttendanceRecord & Partial<WithRawLatLng>>(
        data: T[]
    ): ExtendedRawAttendanceRecord[] => {
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
        
        // Special rule for 'Exozen - IT' and 'Exozen - FMS'
        if (
            projectName &&
            (
                projectName.trim().toLowerCase() === 'exozen - it' ||
                projectName.trim().toLowerCase() === 'exozen - fms'
            )
        ) {
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
        }
        
        // Default logic for other projects (no 2nd and 4th Saturday holidays)
        if (d.getDay() === 0) {
            return 'Sunday';
        }
        if (d.getDay() === 6) { // Saturday
            // For other projects, all Saturdays are working days
            return 'Working Day';
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
    const getAttendanceStatus = (record: ExtendedRawAttendanceRecord, dayType: string) => {
        const leaveType = isLeaveDate(record.date);

        if (leaveType) {
            return leaveType + ' Leave'; // e.g., "SL Leave"
        }

        // Check if there's any punch in/out on a holiday
        if (dayType !== 'Working Day' && record.punchInTime && record.punchOutTime) {
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

        const tableRows = filteredRecords.map((record: ExtendedRawAttendanceRecord) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth);
            const status = getAttendanceStatus(record, dayType);
            let hoursWorked = 'Incomplete';
            let hoursWorkedNum: number | null = null;
            
            // Use UTC times if available, otherwise use regular times
            const punchInTime = record.punchInUtc || record.punchInTime;
            const punchOutTime = record.punchOutUtc || record.punchOutTime;
            
            // Check if we have valid times (not null, not empty, and contain time format)
            if (punchInTime && punchOutTime && 
                punchInTime !== '-' && punchOutTime !== '-' &&
                (punchInTime.includes(':') || punchInTime.includes('T')) &&
                (punchOutTime.includes(':') || punchOutTime.includes('T'))) {
                
                try {
                    const hw = parseFloat(safeCalculateHoursUtc(punchInTime, punchOutTime));
                    hoursWorkedNum = isNaN(hw) ? null : hw;
                    hoursWorked = hoursWorkedNum !== null
                        ? formatHoursToHoursAndMinutes(hoursWorkedNum.toString())
                        : 'Incomplete';
                } catch (error) {
                    console.error('Error calculating hours for PDF:', error);
                    hoursWorked = 'Error';
                }
            } else if (dayType !== 'Working Day') {
                hoursWorked = '-';
            }
            
            // Fix shortage calculation - only show shortage for working days with actual hours
            let shortage = '-';
            if (hoursWorkedNum !== null && dayType === 'Working Day' && hoursWorkedNum < 9) {
                shortage = formatShortage(hoursWorkedNum);
            }

            return [
                formatDate(record.date),
                formatTime(punchInTime),
                formatTime(punchOutTime),
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
                fontSize: 7, 
                cellPadding: 3,
                overflow: 'linebreak',
                cellWidth: 'wrap',
                halign: 'center',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 25, halign: 'center' }, // Date
                1: { cellWidth: 25, halign: 'center' }, // Check In
                2: { cellWidth: 25, halign: 'center' }, // Check Out
                3: { cellWidth: 30, halign: 'center' }, // Hours Worked
                4: { cellWidth: 30, halign: 'center' }, // Shortage Hours
                5: { cellWidth: 30, halign: 'center' }, // Day Type
                6: { cellWidth: 30, halign: 'center' }  // Status
            },
            pageBreak: singlePage ? 'avoid' : 'auto',
            margin: { top: 20, right: 10, bottom: 20, left: 10 },
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
        // Normalize API summary shape
        type MonthlySummaryData = {
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
            lop: number;
        };
        let monthlySummary: MonthlySummaryData | null = null;
        if (summary) {
            if (typeof (summary as unknown as { summary?: MonthlySummaryData }).summary !== 'undefined') {
                monthlySummary = (summary as unknown as { summary: MonthlySummaryData }).summary;
            } else {
                monthlySummary = summary as unknown as MonthlySummaryData;
            }
        }
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
              cellPadding: 4, 
              halign: 'center',
              valign: 'middle',
              overflow: 'linebreak'
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: 255, 
              fontSize: 8, 
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle'
            },
            columnStyles: {
              0: { cellWidth: 22, halign: 'center' }, // Total Days
              1: { cellWidth: 22, halign: 'center' }, // Present Days
              2: { cellWidth: 25, halign: 'center' }, // Regularized Present
              3: { cellWidth: 20, halign: 'center' }, // Half Days
              4: { cellWidth: 25, halign: 'center' }, // Partially Absent
              5: { cellWidth: 22, halign: 'center' }, // Total Weekoff
              6: { cellWidth: 25, halign: 'center' }, // Week Offs Worked
              7: { cellWidth: 20, halign: 'center' }, // Holidays
              8: { cellWidth: 18, halign: 'center' }, // EL
              9: { cellWidth: 18, halign: 'center' }, // SL
              10: { cellWidth: 18, halign: 'center' }, // CL
              11: { cellWidth: 22, halign: 'center' }, // Comp Off
              12: { cellWidth: 18, halign: 'center' }  // LOP
            },
            margin: { top: 10, left: 3, right: 3, bottom: 10 },
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
              cellPadding: 4, 
              halign: 'center',
              valign: 'middle',
              overflow: 'linebreak'
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: 255, 
              fontSize: 8, 
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle'
            },
            columnStyles: {
              0: { cellWidth: 22, halign: 'center' }, // Total Days
              1: { cellWidth: 22, halign: 'center' }, // Present Days
              2: { cellWidth: 20, halign: 'center' }, // Half Days
              3: { cellWidth: 25, halign: 'center' }, // Partially Absent
              4: { cellWidth: 22, halign: 'center' }, // Total Weekoff
              5: { cellWidth: 20, halign: 'center' }, // Holidays
              6: { cellWidth: 18, halign: 'center' }, // EL
              7: { cellWidth: 18, halign: 'center' }, // SL
              8: { cellWidth: 18, halign: 'center' }, // CL
              9: { cellWidth: 25, halign: 'center' }, // Comp Off (Gained)
              10: { cellWidth: 18, halign: 'center' } // LOP
            },
            margin: { top: 10, left: 3, right: 3, bottom: 10 },
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

        // Leave History section will be added later - removing duplicate

        // Add Leave History section with proper spacing
        yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
        
        // Check if we need a new page for leave history
        const leaveHistoryPageHeight = doc.internal.pageSize.getHeight();
        const requiredSpaceForLeaveHistory = 60; // Approximate space needed for leave history
        
        if (yPosition + requiredSpaceForLeaveHistory > leaveHistoryPageHeight - 20) {
            doc.addPage();
            yPosition = 15;
        }
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('Leave History', 15, yPosition);
        yPosition += 8;

        const leaveHistoryHead = [['Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason']];
        let leaveHistoryRows = [];
        
        if (leaveHistory && leaveHistory.length > 0) {
            leaveHistoryRows = leaveHistory.map(leave => [
                leave.leaveType,
                new Date(leave.startDate).toLocaleDateString(),
                new Date(leave.endDate).toLocaleDateString(),
                leave.numberOfDays + (leave.isHalfDay ? ' (Half)' : ''),
                leave.status,
                leave.reason.substring(0, 25) + (leave.reason.length > 25 ? '...' : '')
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
              cellPadding: 4,
              overflow: 'linebreak',
              halign: 'center',
              valign: 'middle'
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: 255,
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 25, halign: 'center' }, // Type
                1: { cellWidth: 30, halign: 'center' }, // Start Date
                2: { cellWidth: 30, halign: 'center' }, // End Date
                3: { cellWidth: 20, halign: 'center' }, // Days
                4: { cellWidth: 25, halign: 'center' }, // Status
                5: { cellWidth: 50, halign: 'left' }    // Reason
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
        let noteYPosition = allTablesFinalY + 10;
        
        // If not enough space, add a new page and reset Y positions
        if (noteYPosition + requiredSpaceForSignature > signaturePageHeight - 20) {
            doc.addPage();
            noteYPosition = 20; // minimal top margin
        }
        // Add note below the leave history table with proper spacing
        doc.setFontSize(10);
        doc.setFont('bold');
        doc.setTextColor(200, 0, 0);
        const noteLabel = 'Note:';
        doc.setTextColor(0, 0, 0);
        const noteText = 'Please ensure that the total working hours per day are at least 8 hours.';
        doc.text(`${noteLabel} ${noteText}`, 15, noteYPosition);

        // Calculate signature position with proper spacing after the note
        const pageHeight = doc.internal.pageSize.getHeight();
        const signatureY = Math.min(pageHeight - 30, noteYPosition + 40); // Ensure proper spacing after note

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

    // In your component's main render logic, process the attendance data
    const processedData = enrichWithLocations(attendanceData);

    // Helper for shortage formatting (target 9h per day)
    const formatShortage = (workedHours: number): string => {
        const deficit = Math.max(0, 9 - workedHours);
        const hours = Math.floor(deficit);
        const minutes = Math.round((deficit - hours) * 60);
        return `${hours}h ${minutes}m`;
    };

    // Stub downloads to avoid reference errors (implement as needed)
    const downloadLocationPDF = () => {
        console.warn('downloadLocationPDF not implemented');
    };
    const downloadLocationExcel = () => {
        console.warn('downloadLocationExcel not implemented');
    };
    const downloadRegularizationHistoryPDF = () => {
        console.warn('downloadRegularizationHistoryPDF not implemented');
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
                    {processedData.map((record: ExtendedRawAttendanceRecord, index) => (
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
                          {(() => {
                            // Debug: log the entire record to understand the data structure
                            console.log('Full record for', record.date, ':', record);
                            // Check if punchInTime contains location/project info instead of time
                            if (record.punchInTime && !record.punchInTime.includes(':')) {
                              // If punchInTime doesn't contain time format, it might be location/project
                              return '-';
                            }
                            return formatTime(record.punchInTime);
                          })()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {(() => {
                            // Check if punchOutTime contains location/project info instead of time
                            if (record.punchOutTime && !record.punchOutTime.includes(':')) {
                              // If punchOutTime doesn't contain time format, it might be location/project
                              return '-';
                            }
                            return formatTime(record.punchOutTime);
                          })()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {(() => {
                            const dayType = getDayType(record.date, selectedYear, selectedMonth);
                            
                            // Debug: log the record to understand the data structure
                            console.log('Hours calculation for', record.date, ':', {
                              punchInTime: record.punchInTime,
                              punchOutTime: record.punchOutTime,
                              punchInUtc: record.punchInUtc,
                              punchOutUtc: record.punchOutUtc,
                              dayType
                            });
                            
                            // Use UTC times if available, otherwise use regular times
                            const punchInTime = record.punchInUtc || record.punchInTime;
                            const punchOutTime = record.punchOutUtc || record.punchOutTime;
                            
                            // Check if we have valid times (not null, not empty, and contain time format)
                            if (punchInTime && punchOutTime && 
                                punchInTime !== '-' && punchOutTime !== '-' &&
                                (punchInTime.includes(':') || punchInTime.includes('T')) &&
                                (punchOutTime.includes(':') || punchOutTime.includes('T'))) {
                              
                              try {
                                const hoursWorked = calculateHoursUtc(punchInTime, punchOutTime);
                                console.log('Calculated hours:', hoursWorked);
                                return formatHoursToHoursAndMinutes(hoursWorked);
                              } catch (error) {
                                console.error('Error calculating hours:', error);
                                return 'Error';
                              }
                            } else if (dayType !== 'Working Day') {
                              return '-';
                            } else {
                              return 'Incomplete';
                            }
                          })()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {(() => {
                            const dayType = getDayType(record.date, selectedYear, selectedMonth);
                            
                            // Use UTC times if available, otherwise use regular times
                            const punchInTime = record.punchInUtc || record.punchInTime;
                            const punchOutTime = record.punchOutUtc || record.punchOutTime;
                            
                            // Check if we have valid times and it's a working day
                            if (punchInTime && punchOutTime && 
                                punchInTime !== '-' && punchOutTime !== '-' &&
                                (punchInTime.includes(':') || punchInTime.includes('T')) &&
                                (punchOutTime.includes(':') || punchOutTime.includes('T')) &&
                                dayType === 'Working Day') {
                              
                              try {
                                const hoursWorked = parseFloat(calculateHoursUtc(punchInTime, punchOutTime));
                                console.log('Shortage calculation - Hours worked:', hoursWorked, 'for', record.date);
                                
                                if (hoursWorked < 9) {
                                  const shortage = 9 - hoursWorked;
                                  const hours = Math.floor(shortage);
                                  const minutes = Math.round((shortage - hours) * 60);
                                  console.log('Shortage calculated:', `${hours}h ${minutes}m`);
                                  return `${hours}h ${minutes}m`;
                                }
                                return '-';
                              } catch (error) {
                                console.error('Error calculating shortage:', error);
                                return 'Error';
                              }
                            } else if (dayType !== 'Working Day') {
                              return '-';
                            } else {
                              return 'Incomplete';
                            }
                          })()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {(() => {
                            const dayType = getDayType(record.date, selectedYear, selectedMonth);
                            return dayType;
                          })()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
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
                                        return status.includes('Leave')
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-red-100 text-red-800';
                                }
                            })()
                          }`}>
                            {(() => {
                                const dayType = getDayType(record.date, selectedYear, selectedMonth);
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
                    ))}
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