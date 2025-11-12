"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSearch } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  projectName: string;
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
  status: string;
}

interface ProjectAttendanceRecord {
  _id: { employeeId: string; date: string } | string;
  status: string;
  employeeId: string;
  date: string;
  name: string;
  designation: string;
  punchInTime?: string;
  punchOutTime?: string;
  punchInPhoto?: string;
  punchOutPhoto?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  projectName: string;
  punchInLocation?: LocationDetail;
  punchOutLocation?: LocationDetail;
}

interface AttendanceApiResponse {
  attendance: AttendanceRecord[];
}

interface KycEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  employeeImage?: string;
  dateOfJoining?: string;
}

interface KycForm {
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
    employeeImage?: string;
    dateOfJoining?: string;
  };
}

interface ManualAttendanceEntry {
  employeeId: string;
  name: string;
  photo?: string;
  dateOfJoining?: string;
  attendance: { [date: string]: 'P' | 'A' | '' };
  otWeekoff: { [date: string]: string }; // Can be 'W/O', 'LOP', or numeric hours like '1', '2', '2.30', etc.
}

interface LocationDetail {
  latitude: number;
  longitude: number;
  address: string | null;
}

export default function AttendanceViewPage() {
  const { theme } = useTheme();
  const [activeTab] = useState("View Attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [, setProjectAttendance] = useState<ProjectAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ProjectAttendanceRecord | null>(null);
  const [kycEmployees, setKycEmployees] = useState<KycEmployee[]>([]);
  const [selectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [showDumpDropdown, setShowDumpDropdown] = useState(false);
  const [dumpProjectFilter, setDumpProjectFilter] = useState("");
  const [dumpMonth, setDumpMonth] = useState<number>(new Date().getMonth() + 1);
  const [dumpYear, setDumpYear] = useState<number>(new Date().getFullYear());
  const [manualAttendanceData, setManualAttendanceData] = useState<ManualAttendanceEntry[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showDumpEmployeeList, setShowDumpEmployeeList] = useState(false);
  const [dumpManualAttendance, setDumpManualAttendance] = useState<ManualAttendanceEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 8;
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Utility function must come before filterAttendance
  const getDateOnly = (dateStr: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  // Filtering logic must come next
  const filterAttendance = (): AttendanceRecord[] => {
    return attendanceData
      .filter((record: AttendanceRecord) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          record.employeeId.toLowerCase().includes(searchLower) ||
          (record.projectName && record.projectName.toLowerCase().includes(searchLower)) ||
          (record.date && new Date(record.date).toLocaleDateString().includes(searchLower));
        let matchesFrom = true,
          matchesTo = true;
        const recordDate = getDateOnly(record.date);
        if (fromDate) {
          matchesFrom = recordDate >= fromDate;
        }
        if (toDate) {
          matchesTo = recordDate <= toDate;
        }
        let matchesProject = true;
        if (activeTab === "Project Wise Attendance" && projectFilter) {
          matchesProject = record.projectName === projectFilter;
        }
        return matchesSearch && matchesFrom && matchesTo && matchesProject;
      })
      .sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  const filteredAttendance: AttendanceRecord[] = filterAttendance();


  // Inline filter states
  const [empIdFilter, setEmpIdFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [projectFilterHeader, setProjectFilterHeader] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Unique designations and projects for dropdowns
  const uniqueDesignations = Array.from(new Set(kycEmployees.map(e => e.designation).filter(Boolean)));
  const uniqueProjectsAll = Array.from(new Set(kycEmployees.map(e => e.projectName).filter(Boolean)));
  const uniqueStatus = Array.from(new Set(attendanceData.map(e => e.status).filter(Boolean)));

  // Filtered attendance with header filters
  const filteredAttendanceWithHeader = filteredAttendance.filter(record => {
    const kyc = kycEmployees.find(e => e.employeeId === record.employeeId);
    const matchesEmpId = empIdFilter === "" || record.employeeId.toLowerCase().includes(empIdFilter.toLowerCase());
    const matchesName = nameFilter === "" || (kyc?.fullName || "").toLowerCase().includes(nameFilter.toLowerCase());
    const matchesDesignation = designationFilter === "" || (kyc?.designation || "").toLowerCase() === designationFilter.toLowerCase();
    const matchesProject = projectFilterHeader === "" || (record.projectName || "").toLowerCase() === projectFilterHeader.toLowerCase();
    const matchesDate = dateFilter === "" || (record.date && record.date.slice(0, 10) === dateFilter);
    const matchesStatus = statusFilter === "" || (record.status || "").toLowerCase() === statusFilter.toLowerCase();
    // Filter by dump project if selected
    const matchesDumpProject = dumpProjectFilter === "" || (record.projectName || "").toLowerCase() === dumpProjectFilter.toLowerCase();
    return matchesEmpId && matchesName && matchesDesignation && matchesProject && matchesDate && matchesStatus && matchesDumpProject;
  });

  // Helper to get photo from kycEmployees
  const getEmployeePhoto = (employeeId: string) => {
    const kyc = kycEmployees.find(e => e.employeeId === employeeId);
    return kyc?.employeeImage || "/placeholder-user.jpg";
  };

  // Get all dates in a month - only dates from the selected month (no previous month dates)
  const getDatesInMonth = (month: number, year: number): string[] => {
    const dates: string[] = [];
    
    // Get the last day of the selected month
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    // Only add dates from day 1 to the last day of the selected month
    // Use UTC to avoid timezone issues that might cause date shifts
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date in local time but ensure it's in the correct month
      const date = new Date(year, month - 1, day);
      
      // Verify the date is exactly what we expect
      // getMonth() returns 0-11, so we compare with month - 1
      if (date.getMonth() === month - 1 && date.getFullYear() === year && date.getDate() === day) {
        // Format as YYYY-MM-DD to ensure consistency
        const yearStr = date.getFullYear();
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
        dates.push(dateStr);
      }
    }
    
    // Final validation: filter out any dates that don't belong to the selected month
    return dates.filter(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return y === year && m === month && d >= 1 && d <= daysInMonth;
    });
  };



  // Fetch dump attendance data from backend API
  const fetchDumpAttendanceFromAPI = async (project: string, month: number, year: number): Promise<ManualAttendanceEntry[] | null> => {
    try {
      const response = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/dump?projectName=${encodeURIComponent(project)}&month=${month}&year=${year}`
      );
      
      if (!response.ok) {
        console.log('Dump API not available, using local initialization');
        return null;
      }
      
      const result = await response.json();
      
      if (result.success && result.data && result.data.employees) {
        // Map backend response to frontend format
        return result.data.employees.map((emp: {
          employeeId: string;
          name: string;
          photo?: string;
          dateOfJoining?: string;
          attendance?: { [date: string]: string };
          otWeekoff?: { [date: string]: string };
        }) => ({
          employeeId: emp.employeeId,
          name: emp.name,
          photo: emp.photo || undefined,
          dateOfJoining: emp.dateOfJoining || undefined,
          attendance: emp.attendance || {},
          otWeekoff: emp.otWeekoff || {}
        }));
      }
      
      return null;
    } catch (error) {
      console.log('Error fetching dump data from API:', error);
      return null;
    }
  };

  // Initialize dump manual attendance data (fallback if API not available)
  const initializeDumpManualAttendance = (project: string, month: number, year: number) => {
    const employeesInProject = kycEmployees.filter(e => e.projectName === project);
    const dates = getDatesInMonth(month, year);
    
    const manualData: ManualAttendanceEntry[] = employeesInProject.map(emp => {
      const attendance: { [date: string]: 'P' | 'A' | '' } = {};
      const otWeekoff: { [date: string]: 'OT' | 'W/O' | '' } = {};
      dates.forEach(date => {
        // Check if employee joined before or on this date
        if (emp.dateOfJoining) {
          const joinDate = new Date(emp.dateOfJoining);
          const currentDate = new Date(date);
          if (joinDate <= currentDate) {
            attendance[date] = '';
            otWeekoff[date] = '';
          }
        } else {
          attendance[date] = '';
          otWeekoff[date] = '';
        }
      });
      return {
        employeeId: emp.employeeId,
        name: emp.fullName,
        photo: emp.employeeImage,
        dateOfJoining: emp.dateOfJoining,
        attendance,
        otWeekoff
      };
    });
    setDumpManualAttendance(manualData);
  };

  // Initialize dump attendance (tries API first, falls back to local)
  const initializeDumpAttendance = async (project: string, month: number, year: number) => {
    setLoading(true);
    try {
      // Try to fetch from API first
      const apiData = await fetchDumpAttendanceFromAPI(project, month, year);
      
      if (apiData && apiData.length > 0) {
        // Use data from API
        setDumpManualAttendance(apiData);
      } else {
        // Fallback to local initialization
        initializeDumpManualAttendance(project, month, year);
      }
    } catch (error) {
      console.error('Error initializing dump attendance:', error);
      // Fallback to local initialization on error
      initializeDumpManualAttendance(project, month, year);
    } finally {
      setLoading(false);
    }
  };

  // Handle dump project selection - show employee list with attendance columns
  const handleDumpProjectSelect = async (project: string) => {
    setDumpProjectFilter(project);
    setCurrentPage(1); // Reset to first page
    if (project) {
      setShowDumpEmployeeList(true);
      setShowManualEntry(false);
      // Initialize dump attendance data (tries API first, falls back to local)
      await initializeDumpAttendance(project, dumpMonth, dumpYear);
    } else {
      setShowDumpEmployeeList(false);
      setDumpManualAttendance([]);
    }
  };

  // Helper function to convert hours.minutes format to total hours (e.g., "2.30" = 2.5 hours)
  const convertHoursMinutesToTotalHours = (value: string): number => {
    if (!value || value === '' || value === '.') return 0;
    
    // Handle partial inputs like "1." or "1.1"
    if (value.endsWith('.')) {
      const hours = parseInt(value.replace('.', '')) || 0;
      return hours;
    }
    
    const parts = value.split('.');
    const hours = parseInt(parts[0]) || 0;
    
    if (parts.length > 1 && parts[1] !== '') {
      // Handle minutes part - could be "1" (single digit) or "15" (two digits)
      const minutesStr = parts[1];
      let minutes = 0;
      
      if (minutesStr.length === 1) {
        // Single digit like "1.1" - treat as 10 minutes (0.1 * 60 = 6 minutes, but we want 10)
        // Actually, "1.1" should be 1 hour 10 minutes, not 1 hour 1 minute
        minutes = parseInt(minutesStr) * 10; // "1.1" = 10 minutes
      } else {
        // Two digits like "1.15" = 15 minutes
        minutes = parseInt(minutesStr) || 0;
      }
      
      // Validate minutes (0-59)
      if (minutes < 0 || minutes > 59) {
        return hours; // Return just hours if minutes invalid
      }
      
      // Convert minutes to decimal hours (30 minutes = 0.5 hours)
      return hours + (minutes / 60);
    }
    
    // Just hours, no minutes
    return hours;
  };

  // Helper function to extract hours and minutes from H.MM format
  const extractHoursMinutes = (value: string): { hours: number; minutes: number } => {
    if (!value || value === '' || value === '.') return { hours: 0, minutes: 0 };
    
    // Handle partial inputs like "1." or "1.1"
    if (value.endsWith('.')) {
      const hours = parseInt(value.replace('.', '')) || 0;
      return { hours, minutes: 0 };
    }
    
    const parts = value.split('.');
    const hours = parseInt(parts[0]) || 0;
    
    if (parts.length > 1 && parts[1] !== '') {
      const minutesStr = parts[1];
      let minutes = 0;
      
      if (minutesStr.length === 1) {
        // Single digit like "1.1" = 10 minutes
        minutes = parseInt(minutesStr) * 10;
      } else {
        // Two digits like "1.15" = 15 minutes
        minutes = parseInt(minutesStr) || 0;
      }
      
      // Validate minutes (0-59)
      if (minutes < 0 || minutes > 59) {
        return { hours, minutes: 0 };
      }
      
      return { hours, minutes };
    }
    
    return { hours, minutes: 0 };
  };


  // Calculate attendance summary for an employee
  const calculateAttendanceSummary = (emp: ManualAttendanceEntry, month: number, year: number) => {
    const dates = getDatesInMonth(month, year);
    let presentDays = 0;
    let absentDays = 0;
    let totalOTHoursValue = 0; // For decimal calculation (backward compatibility)
    let totalOTHours = 0; // Total hours (integer part)
    let totalOTMinutes = 0; // Total minutes (will be converted to hours if >= 60)
    let weekOffDays = 0;
    let lopDays = 0;

    dates.forEach(date => {
      const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
      const currentDate = new Date(date);
      const isBeforeJoin = joinDate && currentDate < joinDate;
      
      if (!isBeforeJoin) {
        const attendanceValue = emp.attendance[date] || '';
        const otWeekoffValue = emp.otWeekoff[date] || '';
        
        // Check if it's H (A + W/O) - Holiday/Week Off
        const isHoliday = attendanceValue === 'A' && otWeekoffValue === 'W/O';
        
        if (attendanceValue === 'P') {
          presentDays++;
          
          // Check for OT hours (only with P)
          if (otWeekoffValue && otWeekoffValue !== '' && otWeekoffValue !== 'LOP' && otWeekoffValue !== 'W/O') {
            // Extract hours and minutes separately from H.MM format
            const { hours, minutes } = extractHoursMinutes(otWeekoffValue);
            if (hours > 0 || minutes > 0) {
              totalOTHours += hours;
              totalOTMinutes += minutes;
              totalOTHoursValue += convertHoursMinutesToTotalHours(otWeekoffValue);
            }
          }
        } else if (isHoliday) {
          // H (Holiday/Week Off) - count as week off, not absent
          weekOffDays++;
        } else if (attendanceValue === 'A') {
          // A (Absent) - count as absent
          absentDays++;
          
          // Check for LOP
          if (otWeekoffValue === 'LOP') {
            lopDays++;
          }
        }
      }
    });

    // Convert excess minutes to hours (if minutes >= 60)
    const extraHours = Math.floor(totalOTMinutes / 60);
    const finalHours = totalOTHours + extraHours;
    const finalMinutes = totalOTMinutes % 60;

    // Format as H.MM (e.g., "3.45" for 3 hours 45 minutes)
    let totalOTHoursDisplay = '';
    if (finalMinutes === 0) {
      totalOTHoursDisplay = finalHours.toString();
    } else {
      totalOTHoursDisplay = `${finalHours}.${finalMinutes.toString().padStart(2, '0')}`;
    }

    // Total = P + W/O (Present days + Week Off days)
    const totalDays = presentDays + weekOffDays;

    return {
      presentDays,
      absentDays,
      totalOTHours: totalOTHoursDisplay, // Display in H.MM format (e.g., "3.45")
      totalOTHoursDecimal: totalOTHoursValue, // Decimal format for calculations if needed
      weekOffDays,
      lopDays,
      totalWorkingDays: totalDays // Total = P + W/O
    };
  };

  // Pagination calculations
  const totalPages = Math.ceil(dumpManualAttendance.length / employeesPerPage);
  const startIndex = (currentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const currentEmployees = dumpManualAttendance.slice(startIndex, endIndex);

  // Update dump manual attendance entry
  const updateDumpManualAttendance = (employeeId: string, date: string, value: string) => {
    // Only allow P, A, or empty
    const normalizedValue = value.toUpperCase().trim();
    const finalValue = normalizedValue === 'P' ? 'P' : normalizedValue === 'A' ? 'A' : '';
    
    setDumpManualAttendance(prev => 
      prev.map(emp => {
        if (emp.employeeId === employeeId) {
          const newAttendance = { ...emp.attendance, [date]: finalValue as 'P' | 'A' | '' };
          const newOtWeekoff = { ...emp.otWeekoff };
          
          // Clear OT/W/O if attendance is cleared or if it doesn't match the new attendance
          if (finalValue === '') {
            newOtWeekoff[date] = '';
          } else if (finalValue === 'P' && newOtWeekoff[date] === 'W/O') {
            // Clear W/O if P is entered
            newOtWeekoff[date] = '';
          } else if (finalValue === 'A') {
            // When A is selected, default to LOP if otWeekoff is empty
            const currentOtValue = newOtWeekoff[date] || '';
            if (currentOtValue === '' || (currentOtValue !== 'W/O' && currentOtValue !== 'LOP')) {
              // Auto-set to LOP when A is selected (unless W/O is already set)
              newOtWeekoff[date] = 'LOP';
            }
          }
          
          return { ...emp, attendance: newAttendance, otWeekoff: newOtWeekoff };
        }
        return emp;
      })
    );
  };

  // Update dump OT/W/O entry - conditional based on attendance
  const updateDumpOTWeekoff = (employeeId: string, date: string, value: string, attendanceValue: 'P' | 'A' | '') => {
    let finalValue: string = '';
    
    // If P (Present), allow multiple input formats for easier entry:
    // - "1.15" → "1.15" - decimal format (PRIORITY - easiest to type)
    // - "1:15" → "1.15" - colon format
    // - "115" → "1.15" (1 hour 15 minutes) - no decimal needed
    // - "2" → "2" - just hours
    if (attendanceValue === 'P') {
      if (value === '') {
        finalValue = '';
      } else {
        // Allow colon format (1:15) and convert to decimal
        let cleanedValue = value.replace(/:/g, '.');
        // Remove any non-numeric characters except decimal point
        cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');
        
        if (cleanedValue === '' || cleanedValue === '.') {
          // Allow partial input like "." or "1." while typing
          finalValue = cleanedValue;
        } else {
          // PRIORITY 1: Check if it has a decimal point (H.MM format) - handle this first
          if (cleanedValue.includes('.')) {
            const parts = cleanedValue.split('.');
            const hoursPart = parts[0] || '';
            const minutesPart = parts[1] || '';
            
            // Validate hours (0-24)
            const hours = parseInt(hoursPart) || 0;
            if (hours < 0 || hours > 24) {
              return; // Invalid hours
            }
            
            // If there's a decimal part, validate minutes (00-59)
            if (minutesPart !== '') {
              // Allow partial input while typing (e.g., "1.1" or "1.15")
              const minutesStr = minutesPart.substring(0, 2); // Take only first 2 digits
              const minutes = parseInt(minutesStr) || 0;
              
              // Allow partial input - don't reject if user is still typing
              if (minutesPart.length === 1) {
                // User typed "1.1" - allow it temporarily
                finalValue = `${hours}.${minutesStr}`;
              } else if (minutes >= 0 && minutes <= 59) {
                // Format as H.MM (e.g., 2.30)
                finalValue = `${hours}.${minutesStr.padStart(2, '0')}`;
              } else {
                return; // Invalid minutes
              }
            } else if (hoursPart !== '') {
              // User typed "1." - allow partial input
              finalValue = `${hours}.`;
            } else {
              finalValue = '';
            }
          } 
          // PRIORITY 2: Check if it's a 3-4 digit number without decimal (e.g., "115" or "2130")
          else {
            const numericOnly = cleanedValue;
            if (numericOnly.length >= 3 && numericOnly.length <= 4) {
              // Parse as HHMM format (e.g., "115" = 1 hour 15 minutes, "2130" = 21 hours 30 minutes)
              const totalDigits = numericOnly.length;
              if (totalDigits === 3) {
                // 3 digits: first digit is hours, last 2 are minutes (e.g., "115" = 1.15)
                const hours = parseInt(numericOnly.substring(0, 1)) || 0;
                const minutes = parseInt(numericOnly.substring(1, 3)) || 0;
                if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59) {
                  finalValue = `${hours}.${minutes.toString().padStart(2, '0')}`;
                } else {
                  return; // Invalid
                }
              } else if (totalDigits === 4) {
                // 4 digits: first 2 are hours, last 2 are minutes (e.g., "2130" = 21.30)
                const hours = parseInt(numericOnly.substring(0, 2)) || 0;
                const minutes = parseInt(numericOnly.substring(2, 4)) || 0;
                if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59) {
                  finalValue = `${hours}.${minutes.toString().padStart(2, '0')}`;
                } else {
                  return; // Invalid
                }
              }
            } 
            // PRIORITY 3: Just hours (1-2 digits)
            else if (numericOnly.length <= 2) {
              const hours = parseInt(numericOnly) || 0;
              if (hours >= 0 && hours <= 24) {
                finalValue = hours.toString();
              } else {
                return; // Invalid
              }
            } else {
              return; // Invalid format
            }
          }
        }
      }
    }
    // If A (Absent), allow W/O or LOP (handled by dropdown)
    else if (attendanceValue === 'A') {
      // This will be handled by dropdown, so just set the value
      finalValue = value;
    }
    // If empty attendance, allow both (but will be cleared when attendance is set)
    else {
      const normalizedValue = value.toUpperCase().trim();
      if (normalizedValue === 'W/O' || normalizedValue === 'WO' || normalizedValue === 'W') {
        finalValue = 'W/O';
      } else if (normalizedValue === 'LOP' || normalizedValue === 'L') {
        finalValue = 'LOP';
      } else {
        // Try to parse as number in multiple formats (same as Present case)
        if (value === '') {
          finalValue = '';
        } else {
          let cleanedValue = value.replace(/:/g, '.');
          cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');
          
          if (cleanedValue === '' || cleanedValue === '.') {
            finalValue = cleanedValue;
          } else {
            // PRIORITY 1: Check if it has a decimal point (H.MM format)
            if (cleanedValue.includes('.')) {
              const parts = cleanedValue.split('.');
              const hoursPart = parts[0] || '';
              const minutesPart = parts[1] || '';
              
              const hours = parseInt(hoursPart) || 0;
              if (hours >= 0 && hours <= 24) {
                if (minutesPart !== '') {
                  const minutesStr = minutesPart.substring(0, 2);
                  const minutes = parseInt(minutesStr) || 0;
                  if (minutesPart.length === 1) {
                    finalValue = `${hours}.${minutesStr}`;
                  } else if (minutes >= 0 && minutes <= 59) {
                    finalValue = `${hours}.${minutesStr.padStart(2, '0')}`;
                  } else if (hoursPart !== '') {
                    finalValue = hours.toString();
                  }
                } else if (hoursPart !== '') {
                  finalValue = `${hours}.`;
                } else {
                  finalValue = '';
                }
              }
            } 
            // PRIORITY 2: Check if it's a 3-4 digit number without decimal
            else {
              const numericOnly = cleanedValue;
              if (numericOnly.length >= 3 && numericOnly.length <= 4) {
                const totalDigits = numericOnly.length;
                if (totalDigits === 3) {
                  const hours = parseInt(numericOnly.substring(0, 1)) || 0;
                  const minutes = parseInt(numericOnly.substring(1, 3)) || 0;
                  if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59) {
                    finalValue = `${hours}.${minutes.toString().padStart(2, '0')}`;
                  }
                } else if (totalDigits === 4) {
                  const hours = parseInt(numericOnly.substring(0, 2)) || 0;
                  const minutes = parseInt(numericOnly.substring(2, 4)) || 0;
                  if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59) {
                    finalValue = `${hours}.${minutes.toString().padStart(2, '0')}`;
                  }
                }
              } 
              // PRIORITY 3: Just hours (1-2 digits)
              else if (numericOnly.length <= 2) {
                const hours = parseInt(numericOnly) || 0;
                if (hours >= 0 && hours <= 24) {
                  finalValue = hours.toString();
                }
              }
            }
          }
        }
      }
    }
    
    setDumpManualAttendance(prev => 
      prev.map(emp => {
        if (emp.employeeId === employeeId) {
          const newOtWeekoff = { ...emp.otWeekoff, [date]: finalValue };
          const newAttendance = { ...emp.attendance };
          
          // If W/O is selected and attendance is empty, set attendance to A
          if (finalValue === 'W/O' && !attendanceValue) {
            newAttendance[date] = 'A';
          }
          
          return { ...emp, attendance: newAttendance, otWeekoff: newOtWeekoff };
        }
        return emp;
      })
    );
  };

  // Download dump Excel
  const downloadDumpExcel = async () => {
    try {
      // Try to use ExcelJS for image support, fallback to XLSX
      let useExcelJS = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ExcelJS: any = null;
      
      try {
        ExcelJS = await import('exceljs');
        useExcelJS = true;
      } catch {
        // Fallback to XLSX if ExcelJS is not available
        useExcelJS = false;
      }
      
      const XLSX = await import('xlsx');
      const dates = getDatesInMonth(dumpMonth, dumpYear);
      const monthName = new Date(dumpYear, dumpMonth - 1).toLocaleString('default', { month: 'long' });
      
      if (useExcelJS && ExcelJS) {
        // Use ExcelJS for image support
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance');
        
        // Set column headers - Column order: S.No, Employee ID, Name, then dates, then summary
        const headers = [
          'S.No',
          'Employee ID',
          'Name',
          ...dates.map(date => parseInt(date.split('-')[2], 10).toString()),
          'P',
          'A',
          'OT Hrs',
          'W/O',
          'LOP',
          'Total'
        ];
        
        // Add header with logo - Professional report style
        const logoRow = worksheet.addRow([]);
        logoRow.height = 70;
        const logoCell = logoRow.getCell(1);
        // No text, just logo image
        logoCell.value = '';
        logoCell.alignment = { vertical: 'middle', horizontal: 'left' };
        logoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        const logoBorder = {
          top: { style: 'medium' as const, color: { argb: 'FF4472C4' } },
          left: { style: 'medium' as const, color: { argb: 'FF4472C4' } },
          bottom: { style: 'medium' as const, color: { argb: 'FF4472C4' } },
          right: { style: 'medium' as const, color: { argb: 'FF4472C4' } }
        };
        logoCell.border = logoBorder;
        worksheet.mergeCells(1, 1, 1, headers.length);
        
        // Try to add logo image
        try {
          const logoPath = '/v1/employee/exozen_logo1.png';
          const response = await fetch(logoPath);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const imageId = workbook.addImage({
              buffer: arrayBuffer,
              extension: 'png',
            });
            worksheet.addImage(imageId, {
              tl: { col: 0, row: 0 },
              ext: { width: 180, height: 70 }
            });
          }
        } catch {
          console.log('Logo image not found, using text only');
        }
        
        // Add title rows with professional styling
        const titleRow = worksheet.addRow([`ATTENDANCE REPORT - ${dumpProjectFilter.toUpperCase()}`]);
        titleRow.height = 30;
        const titleCell = titleRow.getCell(1);
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF4472C4' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        titleCell.border = logoBorder;
        worksheet.mergeCells(2, 1, 2, headers.length);
        
        const monthRow = worksheet.addRow([`Period: ${monthName.toUpperCase()} ${dumpYear}`]);
        monthRow.height = 25;
        const monthCell = monthRow.getCell(1);
        monthCell.font = { bold: true, size: 11, color: { argb: 'FF333333' } };
        monthCell.alignment = { vertical: 'middle', horizontal: 'center' };
        monthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
        monthCell.border = logoBorder;
        worksheet.mergeCells(3, 1, 3, headers.length);
        
        worksheet.addRow([]); // Empty row for spacing
        
        // Add column headers with professional table styling
        const headerRow = worksheet.addRow(headers);
        const headerBorderStyle = {
          top: { style: 'medium' as const, color: { argb: 'FF4472C4' } },
          left: { style: 'thin' as const, color: { argb: 'FFFFFFFF' } },
          bottom: { style: 'medium' as const, color: { argb: 'FF4472C4' } },
          right: { style: 'thin' as const, color: { argb: 'FFFFFFFF' } }
        };
        headerRow.eachCell((cell: { fill: unknown; font: unknown; alignment: unknown; border: unknown }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cell as any).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cell as any).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cell as any).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cell as any).border = headerBorderStyle;
        });
        headerRow.height = 30;
        
        // Add data rows
        dumpManualAttendance.forEach((emp, idx) => {
          const summary = calculateAttendanceSummary(emp, dumpMonth, dumpYear);
          
          // First row: P/A attendance (show H instead of A when W/O is selected)
          const attendanceRow = worksheet.addRow([
            idx + 1,
            emp.employeeId,
            emp.name,
            ...dates.map(date => {
              const attValue = emp.attendance[date] || '';
              const otValue = emp.otWeekoff[date] || '';
              // Show H if attendance is A and otWeekoff is W/O
              if (attValue === 'A' && otValue === 'W/O') {
                return 'H';
              }
              return attValue;
            }),
            summary.presentDays,
            summary.absentDays,
            summary.totalOTHours && summary.totalOTHours !== '0' ? summary.totalOTHours : '0',
            summary.weekOffDays,
            summary.lopDays,
            summary.totalWorkingDays
          ]);
          attendanceRow.height = 22; // Set row height for better appearance
          
          // Professional table border style - thicker outer, thin inner
          const isFirstEmployee = idx === 0;
          const isLastEmployee = idx === dumpManualAttendance.length - 1;
          const rowIndex = idx * 2; // Account for two rows per employee
          const isEvenRow = rowIndex % 4 === 0 || rowIndex % 4 === 1;
          const baseBgColor = isEvenRow ? 'FFFFFFFF' : 'FFF9F9F9';
          
          // Format P/A cells with colors and professional borders
          dates.forEach((date, dateIdx) => {
            const colNum = 4 + dateIdx; // Start after S.No, ID, Name
            const cell = attendanceRow.getCell(colNum);
            const attValue = String(emp.attendance[date] || '').toUpperCase();
            const otValue = emp.otWeekoff[date] || '';
            // Check if it should display as H (A + W/O)
            const isHoliday = attValue === 'A' && otValue === 'W/O';
            const value = isHoliday ? 'H' : attValue;
            const isFirstCol = colNum === 4;
            const isLastCol = colNum === 3 + dates.length;
            
            // Border style - thicker on outer edges
            cell.border = {
              top: { 
                style: isFirstEmployee ? 'medium' as const : 'thin' as const, 
                color: { argb: isFirstEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
              },
              left: { 
                style: isFirstCol ? 'medium' as const : 'thin' as const, 
                color: { argb: isFirstCol ? 'FF4472C4' : 'FFD0D0D0' } 
              },
              bottom: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
              right: { 
                style: isLastCol ? 'medium' as const : 'thin' as const, 
                color: { argb: isLastCol ? 'FF4472C4' : 'FFD0D0D0' } 
              }
            };
            
            if (value === 'P') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
              cell.font = { bold: true, color: { argb: 'FF006100' }, size: 10 };
            } else if (value === 'H') {
              // Purple styling for Holiday/Week Off
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
              cell.font = { bold: true, color: { argb: 'FF7030A0' }, size: 10 };
            } else if (value === 'A') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
              cell.font = { bold: true, color: { argb: 'FF9C0006' }, size: 10 };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBgColor } };
              cell.font = { size: 10 };
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
          
          // Format summary columns with borders and colors
          const summaryStartCol = 4 + dates.length;
          const summaryBorderStyle = {
            top: { 
              style: isFirstEmployee ? 'medium' as const : 'thin' as const, 
              color: { argb: isFirstEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
            },
            left: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
            bottom: { 
              style: isLastEmployee ? 'medium' as const : 'thin' as const, 
              color: { argb: isLastEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
            },
            right: { style: 'medium' as const, color: { argb: 'FF4472C4' } }
          };
          
          // P column
          const pCell = attendanceRow.getCell(summaryStartCol);
          pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
          pCell.font = { bold: true, color: { argb: 'FF006100' }, size: 10 };
          pCell.alignment = { horizontal: 'center', vertical: 'middle' };
          pCell.border = summaryBorderStyle;
          
          // A column
          const aCell = attendanceRow.getCell(summaryStartCol + 1);
          aCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
          aCell.font = { bold: true, color: { argb: 'FF9C0006' }, size: 10 };
          aCell.alignment = { horizontal: 'center', vertical: 'middle' };
          aCell.border = summaryBorderStyle;
          
          // OT Hrs column
          const otCell = attendanceRow.getCell(summaryStartCol + 2);
          otCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
          otCell.font = { bold: true, color: { argb: 'FF0000FF' }, size: 10 };
          otCell.alignment = { horizontal: 'center', vertical: 'middle' };
          otCell.border = summaryBorderStyle;
          
          // W/O column
          const woCell = attendanceRow.getCell(summaryStartCol + 3);
          woCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
          woCell.font = { bold: true, color: { argb: 'FF7030A0' }, size: 10 };
          woCell.alignment = { horizontal: 'center', vertical: 'middle' };
          woCell.border = summaryBorderStyle;
          
          // LOP column
          const lopCell = attendanceRow.getCell(summaryStartCol + 4);
          lopCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
          lopCell.font = { bold: true, color: { argb: 'FFE67E22' }, size: 10 };
          lopCell.alignment = { horizontal: 'center', vertical: 'middle' };
          lopCell.border = summaryBorderStyle;
          
          // Total column
          const totalCell = attendanceRow.getCell(summaryStartCol + 5);
          totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
          totalCell.font = { bold: true, size: 10 };
          totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
          totalCell.border = summaryBorderStyle;
          
          // Format S.No, Employee ID, Name columns with professional borders
          const leftBorderStyle = {
            top: { 
              style: isFirstEmployee ? 'medium' as const : 'thin' as const, 
              color: { argb: isFirstEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
            },
            left: { style: 'medium' as const, color: { argb: 'FF4472C4' } },
            bottom: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } }
          };
          
          attendanceRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          attendanceRow.getCell(1).border = leftBorderStyle;
          attendanceRow.getCell(1).font = { bold: true, size: 10 };
          attendanceRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBgColor } };
          
          attendanceRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
          attendanceRow.getCell(2).border = {
            top: { 
              style: isFirstEmployee ? 'medium' as const : 'thin' as const, 
              color: { argb: isFirstEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
            },
            left: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } }
          };
          attendanceRow.getCell(2).font = { size: 10 };
          attendanceRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBgColor } };
          
          attendanceRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
          attendanceRow.getCell(3).border = {
            top: { 
              style: isFirstEmployee ? 'medium' as const : 'thin' as const, 
              color: { argb: isFirstEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
            },
            left: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } }
          };
          attendanceRow.getCell(3).font = { size: 10 };
          attendanceRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBgColor } };
          
          // Format empty date cells
          attendanceRow.eachCell((cell: { fill?: unknown; alignment?: unknown }, colNumber: number) => {
            if (colNumber > 3 && colNumber < summaryStartCol && !cell.fill) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).alignment = { horizontal: 'center', vertical: 'middle' };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBgColor } };
            }
          });
          
          // Second row: OT/W/O
          const otWeekoffRow = worksheet.addRow([
            '',
            '',
            '',
            ...dates.map(date => emp.otWeekoff[date] || ''),
            '',
            '',
            '',
            '',
            '',
            ''
          ]);
          otWeekoffRow.height = 20; // Set row height for better appearance
          
          // Format OT/W/O cells with colors and professional borders
          const otRowBgColor = isEvenRow ? 'FFF5F5F5' : 'FFFFFFFF';
          dates.forEach((date, dateIdx) => {
            const colNum = 4 + dateIdx;
            const cell = otWeekoffRow.getCell(colNum);
            const value = String(emp.otWeekoff[date] || '').toUpperCase();
            const isFirstCol = colNum === 4;
            const isLastCol = colNum === 3 + dates.length;
            
            // Border style for OT/W/O row
            cell.border = {
              top: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
              left: { 
                style: isFirstCol ? 'medium' as const : 'thin' as const, 
                color: { argb: isFirstCol ? 'FF4472C4' : 'FFD0D0D0' } 
              },
              bottom: { 
                style: isLastEmployee ? 'medium' as const : 'thin' as const, 
                color: { argb: isLastEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
              },
              right: { 
                style: isLastCol ? 'medium' as const : 'thin' as const, 
                color: { argb: isLastCol ? 'FF4472C4' : 'FFD0D0D0' } 
              }
            };
            
            if (value === 'W/O') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
              cell.font = { bold: true, color: { argb: 'FF7030A0' }, size: 10 };
            } else if (value === 'LOP') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
              cell.font = { bold: true, color: { argb: 'FFE67E22' }, size: 10 };
            } else if (value && value !== '') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
              cell.font = { bold: true, color: { argb: 'FF0000FF' }, size: 10 };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: otRowBgColor } };
              cell.font = { size: 10 };
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
          
          // Format all cells in OT/W/O row with professional borders
          const otRowBorderStyle = {
            top: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
            left: { style: 'medium' as const, color: { argb: 'FF4472C4' } },
            bottom: { 
              style: isLastEmployee ? 'medium' as const : 'thin' as const, 
              color: { argb: isLastEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
            },
            right: { style: 'medium' as const, color: { argb: 'FF4472C4' } }
          };
          
          otWeekoffRow.eachCell((cell: { border?: unknown; fill?: unknown; alignment?: unknown; font?: unknown }, colNumber: number) => {
            if (colNumber <= 3) {
              // S.No, ID, Name columns
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).border = otRowBorderStyle;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: otRowBgColor } };
            } else if (colNumber > 3 + dates.length) {
              // Summary columns
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).border = {
                top: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
                left: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
                bottom: { 
                  style: isLastEmployee ? 'medium' as const : 'thin' as const, 
                  color: { argb: isLastEmployee ? 'FF4472C4' : 'FFD0D0D0' } 
                },
                right: { style: 'medium' as const, color: { argb: 'FF4472C4' } }
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: otRowBgColor } };
            }
            if (!cell.alignment) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).alignment = { horizontal: 'center', vertical: 'middle' };
            }
            if (!cell.font) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cell as any).font = { size: 10 };
            }
          });
        });
        
        // Set column widths
        worksheet.getColumn(1).width = 8; // S.No
        worksheet.getColumn(2).width = 18; // Employee ID
        worksheet.getColumn(3).width = 25; // Name
        dates.forEach((_, idx) => {
          worksheet.getColumn(4 + idx).width = 5; // Date columns
        });
        worksheet.getColumn(4 + dates.length).width = 8; // P
        worksheet.getColumn(5 + dates.length).width = 8; // A
        worksheet.getColumn(6 + dates.length).width = 10; // OT Hrs
        worksheet.getColumn(7 + dates.length).width = 8; // W/O
        worksheet.getColumn(8 + dates.length).width = 8; // LOP
        worksheet.getColumn(9 + dates.length).width = 10; // Total
        
        // Generate filename and download
        const fileName = `Attendance_${dumpProjectFilter}_${monthName}_${dumpYear}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        return;
      }
      
      // Fallback to XLSX if ExcelJS is not available
      // Prepare data for Excel - two rows per employee (P/A and OT/W/O) matching table structure
      // Column order: S.No, Employee ID, Name, then dates 1-30, then summary columns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exportData: any[] = [];
      
      // Add header section with logo and title (rows 1-3) - logo only, no text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headerRow1: any[] = ['', '', '', ...dates.map(() => ''), '', '', '', '', '', ''];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headerRow2: any[] = [`Attendance Sheet - ${dumpProjectFilter}`, '', '', ...dates.map(() => ''), '', '', '', '', '', ''];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headerRow3: any[] = [`Month: ${monthName} ${dumpYear}`, '', '', ...dates.map(() => ''), '', '', '', '', '', ''];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emptyRow: any[] = [];
      
      exportData.push(headerRow1);
      exportData.push(headerRow2);
      exportData.push(headerRow3);
      exportData.push(emptyRow);
      
      // Add column headers row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columnHeaders: any[] = [
        'S.No',
        'Employee ID',
        'Name',
        ...dates.map(date => parseInt(date.split('-')[2], 10).toString()),
        'P',
        'A',
        'OT Hrs',
        'W/O',
        'LOP',
        'Total'
      ];
      exportData.push(columnHeaders);
      
      dumpManualAttendance.forEach((emp, idx) => {
        const summary = calculateAttendanceSummary(emp, dumpMonth, dumpYear);
        
        // First row: P/A attendance (show H instead of A when W/O is selected)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attendanceRow: any[] = [
          idx + 1,
          emp.employeeId,
          emp.name,
          ...dates.map(date => {
            const attValue = emp.attendance[date] || '';
            const otValue = emp.otWeekoff[date] || '';
            // Show H if attendance is A and otWeekoff is W/O
            if (attValue === 'A' && otValue === 'W/O') {
              return 'H';
            }
            return attValue;
          }),
          summary.presentDays,
          summary.absentDays,
          summary.totalOTHours && summary.totalOTHours !== '0' ? summary.totalOTHours : '0',
          summary.weekOffDays,
          summary.lopDays,
          summary.totalWorkingDays
        ];
        
        exportData.push(attendanceRow);
        
        // Second row: OT/W/O
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const otWeekoffRow: any[] = [
          '',
          '',
          '',
          ...dates.map(date => emp.otWeekoff[date] || ''),
          '',
          '',
          '',
          '',
          '',
          ''
        ];
        
        exportData.push(otWeekoffRow);
      });
      
      // Create worksheet from array of arrays
      const worksheet = XLSX.utils.aoa_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 8 }, // S.No
        { wch: 18 }, // Employee ID
        { wch: 25 }, // Name
        ...dates.map(() => ({ wch: 5 })), // Date columns (1-30)
        { wch: 8 }, // P
        { wch: 8 }, // A
        { wch: 10 }, // OT Hrs
        { wch: 8 }, // W/O
        { wch: 8 }, // LOP
        { wch: 10 } // Total
      ];
      worksheet['!cols'] = colWidths;
      
      // Add color formatting to summary columns and date cells
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const baseCols = 3; // S.No, Employee ID, Name
      const summaryStartCol = baseCols + dates.length;
      const headerRow = 5; // Row 5 is the column header row (0-indexed: 4, but Excel is 1-indexed)
      const dataStartRow = 6; // Row 6 is where data starts (0-indexed: 5, but Excel is 1-indexed)
      
      // Helper function to get column letter
      const getColLetter = (colIndex: number): string => {
        let result = '';
        let num = colIndex;
        while (num >= 0) {
          result = String.fromCharCode(65 + (num % 26)) + result;
          num = Math.floor(num / 26) - 1;
        }
        return result;
      };
      
      // Format header rows (company name and title)
      for (let row = 1; row <= 3; row++) {
        const cell = `A${row}`;
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { bold: true, sz: 14, color: { rgb: "4472C4" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
        // Merge cells for header (A1 to last column)
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({
          s: { r: row - 1, c: 0 },
          e: { r: row - 1, c: range.e.c }
        });
      }
      
      // Format column header row (row 5)
      for (let col = 0; col <= range.e.c; col++) {
        const colLetter = getColLetter(col);
        const headerCell = `${colLetter}${headerRow}`;
        if (worksheet[headerCell]) {
          worksheet[headerCell].s = {
            fill: { fgColor: { rgb: "4472C4" } },
            font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
      
      // Format data rows with color indicators
      for (let row = dataStartRow - 1; row < range.e.r; row++) {
        const rowNum = row + 1;
        const dataRowIndex = row - (dataStartRow - 1);
        const isAttendanceRow = dataRowIndex % 2 === 0; // First row of each employee pair
        
        // Format date columns with color indicators for P/A/H
        if (isAttendanceRow) {
          for (let col = baseCols; col < summaryStartCol; col++) {
            const colLetter = getColLetter(col);
            const dateCell = `${colLetter}${rowNum}`;
            if (worksheet[dateCell] && worksheet[dateCell].v) {
              const cellValue = String(worksheet[dateCell].v).toUpperCase();
              if (cellValue === 'P') {
                worksheet[dateCell].s = {
                  fill: { fgColor: { rgb: "C6EFCE" } },
                  font: { color: { rgb: "006100" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
              } else if (cellValue === 'H') {
                // Purple styling for Holiday/Week Off
                worksheet[dateCell].s = {
                  fill: { fgColor: { rgb: "E2EFDA" } },
                  font: { color: { rgb: "7030A0" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
              } else if (cellValue === 'A') {
                worksheet[dateCell].s = {
                  fill: { fgColor: { rgb: "FFC7CE" } },
                  font: { color: { rgb: "9C0006" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
              } else {
                worksheet[dateCell].s = {
                  alignment: { horizontal: "center", vertical: "center" }
                };
              }
            }
          }
        } else {
          // OT/W/O row - format date columns
          for (let col = baseCols; col < summaryStartCol; col++) {
            const colLetter = getColLetter(col);
            const dateCell = `${colLetter}${rowNum}`;
            if (worksheet[dateCell]) {
              const cellValue = String(worksheet[dateCell].v || '').toUpperCase();
              if (cellValue === 'W/O') {
                worksheet[dateCell].s = {
                  fill: { fgColor: { rgb: "E2EFDA" } },
                  font: { color: { rgb: "7030A0" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
              } else if (cellValue === 'LOP') {
                worksheet[dateCell].s = {
                  fill: { fgColor: { rgb: "FFE699" } },
                  font: { color: { rgb: "E67E22" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
              } else if (cellValue && cellValue !== '') {
                // OT hours - blue background
                worksheet[dateCell].s = {
                  fill: { fgColor: { rgb: "BDD7EE" } },
                  font: { color: { rgb: "0000FF" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
              } else {
                worksheet[dateCell].s = {
                  alignment: { horizontal: "center", vertical: "center" }
                };
              }
            }
          }
        }
        
        // Format summary columns (only on attendance row)
        if (isAttendanceRow) {
          // P column (green)
          const pCell = `${getColLetter(summaryStartCol)}${rowNum}`;
          if (worksheet[pCell]) {
            worksheet[pCell].s = {
              fill: { fgColor: { rgb: "C6EFCE" } },
              font: { color: { rgb: "006100" }, bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          // A column (red)
          const aCell = `${getColLetter(summaryStartCol + 1)}${rowNum}`;
          if (worksheet[aCell]) {
            worksheet[aCell].s = {
              fill: { fgColor: { rgb: "FFC7CE" } },
              font: { color: { rgb: "9C0006" }, bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          // OT Hrs column (blue)
          const otCell = `${getColLetter(summaryStartCol + 2)}${rowNum}`;
          if (worksheet[otCell]) {
            worksheet[otCell].s = {
              fill: { fgColor: { rgb: "BDD7EE" } },
              font: { color: { rgb: "0000FF" }, bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          // W/O column (purple)
          const woCell = `${getColLetter(summaryStartCol + 3)}${rowNum}`;
          if (worksheet[woCell]) {
            worksheet[woCell].s = {
              fill: { fgColor: { rgb: "E2EFDA" } },
              font: { color: { rgb: "7030A0" }, bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          // LOP column (orange)
          const lopCell = `${getColLetter(summaryStartCol + 4)}${rowNum}`;
          if (worksheet[lopCell]) {
            worksheet[lopCell].s = {
              fill: { fgColor: { rgb: "FFE699" } },
              font: { color: { rgb: "E67E22" }, bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          // Total column (gray)
          const totalCell = `${getColLetter(summaryStartCol + 5)}${rowNum}`;
          if (worksheet[totalCell]) {
            worksheet[totalCell].s = {
              fill: { fgColor: { rgb: "F2F2F2" } },
              font: { bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
        }
      }
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      
      // Generate filename
      const fileName = `Attendance_${dumpProjectFilter}_${monthName}_${dumpYear}.xlsx`;
      
      // Download
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  // Save dump attendance data to API
  const saveDumpAttendance = async () => {
    if (!dumpProjectFilter) {
      setSaveMessage({ type: 'error', message: 'Please select a project first' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      // Format data according to API requirements
      const dates = getDatesInMonth(dumpMonth, dumpYear);
      const employees = dumpManualAttendance.map(emp => {
        const attendance: { [date: string]: string } = {};
        const otWeekoff: { [date: string]: string } = {};

        dates.forEach(date => {
          const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
          const currentDate = new Date(date);
          const isBeforeJoin = joinDate && currentDate < joinDate;

          if (!isBeforeJoin) {
            const attValue = emp.attendance[date] || '';
            const otValue = emp.otWeekoff[date] || '';

            // Only include dates with attendance or otWeekoff data
            if (attValue || otValue) {
              if (attValue) {
                attendance[date] = attValue;
              }
              if (otValue) {
                otWeekoff[date] = otValue;
              }
            }
          }
        });

        return {
          employeeId: emp.employeeId,
          attendance,
          otWeekoff
        };
      }).filter(emp => 
        Object.keys(emp.attendance).length > 0 || Object.keys(emp.otWeekoff).length > 0
      );

      const payload = {
        projectName: dumpProjectFilter,
        month: dumpMonth,
        year: dumpYear,
        employees
      };

      const response = await fetch('https://cafm.zenapi.co.in/api/attendance/dump/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const { updated, created, totalProcessed, errors } = result.data || {};
        setSaveMessage({
          type: 'success',
          message: `Saved successfully! Updated: ${updated || 0}, Created: ${created || 0}, Total: ${totalProcessed || 0}, Errors: ${errors || 0}`
        });
        // Clear message after 5 seconds
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage({
          type: 'error',
          message: result.message || 'Failed to save attendance data'
        });
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error saving dump attendance:', error);
      setSaveMessage({
        type: 'error',
        message: 'Failed to save attendance data. Please try again.'
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Handle Excel file upload
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is Excel format
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      setSaveMessage({ type: 'error', message: 'Please upload a valid Excel file (.xlsx or .xls)' });
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }

    try {
      setLoading(true);
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON array
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          // Find header row (row with "S.No", "Employee ID", "Name")
          let headerRowIndex = -1;
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length > 0) {
              const firstCell = String(row[0] || '').trim();
              if (firstCell === 'S.No' || firstCell === 'S.No.' || firstCell === '#') {
                headerRowIndex = i;
                break;
              }
            }
          }

          if (headerRowIndex === -1) {
            throw new Error('Could not find header row in Excel file');
          }

          const dates = getDatesInMonth(dumpMonth, dumpYear);
          const headerRow = jsonData[headerRowIndex];
          
          // Find date column indices (columns after Name, before summary columns)
          const dateColumnIndices: number[] = [];
          const baseCols = 3; // S.No, Employee ID, Name
          const dateColStart = baseCols;
          const dateColEnd = dateColStart + dates.length;
          
          for (let col = dateColStart; col < dateColEnd && col < headerRow.length; col++) {
            dateColumnIndices.push(col);
          }

          // Parse employee data
          const uploadedData: ManualAttendanceEntry[] = [];
          let rowIndex = headerRowIndex + 1;
          
          while (rowIndex < jsonData.length) {
            const attendanceRow = jsonData[rowIndex];
            const otWeekoffRow = rowIndex + 1 < jsonData.length ? jsonData[rowIndex + 1] : null;
            
            // Check if this is a valid employee row (has employee ID)
            if (!attendanceRow || !attendanceRow[1]) {
              rowIndex += 2; // Skip both attendance and otWeekoff rows
              continue;
            }

            const employeeId = String(attendanceRow[1] || '').trim();
            const name = String(attendanceRow[2] || '').trim();
            
            if (!employeeId) {
              rowIndex += 2;
              continue;
            }

            // Find employee in existing data to get photo and dateOfJoining
            const existingEmp = dumpManualAttendance.find(e => e.employeeId === employeeId);
            
            const attendance: { [date: string]: 'P' | 'A' | '' } = {};
            const otWeekoff: { [date: string]: string } = {};

            // Parse attendance row
            dateColumnIndices.forEach((colIndex, dateIdx) => {
              if (dateIdx < dates.length) {
                const date = dates[dateIdx];
                const cellValue = String(attendanceRow[colIndex] || '').trim().toUpperCase();
                
                // Handle H as A (since H is display-only for W/O)
                if (cellValue === 'H') {
                  attendance[date] = 'A';
                  // Set W/O in otWeekoff (will be overridden if otWeekoffRow has a value)
                  otWeekoff[date] = 'W/O';
                } else if (cellValue === 'P' || cellValue === 'A') {
                  attendance[date] = cellValue as 'P' | 'A';
                } else {
                  attendance[date] = '';
                }
              }
            });

            // Parse OT/W/O row (this will override any W/O set from H above)
            if (otWeekoffRow) {
              dateColumnIndices.forEach((colIndex, dateIdx) => {
                if (dateIdx < dates.length) {
                  const date = dates[dateIdx];
                  const cellValue = String(otWeekoffRow[colIndex] || '').trim();
                  
                  if (cellValue) {
                    // Normalize W/O values
                    const normalized = cellValue.toUpperCase();
                    if (normalized === 'W/O' || normalized === 'WO' || normalized === 'W') {
                      otWeekoff[date] = 'W/O';
                    } else if (normalized === 'LOP' || normalized === 'L') {
                      otWeekoff[date] = 'LOP';
                    } else {
                      // Try to parse as OT hours (numeric)
                      const numericValue = cellValue.replace(/[^0-9.]/g, '');
                      if (numericValue) {
                        otWeekoff[date] = numericValue;
                      }
                    }
                  }
                }
              });
            }

            uploadedData.push({
              employeeId,
              name: name || existingEmp?.name || employeeId,
              photo: existingEmp?.photo,
              dateOfJoining: existingEmp?.dateOfJoining,
              attendance,
              otWeekoff
            });

            rowIndex += 2; // Move to next employee pair
          }

          if (uploadedData.length === 0) {
            throw new Error('No valid employee data found in Excel file');
          }

          // Merge with existing data (update existing employees, add new ones)
          setDumpManualAttendance(prev => {
            const merged = [...prev];
            
            uploadedData.forEach(uploadedEmp => {
              const existingIndex = merged.findIndex(e => e.employeeId === uploadedEmp.employeeId);
              
              if (existingIndex >= 0) {
                // Update existing employee
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  attendance: { ...merged[existingIndex].attendance, ...uploadedEmp.attendance },
                  otWeekoff: { ...merged[existingIndex].otWeekoff, ...uploadedEmp.otWeekoff }
                };
              } else {
                // Add new employee
                merged.push(uploadedEmp);
              }
            });
            
            return merged;
          });

          setSaveMessage({
            type: 'success',
            message: `Successfully uploaded ${uploadedData.length} employee(s) from Excel file`
          });
          setTimeout(() => setSaveMessage(null), 5000);
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to parse Excel file. Please check the format.';
          setSaveMessage({
            type: 'error',
            message: errorMessage
          });
          setTimeout(() => setSaveMessage(null), 5000);
        } finally {
          setLoading(false);
          // Reset file input
          event.target.value = '';
        }
      };

      reader.onerror = () => {
        setLoading(false);
        setSaveMessage({ type: 'error', message: 'Failed to read Excel file' });
        setTimeout(() => setSaveMessage(null), 5000);
        event.target.value = '';
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      setLoading(false);
      setSaveMessage({ type: 'error', message: 'Failed to process Excel file' });
      setTimeout(() => setSaveMessage(null), 5000);
      event.target.value = '';
    }
  };

  // Download dump PDF
  const downloadDumpPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dates = getDatesInMonth(dumpMonth, dumpYear);
    const monthName = new Date(dumpYear, dumpMonth - 1).toLocaleString('default', { month: 'long' });
    const logoPath = '/v1/employee/exozen_logo1.png';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Sheet - ${dumpProjectFilter} - ${monthName} ${dumpYear}</title>
        <style>
          * {
            box-sizing: border-box;
          }
          @page { 
            size: A4 landscape; 
            margin: 8mm 5mm;
          }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0;
            padding: 0;
            font-size: 8px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 2px solid #4472C4;
            page-break-after: avoid;
          }
          .logo {
            height: 45px;
            width: auto;
            max-width: 150px;
          }
          .header-info {
            text-align: right;
          }
          .header-info h1 {
            margin: 0 0 3px 0;
            color: #4472C4;
            font-size: 16px;
            font-weight: bold;
            line-height: 1.2;
          }
          .header-info p {
            margin: 2px 0;
            color: #333;
            font-size: 10px;
            line-height: 1.3;
          }
          .table-container {
            width: 100%;
            overflow: visible;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            font-size: 7px;
            margin: 0;
            table-layout: auto;
          }
          th, td { 
            border: 0.5px solid #999; 
            padding: 3px 2px; 
            text-align: center; 
            vertical-align: middle;
            word-wrap: break-word;
            overflow: hidden;
          }
          th { 
            background-color: #4472C4; 
            color: #FFFFFF; 
            font-weight: bold;
            font-size: 7.5px;
            padding: 4px 2px;
            page-break-inside: avoid;
          }
          .sno-col { width: 22px; }
          .photo-col { width: 32px; }
          .id-col { width: 65px; }
          .name-col { width: 90px; }
          .date-col { width: 16px; font-size: 6.5px; }
          .summary-col { width: 28px; font-weight: bold; }
          .photo-cell { 
            width: 32px; 
            height: 32px; 
            padding: 1px;
          }
          .photo-cell img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            border-radius: 50%;
            border: 1px solid #ddd;
          }
          td {
            font-size: 7px;
            line-height: 1.2;
          }
          .date-cell {
            font-size: 6.5px;
            padding: 2px 1px;
          }
          .name-cell {
            text-align: left;
            padding-left: 4px;
            font-size: 7px;
          }
          .summary-p {
            background-color: #C6EFCE !important;
            color: #006100 !important;
            font-weight: bold;
            font-size: 7.5px;
          }
          .summary-a {
            background-color: #FFC7CE !important;
            color: #9C0006 !important;
            font-weight: bold;
            font-size: 7.5px;
          }
          .summary-ot {
            background-color: #BDD7EE !important;
            color: #0000FF !important;
            font-weight: bold;
            font-size: 7.5px;
          }
          .summary-wo {
            background-color: #E2EFDA !important;
            color: #7030A0 !important;
            font-weight: bold;
            font-size: 7.5px;
          }
          .summary-lop {
            background-color: #FFE699 !important;
            color: #E67E22 !important;
            font-weight: bold;
            font-size: 7.5px;
          }
          .summary-total {
            background-color: #F2F2F2 !important;
            font-weight: bold;
            font-size: 7.5px;
          }
          .present { 
            background-color: #C6EFCE; 
            color: #006100; 
            font-weight: bold; 
            font-size: 7px;
          }
          .absent { 
            background-color: #FFC7CE; 
            color: #9C0006; 
            font-weight: bold; 
            font-size: 7px;
          }
          .weekoff { 
            background-color: #E2EFDA; 
            color: #7030A0; 
            font-weight: bold; 
            font-size: 7px;
          }
          .lop { 
            background-color: #FFE699; 
            color: #E67E22; 
            font-weight: bold; 
            font-size: 7px;
          }
          tr {
            page-break-inside: avoid;
          }
          @media print { 
            body { 
              margin: 0;
              padding: 0;
            }
            .header { 
              page-break-after: avoid; 
              margin-bottom: 6px;
            }
            th { 
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            td {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoPath}" alt="Logo" class="logo" onerror="this.style.display='none'" />
          <div class="header-info">
            <h1>Attendance Sheet</h1>
            <p><strong>Project:</strong> ${dumpProjectFilter}</p>
            <p><strong>Month:</strong> ${monthName} ${dumpYear}</p>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="sno-col">#</th>
                <th class="photo-col">Photo</th>
                <th class="id-col">ID</th>
                <th class="name-col">Name</th>
                ${dates.map(date => {
                  const dayNum = parseInt(date.split('-')[2], 10);
                  return `<th class="date-col date-cell">${dayNum}</th>`;
                }).join('')}
                <th class="summary-col">P</th>
                <th class="summary-col">A</th>
                <th class="summary-col">OT</th>
                <th class="summary-col">W/O</th>
                <th class="summary-col">LOP</th>
                <th class="summary-col">Total</th>
              </tr>
            </thead>
            <tbody>
              ${dumpManualAttendance.map((emp, idx) => {
                const summary = calculateAttendanceSummary(emp, dumpMonth, dumpYear);
                return `
                <tr>
                  <td class="sno-col">${idx + 1}</td>
                  <td class="photo-cell photo-col">${emp.photo ? `<img src="${emp.photo}" alt="${emp.name}" />` : '-'}</td>
                  <td class="id-col" style="font-weight: 600; font-size: 6.5px;">${emp.employeeId}</td>
                  <td class="name-cell name-col">${emp.name}</td>
                  ${dates.map(date => {
                    const attendance = emp.attendance[date] || '';
                    const otWeekoff = emp.otWeekoff[date] || '';
                    let cellContent = '';
                    let cellClass = '';
                    
                    // Check if it should display as H (A + W/O)
                    const isHoliday = attendance === 'A' && otWeekoff === 'W/O';
                    
                    if (isHoliday) {
                      // Show H for Holiday/Week Off
                      cellContent = 'H';
                      cellClass = 'weekoff';
                    } else if (attendance && otWeekoff && attendance === 'P') {
                      // Show P with OT hours below
                      cellContent = `P<br/><span style="font-size: 5.5px;">${otWeekoff}</span>`;
                      cellClass = 'present';
                    } else if (attendance) {
                      cellContent = attendance;
                      if (attendance === 'P') cellClass = 'present';
                      else if (attendance === 'A') cellClass = 'absent';
                    } else if (otWeekoff) {
                      cellContent = otWeekoff;
                      if (otWeekoff === 'W/O') cellClass = 'weekoff';
                      else if (otWeekoff === 'LOP') cellClass = 'lop';
                    }
                    
                    return `<td class="${cellClass} date-col" style="line-height: 1.1; padding: 2px 1px;">${cellContent || '-'}</td>`;
                  }).join('')}
                  <td class="summary-p summary-col">${summary.presentDays}</td>
                  <td class="summary-a summary-col">${summary.absentDays}</td>
                  <td class="summary-ot summary-col">${summary.totalOTHours && summary.totalOTHours !== '0' ? summary.totalOTHours : '0'}</td>
                  <td class="summary-wo summary-col">${summary.weekOffDays}</td>
                  <td class="summary-lop summary-col">${summary.lopDays}</td>
                  <td class="summary-total summary-col">${summary.totalWorkingDays}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };


  // Update manual attendance entry
  const updateManualAttendance = (employeeId: string, date: string, value: 'P' | 'A' | '') => {
    setManualAttendanceData(prev => 
      prev.map(emp => 
        emp.employeeId === employeeId
          ? { ...emp, attendance: { ...emp.attendance, [date]: value } }
          : emp
      )
    );
  };

  // Download Excel for manual entry
  const downloadExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const dates = getDatesInMonth(dumpMonth, dumpYear);
      const monthName = new Date(dumpYear, dumpMonth - 1).toLocaleString('default', { month: 'long' });
      
      // Prepare data for Excel
      const exportData = manualAttendanceData.map((emp, idx) => {
        const row: Record<string, string | number> = {
          'S.No': idx + 1,
          'Employee ID': emp.employeeId,
          'Name': emp.name,
        };
        
        // Add date columns - parse date string directly to avoid timezone issues
        dates.forEach(date => {
          const dayNum = parseInt(date.split('-')[2], 10);
          row[`${dayNum}`] = emp.attendance[date] || '';
        });
        
        return row;
      });
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 8 }, // S.No
        { wch: 15 }, // Employee ID
        { wch: 25 }, // Name
        ...dates.map(() => ({ wch: 5 })) // Date columns
      ];
      worksheet['!cols'] = colWidths;
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      
      // Generate filename
      const fileName = `Attendance_${dumpProjectFilter}_${monthName}_${dumpYear}.xlsx`;
      
      // Download
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  // Download PDF
  const downloadPDF = () => {
    // For now, we'll use a simple approach with window.print or create a PDF
    // You might want to use a library like jsPDF or react-pdf for better PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dates = getDatesInMonth(dumpMonth, dumpYear);
    const monthName = new Date(dumpYear, dumpMonth - 1).toLocaleString('default', { month: 'long' });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Sheet - ${dumpProjectFilter} - ${monthName} ${dumpYear}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; font-size: 10px; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .photo-cell { width: 50px; height: 50px; }
          .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
          @media print { @page { size: landscape; margin: 10mm; } }
        </style>
      </head>
      <body>
        <h2>Attendance Sheet - ${dumpProjectFilter}</h2>
        <p><strong>Month:</strong> ${monthName} ${dumpYear}</p>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Photo</th>
              <th>Employee ID</th>
              <th>Name</th>
              ${dates.map((_, idx) => `<th>${idx + 1}</th>`).join('')}
            </tr>
            <tr>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              ${dates.map(date => {
                const dayNum = parseInt(date.split('-')[2], 10);
                return `<th>${dayNum}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${manualAttendanceData.map((emp, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="photo-cell">${emp.photo ? `<img src="${emp.photo}" alt="${emp.name}" />` : '-'}</td>
                <td>${emp.employeeId}</td>
                <td>${emp.name}</td>
                ${dates.map(date => `<td>${emp.attendance[date] || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const fetchAttendance = async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/attendance/all");
      const data: AttendanceApiResponse = await res.json();
      if (data && data.attendance) {
        setAttendanceData(data.attendance);
      } else {
        setAttendanceData([]);
      }
    } catch {
      setError("Failed to fetch attendance data");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/kyc")
      .then((res) => res.json())
      .then((data) => {
        const employees = (data.kycForms || []).map((form: KycForm) => ({
          employeeId: form.personalDetails.employeeId,
          fullName: form.personalDetails.fullName,
          designation: form.personalDetails.designation,
          projectName: form.personalDetails.projectName,
          employeeImage: form.personalDetails.employeeImage || undefined,
          dateOfJoining: form.personalDetails.dateOfJoining || undefined,
        }));
        setKycEmployees(employees);
      });
  }, []);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setFromDate(todayStr);
    setToDate(todayStr);
  }, []);


  useEffect(() => {
    if (activeTab !== "Project Wise Attendance" || !projectFilter) return;
    
    const enrichWithLocations = (data: ProjectAttendanceRecord[]): ProjectAttendanceRecord[] => {
      return data.map((record) => ({
        ...record,
        punchInLocation: record.punchInLatitude && record.punchInLongitude
          ? {
              latitude: record.punchInLatitude,
              longitude: record.punchInLongitude,
              address: null,
            }
          : undefined,
        punchOutLocation: record.punchOutLatitude && record.punchOutLongitude
          ? {
              latitude: record.punchOutLatitude,
              longitude: record.punchOutLongitude,
              address: null,
            }
          : undefined,
      }));
    };
    
    setLoading(true);
    const employeesInProject = kycEmployees.filter((e) => e.projectName === projectFilter);
    Promise.all(
      employeesInProject.map((emp) =>
        fetch(
          `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${emp.employeeId}&month=${selectedMonth}&year=${selectedYear}`
        )
          .then((res) => res.json())
          .then((data) =>
            enrichWithLocations(
              (data.attendance || []).map((att: ProjectAttendanceRecord) => ({
                ...att,
                name: emp.fullName,
                designation: emp.designation,
                projectName: att.projectName,
                punchInPhoto: att.punchInPhoto,
                punchOutPhoto: att.punchOutPhoto,
                punchInLatitude: att.punchInLatitude,
                punchInLongitude: att.punchInLongitude,
                punchOutLatitude: att.punchOutLatitude,
                punchOutLongitude: att.punchOutLongitude,
              }))
            )
          )
      )
    ).then((results) => {
      setProjectAttendance(results.flat());
      setLoading(false);
    });
  }, [activeTab, projectFilter, selectedMonth, selectedYear, kycEmployees]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    if (activeTab === "Project Wise Attendance" && !projectFilter) {
      if (uniqueProjectsAll.length > 0) {
        setProjectFilter(uniqueProjectsAll[0]);
      }
    }
  }, [activeTab, attendanceData, projectFilter, uniqueProjectsAll]);




  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return "Invalid coordinates";
    }
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&zoom=18`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "EmployeeManagementApp/1.0",
        },
      });
      if (!response.ok) {
        return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
      const data = await response.json();
      if (data && data.display_name) {
        const address = data.address || {};
        const addressParts = [
          address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
          address.suburb || address.neighbourhood,
          address.city || address.town || address.village,
          address.state,
          address.country,
        ].filter(Boolean);
        return addressParts.join(", ") || data.display_name;
      }
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch {
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };


  // Removed unused handleExportLocationPDF function

  const handleRowClick = async (record: AttendanceRecord) => {
    try {
      // Fetch detailed attendance data for the specific employee and date
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      
      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${record.employeeId}&month=${month}&year=${year}`);
      const data = await response.json();
      
      if (data.attendance && Array.isArray(data.attendance)) {
        // Find the attendance record for the specific date
        const recordDate = record.date ? record.date.slice(0, 10) : '';
        const attendanceRecord = data.attendance.find((att: ProjectAttendanceRecord) => 
          att.date && att.date.slice(0, 10) === recordDate
        );
        
        if (attendanceRecord) {
          const updatedRecord = {
            ...attendanceRecord,
            employeeId: record.employeeId,
            projectName: record.projectName,
            name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
            designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
          };
          
          // Fetch location data if coordinates are available
          if (attendanceRecord.punchInLatitude && attendanceRecord.punchInLongitude) {
            const punchInAddress = await reverseGeocode(attendanceRecord.punchInLatitude, attendanceRecord.punchInLongitude);
      updatedRecord.punchInLocation = {
              latitude: attendanceRecord.punchInLatitude,
              longitude: attendanceRecord.punchInLongitude,
              address: punchInAddress,
            };
          }
          
          if (attendanceRecord.punchOutLatitude && attendanceRecord.punchOutLongitude) {
            const punchOutAddress = await reverseGeocode(attendanceRecord.punchOutLatitude, attendanceRecord.punchOutLongitude);
      updatedRecord.punchOutLocation = {
              latitude: attendanceRecord.punchOutLatitude,
              longitude: attendanceRecord.punchOutLongitude,
              address: punchOutAddress,
            };
          }
          
    setSelectedRecord(updatedRecord);
        } else {
          // Fallback to basic record if detailed data not found
          setSelectedRecord({
            ...record,
            _id: { employeeId: record.employeeId, date: record.date },
            name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
            designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
            punchInLocation: { latitude: 0, longitude: 0, address: null },
            punchOutLocation: { latitude: 0, longitude: 0, address: null },
          });
        }
      } else {
        // Fallback to basic record
        setSelectedRecord({
          ...record,
          _id: { employeeId: record.employeeId, date: record.date },
          name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
          designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
          punchInLocation: { latitude: 0, longitude: 0, address: null },
          punchOutLocation: { latitude: 0, longitude: 0, address: null },
        });
      }
    } catch (error) {
      console.error('Error fetching attendance details:', error);
      // Fallback to basic record
      setSelectedRecord({
        ...record,
        _id: { employeeId: record.employeeId, date: record.date },
        name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
        designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
        punchInLocation: { latitude: 0, longitude: 0, address: null },
        punchOutLocation: { latitude: 0, longitude: 0, address: null },
      });
    }
  };

  // Removed unused utility functions: getUtcTimeOnly, formatDate, handleExportToExcel, handleExportToPDF

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Dump Options */}
            <div className="flex gap-2 items-center">
              {!showDumpEmployeeList ? (
                <button
                  onClick={() => {
                    setShowDumpDropdown(!showDumpDropdown);
                    if (!showDumpDropdown) {
                      setShowManualEntry(false);
                      setShowDumpEmployeeList(false);
                      setDumpProjectFilter("");
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold border text-sm transition-all ${
                    theme === 'dark' 
                      ? 'bg-green-700 text-white hover:bg-green-800 border-green-900' 
                      : 'bg-green-600 text-white hover:bg-green-700 border-green-200'
                  }`}
                >
                  Dump
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowDumpDropdown(false);
                    setShowDumpEmployeeList(false);
                    setDumpProjectFilter("");
                    setDumpManualAttendance([]);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold border text-sm transition-all ${
                    theme === 'dark' 
                      ? 'bg-red-700 text-white hover:bg-red-800 border-red-900' 
                      : 'bg-red-600 text-white hover:bg-red-700 border-red-200'
                  }`}
                >
                  Close
                </button>
              )}
              {(showDumpDropdown || showDumpEmployeeList) && (
                <div className="flex gap-2 items-center">
                  <select
                    value={dumpProjectFilter}
                    onChange={(e) => {
                      handleDumpProjectSelect(e.target.value);
                    }}
                    className={`min-w-[180px] appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">Select Project</option>
                    {uniqueProjectsAll.map((project: string, idx: number) => (
                      <option key={project || idx} value={project}>{project}</option>
                    ))}
                  </select>
                  <select
                    value={dumpMonth}
                    onChange={async (e) => {
                      const newMonth = Number(e.target.value);
                      setDumpMonth(newMonth);
                      setCurrentPage(1); // Reset to first page
                      // Reinitialize attendance data if project is selected
                      if (dumpProjectFilter) {
                        await initializeDumpAttendance(dumpProjectFilter, newMonth, dumpYear);
                      }
                    }}
                    className={`min-w-[120px] appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={dumpYear}
                    onChange={async (e) => {
                      const newYear = Number(e.target.value);
                      setDumpYear(newYear);
                      setCurrentPage(1); // Reset to first page
                      // Reinitialize attendance data if project is selected
                      if (dumpProjectFilter) {
                        await initializeDumpAttendance(dumpProjectFilter, dumpMonth, newYear);
                      }
                    }}
                    className={`min-w-[100px] appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            {!showDumpEmployeeList && (
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-blue-900 text-white"
                      : "bg-white border-gray-200 text-black"
                  }`}
                  title="From Date"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-blue-900 text-white"
                      : "bg-white border-gray-200 text-black"
                  }`}
                  title="To Date"
                />
                <button
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                  onClick={fetchAttendance}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dump Employee List Table with Attendance Columns */}
        {showDumpEmployeeList && dumpProjectFilter && (
          <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>
            <div className="mb-4 flex justify-between items-center">
              <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Manual Attendance Entry - {dumpProjectFilter} - {new Date(dumpYear, dumpMonth - 1).toLocaleString('default', { month: 'long' })} {dumpYear}
              </h3>
              <div className="flex flex-col gap-2 items-end">
                <div className="flex gap-2">
                  <button
                    onClick={saveDumpAttendance}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-semibold border text-sm transition-all ${
                      saving
                        ? 'opacity-50 cursor-not-allowed'
                        : theme === 'dark' 
                        ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'
                    }`}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <label
                    className={`px-4 py-2 rounded-lg font-semibold border text-sm cursor-pointer transition-all ${
                      loading
                        ? 'opacity-50 cursor-not-allowed'
                        : theme === 'dark' 
                        ? 'bg-purple-700 text-white hover:bg-purple-800 border-purple-900' 
                        : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-200'
                    }`}
                  >
                    {loading ? 'Uploading...' : 'Upload Excel'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={downloadDumpExcel}
                    className={`px-4 py-2 rounded-lg font-semibold border text-sm ${
                      theme === 'dark' 
                        ? 'bg-green-700 text-white hover:bg-green-800 border-green-900' 
                        : 'bg-green-600 text-white hover:bg-green-700 border-green-200'
                    }`}
                  >
                    Download Excel
                  </button>
                  <button
                    onClick={downloadDumpPDF}
                    className={`px-4 py-2 rounded-lg font-semibold border text-sm ${
                      theme === 'dark' 
                        ? 'bg-red-700 text-white hover:bg-red-800 border-red-900' 
                        : 'bg-red-600 text-white hover:bg-red-700 border-red-200'
                    }`}
                  >
                    Download PDF
                  </button>
                </div>
                {saveMessage && (
                  <div className={`text-sm px-3 py-1 rounded ${
                    saveMessage.type === 'success'
                      ? theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
                      : theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
                  }`}>
                    {saveMessage.message}
                  </div>
                )}
              </div>
            </div>
            <div className={`overflow-x-auto w-full rounded-lg border shadow-lg ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`} style={{ position: 'relative' }}>
              <table className="w-full text-[10px] border-collapse" style={{ borderCollapse: 'collapse', tableLayout: 'auto', minWidth: 'max-content' }}>
                  <thead className={`${theme === "dark" ? "bg-blue-900" : "bg-blue-50"}`}>
                    <tr>
                      <th className={`px-2 py-2 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '40px', minWidth: '40px' }}>
                        #
                      </th>
                      <th className={`px-1 py-2 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '50px', minWidth: '50px' }}>
                        Photo
                      </th>
                      <th className={`px-2 py-2 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '110px', minWidth: '110px' }}>
                        ID
                      </th>
                      <th className={`px-2 py-2 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '140px', minWidth: '140px' }}>
                        Name
                      </th>
                      {getDatesInMonth(dumpMonth, dumpYear).map((date) => {
                        // Parse date string directly to avoid timezone issues
                        const dayNum = parseInt(date.split('-')[2], 10);
                        const dateObj = new Date(date);
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1);
                        return (
                          <th key={date} className={`px-0 py-1.5 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '30px', minWidth: '30px' }} title={`${dayNum} ${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}`}>
                            <div className="text-[9px] font-bold leading-tight">{dayNum}</div>
                            <div className="text-[7px] opacity-70 leading-tight">{dayName}</div>
                          </th>
                        );
                      })}
                      {/* Summary Columns */}
                      <th className={`px-1 py-1.5 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '35px', minWidth: '35px' }}>
                        P
                      </th>
                      <th className={`px-1 py-1.5 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '35px', minWidth: '35px' }}>
                        A
                      </th>
                      <th className={`px-1 py-1.5 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '50px', minWidth: '50px' }}>
                        OT Hrs
                      </th>
                      <th className={`px-1 py-1.5 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '40px', minWidth: '40px' }}>
                        W/O
                      </th>
                      <th className={`px-1 py-1.5 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '40px', minWidth: '40px' }}>
                        LOP
                      </th>
                      <th className={`px-1 py-1.5 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '45px', minWidth: '45px' }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {dumpManualAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4 + getDatesInMonth(dumpMonth, dumpYear).length + 6} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        No employees found for this project
                      </td>
                    </tr>
                  ) : (
                    currentEmployees.flatMap((emp, index) => {
                      const actualIndex = startIndex + index;
                      const dates = getDatesInMonth(dumpMonth, dumpYear);
                      const rowKey = `emp-${emp.employeeId}`;
                      const summary = calculateAttendanceSummary(emp, dumpMonth, dumpYear);
                      
                      // First row: P/A attendance
                      const attendanceRow = (
                        <tr key={`${rowKey}-attendance`} className={`${theme === "dark" ? "hover:bg-blue-900/50 transition" : "hover:bg-blue-50 transition"}`}>
                          <td rowSpan={2} className={`px-2 py-1 font-mono text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`} style={{ width: '40px', minWidth: '40px' }}>
                            {actualIndex + 1}
                          </td>
                          <td rowSpan={2} className={`px-1 py-1 border ${theme === "dark" ? "border-blue-800 bg-gray-800" : "border-blue-200 bg-white"}`} style={{ width: '50px', minWidth: '50px' }}>
                            <div className="flex justify-center">
                              <Image
                                src={emp.photo || "/placeholder-user.jpg"}
                                alt={emp.name || emp.employeeId}
                                width={36}
                                height={36}
                                className={`rounded-full object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                              />
                            </div>
                          </td>
                          <td rowSpan={2} className={`px-2 py-1 font-semibold text-[10px] whitespace-nowrap border text-center ${theme === "dark" ? "text-blue-200 border-blue-800 bg-gray-800" : "text-blue-800 border-blue-200 bg-white"}`} style={{ width: '110px', minWidth: '110px' }}>
                            <div className="truncate" title={emp.employeeId}>{emp.employeeId}</div>
                          </td>
                          <td rowSpan={2} className={`px-2 py-1 text-[10px] whitespace-nowrap border text-center ${theme === "dark" ? "text-gray-300 border-blue-800 bg-gray-800" : "text-gray-700 border-blue-200 bg-white"}`} style={{ width: '140px', minWidth: '140px' }}>
                            <div className="truncate" title={emp.name}>{emp.name || "-"}</div>
                          </td>
                          {dates.map(date => {
                            const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
                            const currentDate = new Date(date);
                            const isBeforeJoin = joinDate && currentDate < joinDate;
                            const attendanceValue = emp.attendance[date] || '';
                            const otWeekoffValue = emp.otWeekoff[date] || '';
                            const isWeekoff = otWeekoffValue === 'W/O';
                            // If attendance is A and W/O is selected, show H instead of A
                            const displayValue = (attendanceValue === 'A' && isWeekoff) ? 'H' : attendanceValue;
                            const isPresent = attendanceValue === 'P';
                            const isAbsent = attendanceValue === 'A' && !isWeekoff; // Only show as absent if not W/O
                            const isHoliday = attendanceValue === 'A' && isWeekoff; // Show as holiday if A with W/O
                            
                            return (
                              <td key={`att-${date}`} className={`px-0 py-1 border text-center ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`} style={{ width: '30px', minWidth: '30px' }}>
                                {isBeforeJoin ? (
                                  <span className="text-gray-400 text-[8px]">-</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={displayValue}
                                    onChange={(e) => {
                                      // If user types H, convert to A and set W/O
                                      const inputValue = e.target.value.toUpperCase().trim();
                                      if (inputValue === 'H') {
                                        updateDumpManualAttendance(emp.employeeId, date, 'A');
                                        updateDumpOTWeekoff(emp.employeeId, date, 'W/O', 'A');
                                      } else {
                                        updateDumpManualAttendance(emp.employeeId, date, inputValue);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      const key = e.key.toUpperCase();
                                      // Allow P, A, H, and navigation keys
                                      if (!['P', 'A', 'H', 'BACKSPACE', 'DELETE', 'ARROWLEFT', 'ARROWRIGHT', 'ARROWUP', 'ARROWDOWN', 'TAB', 'ENTER'].includes(key) && !e.ctrlKey && !e.metaKey) {
                                        e.preventDefault();
                                      }
                                      if (key === 'P' || key === 'A' || key === 'H') {
                                        setTimeout(() => {
                                          const inputs = Array.from(document.querySelectorAll('input[type="text"][data-type="attendance"]'));
                                          const currentIndex = inputs.indexOf(e.currentTarget);
                                          if (currentIndex < inputs.length - 1) {
                                            (inputs[currentIndex + 1] as HTMLInputElement)?.focus();
                                          }
                                        }, 10);
                                      }
                                    }}
                                    data-type="attendance"
                                    maxLength={1}
                                    className={`w-full text-center text-[10px] font-bold py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded transition-colors ${
                                      isPresent 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200' 
                                        : isHoliday
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200'
                                        : isAbsent 
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200'
                                        : theme === "dark" 
                                        ? "bg-gray-800 text-gray-400 hover:bg-gray-700" 
                                        : "bg-white text-gray-400 hover:bg-gray-50"
                                    }`}
                                    style={{ minWidth: '26px', maxWidth: '26px', height: '20px', fontSize: '9px' }}
                                  />
                                )}
                              </td>
                            );
                          })}
                          {/* Summary cells - span both rows */}
                          <td rowSpan={2} className={`px-1 py-1 font-bold text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-green-300 border-blue-800' : 'bg-white text-green-700 border-blue-200'}`} style={{ width: '35px', minWidth: '35px' }}>
                            {summary.presentDays}
                          </td>
                          <td rowSpan={2} className={`px-1 py-1 font-bold text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-red-300 border-blue-800' : 'bg-white text-red-700 border-blue-200'}`} style={{ width: '35px', minWidth: '35px' }}>
                            {summary.absentDays}
                          </td>
                          <td rowSpan={2} className={`px-1 py-1 font-bold text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-blue-300 border-blue-800' : 'bg-white text-blue-700 border-blue-200'}`} style={{ width: '50px', minWidth: '50px' }}>
                            {summary.totalOTHours && summary.totalOTHours !== '0' ? summary.totalOTHours : '0'}
                          </td>
                          <td rowSpan={2} className={`px-1 py-1 font-bold text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-purple-300 border-blue-800' : 'bg-white text-purple-700 border-blue-200'}`} style={{ width: '40px', minWidth: '40px' }}>
                            {summary.weekOffDays}
                          </td>
                          <td rowSpan={2} className={`px-1 py-1 font-bold text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-orange-300 border-blue-800' : 'bg-white text-orange-700 border-blue-200'}`} style={{ width: '40px', minWidth: '40px' }}>
                            {summary.lopDays}
                          </td>
                          <td rowSpan={2} className={`px-1 py-1 font-bold text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-700 border-blue-200'}`} style={{ width: '45px', minWidth: '45px' }}>
                            {summary.totalWorkingDays}
                          </td>
                        </tr>
                      );
                      
                      // Second row: OT/W/O
                      const otWeekoffRow = (
                        <tr key={`${rowKey}-otweekoff`} className={`${theme === "dark" ? "hover:bg-blue-900/50 transition bg-gray-800/30" : "hover:bg-blue-50 transition bg-gray-50"}`}>
                          {dates.map(date => {
                            const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
                            const currentDate = new Date(date);
                            const isBeforeJoin = joinDate && currentDate < joinDate;
                            const attendanceValue = emp.attendance[date] || '';
                            const otWeekoffValue = emp.otWeekoff[date] || '';
                            const isOTHours = otWeekoffValue && otWeekoffValue !== 'W/O' && otWeekoffValue !== 'LOP' && otWeekoffValue !== '';
                            const otHours = isOTHours ? convertHoursMinutesToTotalHours(otWeekoffValue) : 0;
                            
                            // Disable OT/W/O input if attendance is not set
                            const isDisabled = attendanceValue === '';
                            
                            return (
                              <td key={`ot-${date}`} className={`px-0 py-1 border text-center ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`} style={{ width: '30px', minWidth: '30px' }}>
                                {isBeforeJoin ? (
                                  <span className="text-gray-400 text-[9px]">-</span>
                                ) : attendanceValue === 'A' ? (
                                  // Dropdown for Absent: W/O or LOP
                                  <select
                                    value={otWeekoffValue}
                                    onChange={(e) => updateDumpOTWeekoff(emp.employeeId, date, e.target.value, attendanceValue)}
                                    disabled={isDisabled}
                                    className={`w-full text-center text-[9px] font-bold py-0.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors appearance-none ${
                                      otWeekoffValue === 'W/O'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300'
                                        : otWeekoffValue === 'LOP'
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200 border-orange-300'
                                        : isDisabled
                                        ? theme === "dark" 
                                          ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border-blue-800" 
                                          : "bg-gray-100 text-gray-400 cursor-not-allowed border-blue-200"
                                        : theme === "dark" 
                                        ? "bg-gray-800 text-gray-400 hover:bg-gray-700 border-blue-800" 
                                        : "bg-white text-gray-400 hover:bg-gray-50 border-blue-200"
                                    }`}
                                    style={{ minWidth: '28px', maxWidth: '28px', height: '22px', fontSize: '9px', paddingRight: '4px' }}
                                  >
                                    <option value="">-</option>
                                    <option value="W/O">W/O</option>
                                    <option value="LOP">LOP</option>
                                  </select>
                                ) : (
                                  // Input for Present: OT hours - multiple easy formats supported
                                  <input
                                    type="text"
                                    value={otWeekoffValue}
                                    onChange={(e) => updateDumpOTWeekoff(emp.employeeId, date, e.target.value, attendanceValue)}
                                    onKeyDown={(e) => {
                                      const key = e.key.toUpperCase();
                                      // Allow numbers, decimal point, colon, and navigation keys
                                      if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ':', 'BACKSPACE', 'DELETE', 'ARROWLEFT', 'ARROWRIGHT', 'ARROWUP', 'ARROWDOWN', 'TAB', 'ENTER'].includes(key) && !e.ctrlKey && !e.metaKey) {
                                        e.preventDefault();
                                      }
                                    }}
                                    data-type="otweekoff"
                                    maxLength={6}
                                    placeholder="hr"
                                    title="Formats: 1.15 (1h15m), 1:15, 115, or 2 (hours only). Type decimal easily!"
                                    disabled={isDisabled}
                                    className={`w-full text-center text-[9px] font-bold py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded transition-colors ${
                                      isOTHours && otHours > 0
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200' 
                                        : isDisabled
                                        ? theme === "dark" 
                                          ? "bg-gray-800/50 text-gray-500 cursor-not-allowed" 
                                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : theme === "dark" 
                                        ? "bg-gray-800 text-gray-400 hover:bg-gray-700" 
                                        : "bg-white text-gray-400 hover:bg-gray-50"
                                    }`}
                                    style={{ minWidth: '28px', maxWidth: '28px', height: '22px', fontSize: '9px' }}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                      
                      return [attendanceRow, otWeekoffRow];
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {dumpManualAttendance.length > employeesPerPage && (
              <div className="mt-4 flex justify-center items-center gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg font-semibold border text-sm transition-all ${
                    currentPage === 1
                      ? 'opacity-50 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900'
                      : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'
                  }`}
                >
                  Previous
                </button>
                <span className={`px-4 py-1.5 text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Page {currentPage} of {totalPages} ({dumpManualAttendance.length} employees)
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-lg font-semibold border text-sm transition-all ${
                    currentPage === totalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900'
                      : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Excel-like Table */}
        {showManualEntry && manualAttendanceData.length > 0 && (
          <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>
            <div className="mb-4 flex justify-between items-center">
              <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Manual Attendance Entry - {dumpProjectFilter} - {new Date(dumpYear, dumpMonth - 1).toLocaleString('default', { month: 'long' })} {dumpYear}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadExcel}
                  className={`px-4 py-2 rounded-lg font-semibold border text-sm ${
                    theme === 'dark' 
                      ? 'bg-green-700 text-white hover:bg-green-800 border-green-900' 
                      : 'bg-green-600 text-white hover:bg-green-700 border-green-200'
                  }`}
                >
                  Download Excel
                </button>
                <button
                  onClick={downloadPDF}
                  className={`px-4 py-2 rounded-lg font-semibold border text-sm ${
                    theme === 'dark' 
                      ? 'bg-red-700 text-white hover:bg-red-800 border-red-900' 
                      : 'bg-red-600 text-white hover:bg-red-700 border-red-200'
                  }`}
                >
                  Download PDF
                </button>
              </div>
            </div>
            <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
              <table className="w-full text-xs table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900" : "bg-blue-50"}>
                  <tr>
                    <th className={`px-2 py-2 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>S.No</th>
                    <th className={`px-2 py-2 text-center font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>Photo</th>
                    <th className={`px-2 py-2 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>Employee ID</th>
                    <th className={`px-2 py-2 text-center font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>Name</th>
                    {getDatesInMonth(dumpMonth, dumpYear).map((date, idx) => (
                      <th key={date} className={`px-1 py-2 text-center font-bold uppercase whitespace-nowrap border min-w-[30px] ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>
                        {idx + 1}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800 bg-blue-900" : "border-blue-200 bg-blue-50"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800 bg-blue-900" : "border-blue-200 bg-blue-50"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800 bg-blue-900" : "border-blue-200 bg-blue-50"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800 bg-blue-900" : "border-blue-200 bg-blue-50"}`}></th>
                    {getDatesInMonth(dumpMonth, dumpYear).map(date => {
                      // Parse date string directly to avoid timezone issues
                      const dayNum = parseInt(date.split('-')[2], 10);
                      return (
                        <th key={date} className={`px-1 py-1 text-center border text-[10px] ${theme === "dark" ? "border-blue-800 bg-blue-900" : "border-blue-200 bg-blue-50"}`}>
                          {dayNum}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {manualAttendanceData.map((emp, index) => {
                    const dates = getDatesInMonth(dumpMonth, dumpYear);
                    return (
                      <tr key={emp.employeeId} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                        <td className={`px-2 py-1 font-mono text-[10px] border text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>
                          {index + 1}
                        </td>
                        <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800 bg-gray-800" : "border-blue-200 bg-white"}`}>
                          <Image
                            src={emp.photo || "/placeholder-user.jpg"}
                            alt={emp.name}
                            width={32}
                            height={32}
                            className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                          />
                        </td>
                        <td className={`px-2 py-1 font-semibold whitespace-nowrap border text-center ${theme === "dark" ? "text-blue-200 border-blue-800 bg-gray-800" : "text-blue-800 border-blue-200 bg-white"}`}>
                          {emp.employeeId}
                        </td>
                        <td className={`px-2 py-1 whitespace-nowrap border text-center ${theme === "dark" ? "text-blue-200 border-blue-800 bg-gray-800" : "text-blue-800 border-blue-200 bg-white"}`}>
                          <div className="truncate max-w-[120px]" title={emp.name}>{emp.name}</div>
                        </td>
                        {dates.map(date => {
                          const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
                          const currentDate = new Date(date);
                          const isBeforeJoin = joinDate && currentDate < joinDate;
                          
                          return (
                            <td key={date} className={`px-1 py-1 border text-center ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                              {isBeforeJoin ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <select
                                  value={emp.attendance[date] || ''}
                                  onChange={(e) => updateManualAttendance(emp.employeeId, date, e.target.value as 'P' | 'A' | '')}
                                  className={`w-full text-xs border rounded px-1 py-0.5 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-300"}`}
                                >
                                  <option value="">-</option>
                                  <option value="P">P</option>
                                  <option value="A">A</option>
                                </select>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table - Excel-like compact grid full screen */}
        {!showManualEntry && !showDumpEmployeeList && (
          <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
            <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
              {loading ? (
                <div className="py-12 text-center text-lg font-semibold">Loading attendance records...</div>
              ) : error ? (
                <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
              ) : (
                <>
                <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900" : "bg-blue-50"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-16 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Photo</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee ID</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee Name</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Punch In Time</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Punch Out Time</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 w-16 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={empIdFilter} 
                        onChange={e => setEmpIdFilter(e.target.value)} 
                        placeholder="Filter ID" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={nameFilter} 
                        onChange={e => setNameFilter(e.target.value)} 
                        placeholder="Filter Name" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={designationFilter} 
                        onChange={e => setDesignationFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={projectFilterHeader} 
                        onChange={e => setProjectFilterHeader(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueProjectsAll.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        type="date"
                        value={dateFilter} 
                        onChange={e => setDateFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueStatus.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {filteredAttendanceWithHeader.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No attendance records found</td>
                    </tr>
                  ) : filteredAttendanceWithHeader.map((record, index) => {
                    const kyc = kycEmployees.find(e => e.employeeId === record.employeeId);
                    return (
                      <tr key={record._id || index} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                        <td className={`px-2 py-1 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{index + 1}</td>
                        <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <Image
                            src={getEmployeePhoto(record.employeeId)}
                            alt={kyc?.fullName || record.employeeId}
                            width={32}
                            height={32}
                            className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                          />
                        </td>
                        <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{record.employeeId}</td>
                        <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={kyc?.fullName || "-"}>{kyc?.fullName || "-"}</div></td>
                        <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={kyc?.designation || "-"}>{kyc?.designation || "-"}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={record.projectName}>{record.projectName}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{record.date ? new Date(record.date).toLocaleDateString() : "N/A"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{record.punchInTime ? new Date(record.punchInTime).toLocaleTimeString() : "-"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{record.punchOutTime ? new Date(record.punchOutTime).toLocaleTimeString() : "-"}</td>
                        <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                            record.status === 'Present' 
                              ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              : record.status === 'Absent'
                              ? theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                              : theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {record.status || "N/A"}
                          </span>
                        </td>
                        <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <button
                            onClick={() => handleRowClick(record)}
                            title="View Details"
                            className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                              theme === 'dark' 
                                ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                            }`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>
        )}
      </div>

        {/* Attendance Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold" onClick={() => setSelectedRecord(null)}>✕</button>
              <h2 className="text-2xl font-bold mb-4 text-center">Attendance Record Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Image src={getEmployeePhoto(selectedRecord.employeeId)} alt="Employee" width={64} height={64} className="w-16 h-16 rounded-full object-cover border" />
                  <div>
                    <div className="font-bold text-lg">{selectedRecord.name || selectedRecord.employeeId}</div>
                    <div className="text-xs text-gray-500">{selectedRecord.employeeId}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><b>Project:</b> {selectedRecord.projectName || '-'}</div>
                  <div><b>Designation:</b> {selectedRecord.designation || '-'}</div>
                  <div><b>Date:</b> {selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '-'}</div>
                  <div><b>Status:</b> {selectedRecord.status || '-'}</div>
                  <div><b>Punch In Time:</b> {selectedRecord.punchInTime ? new Date(selectedRecord.punchInTime).toLocaleTimeString() : '-'}</div>
                  <div><b>Punch Out Time:</b> {selectedRecord.punchOutTime ? new Date(selectedRecord.punchOutTime).toLocaleTimeString() : '-'}</div>
                  <div className="col-span-2">
                    <b>Punch In Location:</b> 
                    {selectedRecord.punchInLocation?.address ? (
                      <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedRecord.punchInLocation.address}</span>
                    ) : selectedRecord.punchInLatitude && selectedRecord.punchInLongitude ? (
                      <span className="ml-2 text-gray-500">Loading location...</span>
                    ) : (
                      <span className="ml-2 text-gray-500">No location data</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <b>Punch Out Location:</b> 
                    {selectedRecord.punchOutLocation?.address ? (
                      <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedRecord.punchOutLocation.address}</span>
                    ) : selectedRecord.punchOutLatitude && selectedRecord.punchOutLongitude ? (
                      <span className="ml-2 text-gray-500">Loading location...</span>
                    ) : (
                      <span className="ml-2 text-gray-500">No location data</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Punch In Photo</div>
                    {selectedRecord.punchInPhoto && selectedRecord.punchInPhoto !== '' ? (
                      <Image
                        src={selectedRecord.punchInPhoto}
                        alt="Punch In"
                        width={192} 
                        height={240} 
                        className="rounded-lg w-48 h-60 object-cover border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-48 h-60 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 border ${selectedRecord.punchInPhoto && selectedRecord.punchInPhoto !== '' ? 'hidden' : ''}`}>
                      {selectedRecord.punchInPhoto === '' ? 'No Photo Available' : 'No Photo'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Punch Out Photo</div>
                    {selectedRecord.punchOutPhoto && selectedRecord.punchOutPhoto !== '' ? (
                      <Image
                        src={selectedRecord.punchOutPhoto}
                        alt="Punch Out"
                        width={192} 
                        height={240} 
                        className="rounded-lg w-48 h-60 object-cover border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-48 h-60 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 border ${selectedRecord.punchOutPhoto && selectedRecord.punchOutPhoto !== '' ? 'hidden' : ''}`}>
                      {selectedRecord.punchOutPhoto === '' ? 'No Photo Available' : 'No Photo'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </ManagerDashboardLayout>
  );
}