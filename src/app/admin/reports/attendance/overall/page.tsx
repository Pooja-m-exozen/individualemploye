"use client";

import React, { JSX, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaSpinner, FaFilePdf, FaFileExcel, FaChevronDown, FaFilter } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Image from "next/image";
import { useRouter, usePathname } from 'next/navigation';

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

// Add this utility function near the top:
function getWeekOffsInMonth(year: number, month: number, projectName?: string): number {
  let weekOffs = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (projectName === 'Exozen - Ops') {
      if (dayOfWeek === 0) weekOffs++; // Only Sundays
    } else {
      if (dayOfWeek === 0) {
        weekOffs++;
      } else if (dayOfWeek === 6) {
        const saturday = Math.floor((date.getDate() - 1) / 7) + 1;
        if (saturday === 2 || saturday === 4) weekOffs++;
      }
    }
  }
  return weekOffs;
}

// Interfaces for API responses
interface KycForm {
  personalDetails: {
    projectName: string;
    employeeId: string;
    fullName: string;
    designation: string;
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

const OverallSummaryPage = (): JSX.Element => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [leaveData, setLeaveData] = useState<Record<string, LeaveRecord[]>>({});
  const [lopData, setLopData] = useState<Record<string, number>>({});
  const [weekOffData, setWeekOffData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingLop, setLoadingLop] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'overall' | 'consolidated'>(
    pathname?.endsWith('/overall') ? 'consolidated' : 'overall'
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  const daysInMonth = new Date(year, month, 0).getDate();

  const handleTabClick = (tab: 'overall' | 'consolidated') => {
    setActiveTab(tab);
    if (tab === 'overall') {
      router.push('/admin/reports/attendance');
    } else if (tab === 'consolidated') {
      router.push('/admin/reports/attendance/overall');
    }
  };

  useEffect(() => {
    const fetchEmployeesAndLeaves = async () => {
      setLoading(true);
      try {
        const kycResponse = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const kycData: KycApiResponse = await kycResponse.json();

        if (kycData.kycForms) {
          const filteredEmployees = kycData.kycForms
            // .filter((form) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form) => ({
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
    const fetchSummaryData = async () => {
      if (employees.length === 0) return;
      setLoadingLop(true);
      try {
        const summaryPromises = employees.map(emp =>
          fetch(`https://cafm.zenapi.co.in/api/attendance/${emp.employeeId}/monthly-summary?month=${month}&year=${year}`)
            .then(res => res.json())
            .then(data => ({
              employeeId: emp.employeeId,
              lop: data.data?.summary?.lop ?? 0,
              weekOffs: data.data?.summary?.weekOffs ?? 0,
            }))
        );
        
        const allSummaryData = await Promise.all(summaryPromises);
        const lopMap: Record<string, number> = {};
        const weekOffMap: Record<string, number> = {};
        allSummaryData.forEach(data => {
          lopMap[data.employeeId] = data.lop;
          weekOffMap[data.employeeId] = data.weekOffs;
        });
        setLopData(lopMap);
        setWeekOffData(weekOffMap);
      } catch (error) {
        console.error("Error fetching summary data:", error);
      } finally {
        setLoadingLop(false);
      }
    };

    fetchSummaryData();
  }, [employees, month, year]);

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
            
            const dayRecord = employeeAttendance.find((record) => {
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

  const downloadPDF = async () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    await addLogoToPDF(doc, (pageWidth / 2) - 30, 10, 60, 25);
    doc.setFontSize(18);
    doc.text('Attendance Summary Report', pageWidth / 2, 45, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`, pageWidth / 2, 55, { align: 'center' });

    const tableHeaders = [
        ['Employee', 'ID', 'Total Days', 'Present', 'Absent', 'Week Offs', 'CF', 'CFL', 'EL', 'SL', 'CL', 'LOP', 'Payable Days']
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

        const payableDays = getPayableDays(empAttendance);
        const lop = daysInMonth - payableDays;
        const clCount = getCount('CL');

        return [
            employee.fullName,
            employee.employeeId,
            daysInMonth,
            getCount('P'),
            getCount('A'),
            getWeekOffsInMonth(year, month, employee.projectName),
            getCount('CF'),
            getCount('CFL'),
            getCount('EL'),
            getCount('SL'),
            clCount,
            lop,
            payableDays
        ];
    });

    autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 65,
        theme: 'grid',
    });

    doc.save(`Attendance_Summary_${month}_${year}.pdf`);
  };
  
  const downloadExcel = () => {
      const employeesToDownload = selectedEmployeeIds.length > 0
        ? employees.filter(e => selectedEmployeeIds.includes(e.employeeId))
        : filteredEmployees;
      const worksheetData = employeesToDownload.map(employee => {
          const empAttendance = attendanceData[employee.employeeId] || [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const getCount = (status: string) => empAttendance.filter(a => {
              const d = new Date(a.date);
              d.setHours(0, 0, 0, 0);
              return a.status === status && d <= today;
          }).length;

          const payableDays = getPayableDays(empAttendance);
          const lop = daysInMonth - payableDays;
          const clCount = getCount('CL');

          return {
              'Employee Name': employee.fullName,
              'Employee ID': employee.employeeId,
              'Total Days': daysInMonth,
              'Present': getCount('P'),
              'Absent': getCount('A'),
              'Week Offs': getWeekOffsInMonth(year, month, employee.projectName),
              'CF': getCount('CF'),
              'CFL': getCount('CFL'),
              'EL': getCount('EL'),
              'SL': getCount('SL'),
              'LOP': lop,
              'Payable Days': payableDays,
              'CL': clCount
          };
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
      XLSX.writeFile(workbook, `Attendance_Summary_${month}_${year}.xlsx`);
  };

  return (
    <AdminDashboardLayout>
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
          {/* Header */}
          <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-0 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
            <div className="flex items-center gap-6">
              <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
                <FaFilePdf className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Summary</h1>
              </div>
            </div>
            {/* Filter Row: Month, Year, Search, Filter Icon */}
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
                {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
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
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Projects</label>
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
                <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>CFL</span><span>CompOff Leave</span></div>
                <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>EL/SL/CL</span><span>On Leave</span></div>
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
          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className={`animate-spin ${
                theme === 'light' ? 'text-blue-600' : 'text-blue-400'
              } w-12 h-12`} />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-md" style={{ maxHeight: '70vh' }}>
              <table className={`w-full min-w-[1200px] rounded-lg overflow-hidden text-sm ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'}`}>
                <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm' : 'bg-blue-600/90 backdrop-blur-sm'} text-white`}>
                  <tr>
                    <th className="py-3 pl-4 pr-8 text-left font-semibold sticky left-0 bg-inherit z-20 w-48">Employee</th>
                    <th className="p-3 text-center font-semibold w-20">Total Days</th>
                    <th className="p-3 text-center font-semibold w-16">Present</th>
                    <th className="p-3 text-center font-semibold w-16">Absent</th>
                    <th className="p-3 text-center font-semibold w-20">Week Offs</th>
                    <th className="p-3 text-center font-semibold w-16">CF</th>
                    <th className="p-3 text-center font-semibold w-16">CFL</th>
                    <th className="p-3 text-center font-semibold w-16">EL</th>
                    <th className="p-3 text-center font-semibold w-16">SL</th>
                    <th className="p-3 text-center font-semibold w-16">CL</th>
                    <th className="p-3 text-center font-semibold w-16">LOP</th>
                    <th className="p-3 text-center font-semibold w-24">Payable Days</th>
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

                    const presentDays = getCount('P');
                    const absentDays = getCount('A');
                    const holidayCount = getCount('H');
                    const cfCount = getCount('CF');
                    const cflCount = getCount('CFL');
                    const elCount = getCount('EL');
                    const slCount = getCount('SL');
                    const payableDays = getPayableDays(empAttendance);
                    const lop = daysInMonth - payableDays;
                    const clCount = getCount('CL');
                    return (
                      <tr key={employee.employeeId} className={`transition-colors duration-150 ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50/50'}`}>
                        <td className={`py-3 pl-4 pr-8 sticky left-0 bg-inherit z-10 whitespace-nowrap w-48 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}> 
                          <div className="flex items-center gap-3">
                            <Image src={employee.imageUrl} alt={employee.fullName} width={32} height={32} className="rounded-full object-cover" />
                            <div>
                              <div className="font-bold text-sm">{employee.fullName}</div>
                              <div className="text-xs opacity-70">{employee.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`p-3 text-center font-bold w-20 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>{daysInMonth}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>{presentDays}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-red-900' : 'bg-red-100'}`}>{absentDays}</td>
                        <td className={`p-3 text-center font-bold w-20 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>{loadingLop ? '...' : getWeekOffsInMonth(year, month, employee.projectName)}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-cyan-900' : 'bg-cyan-100'}`}>{cfCount}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>{cflCount}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{elCount}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{slCount}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>{clCount}</td>
                        <td className={`p-3 text-center font-bold w-16 ${theme === 'dark' ? 'bg-red-900' : 'bg-red-100'}`}>{loadingLop ? '...' : lop}</td>
                        <td className={`p-3 text-center font-bold w-24 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>{payableDays}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default OverallSummaryPage;