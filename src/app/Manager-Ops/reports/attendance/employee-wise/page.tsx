"use client";

import React, { JSX, useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaFileExcel, FaFilePdf, FaCalendar, FaUser,  FaEye } from "react-icons/fa";
// import { calculateHoursUtc } from "@/app/utils/attendanceUtils";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Image from 'next/image';
import { calculateHoursUtc, } from '@/app/utils/attendanceUtils';


declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Parameters<typeof autoTable>[1]) => void;
  }
}

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
}

interface Attendance {
  date: string;
  status: string;
  punchInTime: string;
  punchOutTime: string;
  projectName?: string;
  isLate?: boolean;
  _id?: string; // Added property
  punchInUtc?: string;
  punchOutUtc?: string;
  punchInPhoto?: string;
  punchOutPhoto?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  punchInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  punchOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
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

interface MonthSummaryResponse {
  success: boolean;
  data: {
    summary: {
      totalDays: number;
      presentDays: number;
      halfDays: number;
      partiallyAbsentDays: number;
      weekOffs: number;
      holidays: number;
      el: number;
      sl: number;
      cl: number;
      compOff: number;
      lop: number;
    };
  };
}

// // Define the type for the lastAutoTable property
// type JsPDFWithAutoTable = jsPDF & {
//   lastAutoTable?: {
//     finalY: number;
//   };
// };

interface LocationAddresses {
  [key: string]: {
    in: string;
    out: string;
  };
}

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

const EmployeeWiseAttendancePage = (): JSX.Element => {
  const { theme } = useTheme(); // Add theme hook
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [summary, setSummary] = useState<MonthSummaryResponse['data'] | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);
  const [inLocationAddress, setInLocationAddress] = useState<string | null>(null);
  const [outLocationAddress, setOutLocationAddress] = useState<string | null>(null);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<Employee | null>(null); // New state to store full employee details
  const [locationAddresses, setLocationAddresses] = useState<LocationAddresses>({});

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

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          type KycForm = { personalDetails: { employeeId: string; employeeImage: string; fullName: string; designation: string; projectName: string; } };
          const filteredEmployees = (data.kycForms as KycForm[])
            .filter((form) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
            }));

          setEmployees(filteredEmployees);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!selectedEmployee || !month || !year) return;
    
    fetch(`https://cafm.zenapi.co.in/api/attendance/${selectedEmployee}/monthly-summary?month=${month}&year=${year}`)
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
  }, [selectedEmployee, month, year]);

  useEffect(() => {
    if (!selectedEmployee) return;
    fetch(`https://cafm.zenapi.co.in/api/leave/balance/${selectedEmployee}`)
      .then(res => res.json())
      .then(data => setLeaveBalance(data))
      .catch(() => setLeaveBalance(null));
  }, [selectedEmployee]);

  useEffect(() => {
    if (!selectedEmployee) return;
    // Set selected employee details when selectedEmployee changes
    const currentEmployee = employees.find(emp => emp.employeeId === selectedEmployee);
    setSelectedEmployeeDetails(currentEmployee || null);
  }, [selectedEmployee, employees]);

  useEffect(() => {
    if (!selectedEmployee || !month || !year) return;
    fetch(`https://cafm.zenapi.co.in/api/leave/history/${selectedEmployee}`)
      .then(res => res.json())
      .then(data => {
        if (data.leaveHistory) {
          const filteredHistory = filterLeaveHistoryByMonth(
            data.leaveHistory,
            month,
            year
          );
          setLeaveHistory(filteredHistory);
        } else {
          setLeaveHistory([]);
        }
      })
      .catch(() => {
        setLeaveHistory([]);
      });
  }, [selectedEmployee, month, year]);

  const enrichWithLocations = (data: Attendance[]): Attendance[] => {
    return data.map(record => ({
      ...record,
      punchInLocation: record.punchInLatitude && record.punchInLongitude
        ? {
            latitude: record.punchInLatitude,
            longitude: record.punchInLongitude,
            address: undefined  // Changed from null to undefined
          }
        : null,
      punchOutLocation: record.punchOutLatitude && record.punchOutLongitude
        ? {
            latitude: record.punchOutLatitude,
            longitude: record.punchOutLongitude,
            address: undefined  // Changed from null to undefined
          }
        : null
    }));
  };

  const fetchAttendance = async (employeeId: string) => {
    setAttendanceLoading(true);
    try {
      const response = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${month}&year=${year}`
      );
      const data = await response.json();

      if (data.attendance) {
        const enrichedData = enrichWithLocations(data.attendance);
        setAttendance(enrichedData);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

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

  useEffect(() => {
    const fetchLocationAddresses = async () => {
      if (attendance.length > 0) {
        const newAddresses: LocationAddresses = {};
        for (const record of attendance) {
          if (record._id && !locationAddresses[record._id]) {
            const addresses = { in: '', out: '' };
            if (record.punchInLocation?.latitude && record.punchInLocation?.longitude) {
              addresses.in = await reverseGeocode(
                record.punchInLocation.latitude,
                record.punchInLocation.longitude
              );
            }
            if (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude) {
              addresses.out = await reverseGeocode(
                record.punchOutLocation.latitude,
                record.punchOutLocation.longitude
              );
            }
            newAddresses[record._id] = addresses;
          }
        }
        setLocationAddresses(prev => ({ ...prev, ...newAddresses }));
      }
    };
    fetchLocationAddresses();
  }, [attendance, locationAddresses]);

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
            return leave.leaveType;
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }
    return null;
  };

  const getDayType = (date: string, year: number, month: number) => {
    const dateStr = date.split('T')[0];
    const d = new Date(dateStr);
    
    if (governmentHolidays.includes(dateStr)) {
      return governmentHolidayMap[dateStr] || 'Holiday';
    }
    
    if (d.getDay() === 0) {
      return 'Sunday';
    }
    
    if (d.getDay() === 6) {
      const weekNumber = Math.ceil((d.getDate() + (new Date(year, month - 1, 1).getDay())) / 7);
      if (weekNumber === 2) {
        return '2nd Saturday';
      } else if (weekNumber === 4) {
        return '4th Saturday';
      }
    }
    
    return 'Working Day';
  };

  const getAttendanceStatus = (record: Attendance, dayType: string) => {
    const leaveType = isLeaveDate(record.date);

    if (leaveType) {
      return leaveType + ' Leave';
    }

    if (dayType !== 'Working Day' && record.punchInTime && record.punchOutTime) {
      const inTime = record.punchInUtc || record.punchInTime;
      const outTime = record.punchOutUtc || record.punchOutTime;
      const hoursWorked = parseFloat(calculateHoursUtc(inTime, outTime));
      if (hoursWorked >= 4) {
        return 'Comp Off';
      }
    }

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

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      attendance.map((record) => ({
        Date: new Date(record.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        Project: record.projectName || "N/A",
        "Check-In": formatTime(record.punchInTime),
        "Check-Out": formatTime(record.punchOutTime),
        "Hours Worked": record.punchInTime && record.punchOutTime
          ? formatHoursToHoursAndMinutes(calculateHoursUtc(record.punchInTime, record.punchOutTime))
          : "N/A",
        "Day Type": getDayType(record.date, year, month),
        Status: getAttendanceStatus(record, getDayType(record.date, year, month)),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "Attendance_Report.xlsx");
  };

  const downloadPDF = async () => {
    if (!selectedEmployee) {
      alert("Please select an employee to generate the PDF report.");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Header with logo
      doc.addImage("/v1/employee/exozen_logo1.png", 'PNG', 15, 15, 25, 8);
      doc.setFontSize(16);
      doc.setTextColor(41, 128, 185);
      doc.text(`Attendance Report - ${months[month - 1]} ${year}`, 45, 20);
      doc.setFontSize(12);
      doc.text(`Employee: ${selectedEmployeeDetails?.fullName || 'N/A'}`, 45, 28);
      doc.text(`Employee ID: ${selectedEmployee}`, 45, 35);

      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 45, 195, 45);

      // Attendance table
      const tableColumn = ["Date", "Project", "Check In", "Check Out", "Hours", "Day Type", "Status"];
      const tableRows = attendance.map((record) => {
        const dayType = getDayType(record.date, year, month);
        const status = getAttendanceStatus(record, dayType);
        let hoursWorked = dayType !== 'Working Day' ? '-' : '0h 0m';
        
        if (record.punchInTime && record.punchOutTime) {
            const inTime = new Date(record.punchInTime);
            const outTime = new Date(record.punchOutTime);
            const diffMs = outTime.getTime() - inTime.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            hoursWorked = `${hours}h ${minutes}m`;
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
        startY: 50,
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

      // Get the final Y position after the attendance table
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Monthly Summary on same page
      if (summary) {
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.text('Monthly Summary', 15, finalY + 10);

        const summaryHeaders = [
            'Total Days', 'Present', 'Half Days', 'Partially Absent', 'Week Offs', 
            'Holidays', 'EL', 'SL', 'CL', 'Comp Off', 'LOP'
        ];
        
        const summaryValues = [
            summary.summary.totalDays.toString(),
            summary.summary.presentDays.toString(),
            summary.summary.halfDays.toString(),
            summary.summary.partiallyAbsentDays.toString(),
            summary.summary.weekOffs.toString(),
            summary.summary.holidays.toString(),
            summary.summary.el.toString(),
            summary.summary.sl.toString(),
            summary.summary.cl.toString(),
            summary.summary.compOff.toString(),
            summary.summary.lop.toString()
        ];

        autoTable(doc, {
            head: [summaryHeaders],
            body: [summaryValues],
            startY: finalY + 15,
            theme: 'grid',
            styles: { 
                fontSize: 8,
                cellPadding: 2,
                halign: 'center'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold'
            }
        });
    }

      // Add Leave Balance section
      if (leaveBalance) {
        const leaveY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.text('Leave Balance', 15, leaveY + 10);

        const leaveHeaders = ['Leave Type', 'Allocated', 'Used', 'Remaining'];
        const leaveRows = Object.entries(leaveBalance.balances).map(([type, balance]) => [
          type,
          balance.allocated.toString(),
          balance.used.toString(),
          balance.remaining.toString()
        ]);

        autoTable(doc, {
          head: [leaveHeaders],
          body: leaveRows,
          startY: leaveY + 15,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            halign: 'center'
          },
          alternateRowStyles: { fillColor: [245, 245, 245] }
        });
      }

      // Add Leave History section
      if (leaveHistory.length > 0) {
        const historyY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.text('Leave History', 15, historyY + 10);

        const leaveHistoryData = [
          ['Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'],
          ...leaveHistory.map(leave => [
            leave.leaveType,
            new Date(leave.startDate).toLocaleDateString(),
            new Date(leave.endDate).toLocaleDateString(),
            leave.numberOfDays + (leave.isHalfDay ? ' (Half)' : ''),
            leave.status,
            leave.reason.substring(0, 20) + (leave.reason.length > 20 ? '...' : '')
          ])
        ];

        autoTable(doc, {
          head: [leaveHistoryData[0]],
          body: leaveHistoryData.slice(1),
          startY: historyY + 15,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold'
          }
        });
      }

      // Add note and signatures at the bottom
      const finalPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      doc.setFontSize(11);
      doc.setTextColor(200, 0, 0);
      doc.text('Note:', 15, finalPosition);
      doc.setTextColor(0, 0, 0);
      doc.text('Please ensure that the total working hours per day are at least 8 hours.', 30, finalPosition);

      // Signature lines
      const signatureY = finalPosition + 30;
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.line(25, signatureY, 85, signatureY);
      doc.line(125, signatureY, 185, signatureY);

      doc.setFontSize(10);
      doc.text('Authorized Signature', 25, signatureY + 5);
      doc.text('Employee Signature', 125, signatureY + 5);

      // Save the PDF
      doc.save(`attendance_report_${selectedEmployee}_${month}_${year}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const match = dateString.match(/T(\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : 'N/A';
  };

  const formatHoursToHoursAndMinutes = (hoursDecimal: string): string => {
    if (hoursDecimal === '0' || hoursDecimal === 'N/A') return 'N/A';
    const hours = Math.floor(parseFloat(hoursDecimal));
    const minutes = Math.round((parseFloat(hoursDecimal) - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const filterLeaveHistoryByMonth = (leaveHistory: LeaveRecord[], month: number, year: number) => {
    return leaveHistory.filter(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const targetDate = new Date(year, month - 1);
      
      return (
        (startDate.getMonth() === month - 1 && startDate.getFullYear() === year) ||
        (endDate.getMonth() === month - 1 && endDate.getFullYear() === year) ||
        (startDate <= targetDate && endDate >= new Date(year, month, 0))
      );
    });
  };

  return (
    <ManagerOpsLayout>
      <div className={`min-h-screen font-sans ${
        theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'
      }`}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className={`${
            theme === 'dark' 
              ? 'bg-gray-800' 
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
                  <h1 className="text-3xl font-bold">Employee-wise Attendance Report</h1>
                  <p className={`${
                    theme === 'dark' 
                      ? 'text-gray-300' 
                      : 'text-blue-100'
                  } mt-1`}>View attendance details for employees</p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className={`animate-spin ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              } w-12 h-12`} />
            </div>
          ) : (
            <div>
              {/* Filters and Actions */}
              <div className={`flex flex-wrap gap-4 items-center justify-between p-4 ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
              } rounded-xl mb-6`}>
                <div className="flex gap-4">
                  <div className="relative">
                    <FaCalendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                    <select
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value))}
                      className={`pl-10 pr-4 py-2 border rounded-lg appearance-none ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200' 
                          : 'bg-white border-gray-200 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    >
                      {months.map((monthName, index) => (
                        <option key={index + 1} value={index + 1}>{monthName}</option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className={`px-4 py-2 border rounded-lg appearance-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-200 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    {years.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employee Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {employees.map((employee) => (
                  <div
                    key={employee.employeeId}
                    className={`${
                      theme === 'dark'
                        ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                        : 'bg-white hover:bg-gray-50'
                    } rounded-xl shadow-lg p-6 transition-colors`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-100'} flex items-center justify-center overflow-hidden`}>
                        {employee.employeeImage ? (
                          <Image
                            src={employee.employeeImage}
                            alt={employee.fullName}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FaUser className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-400' : 'text-blue-500'}`} />
                        )}
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                          {employee.fullName}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {employee.employeeId}
                        </p>
                      </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Designation:
                      </span>{" "}
                      {employee.designation}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee.employeeId);
                        fetchAttendance(employee.employeeId);
                      }}
                      className={`w-full ${
                        theme === 'dark'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-blue-500 hover:bg-blue-600'
                      } text-white py-2 rounded-lg transition-colors`}
                    >
                      View Attendance
                    </button>
                  </div>
                ))}
              </div>

              {/* Attendance Table */}
              {selectedEmployee && (
                <div className={`overflow-x-auto rounded-xl border ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className={`flex justify-between items-center p-4 ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                  }`}>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Attendance Details
                    </h2>
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

                  {attendanceLoading ? (
                    <div className="flex justify-center items-center">
                      <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
                    </div>
                  ) : attendance.length === 0 ? (
                    <p className="text-gray-600 text-lg">
                      No attendance records found for the selected month.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full bg-white rounded-lg shadow-md overflow-hidden">
                        <thead className={`${
                          theme === 'dark'
                            ? 'bg-gray-700 text-gray-200'
                            : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white'
                        }`}>
                          <tr>
                            <th className="p-4 text-left font-semibold">Date</th>
                            <th className="p-4 text-left font-semibold">Project</th>
                            <th className="p-4 text-left font-semibold">Check-In</th>
                            <th className="p-4 text-left font-semibold">Check-Out</th>
                            <th className="p-4 text-left font-semibold">Hours Worked</th>
                            <th className="p-4 text-left font-semibold">Day Type</th>
                            <th className="p-4 text-left font-semibold">Status</th>
                            <th className="p-4 text-left font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        } divide-y ${
                          theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                        }`}>
                          {attendance.map((record, index) => {
                            const dayType = getDayType(record.date, year, month);
                            const status = getAttendanceStatus(record, dayType);
                            let hoursWorked = dayType !== 'Working Day' ? '-' : '0h 0m';
                            
                            if (record.punchInTime && record.punchOutTime) {
                                const inTime = new Date(record.punchInTime);
                                const outTime = new Date(record.punchOutTime);
                                const diffMs = outTime.getTime() - inTime.getTime();
                                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                hoursWorked = `${hours}h ${minutes}m`;
                            }

                            return (
                              <tr
                                key={record._id}
                                className={`${
                                  theme === 'dark' 
                                    ? 'hover:bg-gray-700' 
                                    : index % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-100'
                                } transition-colors`}
                              >
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {new Date(record.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                                </td>
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {record.projectName || "N/A"}
                                </td>
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {formatTime(record.punchInTime)}
                                </td>
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {formatTime(record.punchOutTime)}
                                </td>
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {hoursWorked}
                                </td>
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {dayType}
                                </td>
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {status}
                                </td>
                                <td className={`p-4 ${
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  <button
                                    onClick={() => setSelectedRecord(record)}
                                    className={`${
                                      theme === 'dark'
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}
                                  >
                                    <FaEye className="w-4 h-4" />
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Modal for viewing record details */}
              {selectedRecord && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                  <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
                    {/* Close button */}
                    <button
                      onClick={() => setSelectedRecord(null)}
                      className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                      aria-label="Close"
                    >
                      &times;
                    </button>

                    {/* Modal header */}
                    <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                      Attendance Record Details
                    </h2>

                    {/* Modal content */}
                    <div className="space-y-4">
                      {/* Basic Details */}
                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Date:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {new Date(selectedRecord.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Project Name:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {selectedRecord.projectName || 'N/A'}
                        </span>
                      </div>

                      {/* Punch In Details */}
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
                                : 'Location data unavailable'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Punch Out Details */}
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
                                : 'Location data unavailable'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Photos */}
                      <div className="flex flex-col items-start border-b pb-2">
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                          Attendance Photos:
                        </span>
                        <div className="grid grid-cols-2 gap-4 w-full">
                          {selectedRecord.punchInPhoto && (
                            <div>
                              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} block mb-1`}>
                                Punch In:
                              </span>
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
                              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} block mb-1`}>
                                Punch Out:
                              </span>
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
          )}
        </div>
      </div>
    </ManagerOpsLayout>
  );
};

export default EmployeeWiseAttendancePage;