// Shared attendance utilities for status, holiday, and record transformation
// import { format } from 'date-fns';
import { RawAttendanceRecord, TransformedAttendanceRecord } from '../types/attendance';

export const GOVT_HOLIDAYS = [
  // 2024 Holidays
  '2024-01-26', // Republic Day
  '2024-03-25', // Holi
  '2024-04-09', // Ram Navami
  '2024-05-01', // Labor Day
  '2024-08-08', // Varmahalski Holiday
  '2024-08-15', // Independence Day
  '2024-10-02', // Gandhi Jayanti
  '2024-11-14', // Diwali
  '2024-12-25', // Christmas
  
  // 2025 Holidays
  '2025-01-26', // Republic Day
  '2025-03-14', // Holi
  '2025-04-09', // Ram Navami
  '2025-05-01', // Labor Day
  '2025-08-08', // Varmahalski Holiday
  '2025-08-15', // Independence Day
  '2025-10-02', // Gandhi Jayanti
  '2025-11-03', // Diwali
  '2025-12-25', // Christmas
  
  // 2026 Holidays
  '2026-01-26', // Republic Day
  '2026-03-03', // Holi
  '2026-03-29', // Ram Navami
  '2026-05-01', // Labor Day
  '2026-08-08', // Varmahalski Holiday
  '2026-08-15', // Independence Day
  '2026-10-02', // Gandhi Jayanti
  '2026-10-23', // Diwali
  '2026-12-25', // Christmas
  
  // 2027 Holidays
  '2027-01-26', // Republic Day
  '2027-03-22', // Holi
  '2027-03-18', // Ram Navami
  '2027-05-01', // Labor Day
  '2027-08-08', // Varmahalski Holiday
  '2027-08-15', // Independence Day
  '2027-10-02', // Gandhi Jayanti
  '2027-11-12', // Diwali
  '2027-12-25', // Christmas
  
  // 2028 Holidays
  '2028-01-26', // Republic Day
  '2028-03-10', // Holi
  '2028-04-06', // Ram Navami
  '2028-05-01', // Labor Day
  '2028-08-08', // Varmahalski Holiday
  '2028-08-15', // Independence Day
  '2028-10-02', // Gandhi Jayanti
  '2028-10-30', // Diwali
  '2028-12-25', // Christmas
];

export function isHoliday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0=Sunday, 6=Saturday
  // Sundays
  if (day === 0) return true;
  // 2nd and 4th Saturdays
  if (day === 6) {
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    if (weekOfMonth === 2 || weekOfMonth === 4) return true;
  }
  // Government holidays
  if (GOVT_HOLIDAYS.includes(dateStr)) return true;
  return false;
}

export function formatUtcTime(utcString: string | null): string | null {
  if (!utcString) return null;
  try {
    const date = new Date(utcString);
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  } catch {
    return null;
  }
}

export const calculateHoursUtc = (punchInUtc: string | null, punchOutUtc: string | null): string => {
  if (!punchInUtc || !punchOutUtc) return '0.00';
  try {
    const punchIn = new Date(punchInUtc);
    const punchOut = new Date(punchOutUtc);
    const diffMs = Math.abs(punchOut.getTime() - punchIn.getTime());
    const diffHrs = diffMs / (1000 * 60 * 60);
    return diffHrs.toFixed(2);
  } catch (error) {
    console.error('Error calculating hours:', error);
    return '0.00';
  }
};

export const getAttendanceStatus = (hoursWorked: number): string => {
  if (hoursWorked >= 7) {
    return 'Present';
  } else if (hoursWorked >= 4.5 && hoursWorked < 7) {
    return 'Half Day';
  } else {
    return 'Absent';
  }
};

// Transform API attendance record to unified AttendanceRecord format
export function transformAttendanceRecord(record: RawAttendanceRecord): TransformedAttendanceRecord {
  return {
    _id: record._id,
    employeeId: record.employeeId,
    date: record.date,
    punchInUtc: record.punchInTime || undefined,
    punchOutUtc: record.punchOutTime || undefined,
    punchInTime: record.punchInTime ? formatUtcTime(record.punchInTime) : null,
    punchOutTime: record.punchOutTime ? formatUtcTime(record.punchOutTime) : null,
    projectName: record.projectName,
    designation: record.designation,
    punchInPhoto: record.punchInPhoto,
    punchOutPhoto: record.punchOutPhoto,
    status: record.status || 'Absent'
  };
}