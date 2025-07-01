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
    const [summary, setSummary] = useState<MonthSummaryResponse['data'] | null>(null);
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
    const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
    const [inLocationAddress, setInLocationAddress] = useState<string | null>(null);
    const [outLocationAddress, setOutLocationAddress] = useState<string | null>(null);

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
    const processedAttendanceData = attendanceData.map((record: ExtendedRawAttendanceRecord): TransformedAttendanceRecord => 
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

    const getDayType = (date: string, year: number, month: number, projectName?: string) => {
        const dateStr = date.split('T')[0];
        const d = new Date(dateStr);
        // Special rule for 'Arvind Technical'
        if (projectName && projectName.trim().toLowerCase() === 'arvind technical') {
            if (d.getDay() === 0) {
                return 'Sunday';
            }
            // For Arvind Technical, 2nd and 4th Saturdays are working days
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
        if (!employeeId || !selectedMonth || !selectedYear) return;
        
        fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-summary?month=${selectedMonth}&year=${selectedYear}`)
          .then(res => res.json())
          .then((data: MonthSummaryResponse) => {
            if (data.success) {
              setSummary(data.data);
            } else {
              setSummary(null);
            }
          })
          .catch(() => {
            setSummary(null);
          });
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
        const tableColumn = ["Date", "Project", "Check In", "Check Out", "Hours Worked", "Day Type", "Status"];
        const filteredRecords = processedAttendanceData.filter(record => {
            const dateObj = new Date(record.date);
            return dateObj.getMonth() === selectedMonth - 1 && dateObj.getFullYear() === selectedYear;
        });

        // Helper function to safely calculate hours
        const safeCalculateHoursUtc = (inTime?: string | null, outTime?: string | null): string => {
            if (!inTime || !outTime) return '0';
            return calculateHoursUtc(inTime, outTime);
        };

        const tableRows = filteredRecords.map((record: ExtendedRawAttendanceRecord) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName === null ? undefined : record.projectName);
            const status = getAttendanceStatus(record, dayType);
            let hoursWorked = 'Incomplete';
            
            if (record.punchInUtc && record.punchOutUtc) {
                hoursWorked = formatHoursToHoursAndMinutes(
                    safeCalculateHoursUtc(record.punchInUtc, record.punchOutUtc)
                );
            } else if (dayType !== 'Working Day') {
                hoursWorked = '-';
            }

            return [
                formatDate(record.date),
                record.projectName || '-',
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
        // Remove Attendance Location Report page from the main attendance report PDF
        // Only include the monthly summary and other sections below
        // Monthly Summary Table
        autoTable(doc, {
            head: [[
                'Total Days',
                'Present Days',
                'Half Days',
                'Partially Absent',
                'Total Weekoff', // Replaces 'Week Offs'
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
                summary?.summary.weekOffs ?? 0, // Total Weekoff
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
                4: { cellWidth: 20 }, // Total Weekoff
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
            const totalWeekoff = summary.summary.weekOffs ?? 0;
            const totalPayableDays = summary.summary.presentDays + (summary.summary.halfDays / 2) + summary.summary.el + summary.summary.sl + summary.summary.cl + summary.summary.compOff;
            const attendancePercentage = ((totalPayableDays / workingDays) * 100).toFixed(2);
            doc.text([
                `Total Working Days: ${workingDays} days`,
                `Total Weekoff: ${totalWeekoff} days`,
                `Total Payable Days: ${totalPayableDays} days`,
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

        // Add Leave History section after leave balance
        if (leaveHistory.length > 0) {
            yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
            doc.setFontSize(12);
            doc.setTextColor(41, 128, 185);
            doc.text('Leave History', 15, yPosition);
            yPosition += 10;

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
                styles: { fontSize: 8, cellPadding: 4 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 50 }
                },
                margin: { left: 15 }
            });
        }

        // Get the final Y position after all tables
        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        
        // Add note below the leave history table with proper spacing
        const noteY = finalY + 60; // Increased spacing from table
        doc.setFontSize(11);
        doc.setFont('bold');
        doc.setTextColor(200, 0, 0);
        const noteLabel = 'Note:';
        doc.setTextColor(0, 0, 0);
        const noteText = 'Please ensure that the total working hours per day are at least 8 hours.';
        doc.text(`${noteLabel} ${noteText}`, 15, noteY);

        // Calculate signature position with proper spacing after the note
        const pageHeight = doc.internal.pageSize.getHeight();
        const signatureY = Math.min(pageHeight - 30, noteY + 40); // Ensure proper spacing after note

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

    // In your component's main render logic, process the attendance data
    const processedData = enrichWithLocations(attendanceData);

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

    // Replace the XLSX location export with PDF export, now with batch address fetching
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
      } catch (e) {
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
                          {formatTime(record.punchInTime)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {formatTime(record.punchOutTime)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
    {(() => {
  const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName === null ? undefined : record.projectName);
  if (record.punchInTime && record.punchOutTime) {
    return formatHoursToHoursAndMinutes(
      calculateHoursUtc(record.punchInUtc || record.punchInTime, record.punchOutUtc || record.punchOutTime)
    );
  } else if (dayType !== 'Working Day') {
    return '-';
  } else {
    return 'Incomplete';
  }
})()}


                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {record.punchInTime && record.punchOutTime ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {record.punchInTime && record.punchOutTime ? 'Present' : 'Absent'}
                            </span>
                          ) : ''}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            (() => {
                                const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName === null ? undefined : record.projectName);
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
                                const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName === null ? undefined : record.projectName);
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