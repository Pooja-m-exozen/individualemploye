"use client";

import React, { JSX, useEffect, useState } from "react";
import AdminLayout from "@/components/dashboard/AdminDashboardLayout";
import { useTheme } from "@/context/ThemeContext";
import { FaSpinner,  FaFilePdf, FaFileExcel, FaInfoCircle, FaFilter, FaChevronDown } from "react-icons/fa";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";
import 'react-tooltip/dist/react-tooltip.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  imageUrl: string;
}

interface Attendance {
  date: string;
  status: string;
  punchInTime?: string;
  punchOutTime?: string;
}

interface LeaveRecord {
  leaveId?: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
}

const GOVERNMENT_HOLIDAYS = [
  { date: '2024-01-26', description: 'Republic Day' },
  { date: '2024-08-15', description: 'Independence Day' },
];

const isSecondOrFourthSaturday = (date: Date): boolean => {
  if (date.getDay() !== 6) return false;
  const saturday = Math.floor((date.getDate() - 1) / 7) + 1;
  return saturday === 2 || saturday === 4;
};

const isHoliday = (date: Date, projectName?: string): boolean => {
  const day = date.getDay();
  const dateString = date.toISOString().split('T')[0];
  
  // For Exozen - Ops project: only Sundays are holidays, 2nd and 4th Saturdays are working days
  if (projectName === "Exozen - Ops") {
    if (day === 0) return true; // Sunday is holiday
    // 2nd and 4th Saturdays are working days, so return false
    return GOVERNMENT_HOLIDAYS.some(holiday => holiday.date === dateString);
  }
  
  // For other projects: Sundays and 2nd/4th Saturdays are holidays
  if (day === 0) return true;
  if (isSecondOrFourthSaturday(date)) return true;
  return GOVERNMENT_HOLIDAYS.some(holiday => holiday.date === dateString);
};

const getAttendanceStatus = (date: Date, leaves: LeaveRecord[], projectName?: string, status?: string, punchInTime?: string, punchOutTime?: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (checkDate > today) {
    return '';
  }

  const onLeave = leaves.find(leave => {
    const startDate = new Date(leave.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(leave.endDate);
    endDate.setHours(0, 0, 0, 0);
    return checkDate >= startDate && checkDate <= endDate && leave.status === 'Approved';
  });

  if (onLeave) {
    const leaveType = (onLeave.leaveType || '').toLowerCase().replace(/\s+/g, '');
    if (leaveType === 'compoff' || leaveType === 'cfl' || leaveType === 'compoffleave') return 'CFL';
    return onLeave.leaveType;
  }

  // For Exozen - Ops project: if it's Sunday and they worked, it's Comp Off
  if (projectName === "Exozen - Ops" && date.getDay() === 0) {
    if (punchInTime && punchOutTime) return 'CF';
    return 'H';
  }

  // For other projects: check if it's a holiday
  if (isHoliday(date, projectName)) {
    if (punchInTime && punchOutTime) return 'CF';
    return 'H';
  }

  const isToday = checkDate.getTime() === today.getTime();
  return (status === 'Present' && punchInTime && (punchOutTime || isToday)) ? 'P' : 'A';
};

// type WeekOffType = 'sunday' | 'saturday';
// const getWeekOffs = (year: number, month: number): { date: string, type: WeekOffType }[] => {
//   const daysInMonth = new Date(year, month, 0).getDate();
//   const weekOffs: { date: string, type: WeekOffType }[] = [];
//   for (let day = 1; day <= daysInMonth; day++) {
//     const date = new Date(year, month - 1, day);
//     if (date.getDay() === 0) {
//       weekOffs.push({ date: date.toISOString().split('T')[0], type: 'sunday' });
//     } else if (isSecondOrFourthSaturday(date)) {
//       weekOffs.push({ date: date.toISOString().split('T')[0], type: 'saturday' });
//     }
//   }
//   return weekOffs;
// };

const getPayableDays = (attendance: Attendance[]): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return attendance.filter(a => {
    const attendanceDate = new Date(a.date);
    attendanceDate.setHours(0, 0, 0, 0);
    if (attendanceDate > today) return false;
    return ['P', 'H', 'CF', 'CFL', 'EL', 'SL', 'CL'].includes(a.status);
  }).length;
};

const getBase64FromUrl = async (url: string, retries = 3): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying image fetch, ${retries} attempts remaining`);
      return getBase64FromUrl(url, retries - 1);
    }
    throw error;
  }
};

const addLogoToPDF = async (doc: jsPDF, x: number, y: number, width: number, height: number): Promise<void> => {
  try {
    const logoBase64 = await getBase64FromUrl("/v1/employee/exozen_logo1.png");
    doc.addImage(logoBase64, 'PNG', x, y, width, height);
  } catch {
    console.warn('Failed to load primary logo, trying fallback logo');
    try {
      const fallbackLogoBase64 = await getBase64FromUrl('/exozen_logo.png');
      doc.addImage(fallbackLogoBase64, 'PNG', x, y, width, height);
    } catch (fallbackError) {
      console.error('Failed to load both logos:', fallbackError);
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('EXOZEN', x, y + height / 2);
    }
  }
};

interface KycForm {
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
    employeeImage?: string;
  };
}
interface KycApiResponse {
  kycForms: KycForm[];
}
interface AttendanceRecord {
  employeeId: string;
  projectName: string;
  date: string;
  status: string;
  punchInTime?: string;
  punchOutTime?: string;
}
interface AttendanceApiResponse {
  attendance: AttendanceRecord[];
}
interface LeaveHistoryResponse {
  leaveHistory: LeaveRecord[];
}

const OverallAttendancePage = (): JSX.Element => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [leaveData, setLeaveData] = useState<Record<string, LeaveRecord[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'overall' | 'consolidated'>('overall');
  const router = useRouter();
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    const fetchEmployeesAndLeaves = async () => {
      setLoading(true);
      try {
        const kycResponse = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const kycData: KycApiResponse = await kycResponse.json();

        if (kycData.kycForms) {
          const filteredEmployees = kycData.kycForms
            // .filter((form: KycForm) => form.personalDetails.projectName === "Exozen - ")
            .map((form: KycForm) => ({
              employeeId: form.personalDetails.employeeId,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              projectName: form.personalDetails.projectName,
              imageUrl: form.personalDetails.employeeImage || "/default-avatar.png",
            }));
          setEmployees(filteredEmployees);

          const leavePromises = filteredEmployees.map(emp =>
            fetch(`https://cafm.zenapi.co.in/api/leave/history/${emp.employeeId}`)
              .then(res => res.json())
              .then((data: LeaveHistoryResponse) => ({
                employeeId: emp.employeeId,
                leaves: data.leaveHistory || []
              }))
          );
          
          const allLeaves = await Promise.all(leavePromises);
          const leaveMap: Record<string, LeaveRecord[]> = {};
          allLeaves.forEach(empLeaves => {
            leaveMap[empLeaves.employeeId] = empLeaves.leaves;
          });
          setLeaveData(leaveMap);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeesAndLeaves();
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (employees.length === 0) return;
      setLoading(true);
      try {
        const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/all`);
        const data: AttendanceApiResponse = await response.json();
        
        const attendanceMap: Record<string, Attendance[]> = {};
        
        employees.forEach((employee) => {
          const employeeAttendance = data.attendance.filter((record: AttendanceRecord) => 
            record.employeeId === employee.employeeId
          );
          const employeeLeaves = leaveData[employee.employeeId] || [];

          const daysInMonth = new Date(year, month, 0).getDate();
          const monthAttendance: Attendance[] = [];

          for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            const dateString = currentDate.toISOString().split('T')[0];
            
            const dayRecord = employeeAttendance.find((record: AttendanceRecord) => {
              const recordDate = new Date(record.date);
              return recordDate.getFullYear() === currentDate.getFullYear() &&
                     recordDate.getMonth() === currentDate.getMonth() &&
                     recordDate.getDate() === currentDate.getDate();
            });
            
            monthAttendance.push({
              date: dateString,
              status: getAttendanceStatus(currentDate, employeeLeaves, employee.projectName, dayRecord?.status, dayRecord?.punchInTime, dayRecord?.punchOutTime),
              punchInTime: dayRecord?.punchInTime,
              punchOutTime: dayRecord?.punchOutTime
            });
          }

          attendanceMap[employee.employeeId] = monthAttendance;
        });

        setAttendanceData(attendanceMap);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [employees, leaveData, month, year]);

  const downloadPDF = async () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margins = 10;
    let yPosition = 12;
    const logoWidth = 60;
    const logoHeight = 25;
    const logoX = (pageWidth - logoWidth) / 2;
    await addLogoToPDF(doc, logoX, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 6;

    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('Monthly Attendance Report', pageWidth / 2, yPosition + 8, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`, pageWidth / 2, yPosition + 18, { align: 'center' });

    const daysInMonth = getDaysInMonth(year, month);
    const tableHeaders = [
      [
        'Emp ID', 'Name',
        ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()),
        'P', 'A', 'H', 'CF', 'CFL', 'EL', 'SL', 'CL', 'Payable'
      ]
    ];

    // Only include selected employees if any are selected, otherwise all filteredEmployees
    const employeesToDownload = selectedEmployeeIds.length > 0
      ? employees.filter(e => selectedEmployeeIds.includes(e.employeeId))
      : filteredEmployees;

    const tableData = employeesToDownload.map(employee => {
      const empAttendance = attendanceData[employee.employeeId] || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const getCount = (status: string) => empAttendance.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return a.status === status && d <= today;
      }).length;

      const presentCount = getCount('P');
      const absentCount = getCount('A');
      const holidayCount = getCount('H');
      const cfCount = getCount('CF');
      const cflCount = getCount('CFL');
      const elCount = getCount('EL');
      const slCount = getCount('SL');
      const clCount = getCount('CL');
      // const compOffCount = getCount('CompOff');
      const payableDays = getPayableDays(empAttendance);
      
      return [
        employee.employeeId, employee.fullName,
        ...empAttendance.map(record => {
          let fillColor: [number, number, number] = [248, 250, 252];
          if (record.status === 'P') fillColor = [232, 245, 233];
          else if (record.status === 'H') fillColor = [237, 231, 246];
          else if (record.status === 'A') fillColor = [253, 232, 232];
          else if (record.status === 'CF') fillColor = [224, 247, 250];
          else if (record.status === 'CFL') fillColor = [187, 222, 251];
          else if (['EL', 'SL', 'CL', 'CompOff'].includes(record.status)) fillColor = [255, 248, 225];

          let textColor: [number, number, number] = [156, 163, 175];
          if (record.status === 'P') textColor = [27, 94, 32];
          else if (record.status === 'H') textColor = [94, 53, 177];
          else if (record.status === 'A') textColor = [183, 28, 28];
          else if (record.status === 'CF') textColor = [8, 145, 178];
          else if (record.status === 'CFL') textColor = [30, 64, 175];
          else if (['EL', 'SL', 'CL', 'CompOff'].includes(record.status)) textColor = [217, 119, 6];
          
          const fontStyle: 'bold' | 'normal' = ['P', 'A', 'H', 'CF', 'CFL', 'EL', 'SL', 'CL', 'CompOff'].includes(record.status) ? 'bold' : 'normal';

          return {
            content: record.status || '-',
            styles: {
              fillColor,
              textColor,
              fontStyle,
            }
          };
        }),
        presentCount.toString(), absentCount.toString(), holidayCount.toString(), cfCount.toString(), cflCount.toString(),
        elCount.toString(), slCount.toString(), clCount.toString(), payableDays.toString()
      ];
    });

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: yPosition + 28,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1, valign: 'middle', halign: 'center', lineWidth: 0.1, lineColor: [226, 232, 240] },
      columnStyles: { 1: { cellWidth: 35 } },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      margin: { left: margins, right: margins }
    });

    const fileName = `Attendance_Report_${new Date(year, month - 1).toLocaleString('default', { month: 'long' })}_${year}.pdf`;
    doc.save(fileName);
  };

  const downloadExcel = () => {
    const worksheetData = employees.map((employee) => {
      const empAttendance = attendanceData[employee.employeeId] || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const getCount = (status: string) => empAttendance.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return a.status === status && d <= today;
      }).length;
      
      const rowData: { [key: string]: string | number } = {
        "Employee ID": employee.employeeId,
        "Employee Name": employee.fullName
      };
      
      Array.from({ length: getDaysInMonth(year, month) }, (_, i) => {
        const date = new Date(year, month - 1, i + 1).toISOString().split("T")[0];
        const record = empAttendance.find(r => r.date === date);
        const dateLabel = new Date(year, month - 1, i + 1).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
        rowData[dateLabel] = record ? record.status : '-';
      });

      rowData["Present"] = getCount('P');
      rowData["Absent"] = getCount('A');
      rowData["Holiday"] = getCount('H');
      rowData["CF"] = getCount('CF');
      rowData["CFL"] = getCount('CFL');
      rowData["EL"] = getCount('EL');
      rowData["SL"] = getCount('SL');
      rowData["CL"] = getCount('CL');
      rowData["Payable Days"] = getPayableDays(empAttendance);
      
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Overall Attendance");
    XLSX.writeFile(workbook, "Overall_Attendance_Report.xlsx");
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const LoadingSkeleton = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
      <span className="text-lg text-gray-500 dark:text-gray-300">Loading attendance data...</span>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <FaInfoCircle className="text-4xl text-blue-400 mb-4" />
      <span className="text-lg text-gray-500 dark:text-gray-300">No employees or attendance data found for this period.</span>
    </div>
  );
  
  // Tab click handler
  const handleTabClick = (tab: 'overall' | 'consolidated') => {
    setActiveTab(tab);
    if (tab === 'overall') {
      router.push('/admin/reports/attendance');
    } else if (tab === 'consolidated') {
      router.push('/admin/reports/attendance/overall');
    }
  };

  // Extract unique project names and designations
  const projectNames = Array.from(new Set(employees.map(e => e.projectName).filter(Boolean)));
  const designations = Array.from(new Set(employees.map(e => e.designation).filter(Boolean)));

  // Filter employees based on selected filters and search
  const filteredEmployees = employees.filter(emp => {
    const matchesProject = selectedProjects.length > 0 ? selectedProjects.includes(emp.projectName) : true;
    const matchesDesignation = selectedDesignation ? emp.designation === selectedDesignation : true;
    const matchesSearch = searchQuery
      ? emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesProject && matchesDesignation && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        <div className="p-6">
          {/* Tabs */}
          <div className="mb-6 flex gap-2">
            <button
              className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 transition-all duration-200 focus:outline-none ${
                activeTab === 'overall'
                  ? theme === 'dark'
                    ? 'bg-gray-800 border-blue-400 text-blue-400'
                    : 'bg-white border-blue-600 text-blue-700'
                  : theme === 'dark'
                  ? 'bg-gray-700 border-transparent text-gray-300 hover:text-blue-300'
                  : 'bg-gray-100 border-transparent text-gray-500 hover:text-blue-700'
              }`}
              onClick={() => handleTabClick('overall')}
            >
              Overall
            </button>
            <button
              className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 transition-all duration-200 focus:outline-none ${
                activeTab === 'consolidated'
                  ? theme === 'dark'
                    ? 'bg-gray-800 border-blue-400 text-blue-400'
                    : 'bg-white border-blue-600 text-blue-700'
                  : theme === 'dark'
                  ? 'bg-gray-700 border-transparent text-gray-300 hover:text-blue-300'
                  : 'bg-gray-100 border-transparent text-gray-500 hover:text-blue-700'
              }`}
              onClick={() => handleTabClick('consolidated')}
            >
              Consolidated
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'consolidated' ? (
            null
          ) : (
            <>
              <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-0 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
                <div className="flex items-center gap-6">
                  <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
                    <FaFilePdf className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Overall</h1>
                  </div>
                </div>
                {/* Filter Row: Month, Year, Search, Filter Icon (no download buttons) */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
                  >
                    {[2025, 2024, 2023].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  {/* Search Bar */}
                  <div className="relative w-full md:w-auto">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by name or ID"
                      className={`pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <FaSpinner className="w-4 h-4" />
                    </span>
                  </div>
                  {/* Filter Icon */}
                  <button
                    type="button"
                    className={`p-2 rounded-lg border-none shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 hover:bg-blue-900' : 'bg-white/80 text-blue-900 hover:bg-blue-100 focus:ring-white'}`}
                    title="Advanced Filters"
                    onClick={() => setFilterModalOpen(true)}
                  >
                    <FaFilter className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Filter Modal */}
              {filterModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                  <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md relative`}>
                    <button
                      className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                      onClick={() => setFilterModalOpen(false)}
                    >
                      ×
                    </button>
                    <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Advanced Filters</h2>
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-semibold text-white">Select Projects:</label>
                      <div className="flex flex-wrap gap-2">
                        {projectNames.map(project => (
                          <label key={project} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded">
                            <input
                              type="checkbox"
                              checked={selectedProjects.includes(project)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedProjects(prev => [...prev, project]);
                                } else {
                                  setSelectedProjects(prev => prev.filter(p => p !== project));
                                }
                              }}
                            />
                            <span>{project}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Designation</label>
                      <select
                        value={selectedDesignation}
                        onChange={e => setSelectedDesignation(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      >
                        <option value="">All Designations</option>
                        {designations.map(designation => (
                          <option key={designation} value={designation}>{designation}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      onClick={() => setFilterModalOpen(false)}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
              {/* Multi-select for employees after project filter */}
              {selectedProjects.length > 0 && filteredEmployees.length > 0 && (
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-semibold text-white">Select Employees to Download (optional):</label>
                  <div className="flex flex-wrap gap-2">
                    {filteredEmployees.map(emp => (
                      <label key={emp.employeeId} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(emp.employeeId)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedEmployeeIds(ids => [...ids, emp.employeeId]);
                            } else {
                              setSelectedEmployeeIds(ids => ids.filter(id => id !== emp.employeeId));
                            }
                          }}
                        />
                        <span>{emp.fullName} ({emp.employeeId})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {/* Attendance Legend with Download Dropdown */}
              <div className={`mb-4 p-4 rounded-lg border flex items-center justify-between ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}>
                <div>
                  <h3 className="font-semibold mb-2">Attendance Legend:</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>P</span><span>Present</span></div>
                    <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'}`}>A</span><span>Absent</span></div>
                    <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>H</span><span>Holiday</span></div>
                    <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>CF</span><span>Comp. Off</span></div>
                    <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>EL/SL/CL</span><span>On Leave</span></div>
                    <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>CFL</span><span>CompOff Leave</span></div>
                    <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>-</span><span>Future</span></div>
                  </div>
                </div>
                {/* Download Dropdown */}
                <div className="relative">
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' : 'bg-white text-blue-900 border-gray-300 hover:bg-blue-50'}`}
                    onClick={() => setDownloadDropdownOpen((open) => !open)}
                  >
                    <span>Download</span>
                    <FaChevronDown className="w-4 h-4" />
                  </button>
                  {downloadDropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-black'}`}>
                      <button
                        onClick={() => { setDownloadDropdownOpen(false); downloadExcel(); }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-100 dark:hover:bg-gray-700 text-left"
                      >
                        <FaFileExcel className="text-green-600" /> Excel
                      </button>
                      <button
                        onClick={() => { setDownloadDropdownOpen(false); downloadPDF(); }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-100 dark:hover:bg-gray-700 text-left"
                      >
                        <FaFilePdf className="text-red-600" /> PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <LoadingSkeleton />
              ) : filteredEmployees.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-md" style={{ maxHeight: '70vh' }}>
                  <table className={`w-full min-w-[1200px] rounded-lg overflow-hidden text-sm ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'}`}>
                    <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm' : 'bg-blue-600/90 backdrop-blur-sm'} text-white`}>
                      <tr>
                        <th className="py-3 pl-4 pr-8 text-left font-semibold sticky left-0 bg-inherit z-20 w-64">Employee</th>
                        {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => (
                          <th key={i + 1} className="p-3 text-center font-semibold">
                            {new Date(year, month - 1, i + 1).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
                          </th>
                        ))}
                        <th className="p-3 text-center font-semibold bg-green-600">P</th>
                        <th className="p-3 text-center font-semibold bg-red-600">A</th>
                        <th className="p-3 text-center font-semibold bg-purple-600">H</th>
                        <th className="p-3 text-center font-semibold bg-cyan-600">CF</th>
                        <th className="p-3 text-center font-semibold bg-blue-400">CFL</th>
                        <th className="p-3 text-center font-semibold bg-yellow-600">EL</th>
                        <th className="p-3 text-center font-semibold bg-yellow-600">SL</th>
                        <th className="p-3 text-center font-semibold bg-yellow-600">CL</th>
                        <th className="p-3 text-center font-semibold bg-blue-600">Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredEmployees.map((employee) => {
                        const empAttendance = attendanceData[employee.employeeId] || [];
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const getCount = (status: string) => empAttendance.filter(a => {
                          const d = new Date(a.date);
                          d.setHours(0, 0, 0, 0);
                          return a.status === status && d <= today;
                        }).length;
                        
                        return (
                          <tr key={employee.employeeId} className={`transition-colors duration-150 ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50/50'}`}>
                            <td className={`py-3 pl-4 pr-8 sticky left-0 bg-inherit z-10 whitespace-nowrap ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                              <div className="flex items-center gap-3">
                                <Image src={employee.imageUrl} alt={employee.fullName} width={40} height={40} className="rounded-full object-cover" />
                                <div>
                                  <div className="font-bold">{employee.fullName}</div>
                                  <div className="text-xs opacity-70">{employee.employeeId}</div>
                                </div>
                              </div>
                            </td>
                            {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => {
                              const date = new Date(year, month - 1, i + 1).toISOString().split('T')[0];
                              const record = empAttendance.find(r => r.date === date);
                              const status = record?.status || '';
                              
                              let badgeColor = '';
                              if (status === 'P') badgeColor = theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700';
                              else if (status === 'A') badgeColor = theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700';
                              else if (status === 'H') badgeColor = theme === 'dark' ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700';
                              else if (status === 'CF') badgeColor = theme === 'dark' ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700';
                              else if (status === 'CFL') badgeColor = theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700';
                              else if (['EL', 'SL', 'CL'].includes(status)) badgeColor = theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
                              else badgeColor = theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500';
                              
                              return (
                                <td key={i + 1} className="p-3 text-center font-semibold">
                                  <span className={`inline-block rounded-full w-8 py-1 text-xs font-bold shadow-sm ${badgeColor}`}>{status || '-'}</span>
                                </td>
                              );
                            })}
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>{getCount('P')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-red-900' : 'bg-red-100'}`}>{getCount('A')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}>{getCount('H')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-cyan-900' : 'bg-cyan-100'}`}>{getCount('CF')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>{getCount('CFL')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{getCount('EL')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{getCount('SL')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{getCount('CL')}</td>
                            <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>{getPayableDays(empAttendance)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default OverallAttendancePage;