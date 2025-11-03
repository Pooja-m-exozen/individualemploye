import React, { useState, useEffect, useCallback } from 'react';
import { FaFileExcel, FaFilePdf, FaCalendar } from 'react-icons/fa';
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
    attendanceData: ExtendedRawAttendanceRecord[];
    selectedMonth: number;
    selectedYear: number;
    handleMonthChange: (month: number) => void;
    handleYearChange: (year: number) => void;
    handleBack: () => void;
    formatDate: (dateString: string) => string;
    employeeId: string;
    theme: 'light' | 'dark';
    summary?: MonthSummaryResponse['data'] | null; // Add summary prop for API data
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


// Utility function to check if a project is "Exozen - Ops"
// Exozen - Ops projects have ALL Saturdays as working days (no Saturday holidays)
const isExozenOpsProject = (projectName: string): boolean => {
    if (!projectName) return false;
   
    const normalizedName = projectName.trim().toLowerCase();
   
    return (
        normalizedName.includes('exozen - ops') ||
        normalizedName.includes('exozen-ops') ||
        normalizedName.includes('exozen ops') ||
        normalizedName === 'exozen - ops' ||
        normalizedName === 'exozen-ops' ||
        normalizedName === 'exozen ops'
    );
};



const AttendanceReport: React.FC<AttendanceReportProps> = ({
    attendanceData,
    selectedMonth,
    selectedYear,
    handleMonthChange,
    handleYearChange,
    formatDate,
    employeeId,
    theme,
    summary // Add summary prop
}) => {
    const [selectedRecord, setSelectedRecord] = useState<ExtendedRawAttendanceRecord | null>(null);
    // Remove the null state - use the summary prop instead
    const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
    const [inLocationAddress, setInLocationAddress] = useState<string | null>(null);
    const [outLocationAddress, setOutLocationAddress] = useState<string | null>(null);
    const [fromDateForPDF, setFromDateForPDF] = useState<string>("");
    const [toDateForPDF, setToDateForPDF] = useState<string>("");
    const [isGeneratingLocationPDF, setIsGeneratingLocationPDF] = useState(false);

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
        '2025-10-01': 'Vijaya Dashami',
        '2025-10-02': 'Gandhi Jayanti',
        '2025-10-20': 'Deepavali',
        '2025-10-22': 'Deepavali',
        '2025-11-01': 'Kannada Rajyotsava',
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
            punchInLocation: (record.punchInLocation?.latitude && record.punchInLocation?.longitude)
                ? {
                    latitude: record.punchInLocation?.latitude,
                    longitude: record.punchInLocation?.longitude,
                    address: record.punchInLocation?.address || null
                }
                : (record.punchInLatitude && record.punchInLongitude)
                ? {
                    latitude: record.punchInLatitude,
                    longitude: record.punchInLongitude,
                    address: null
                }
                : undefined,
            punchOutLocation: (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude)
                ? {
                    latitude: record.punchOutLocation?.latitude,
                    longitude: record.punchOutLocation?.longitude,
                    address: record.punchOutLocation?.address || null
                }
                : (record.punchOutLatitude && record.punchOutLongitude)
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
       
        // Debug logging for Exozen - Ops projects
        if (projectName && projectName.toLowerCase().includes('ops')) {
            console.log('🔍 Exozen - Ops project detected:', {
                date: dateStr,
                projectName: projectName,
                dayOfWeek: d.getDay(),
                dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
            });
        }
       
        // Debug logging for September 13, 2025
        if (dateStr === '2025-09-13') {
            console.log('🔍 DEBUG September 13, 2025 (Updated Logic):', {
                dateStr,
                projectName,
                dayOfWeek: d.getDay(),
                dayOfMonth: d.getDate(),
                firstDayOfMonth: new Date(year, month - 1, 1).getDay(),
                isExozenOps: projectName && (
                    projectName.toLowerCase().includes('exozen - ops') ||
                    projectName.toLowerCase().includes('exozen-ops') ||
                    projectName.toLowerCase().includes('exozen ops')
                )
            });
        }
       
        // Check for government holidays FIRST (before any other logic)
        if (governmentHolidays.includes(dateStr)) {
            return governmentHolidayMap[dateStr] || 'Holiday';
        }
       
        // Handle Sunday
        if (d.getDay() === 0) {
            return 'Sunday';
        }
       
        // Handle Saturday - Special rules for different projects
        if (d.getDay() === 6) {
            // Special rule for 'Exozen - Ops' - ALL Saturdays are working days (including 2nd and 4th Saturdays)
            if (isExozenOpsProject(projectName || '')) {
                console.log('🔍 Saturday for Exozen - Ops project (ALL Saturdays are Working Days):', {
                    date: dateStr,
                    projectName: projectName,
                    normalized: projectName?.toLowerCase().trim(),
                    dayOfMonth: d.getDate(),
                    result: 'Working Day'
                });
                return 'Working Day';
            }
           
            // Use the same calculation as coordinator page for other projects (universal 2nd and 4th Saturday holidays)
            const weekNumber = Math.ceil((d.getDate() + (new Date(year, month - 1, 1).getDay())) / 7);
           
            console.log('🔍 Saturday calculation (Coordinator Style):', {
                date: dateStr,
                projectName: projectName,
                dayOfWeek: d.getDay(),
                weekNumber: weekNumber,
                dayOfMonth: d.getDate(),
                firstDayOfMonth: new Date(year, month - 1, 1).getDay(),
                calculation: `Math.ceil((${d.getDate()} + ${new Date(year, month - 1, 1).getDay()}) / 7) = ${weekNumber}`
            });
           
            if (weekNumber === 2) {
                console.log('✅ Returning 2nd Saturday');
                return '2nd Saturday';
            } else if (weekNumber === 4) {
                console.log('✅ Returning 4th Saturday');
                return '4th Saturday';
            } else {
                console.log('✅ Returning Working Day (other Saturday)');
            }
        }
       
        // Default logic for other days
        if (dateStr === '2025-09-13') {
            console.log('🔍 September 13: Not Saturday, returning Working Day');
        }
        return 'Working Day';
    };

    // Enhanced reverseGeocode function with retry mechanism and better error handling
    const reverseGeocode = useCallback(async (lat: number, lng: number, retryCount = 0): Promise<string> => {
        // Validate coordinates
        if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.warn('Invalid coordinates:', { lat, lng });
            return 'Invalid coordinates';
        }

        console.log(`Geocoding request for: (${lat}, ${lng}) - Attempt ${retryCount + 1}`);
       
        try {
            // Try different zoom levels and parameters for better results
            const zoomLevels = [16, 14, 12, 10];
            const currentZoom = zoomLevels[Math.min(retryCount, zoomLevels.length - 1)];
            
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&zoom=${currentZoom}&extratags=1&namedetails=1`;
            
            console.log('Geocoding URL:', url);

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'EmployeeManagementApp/1.0',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`Geocoding API error: ${response.status} ${response.statusText}`);
                if (retryCount < 2) {
                    console.log(`Retrying geocoding for (${lat}, ${lng})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    return reverseGeocode(lat, lng, retryCount + 1);
                }
                return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }

            const data = await response.json();
            console.log('Geocoding response:', data);

            if (data && data.display_name) {
                // Extract address components from Nominatim response
                const address = data.address || {};
               
                // Build a comprehensive address from available components
                const addressParts = [];
                
                // Add house number and road
                if (address.house_number && address.road) {
                    addressParts.push(`${address.house_number} ${address.road}`);
                } else if (address.road) {
                    addressParts.push(address.road);
                }
                
                // Add locality/suburb/neighbourhood
                if (address.suburb) {
                    addressParts.push(address.suburb);
                } else if (address.neighbourhood) {
                    addressParts.push(address.neighbourhood);
                } else if (address.hamlet) {
                    addressParts.push(address.hamlet);
                } else if (address.locality) {
                    addressParts.push(address.locality);
                }
                
                // Add city/town/village
                if (address.city) {
                    addressParts.push(address.city);
                } else if (address.town) {
                    addressParts.push(address.town);
                } else if (address.village) {
                    addressParts.push(address.village);
                }
                
                // Add district/division
                if (address.city_district) {
                    addressParts.push(address.city_district);
                } else if (address.district) {
                    addressParts.push(address.district);
                } else if (address.county) {
                    addressParts.push(address.county);
                }
                
                // Add state
                if (address.state) {
                    addressParts.push(address.state);
                }
                
                // Add country
                if (address.country) {
                    addressParts.push(address.country);
                }

                // Filter out empty parts and join
                const filteredParts = addressParts.filter(part => part && part.trim() !== '');
                let formattedAddress;
                
                if (filteredParts.length > 0) {
                    formattedAddress = filteredParts.join(', ');
                } else {
                    // Use display_name as fallback, but clean it up
                    formattedAddress = data.display_name;
                }
                
                // Truncate very long addresses to keep them readable
                if (formattedAddress.length > 100) {
                    formattedAddress = formattedAddress.substring(0, 97) + '...';
                }
               
                console.log('Formatted address:', formattedAddress);
                return formattedAddress;
            } else if (data && data.error) {
                console.warn('Geocoding error:', data.error);
                if (retryCount < 2) {
                    console.log(`Retrying geocoding for (${lat}, ${lng}) due to error...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return reverseGeocode(lat, lng, retryCount + 1);
                }
                return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
           
            console.warn('No results found for location:', { lat, lng });
            if (retryCount < 2) {
                console.log(`Retrying geocoding for (${lat}, ${lng}) - no results...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return reverseGeocode(lat, lng, retryCount + 1);
            }
            return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        } catch (error) {
            console.error('Geocoding error:', error);
            if (retryCount < 2) {
                console.log(`Retrying geocoding for (${lat}, ${lng}) due to exception...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return reverseGeocode(lat, lng, retryCount + 1);
            }
            
            return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
    }, []);

    // Add this helper function before it's used
    const filterLeaveHistoryByMonth = useCallback((leaveHistory: LeaveRecord[], month: number, year: number) => {
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
    }, []);

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
    }, [employeeId, selectedMonth, selectedYear, filterLeaveHistoryByMonth]);

    // State to store all location addresses
    const [locationAddresses, setLocationAddresses] = useState<Map<string, string>>(new Map());
    
    
    

    // Update the useEffect for fetching locations
    useEffect(() => {
        const fetchLocations = async () => {
            console.log('Selected record for location:', selectedRecord);

            if (selectedRecord) {
                try {
                    if (selectedRecord.punchInLocation?.latitude && selectedRecord.punchInLocation?.longitude) {
                        const locationKey = `${selectedRecord.punchInLocation.latitude},${selectedRecord.punchInLocation.longitude}`;
                        
                        // Check if we already have this address cached
                        if (locationAddresses.has(locationKey)) {
                            setInLocationAddress(locationAddresses.get(locationKey)!);
                        } else {
                            console.log('Fetching punch-in location:', selectedRecord.punchInLocation);
                            const inAddress = await reverseGeocode(
                                selectedRecord.punchInLocation.latitude,
                                selectedRecord.punchInLocation.longitude
                            );
                            console.log('Punch-in address found:', inAddress);
                            setInLocationAddress(inAddress);
                            
                            // Cache the address
                            setLocationAddresses(prev => new Map(prev).set(locationKey, inAddress));
                        }
                    }

                    if (selectedRecord.punchOutLocation?.latitude && selectedRecord.punchOutLocation?.longitude) {
                        const locationKey = `${selectedRecord.punchOutLocation.latitude},${selectedRecord.punchOutLocation.longitude}`;
                        
                        // Check if we already have this address cached
                        if (locationAddresses.has(locationKey)) {
                            setOutLocationAddress(locationAddresses.get(locationKey)!);
                        } else {
                            console.log('Fetching punch-out location:', selectedRecord.punchOutLocation);
                            const outAddress = await reverseGeocode(
                                selectedRecord.punchOutLocation.latitude,
                                selectedRecord.punchOutLocation.longitude
                            );
                            console.log('Punch-out address found:', outAddress);
                            setOutLocationAddress(outAddress);
                            
                            // Cache the address
                            setLocationAddresses(prev => new Map(prev).set(locationKey, outAddress));
                        }
                    }
                } catch {
                    console.error('Error in location fetching');
                    setInLocationAddress('Error fetching location');
                    setOutLocationAddress('Error fetching location');
                }
            } else {
                setInLocationAddress(null);
                setOutLocationAddress(null);
            }
        };
        fetchLocations();
    }, [selectedRecord, locationAddresses, reverseGeocode]);

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

        console.log('🔍 getAttendanceStatus:', {
            date: record.date,
            dayType: dayType,
            punchInTime: record.punchInTime,
            punchOutTime: record.punchOutTime
        });

        // Check if there's any punch in/out on a holiday (including 2nd and 4th Saturday)
        if ((dayType === '2nd Saturday' || dayType === '4th Saturday' || dayType === 'Holiday') && record.punchInTime && record.punchOutTime) {
            const inTime = record.punchInUtc || record.punchInTime;
            const outTime = record.punchOutUtc || record.punchOutTime;
            const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
            if (hoursWorked >= 4) {
                console.log('✅ Returning Comp Off for holiday work');
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
       
        // Return appropriate status based on day type
        if (dayType === 'Working Day') {
            return 'Absent';
        } else if (dayType === 'Sunday') {
            return 'Sunday';
        } else if (dayType === '2nd Saturday' || dayType === '4th Saturday') {
            console.log('✅ Returning Holiday for', dayType);
            return 'Holiday';
        } else {
            return 'Holiday';
        }
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
            // Set time to start/end of day for proper comparison
            fromDateObj.setHours(0, 0, 0, 0);
            toDateObj.setHours(23, 59, 59, 999);
            
            if (fromDateObj > toDateObj) {
                alert("From date cannot be after To date.");
                return;
            }
            filteredRecords = processedAttendanceData.filter(record => {
                const recordDate = new Date(record.date);
                recordDate.setHours(0, 0, 0, 0);
                return recordDate >= fromDateObj && recordDate <= toDateObj;
            });
            
            console.log('Date range filter:', {
                fromDate: fromDateForPDF,
                toDate: toDateForPDF,
                totalRecords: processedAttendanceData.length,
                filteredCount: filteredRecords.length,
                sampleRecords: filteredRecords.slice(0, 3).map(r => ({ date: r.date, status: r.status }))
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

        console.log('=== PDF GENERATION DEBUG ===');
        console.log('Filtered records count:', filteredRecords.length);
        console.log('Sample filtered records:', filteredRecords.slice(0, 5).map(r => ({ date: r.date, punchIn: r.punchInTime, punchOut: r.punchOutTime })));
        
        const tableRows = filteredRecords.map((record: ExtendedRawAttendanceRecord) => {
            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
            const status = getAttendanceStatus(record, dayType);
           
            // Debug logging for PDF table
            if (record.projectName && record.projectName.toLowerCase().includes('exozen') && (record.date.includes('2025-09-27') || record.date.includes('2025-09-13'))) {
              console.log('🔍 PDF Table Debug for September 13/27, 2025:', {
                date: record.date,
                projectName: record.projectName,
                dayType: dayType,
                status: status
              });
            }
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
            } else if (dayType !== 'Working Day' && dayType !== 'Sunday' && dayType !== '2nd Saturday' && dayType !== '4th Saturday') {
                hoursWorked = '-';
            }
           
            // Fix shortage calculation - only show shortage for working days with actual hours
            let shortage = '-';
            if (hoursWorkedNum !== null && dayType === 'Working Day' && hoursWorkedNum < 9) {
                shortage = formatShortage(hoursWorkedNum);
            }

            return [
                formatDate(record.date),
                formatTime(punchInTime) || '-',
                formatTime(punchOutTime) || '-',
                hoursWorked,
                shortage,
                dayType,
                status
            ];
        });
        
        console.log('Table rows generated:', tableRows.length);
        console.log('Sample table rows:', tableRows.slice(0, 3));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: yPosition,
            theme: 'grid',
            styles: {
                fontSize: 7,
                cellPadding: 2,
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
                0: { cellWidth: 22, halign: 'center' }, // Date
                1: { cellWidth: 22, halign: 'center' }, // Check In
                2: { cellWidth: 22, halign: 'center' }, // Check Out
                3: { cellWidth: 25, halign: 'center' }, // Hours Worked
                4: { cellWidth: 25, halign: 'center' }, // Shortage Hours
                5: { cellWidth: 25, halign: 'center' }, // Day Type
                6: { cellWidth: 25, halign: 'center' }  // Status
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

        // Check if table was actually generated
        const attendanceTableFinalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY;
        
        // If no table was generated or it's empty, show a message
        if (!tableRows || tableRows.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            yPosition += 10;
            doc.text('No attendance data available for the selected period.', 15, yPosition);
            doc.save(`attendance_${fromDateForPDF || `${selectedMonth}_${selectedYear}`}_to_${toDateForPDF || 'report'}.pdf`);
            return;
        }

        // If a date range is selected, save PDF without summary table
        if (singlePage) {
            doc.save(`attendance_${fromDateForPDF}_to_${toDateForPDF}.pdf`);
            return;
        }

        // Get the final Y position after the attendance table
        yPosition = attendanceTableFinalY || yPosition;
        yPosition += 5;
       
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
        console.log('=== PDF SUMMARY DEBUG ===');
        console.log('Summary prop received:', summary);
        console.log('Summary type:', typeof summary);
        console.log('Summary is null/undefined:', summary === null || summary === undefined);
       
        // Normalize API summary shape
        type MonthlySummaryData = {
            totalDays: number;
            presentDays: number;
            halfDays: number;
            partiallyAbsentDays: number;
            weekOffs: number;
            weekOffsWorked: number;
            holidays: number;
            el: number;
            sl: number;
            cl: number;
            compOff: number; // Comp Off Leave taken by employee (API field name)
            compOffEarned: number; // Comp Off earned from holiday work (API field name)
            regularizedPresentDays: number;
            lop: number;
        };
        let monthlySummary: MonthlySummaryData | null = null;
        if (summary) {
            console.log('Processing summary data...');
            if (typeof (summary as unknown as { summary?: MonthlySummaryData }).summary !== 'undefined') {
                monthlySummary = (summary as unknown as { summary: MonthlySummaryData }).summary;
                console.log('Using nested summary:', monthlySummary);
            } else {
                monthlySummary = summary as unknown as MonthlySummaryData;
                console.log('Using direct summary:', monthlySummary);
            }
        } else {
            console.log('No summary data provided - will use manual calculation');
        }
       
        console.log('Final monthlySummary:', monthlySummary);
        console.log('Will use API data:', monthlySummary !== null);
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
              'Comp Off (Gained)',
              'Comp Off (Leave)',
              'LOP'
            ]],
            body: [[
              monthlySummary.totalDays,
              monthlySummary.presentDays,
              monthlySummary.regularizedPresentDays,
              monthlySummary.halfDays,
              monthlySummary.partiallyAbsentDays,
              monthlySummary.weekOffs,
              monthlySummary.weekOffsWorked,
              monthlySummary.holidays,
              monthlySummary.el,
              monthlySummary.sl,
              monthlySummary.cl,
              monthlySummary.compOffEarned, // Use API value for Comp Off Earned
              monthlySummary.compOff, // Use API value for Comp Off Leave
              monthlySummary.lop
            ]],
            startY: yPosition,
            theme: 'grid',
            styles: {
              fontSize: 7,
              cellPadding: 2,
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
              0: { cellWidth: 15, halign: 'center' }, // Total Days
              1: { cellWidth: 15, halign: 'center' }, // Present Days
              2: { cellWidth: 18, halign: 'center' }, // Regularized Present
              3: { cellWidth: 14, halign: 'center' }, // Half Days
              4: { cellWidth: 18, halign: 'center' }, // Partially Absent
              5: { cellWidth: 15, halign: 'center' }, // Total Weekoff
              6: { cellWidth: 18, halign: 'center' }, // Week Offs Worked
              7: { cellWidth: 14, halign: 'center' }, // Holidays
              8: { cellWidth: 12, halign: 'center' }, // EL
              9: { cellWidth: 12, halign: 'center' }, // SL
              10: { cellWidth: 12, halign: 'center' }, // CL
              11: { cellWidth: 16, halign: 'center' }, // Comp Off (Gained)
              12: { cellWidth: 16, halign: 'center' }, // Comp Off (Leave)
              13: { cellWidth: 12, halign: 'center' }  // LOP
            },
            margin: { top: 10, left: 3, right: 3, bottom: 10 },
            pageBreak: 'auto'
          });
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

          // Add Overall Summary section with minimal spacing
          doc.setFontSize(11);
          doc.setTextColor(41, 128, 185);
          doc.setFont('helvetica', 'bold');
          doc.text('Overall Summary', 15, yPosition);
          yPosition += 12;
         
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
         
          // Calculate Total Payable Days: Present + Half Days + (Weekoffs - Weekoffs Worked) + Holidays + Leaves + Comp Off Leave
          // Note: 
          // - weekOffsWorked days are already included in presentDays, so we subtract them from weekOffs to avoid double counting
          // - compOffEarned should not be included in payable days (it's earned, not taken as leave)
          // - partiallyAbsentDays should not be included as they are not fully payable
          // - regularizedPresentDays should not be included
          const netWeekOffs = monthlySummary.weekOffs - (monthlySummary.weekOffsWorked || 0);
          const totalPayableDays = 
            monthlySummary.presentDays +
            monthlySummary.halfDays +
            (netWeekOffs > 0 ? netWeekOffs : 0) +
            monthlySummary.holidays +
            monthlySummary.el +
            monthlySummary.cl +
            monthlySummary.sl +
            monthlySummary.compOff;
         
          console.log('=== TOTAL PAYABLE DAYS CALCULATION (API DATA) ===');
          console.log('Present Days:', monthlySummary.presentDays);
          console.log('Regularized Present:', monthlySummary.regularizedPresentDays);
          console.log('Half Days:', monthlySummary.halfDays);
          console.log('Partially Absent:', monthlySummary.partiallyAbsentDays);
          console.log('Week Offs:', monthlySummary.weekOffs);
          console.log('Week Offs Worked:', monthlySummary.weekOffsWorked);
          console.log('Holidays:', monthlySummary.holidays);
          console.log('EL:', monthlySummary.el);
          console.log('CL:', monthlySummary.cl);
          console.log('SL:', monthlySummary.sl);
          console.log('Comp Off Earned (API):', monthlySummary.compOffEarned);
          console.log('Comp Off Leave (API):', monthlySummary.compOff);
          console.log('TOTAL PAYABLE DAYS:', totalPayableDays);
         
          // Total Payable Days should equal the sum of all payable days
          const cappedPayableDays = totalPayableDays;
          const attendancePercentage = monthlySummary.totalDays > 0 ? Math.min(((cappedPayableDays / monthlySummary.totalDays) * 100), 100).toFixed(2) : '0.00';
         
          // Add summary lines with minimal spacing
          const summaryLines = [
            `Total Days: ${monthlySummary.totalDays}`,
            `Total Payable Days: ${cappedPayableDays % 1 === 0 ? cappedPayableDays.toString() : cappedPayableDays.toFixed(2)}`,
            `Attendance Percentage: ${attendancePercentage}%`
          ];
         
          if (monthlySummary.compOffEarned > 0) {
            summaryLines.splice(2, 0, `Comp Off Earned (Holiday Work): ${monthlySummary.compOffEarned}`);
          }
          if (monthlySummary.compOff > 0) {
            summaryLines.splice(3, 0, `Comp Off Leave Taken: ${monthlySummary.compOff}`);
          }
         
          doc.text(summaryLines, 15, yPosition, { lineHeightFactor: 1.3 });
          yPosition += (summaryLines.length * 8) + 5;
        } else {
          // Calculate summary from attendance records and leave history
          let presentDays = 0;
          let halfDays = 0;
          let partiallyAbsentDays = 0;
          let holidays = 0;
          let el = 0;
          let sl = 0;
          let cl = 0;
          let compOffGained = 0;
          let compOffLeave = 0; // Comp Off Leave taken by employee
          let lop = 0;

          // Helper: is this a week off day?
          const isWeekOffDay = (date: string, year: number, month: number, projectName?: string) => {
            const dayType = getDayType(date, year, month, projectName);
            // For Exozen - Ops projects, only Sunday and government holidays are week off days
            // For other projects, Sunday, government holidays, and 2nd/4th Saturdays are week off days
            return dayType === 'Sunday' || dayType === 'Holiday' || dayType === '2nd Saturday' || dayType === '4th Saturday';
          };

           // Get the project name from the first record to determine weekoff rules
           const projectName: string | undefined = filteredRecords.length > 0 ? (filteredRecords[0].projectName ?? undefined) : undefined;
           console.log('PDF Summary - Using project name for weekoff calculation:', projectName);

           // Build a set of all week off dates in the month based on project rules
          const weekOffDates = new Set<string>();
          for (let d = 1; d <= new Date(selectedYear, selectedMonth, 0).getDate(); d++) {
            const dateStr = new Date(selectedYear, selectedMonth - 1, d).toISOString().split('T')[0];
             if (isWeekOffDay(dateStr, selectedYear, selectedMonth, projectName)) {
              weekOffDates.add(dateStr);
               console.log('Added weekoff date:', dateStr, 'for project:', projectName);
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
          const weekOffsWithoutHolidays = Array.from(weekOffDates).filter(date => !workedWeekOffDates.has(date)).length;
          const weekOffsWorked = workedWeekOffDates.size;
           
           // Separate holidays count (holidays are already counted in holidays variable)
           
           console.log('=== WEEKOFF CALCULATION ===');
           console.log('All weekoff dates in month:', Array.from(weekOffDates));
           console.log('Worked weekoff dates:', Array.from(workedWeekOffDates));
           console.log('Weekoffs (without holidays):', weekOffsWithoutHolidays);
           console.log('Weekoffs Worked:', weekOffsWorked);
           console.log('Holidays count:', holidays);

          // Count EL, SL, CL, Comp Off Leave from leaveHistory for the selected month
          leaveHistory.forEach((leave) => {
            if (leave.leaveType === 'EL') el += leave.numberOfDays;
            if (leave.leaveType === 'SL') sl += leave.numberOfDays;
            if (leave.leaveType === 'CL') cl += leave.numberOfDays;
            if (leave.leaveType === 'Comp Off' || leave.leaveType === 'COMP OFF' || leave.leaveType === 'CompOff') {
              compOffLeave += leave.numberOfDays;
            }
          });

          // LOP: add Partially Absent as LOP if required
          lop += partiallyAbsentDays;

          // Calculate Total Payable Days: presentDays + halfDays + (weekOffs - weekOffsWorked) + holidays + el + cl + sl + compOffLeave
          // Note: 
          // - weekOffsWorked is already included in presentDays, so subtract it from weekOffs to avoid double counting
          // - compOffGained should not be included in payable days
          // - partiallyAbsentDays should not be included as they are not fully payable
          const netWeekOffs = weekOffsWithoutHolidays - weekOffsWorked;
          let totalPayableDays = 
            presentDays +
            halfDays + // Half days count as 0.5
            (netWeekOffs > 0 ? netWeekOffs : 0) + // Net week offs (excluding worked ones)
            holidays + // Holidays
            el + // Earned Leave
            cl + // Casual Leave
            sl + // Sick Leave
            compOffLeave; // Comp Off Leave (CFL)
          // Do NOT add compOffGained or partiallyAbsentDays
          
          if (totalPayableDays < 0) totalPayableDays = 0;

          autoTable(doc, {
            head: [[
              'Total Days',
              'Present Days',
              'Half Days',
              'Partially Absent',
              'Total Weekoff',
              'EL',
              'SL',
              'CL',
              'Comp Off (Gained)',
              'Comp Off (Leave)',
              'LOP'
            ]],
            body: [[
              filteredRecords.length,
              presentDays,
              halfDays,
              partiallyAbsentDays,
              weekOffsWithoutHolidays, // Total weekoffs (excluding holidays which are counted separately)
              el,
              sl,
              cl,
              compOffGained,
              compOffLeave,
              lop
            ]],
            startY: yPosition,
            theme: 'grid',
            styles: {
              fontSize: 7,
              cellPadding: 2,
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
              0: { cellWidth: 16, halign: 'center' }, // Total Days
              1: { cellWidth: 16, halign: 'center' }, // Present Days
              2: { cellWidth: 14, halign: 'center' }, // Half Days
              3: { cellWidth: 18, halign: 'center' }, // Partially Absent
              4: { cellWidth: 16, halign: 'center' }, // Total Weekoff
              5: { cellWidth: 12, halign: 'center' }, // EL
              6: { cellWidth: 12, halign: 'center' }, // SL
              7: { cellWidth: 12, halign: 'center' }, // CL
              8: { cellWidth: 16, halign: 'center' }, // Comp Off (Gained)
              9: { cellWidth: 16, halign: 'center' }, // Comp Off (Leave)
              10: { cellWidth: 12, halign: 'center' }  // LOP
            },
            margin: { top: 10, left: 3, right: 3, bottom: 10 },
            pageBreak: 'auto'
          });

          // Add minimal spacing after summary table
          yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
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
         
          if (compOffLeave > 0) {
            summaryLines.push(`Comp Off Leave Taken: ${compOffLeave}`);
          }
         
          summaryLines.push(`Attendance Percentage: ${attendancePercentage}%`);
         
          doc.text(summaryLines, 12, yPosition, { lineHeightFactor: 1.3 });
          yPosition += 5;
        }

        // Add leave history as table if there are leaves
        if (leaveHistory && leaveHistory.length > 0) {
            // Check if we need a new page
            const pageHeight = doc.internal.pageSize.getHeight();
            if (yPosition + 60 > pageHeight - 20) {
                doc.addPage();
                yPosition = 15;
            }
       
            doc.setFontSize(11);
            doc.setTextColor(41, 128, 185);
            doc.setFont('helvetica', 'bold');
            doc.text('Leave History', 15, yPosition);
            yPosition += 8;
           
            // Create leave history table
            const leaveColumns = ['Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
            const leaveRows = leaveHistory.map(leave => [
                leave.leaveType,
                new Date(leave.startDate).toLocaleDateString(),
                new Date(leave.endDate).toLocaleDateString(),
                leave.numberOfDays.toString(),
                leave.status,
                leave.reason || 'N/A'
            ]);

            autoTable(doc, {
                head: [leaveColumns],
                body: leaveRows,
                startY: yPosition,
                theme: 'grid',
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
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
                    0: { cellWidth: 20, halign: 'center' }, // Leave Type
                    1: { cellWidth: 25, halign: 'center' }, // Start Date
                    2: { cellWidth: 25, halign: 'center' }, // End Date
                    3: { cellWidth: 15, halign: 'center' }, // Days
                    4: { cellWidth: 20, halign: 'center' }, // Status
                    5: { cellWidth: 35, halign: 'left' }    // Reason
                },
                margin: { top: 5, left: 3, right: 3, bottom: 5 },
                pageBreak: 'auto'
            });
           
            yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
       
        // Add note and signatures with minimal spacing
        // Check if we need a new page for note and signatures
        const pageHeight = doc.internal.pageSize.getHeight();
        if (yPosition + 50 > pageHeight - 20) {
            doc.addPage();
            yPosition = 15;
        }
       
        // Add note
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 0, 0);
        const noteLabel = 'Note:';
        doc.setTextColor(0, 0, 0);
        const noteText = 'Please ensure that the total working hours per day are at least 8 hours.';
        doc.text(`${noteLabel} ${noteText}`, 15, yPosition);
        yPosition += 15;

        // Signature lines
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(30, yPosition, 90, yPosition);
        doc.line(120, yPosition, 180, yPosition);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Authorized Signature', 30, yPosition + 8);
        doc.text('Employee Signature', 120, yPosition + 8);

        doc.save(`attendance_report_${selectedMonth}_${selectedYear}.pdf`);
    };


    // In your component's main render logic, process the attendance data
    const processedData = enrichWithLocations(attendanceData);

    // Helper function to pre-fetch all unique addresses
    const prefetchAddresses = useCallback(async () => {
        const uniqueLocations = new Set<string>();
        
        // Collect all unique coordinates
        processedData.forEach(record => {
            if (record.punchInLocation?.latitude && record.punchInLocation?.longitude) {
                uniqueLocations.add(`${record.punchInLocation.latitude},${record.punchInLocation.longitude}`);
            }
            if (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude) {
                uniqueLocations.add(`${record.punchOutLocation.latitude},${record.punchOutLocation.longitude}`);
            }
        });

        // Fetch addresses for all unique locations
        const addressPromises = Array.from(uniqueLocations).map(async (locationKey) => {
            if (!locationAddresses.has(locationKey)) {
                const [lat, lng] = locationKey.split(',').map(Number);
                try {
                    const address = await reverseGeocode(lat, lng);
                    return { locationKey, address };
                } catch {
                    console.error('Error fetching address for', locationKey);
                    return { locationKey, address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})` };
                }
            }
            return null;
        });

        const results = await Promise.all(addressPromises);
        const newAddresses = new Map(locationAddresses);
        
        results.forEach(result => {
            if (result) {
                newAddresses.set(result.locationKey, result.address);
            }
        });
        
        setLocationAddresses(newAddresses);
    }, [processedData, locationAddresses, reverseGeocode]);

    // Pre-fetch addresses when component loads or data changes
    useEffect(() => {
        if (processedData.length > 0) {
            prefetchAddresses();
        }
    }, [processedData, prefetchAddresses]);

    // Helper for shortage formatting (target 9h per day)
    const formatShortage = (workedHours: number): string => {
        const deficit = Math.max(0, 9 - workedHours);
        const hours = Math.floor(deficit);
        const minutes = Math.round((deficit - hours) * 60);
        return `${hours}h ${minutes}m`;
    };

    // Location Report PDF Download - Show ALL punch records with addresses
    const downloadLocationPDF = async () => {
        if (isGeneratingLocationPDF) return; // Prevent multiple clicks
        
        setIsGeneratingLocationPDF(true);
        try {
            console.log('Starting detailed location PDF generation...');
            const doc = new jsPDF();
            let yPosition = 15;

            // Header
            doc.addImage("/v1/employee/exozen_logo1.png", 'PNG', 15, yPosition, 25, 8);
            doc.setFontSize(11);
            doc.setTextColor(41, 128, 185);
            doc.text(`Location Report - ${months[selectedMonth - 1]} ${selectedYear}`, 45, yPosition + 4);
            doc.setFontSize(9);
            doc.text(`Employee ID: ${employeeId}`, 45, yPosition + 8);

            yPosition += 12;
            doc.setDrawColor(200, 200, 200);
            doc.line(15, yPosition, 195, yPosition);
            yPosition += 5;

            // Filter records that have location data (either punch in OR punch out)
            const recordsWithLocation = processedAttendanceData.filter(record =>
                (record.punchInLocation?.latitude && record.punchInLocation?.longitude) ||
                (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude)
            );

            if (recordsWithLocation.length === 0) {
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text('No location data available for the selected period.', 15, yPosition);
                doc.save(`location_report_${selectedMonth}_${selectedYear}.pdf`);
                return;
            }

            // Location table - Show ALL punch events
            const locationColumns = ["Date", "Event Type", "Time", "Location"];
            const locationRows = [];
            
            // Create a local cache for this PDF generation
            const localAddressCache = new Map<string, string>();

            console.log(`Processing ${recordsWithLocation.length} records for detailed PDF...`);

            // Process all records and get detailed punch data
            for (const record of recordsWithLocation) {
                try {
                    // Get detailed punch data for this specific date
                    const dateStr = record.date.split('T')[0]; // Get YYYY-MM-DD format
                    console.log(`Fetching detailed punches for ${dateStr}...`);
                    
                    const punchResponse = await fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/punches/${dateStr}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        // Add timeout to prevent hanging
                        signal: AbortSignal.timeout(10000) // 10 second timeout
                    });
                    
                    if (punchResponse.ok) {
                        const punchData = await punchResponse.json();
                        console.log(`Punch data for ${dateStr}:`, punchData);
                        
                        if (punchData && Array.isArray(punchData.punches)) {
                            // Sort punches by time
                            const sortedPunches = punchData.punches.sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
                                new Date(a.time as string).getTime() - new Date(b.time as string).getTime()
                            );
                            
                            console.log(`Found ${sortedPunches.length} punches for ${dateStr}`);
                            
                            // Add each punch event as a separate row
                            for (let i = 0; i < sortedPunches.length; i++) {
                                const punch = sortedPunches[i];
                                let address = '-';
                                
                                try {
                                    if (punch.latitude && punch.longitude) {
                                        const locationKey = `${punch.latitude},${punch.longitude}`;
                                        
                                        // Check local cache first, then global cache, then fetch
                                        if (localAddressCache.has(locationKey)) {
                                            address = localAddressCache.get(locationKey)!;
                                        } else if (locationAddresses.has(locationKey)) {
                                            address = locationAddresses.get(locationKey)!;
                                            localAddressCache.set(locationKey, address);
                                        } else {
                                            // Fetch address with timeout
                                            console.log(`Fetching address for coordinates: ${punch.latitude}, ${punch.longitude}`);
                                            const geocodePromise = reverseGeocode(punch.latitude, punch.longitude);
                                            const timeoutPromise = new Promise<string>((_, reject) => 
                                                setTimeout(() => reject(new Error('Geocoding timeout')), 8000)
                                            );
                                            
                                            address = await Promise.race([geocodePromise, timeoutPromise]);
                                            localAddressCache.set(locationKey, address);
                                            console.log(`Got address: ${address}`);
                                        }
                                    }
                                } catch {
                                    console.warn('Error fetching punch location');
                                    address = `Location (${punch.latitude?.toFixed(4)}, ${punch.longitude?.toFixed(4)})`;
                                }

                                // Determine event type based on punch pattern
                                // First punch is always Punch In, then alternate
                                const eventType = i === 0 ? 'Punch In' : 
                                                i % 2 === 1 ? 'Punch Out' : 'Punch In';

                                locationRows.push([
                                    formatDate(record.date),
                                    eventType,
                                    formatTime(punch.time),
                                    address.length > 60 ? address.substring(0, 60) + '...' : address
                                ]);
                            }
                        } else {
                            console.log(`No detailed punches found for ${dateStr}, using fallback data`);
                            // Fallback to original data if detailed punches not available
                            if (record.punchInLocation?.latitude && record.punchInLocation?.longitude) {
                                let punchInAddress = '-';
                                try {
                                    const locationKey = `${record.punchInLocation.latitude},${record.punchInLocation.longitude}`;
                                    
                                    if (localAddressCache.has(locationKey)) {
                                        punchInAddress = localAddressCache.get(locationKey)!;
                                    } else if (locationAddresses.has(locationKey)) {
                                        punchInAddress = locationAddresses.get(locationKey)!;
                                        localAddressCache.set(locationKey, punchInAddress);
                                    } else {
                                        const geocodePromise = reverseGeocode(record.punchInLocation.latitude, record.punchInLocation.longitude);
                                        const timeoutPromise = new Promise<string>((_, reject) => 
                                            setTimeout(() => reject(new Error('Geocoding timeout')), 8000)
                                        );
                                        
                                        punchInAddress = await Promise.race([geocodePromise, timeoutPromise]);
                                        localAddressCache.set(locationKey, punchInAddress);
                                    }
                                } catch {
                                    punchInAddress = `Location (${record.punchInLocation.latitude.toFixed(4)}, ${record.punchInLocation.longitude.toFixed(4)})`;
                                }

                                locationRows.push([
                                    formatDate(record.date),
                                    'Punch In',
                                    formatTime(record.punchInTime),
                                    punchInAddress.length > 60 ? punchInAddress.substring(0, 60) + '...' : punchInAddress
                                ]);
                            }

                            if (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude) {
                                let punchOutAddress = '-';
                                try {
                                    const locationKey = `${record.punchOutLocation.latitude},${record.punchOutLocation.longitude}`;
                                    
                                    if (localAddressCache.has(locationKey)) {
                                        punchOutAddress = localAddressCache.get(locationKey)!;
                                    } else if (locationAddresses.has(locationKey)) {
                                        punchOutAddress = locationAddresses.get(locationKey)!;
                                        localAddressCache.set(locationKey, punchOutAddress);
                                    } else {
                                        const geocodePromise = reverseGeocode(record.punchOutLocation.latitude, record.punchOutLocation.longitude);
                                        const timeoutPromise = new Promise<string>((_, reject) => 
                                            setTimeout(() => reject(new Error('Geocoding timeout')), 8000)
                                        );
                                        
                                        punchOutAddress = await Promise.race([geocodePromise, timeoutPromise]);
                                        localAddressCache.set(locationKey, punchOutAddress);
                                    }
                                } catch {
                                    punchOutAddress = `Location (${record.punchOutLocation.latitude.toFixed(4)}, ${record.punchOutLocation.longitude.toFixed(4)})`;
                                }

                                locationRows.push([
                                    formatDate(record.date),
                                    'Punch Out',
                                    formatTime(record.punchOutTime),
                                    punchOutAddress.length > 60 ? punchOutAddress.substring(0, 60) + '...' : punchOutAddress
                                ]);
                            }
                        }
                    } else {
                        console.log(`API failed for ${dateStr}, using fallback data`);
                        // Fallback to original data if API fails
                        if (record.punchInLocation?.latitude && record.punchInLocation?.longitude) {
                            let punchInAddress = '-';
                            try {
                                const locationKey = `${record.punchInLocation.latitude},${record.punchInLocation.longitude}`;
                                
                                if (localAddressCache.has(locationKey)) {
                                    punchInAddress = localAddressCache.get(locationKey)!;
                                } else if (locationAddresses.has(locationKey)) {
                                    punchInAddress = locationAddresses.get(locationKey)!;
                                    localAddressCache.set(locationKey, punchInAddress);
                                } else {
                                    const geocodePromise = reverseGeocode(record.punchInLocation.latitude, record.punchInLocation.longitude);
                                    const timeoutPromise = new Promise<string>((_, reject) => 
                                        setTimeout(() => reject(new Error('Geocoding timeout')), 8000)
                                    );
                                    
                                    punchInAddress = await Promise.race([geocodePromise, timeoutPromise]);
                                    localAddressCache.set(locationKey, punchInAddress);
                                }
                                } catch {
                                    punchInAddress = `Location (${record.punchInLocation.latitude.toFixed(4)}, ${record.punchInLocation.longitude.toFixed(4)})`;
                                }

                            locationRows.push([
                                formatDate(record.date),
                                'Punch In',
                                formatTime(record.punchInTime),
                                punchInAddress.length > 60 ? punchInAddress.substring(0, 60) + '...' : punchInAddress
                            ]);
                        }

                        if (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude) {
                            let punchOutAddress = '-';
                            try {
                                const locationKey = `${record.punchOutLocation.latitude},${record.punchOutLocation.longitude}`;
                                
                                if (localAddressCache.has(locationKey)) {
                                    punchOutAddress = localAddressCache.get(locationKey)!;
                                } else if (locationAddresses.has(locationKey)) {
                                    punchOutAddress = locationAddresses.get(locationKey)!;
                                    localAddressCache.set(locationKey, punchOutAddress);
                                } else {
                                    const geocodePromise = reverseGeocode(record.punchOutLocation.latitude, record.punchOutLocation.longitude);
                                    const timeoutPromise = new Promise<string>((_, reject) => 
                                        setTimeout(() => reject(new Error('Geocoding timeout')), 8000)
                                    );
                                    
                                    punchOutAddress = await Promise.race([geocodePromise, timeoutPromise]);
                                    localAddressCache.set(locationKey, punchOutAddress);
                                }
                                } catch {
                                    punchOutAddress = `Location (${record.punchOutLocation.latitude.toFixed(4)}, ${record.punchOutLocation.longitude.toFixed(4)})`;
                                }

                            locationRows.push([
                                formatDate(record.date),
                                'Punch Out',
                                formatTime(record.punchOutTime),
                                punchOutAddress.length > 60 ? punchOutAddress.substring(0, 60) + '...' : punchOutAddress
                            ]);
                        }
                    }
                                } catch {
                                    console.error('Error fetching detailed punch data for', record.date);
                                    // Continue with fallback data
                                }
            }

            console.log(`Generated ${locationRows.length} location rows for PDF`);

            // Update global cache with local cache after PDF generation
            setLocationAddresses(prev => {
                const newCache = new Map(prev);
                localAddressCache.forEach((value, key) => {
                    newCache.set(key, value);
                });
                return newCache;
            });

            // Generate the table
            autoTable(doc, {
                head: [locationColumns],
                body: locationRows,
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
                    1: { cellWidth: 20, halign: 'center' }, // Event Type
                    2: { cellWidth: 20, halign: 'center' }, // Time
                    3: { cellWidth: 130, halign: 'left' }   // Location
                },
                pageBreak: 'auto',
                margin: { top: 20, right: 10, bottom: 20, left: 10 },
                tableWidth: 'auto',
                showHead: 'everyPage'
            });

            // Save the PDF
            console.log('Saving PDF...');
            doc.save(`location_report_${selectedMonth}_${selectedYear}.pdf`);
            console.log('PDF saved successfully');
        } catch (error) {
            console.error('Error generating location PDF:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Error generating location report PDF: ${errorMessage}. Please try again.`);
        } finally {
            setIsGeneratingLocationPDF(false);
        }
    };

    // Location Report Excel Download
    const downloadLocationExcel = async () => {
        try {
            // Filter records that have location data (either punch in OR punch out)
            const recordsWithLocation = processedAttendanceData.filter(record =>
                (record.punchInLocation?.latitude && record.punchInLocation?.longitude) ||
                (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude)
            );

            if (recordsWithLocation.length === 0) {
                alert('No location data available for the selected period.');
                return;
            }

            // Prepare data for Excel with ALL punch events
            const excelData = [];
            
            // Create a local cache for this Excel generation
            const localAddressCache = new Map<string, string>();
           
            for (const record of recordsWithLocation) {
                try {
                    // Get detailed punch data for this specific date
                    const dateStr = record.date.split('T')[0]; // Get YYYY-MM-DD format
                    const punchResponse = await fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/punches/${dateStr}`);
                    
                    if (punchResponse.ok) {
                        const punchData = await punchResponse.json();
                        
                        if (punchData && Array.isArray(punchData.punches)) {
                            // Sort punches by time
                            const sortedPunches = punchData.punches.sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
                                new Date(a.time as string).getTime() - new Date(b.time as string).getTime()
                            );
                            
                            // Add each punch event as a separate row
                            for (const punch of sortedPunches) {
                                let address = '-';
                                try {
                                    if (punch.latitude && punch.longitude) {
                                        const locationKey = `${punch.latitude},${punch.longitude}`;
                                        
                                        // Check local cache first, then global cache, then fetch
                                        if (localAddressCache.has(locationKey)) {
                                            address = localAddressCache.get(locationKey)!;
                                        } else if (locationAddresses.has(locationKey)) {
                                            address = locationAddresses.get(locationKey)!;
                                            localAddressCache.set(locationKey, address);
                                        } else {
                                            address = await reverseGeocode(punch.latitude, punch.longitude);
                                            localAddressCache.set(locationKey, address);
                                        }
                                    }
                                } catch {
                                    console.error('Error fetching punch location');
                                    address = `Location (${punch.latitude?.toFixed(4)}, ${punch.longitude?.toFixed(4)})`;
                                }

                                // Determine event type based on punch pattern
                                // First punch is always Punch In, then alternate
                                const punchIndex = sortedPunches.indexOf(punch);
                                const eventType = punchIndex === 0 ? 'Punch In' : 
                                                punchIndex % 2 === 1 ? 'Punch Out' : 'Punch In';

                                excelData.push({
                                    'Date': formatDate(record.date),
                                    'Event Type': eventType,
                                    'Time': formatTime(punch.time),
                                    'Project Name': record.projectName || 'N/A',
                                    'Designation': record.designation || 'N/A',
                                    'Latitude': punch.latitude,
                                    'Longitude': punch.longitude,
                                    'Address': address
                                });
                            }
                        } else {
                            // Fallback to original data if detailed punches not available
                            if (record.punchInLocation?.latitude && record.punchInLocation?.longitude) {
                                let punchInAddress = '-';
                                try {
                                    const locationKey = `${record.punchInLocation.latitude},${record.punchInLocation.longitude}`;
                                    
                                    // Check local cache first, then global cache, then fetch
                                    if (localAddressCache.has(locationKey)) {
                                        punchInAddress = localAddressCache.get(locationKey)!;
                                    } else if (locationAddresses.has(locationKey)) {
                                        punchInAddress = locationAddresses.get(locationKey)!;
                                        localAddressCache.set(locationKey, punchInAddress);
                                    } else {
                                        punchInAddress = await reverseGeocode(record.punchInLocation?.latitude, record.punchInLocation?.longitude);
                                        localAddressCache.set(locationKey, punchInAddress);
                                    }
                                } catch {
                                    punchInAddress = `Location (${record.punchInLocation?.latitude?.toFixed(4)}, ${record.punchInLocation?.longitude?.toFixed(4)})`;
                                }

                                excelData.push({
                                    'Date': formatDate(record.date),
                                    'Event Type': 'Punch In',
                                    'Time': formatTime(record.punchInTime),
                                    'Project Name': record.projectName || 'N/A',
                                    'Designation': record.designation || 'N/A',
                                    'Latitude': record.punchInLocation?.latitude,
                                    'Longitude': record.punchInLocation?.longitude,
                                    'Address': punchInAddress
                                });
                            }

                            if (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude) {
                                let punchOutAddress = '-';
                                try {
                                    const locationKey = `${record.punchOutLocation.latitude},${record.punchOutLocation.longitude}`;
                                    
                                    // Check local cache first, then global cache, then fetch
                                    if (localAddressCache.has(locationKey)) {
                                        punchOutAddress = localAddressCache.get(locationKey)!;
                                    } else if (locationAddresses.has(locationKey)) {
                                        punchOutAddress = locationAddresses.get(locationKey)!;
                                        localAddressCache.set(locationKey, punchOutAddress);
                                    } else {
                                        punchOutAddress = await reverseGeocode(record.punchOutLocation?.latitude, record.punchOutLocation?.longitude);
                                        localAddressCache.set(locationKey, punchOutAddress);
                                    }
                                } catch {
                                    punchOutAddress = `Location (${record.punchOutLocation?.latitude?.toFixed(4)}, ${record.punchOutLocation?.longitude?.toFixed(4)})`;
                                }

                                excelData.push({
                                    'Date': formatDate(record.date),
                                    'Event Type': 'Punch Out',
                                    'Time': formatTime(record.punchOutTime),
                                    'Project Name': record.projectName || 'N/A',
                                    'Designation': record.designation || 'N/A',
                                    'Latitude': record.punchOutLocation?.latitude,
                                    'Longitude': record.punchOutLocation?.longitude,
                                    'Address': punchOutAddress
                                });
                            }
                        }
                    } else {
                        // Fallback to original data if API fails
                        if (record.punchInLocation?.latitude && record.punchInLocation?.longitude) {
                            let punchInAddress = '-';
                            try {
                                const locationKey = `${record.punchInLocation.latitude},${record.punchInLocation.longitude}`;
                                
                                if (localAddressCache.has(locationKey)) {
                                    punchInAddress = localAddressCache.get(locationKey)!;
                                } else if (locationAddresses.has(locationKey)) {
                                    punchInAddress = locationAddresses.get(locationKey)!;
                                    localAddressCache.set(locationKey, punchInAddress);
                                } else {
                                    punchInAddress = await reverseGeocode(record.punchInLocation?.latitude, record.punchInLocation?.longitude);
                                    localAddressCache.set(locationKey, punchInAddress);
                                }
                            } catch {
                                punchInAddress = `Location (${record.punchInLocation?.latitude?.toFixed(4)}, ${record.punchInLocation?.longitude?.toFixed(4)})`;
                            }

                            excelData.push({
                                'Date': formatDate(record.date),
                                'Event Type': 'Punch In',
                                'Time': formatTime(record.punchInTime),
                                'Project Name': record.projectName || 'N/A',
                                'Designation': record.designation || 'N/A',
                                'Latitude': record.punchInLocation?.latitude,
                                'Longitude': record.punchInLocation?.longitude,
                                'Address': punchInAddress
                            });
                        }

                        if (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude) {
                            let punchOutAddress = '-';
                            try {
                                const locationKey = `${record.punchOutLocation.latitude},${record.punchOutLocation.longitude}`;
                                
                                if (localAddressCache.has(locationKey)) {
                                    punchOutAddress = localAddressCache.get(locationKey)!;
                                } else if (locationAddresses.has(locationKey)) {
                                    punchOutAddress = locationAddresses.get(locationKey)!;
                                    localAddressCache.set(locationKey, punchOutAddress);
                                } else {
                                    punchOutAddress = await reverseGeocode(record.punchOutLocation?.latitude, record.punchOutLocation?.longitude);
                                    localAddressCache.set(locationKey, punchOutAddress);
                                }
                            } catch {
                                punchOutAddress = `Location (${record.punchOutLocation?.latitude?.toFixed(4)}, ${record.punchOutLocation?.longitude?.toFixed(4)})`;
                            }

                            excelData.push({
                                'Date': formatDate(record.date),
                                'Event Type': 'Punch Out',
                                'Time': formatTime(record.punchOutTime),
                                'Project Name': record.projectName || 'N/A',
                                'Designation': record.designation || 'N/A',
                                'Latitude': record.punchOutLocation?.latitude,
                                'Longitude': record.punchOutLocation?.longitude,
                                'Address': punchOutAddress
                            });
                        }
                    }
                                } catch {
                                    console.error('Error fetching detailed punch data for', record.date);
                                    // Continue with fallback data
                                }
            }

            // Update global cache with local cache after Excel generation
            setLocationAddresses(prev => {
                const newCache = new Map(prev);
                localAddressCache.forEach((value, key) => {
                    newCache.set(key, value);
                });
                return newCache;
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Location Report');
            XLSX.writeFile(workbook, `location_report_${selectedMonth}_${selectedYear}.xlsx`);
        } catch {
            console.error('Error generating location Excel');
            alert('Error generating location report Excel. Please try again.');
        }
    };

    return (
        <div className={`space-y-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6`}>

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
                        disabled={isGeneratingLocationPDF}
                        className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${
                            isGeneratingLocationPDF 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        <FaFilePdf className="w-4 h-4" />
                        {isGeneratingLocationPDF ? 'Generating PDF...' : 'Export Location Report (PDF)'}
                    </button>
                    <button
                        onClick={downloadLocationExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <FaFileExcel className="w-4 h-4" />
                        Export Location Report (Excel)
                    </button>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto w-full">
                <table className="min-w-[1200px] text-sm table-auto border-collapse border border-blue-400">
                  <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                    <tr>
                      <th className={`px-4 py-3 text-left font-bold sticky left-0 z-20 whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`} style={{ width: 60 }}>#</th>
                      <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Date</th>
                      <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Project</th>
                      <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Check In</th>
                      <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Check Out</th>
                      <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Hours Worked</th>
                      <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Shortage Hours</th>
                      <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Day Type</th>
                      <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Status</th>
                      <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.map((record: ExtendedRawAttendanceRecord, index) => (
                      <tr key={record._id || index} className={`${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-gray-50"} transition-colors duration-200`}>
                        <td className={`px-4 py-3 text-left font-mono text-sm border border-blue-400 ${theme === "dark" ? "bg-slate-800 text-gray-300" : "bg-white text-gray-600"}`} style={{ width: 60 }}>
                          {index + 1}
                        </td>
                        <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                          <span className="block whitespace-pre-wrap break-words leading-5" title={formatDate(record.date)}>
                            {formatDate(record.date)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                          <span className="block whitespace-pre-wrap break-words leading-5 hover:underline cursor-pointer" title={record.projectName || 'N/A'}>
                            {record.projectName || 'N/A'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                          <span className="block whitespace-pre-wrap break-words leading-5" title={(() => {
                            // Check if punchInTime contains location/project info instead of time
                            if (record.punchInTime && !record.punchInTime.includes(':')) {
                              return '-';
                            }
                            return formatTime(record.punchInTime);
                          })()}>
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
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                          <span className="block whitespace-pre-wrap break-words leading-5" title={(() => {
                            // Check if punchOutTime contains location/project info instead of time
                            if (record.punchOutTime && !record.punchOutTime.includes(':')) {
                              return '-';
                            }
                            return formatTime(record.punchOutTime);
                          })()}>
                            {(() => {
                              // Check if punchOutTime contains location/project info instead of time
                              if (record.punchOutTime && !record.punchOutTime.includes(':')) {
                                // If punchOutTime doesn't contain time format, it might be location/project
                                return '-';
                              }
                              return formatTime(record.punchOutTime);
                            })()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center border border-blue-400 font-mono ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                          <span className="block whitespace-pre-wrap break-words leading-5" title={(() => {
                            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                           
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
                                return formatHoursToHoursAndMinutes(hoursWorked);
                              } catch {
                                return 'Error';
                              }
                            } else if (dayType !== 'Working Day' && dayType !== 'Sunday' && dayType !== '2nd Saturday' && dayType !== '4th Saturday') {
                              return '-';
                            } else {
                              return 'Incomplete';
                            }
                          })()}>
                            {(() => {
                              const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                             
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
                              } catch {
                                console.error('Error calculating hours');
                                return 'Error';
                              }
                              } else if (dayType !== 'Working Day' && dayType !== 'Sunday' && dayType !== '2nd Saturday' && dayType !== '4th Saturday') {
                                return '-';
                              } else {
                                return 'Incomplete';
                              }
                            })()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center border border-blue-400 font-mono ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                          <span className="block whitespace-pre-wrap break-words leading-5" title={(() => {
                            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                           
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
                               
                                if (hoursWorked < 9) {
                                  const shortage = 9 - hoursWorked;
                                  const hours = Math.floor(shortage);
                                  const minutes = Math.round((shortage - hours) * 60);
                                  return `${hours}h ${minutes}m`;
                                }
                                return '-';
                              } catch {
                                return 'Error';
                              }
                            } else if (dayType !== 'Working Day' && dayType !== 'Sunday' && dayType !== '2nd Saturday' && dayType !== '4th Saturday') {
                              return '-';
                            } else {
                              return 'Incomplete';
                            }
                          })()}>
                            {(() => {
                              const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                             
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
                                } catch {
                                console.error('Error calculating shortage');
                                return 'Error';
                              }
                              } else if (dayType !== 'Working Day' && dayType !== 'Sunday' && dayType !== '2nd Saturday' && dayType !== '4th Saturday') {
                                return '-';
                              } else {
                                return 'Incomplete';
                              }
                            })()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                          <span className="block whitespace-pre-wrap break-words leading-5" title={(() => {
                            const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                            return dayType;
                          })()}>
                            {(() => {
                              const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                             
                              // Debug logging for UI table
                              if (record.projectName && record.projectName.toLowerCase().includes('exozen') && (record.date.includes('2025-09-27') || record.date.includes('2025-09-13'))) {
                                console.log('🔍 UI Table Debug for September 13/27, 2025:', {
                                  date: record.date,
                                  projectName: record.projectName,
                                  dayType: dayType,
                                  status: getAttendanceStatus(record, dayType)
                                });
                              }
                             
                              return dayType;
                            })()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center border border-blue-400`}>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            (() => {
                                const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                                const status = getAttendanceStatus(record, dayType);
                               
                                // Debug logging for status
                                if (record.projectName && record.projectName.toLowerCase().includes('exozen') && (record.date.includes('2025-09-27') || record.date.includes('2025-09-13'))) {
                                  console.log('🔍 Status Debug for September 13/27, 2025:', {
                                    date: record.date,
                                    projectName: record.projectName,
                                    dayType: dayType,
                                    status: status
                                  });
                                }
                                switch (status) {
                                    case 'Present':
                                        return theme === "dark" ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800';
                                    case 'Half Day':
                                        return theme === "dark" ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800';
                                    case 'Comp Off':
                                        return theme === "dark" ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800';
                                    case 'Holiday':
                                        return theme === "dark" ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800';
                                    default:
                                        return status.includes('Leave')
                                            ? (theme === "dark" ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800')
                                            : (theme === "dark" ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800');
                                }
                            })()
                          }`}>
                            {(() => {
                                const dayType = getDayType(record.date, selectedYear, selectedMonth, record.projectName ?? undefined);
                                return getAttendanceStatus(record, dayType);
                            })()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center border border-blue-400`}>
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className={`px-3 py-1 text-xs font-semibold border rounded transition-colors ${
                              theme === "dark" 
                                ? "bg-blue-800 text-white border-blue-400 hover:bg-blue-700" 
                                : "bg-blue-50 text-blue-700 border-blue-400 hover:bg-blue-100"
                            }`}
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
                  <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 max-w-4xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
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
                    
                    {/* Table format for record details */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                        <thead className={theme === "dark" ? "bg-blue-900" : "bg-blue-50"}>
                          <tr>
                            <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Field</th>
                            <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>Date</td>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-900 border-gray-200"}`}>
                              {formatDate(selectedRecord.date)}
                            </td>
                          </tr>
                          <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>Project Name</td>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-900 border-gray-200"}`}>
                              {selectedRecord.projectName || 'N/A'}
                            </td>
                          </tr>
                          <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>Designation</td>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-900 border-gray-200"}`}>
                              {selectedRecord.designation || 'N/A'}
                            </td>
                          </tr>
                          <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>Punch In Time</td>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-900 border-gray-200"}`}>
                              {formatTime(selectedRecord.punchInTime)}
                            </td>
                          </tr>
                          <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>Punch Out Time</td>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-900 border-gray-200"}`}>
                              {formatTime(selectedRecord.punchOutTime)}
                            </td>
                          </tr>
                          <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>Punch In Location</td>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-900 border-gray-200"}`}>
                              {selectedRecord.punchInLocation
                                ? (inLocationAddress || 'Fetching location...')
                                : 'Location not available'}
                            </td>
                          </tr>
                          <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>Punch Out Location</td>
                            <td className={`px-3 py-2 text-left whitespace-nowrap border ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-900 border-gray-200"}`}>
                              {selectedRecord.punchOutLocation
                                ? (outLocationAddress || 'Fetching location...')
                                : 'Location not available'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Attendance Photos section */}
                    {(selectedRecord.punchInPhoto || selectedRecord.punchOutPhoto) && (
                      <div className="mt-6">
                        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                          Attendance Photos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedRecord.punchInPhoto && (
                            <div className="text-center">
                              <span className={`text-sm font-medium block mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Punch In Photo</span>
                              <Image
                                src={selectedRecord.punchInPhoto}
                                alt="Punch In"
                                width={200}
                                height={200}
                                className="rounded-lg mx-auto"
                              />
                            </div>
                          )}
                          {selectedRecord.punchOutPhoto && (
                            <div className="text-center">
                              <span className={`text-sm font-medium block mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Punch Out Photo</span>
                              <Image
                                src={selectedRecord.punchOutPhoto}
                                alt="Punch Out"
                                width={200}
                                height={200}
                                className="rounded-lg mx-auto"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
        </div>
      );
    };

    export default AttendanceReport;