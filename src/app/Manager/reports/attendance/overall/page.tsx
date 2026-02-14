"use client";

import React, { JSX, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSpinner, FaFilePdf, FaFileExcel } from "react-icons/fa";
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
  { date: '2025-01-14', description: 'Makar Sankranti' }, // Makar Sankranti
  { date: '2025-01-26', description: 'Republic Day' }, // Republic Day
  { date: '2025-02-26', description: 'Maha Shivratri' }, //Maha Shivratri
  { date: '2025-03-30', description: 'Ugadi' }, //Ugadi
  { date: '2025-03-31', description: 'Eid al Fitr' }, //Eid al Fitr
  { date: '2025-04-10', description: 'Mahavira Janma Kalyanaka' }, //Mahavira Janma Kalyanaka
  { date: '2025-04-14', description: 'Ambedkar Jayanti' }, //Ambedkar Jayanti
  { date: '2025-05-01', description: 'Labour Day' }, //Labour Day
  { date: '2025-08-08', description: 'Varamahalakshmi' }, //Varamahalakshmi
  { date: '2025-08-15', description: 'Independence Day' }, // Independence Day
  { date: '2025-08-27', description: 'Ganesh Chaturthi' }, // Ganesh Chaturthi
  { date: '2025-10-02', description: 'Gandhi Jayanti' }, // Gandhi Jayanti
];

const isSecondOrFourthSaturday = (date: Date): boolean => {
  if (date.getDay() !== 6) return false;
  const saturday = Math.floor((date.getDate() - 1) / 7) + 1;
  return saturday === 2 || saturday === 4;
};

const isHoliday = (date: Date): boolean => {
  const day = date.getDay();
  const dateString = date.toISOString().split('T')[0];
  if (day === 0) return true;
  if (isSecondOrFourthSaturday(date)) return true;
  return GOVERNMENT_HOLIDAYS.some(holiday => holiday.date === dateString);
};

const getAttendanceStatus = (date: Date, leaves: LeaveRecord[], status?: string, punchInTime?: string, punchOutTime?: string): string => {
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
    return onLeave.leaveType;
  }

  if (isHoliday(date)) {
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
    return ['P', 'H', 'CF', 'EL', 'SL', 'CL', 'CompOff'].includes(a.status);
  }).length;
};

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
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const daysInMonth = new Date(year, month, 0).getDate();

  const handleTabClick = (tab: 'overall' | 'consolidated') => {
    setActiveTab(tab);
    if (tab === 'overall') {
      router.push('/Manager/reports/attendance');
    } else if (tab === 'consolidated') {
      router.push('/Manager/reports/attendance/overall');
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
              status: getAttendanceStatus(currentDate, employeeLeaves, dayRecord?.status, dayRecord?.punchInTime, dayRecord?.punchOutTime),
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
    const matchesProject = selectedProject ? emp.projectName === selectedProject : true;
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
        ['Employee', 'ID', 'Total Days', 'Present', 'Absent', 'Week Offs', 'Holidays', 'CF', 'EL', 'CL', 'SL', 'LOP', 'Payable Days']
    ];

    const tableData = filteredEmployees.map(employee => {
        const empAttendance = attendanceData[employee.employeeId] || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getCount = (status: string) => empAttendance.filter(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            return a.status === status && d <= today;
        }).length;

        return [
            employee.fullName,
            employee.employeeId,
            daysInMonth,
            getCount('P'),
            getCount('A'),
            weekOffData[employee.employeeId] ?? 0,
            getCount('H'),
            getCount('CF'),
            getCount('EL'),
            getCount('CL'),
            getCount('SL'),
            lopData[employee.employeeId] ?? 0,
            getPayableDays(empAttendance)
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
      const worksheetData = filteredEmployees.map(employee => {
          const empAttendance = attendanceData[employee.employeeId] || [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const getCount = (status: string) => empAttendance.filter(a => {
              const d = new Date(a.date);
              d.setHours(0, 0, 0, 0);
              return a.status === status && d <= today;
          }).length;

          return {
              'Employee Name': employee.fullName,
              'Employee ID': employee.employeeId,
              'Total Days': daysInMonth,
              'Present': getCount('P'),
              'Absent': getCount('A'),
              'Week Offs': weekOffData[employee.employeeId] ?? 0,
              'Holidays': getCount('H'),
              'CF': getCount('CF'),
              'EL': getCount('EL'),
              'CL': getCount('CL'),
              'SL': getCount('SL'),
              'LOP': lopData[employee.employeeId] ?? 0,
              'Payable Days': getPayableDays(empAttendance)
          };
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
      XLSX.writeFile(workbook, `Attendance_Summary_${month}_${year}.xlsx`);
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-500' 
          : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200'
      }`}>
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
          <div className={`rounded-2xl p-6 shadow-lg ${
            theme === 'light' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-800' 
              : 'bg-gradient-to-r from-gray-700 to-gray-800'
          }`}>
            <h1 className="text-3xl font-bold text-white">Attendance Summary</h1>
            <p className="text-white text-sm mt-2 opacity-90">
              View detailed attendance and leave summaries for all employees.
            </p>
          </div>

          {/* Filters */}
          <div className="my-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 flex-wrap items-center">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className={`border rounded-lg p-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-black border-gray-300'
                }`}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={`border rounded-lg p-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-black border-gray-300'
                }`}
              >
                {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {/* Project Dropdown */}
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className={`border rounded-lg p-2 min-w-[140px] ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
              >
                <option value="">All Projects</option>
                {projectNames.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
              {/* Designation Dropdown */}
              <select
                value={selectedDesignation}
                onChange={e => setSelectedDesignation(e.target.value)}
                className={`border rounded-lg p-2 min-w-[140px] ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
              >
                <option value="">All Designations</option>
                {designations.map(designation => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>
              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID"
                className={`border rounded-lg p-2 min-w-[180px] ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
              />
            </div>
            <div className="flex gap-4">
              <button onClick={downloadExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <FaFileExcel />
                  <span>Excel</span>
              </button>
              <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  <FaFilePdf />
                  <span>PDF</span>
              </button>
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
            <div className={`rounded-lg shadow-lg p-4 overflow-x-auto ${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            }`}>
              <table className="w-full text-left border-collapse">
                <thead className={`sticky top-0 ${
                  theme === 'light'
                    ? 'bg-gray-50 text-gray-700'
                    : 'bg-gray-800 text-gray-200'
                }`}>
                  <tr>
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-center">Total Days</th>
                    <th className="p-3 text-center">Present</th>
                    <th className="p-3 text-center">Absent</th>
                    <th className="p-3 text-center">Week Offs</th>
                    <th className="p-3 text-center">Holidays</th>
                    <th className="p-3 text-center">CF</th>
                    <th className="p-3 text-center">EL</th>
                    <th className="p-3 text-center">CL</th>
                    <th className="p-3 text-center">SL</th>
                    <th className="p-3 text-center">LOP</th>
                    <th className="p-3 text-center">Payable Days</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'light' ? 'divide-gray-200' : 'divide-gray-700'
                }`}>
                  {filteredEmployees.map((employee,) => {
                    const empAttendance = attendanceData[employee.employeeId] || [];

                    if (loading && empAttendance.length === 0) {
                      return (
                        <tr key={employee.employeeId}>
                          <td colSpan={12} className="p-3 text-center">Loading summary for {employee.fullName}...</td>
                        </tr>
                      );
                    }

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
                    const elCount = getCount('EL');
                    const clCount = getCount('CL');
                    const slCount = getCount('SL');
                    const payableDays = getPayableDays(empAttendance);
                    
                    return (
                      <tr
                        key={employee.employeeId}
                        className={`transition-colors ${
                          theme === 'light'
                            ? 'hover:bg-gray-50'
                            : 'hover:bg-gray-700'
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                          <Image
                            src={employee.imageUrl}
                            alt={employee.fullName}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover"
                          />
                            <div>
                                <div className="font-bold">{employee.fullName}</div>
                                <div className="text-xs opacity-70">{employee.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{daysInMonth}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{presentDays}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{absentDays}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{loadingLop ? '...' : weekOffData[employee.employeeId] ?? 0}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{holidayCount}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{cfCount}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{elCount}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{clCount}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{slCount}</td>
                        <td className={`p-3 border text-center ${
                          theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-gray-700 text-gray-200'
                        }`}>{loadingLop ? '...' : lopData[employee.employeeId] ?? 0}</td>
                        <td className={`p-3 border text-center font-bold ${
                          theme === 'light' ? 'border-gray-200 text-blue-600' : 'border-gray-700 text-blue-400'
                        }`}>{payableDays}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ManagerDashboardLayout>
  );
};

export default OverallSummaryPage;