"use client";

import React, { JSX, useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { useTheme } from "@/context/ThemeContext";
import { FaSpinner,  FaFilePdf, FaFileExcel, FaInfoCircle } from "react-icons/fa";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";
import 'react-tooltip/dist/react-tooltip.css';
import Image from 'next/image';

interface LeaveBalanceType {
  [key: string]: {
    allocated: number;
    used: number;
    remaining: number;
    pending: number;
  };
}

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  imageUrl: string;
  leaveBalance?: LeaveBalanceType;
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

// Get payable days: if employee is absent and has done CompOff (CF),
// match absent days with CF days, add matched to payable, remainder CF is shown as CF
const getPayableDays = (
  attendance: Attendance[],
  compOffUsed: number = 0,
  daysInMonth: number
): { payable: number, absent: number, cfRemain: number } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let present = 0, el = 0, sl = 0, cl = 0, absent = 0, cf = 0, holiday = 0;
  attendance.forEach(a => {
    const attendanceDate = new Date(a.date);
    attendanceDate.setHours(0, 0, 0, 0);
    if (attendanceDate > today) return;
    if (a.status === 'P') present++;
    else if (a.status === 'EL') el++;
    else if (a.status === 'SL') sl++;
    else if (a.status === 'CL') cl++;
    else if (a.status === 'A') absent++;
    else if (a.status === 'CF') cf++;
    else if (a.status === 'H') holiday++;
  });
  // Match absent days with CF days
  const cfMatched = Math.min(absent, cf);
  const cfRemain = cf - cfMatched;
  // Payable = present + holiday + el + sl + cl + cfMatched + compOffUsed (from leave balance)
  let payableSum = present + holiday + el + sl + cl + cfMatched;
  if (typeof compOffUsed === 'number' && compOffUsed > 0) {
    payableSum += compOffUsed;
  }
  // If sum matches days in month, set payable to daysInMonth
  const payable = payableSum === daysInMonth ? daysInMonth : payableSum;
  // Absent = absent - cfMatched
  const absentFinal = absent - cfMatched;
  return { payable, absent: absentFinal, cfRemain };
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

  useEffect(() => {
    const fetchEmployeesAndLeaves = async () => {
      setLoading(true);
      try {
        const kycResponse = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const kycData: KycApiResponse = await kycResponse.json();

        if (kycData.kycForms) {
          const filteredEmployees = kycData.kycForms
            .filter((form: KycForm) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: KycForm) => ({
              employeeId: form.personalDetails.employeeId,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              imageUrl: form.personalDetails.employeeImage || "/default-avatar.png",
            }));

          // Fetch leave balances for all employees
          const leaveBalancePromises = filteredEmployees.map(emp =>
            fetch(`https://cafm.zenapi.co.in/api/leave/balance/${emp.employeeId}`)
              .then(res => res.json())
              .then((data) => ({ employeeId: emp.employeeId, leaveBalance: data.balances || {} }))
              .catch(() => ({ employeeId: emp.employeeId, leaveBalance: {} }))
          );
          const leaveBalances = await Promise.all(leaveBalancePromises);
          const leaveBalanceMap: Record<string, LeaveBalanceType> = {};
          leaveBalances.forEach(lb => {
            leaveBalanceMap[lb.employeeId] = lb.leaveBalance;
          });

          // Attach leaveBalance to each employee
          const employeesWithBalance = filteredEmployees.map(emp => ({
            ...emp,
            leaveBalance: leaveBalanceMap[emp.employeeId] || {},
          }));
          setEmployees(employeesWithBalance);

          // Fetch leave history as before
          const leavePromises = employeesWithBalance.map(emp =>
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
            record.employeeId === employee.employeeId && 
            record.projectName === "Exozen - Ops"
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

  const downloadPDF = async () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    // const pageHeight = doc.internal.pageSize.getHeight();
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
        'P', 'A', 'H', 'CF', 'EL', 'SL', 'CL', 'CompOff Used', 'Payable'
      ]
    ];

    const tableData = employees.map(employee => {
      const empAttendance = attendanceData[employee.employeeId] || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const getCount = (status: string) => empAttendance.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return a.status === status && d <= today;
      }).length;
      const daysInMonth = getDaysInMonth(year, month);
      const compOffUsed = employee.leaveBalance?.CompOff?.used || 0;
      // Add all CF days (not just cfRemain) to payable days
      const cfCount = getCount('CF');
      let presentCount = getCount('P');
      let holidayCount = getCount('H');
      let elCount = getCount('EL');
      let slCount = getCount('SL');
      let clCount = getCount('CL');
      let cf = cfCount;
      let compOff = compOffUsed;
      // For EFMS3254, set week off, holidays, and all leave types to 0
      if (employee.employeeId === "EFMS3254") {
        presentCount = 0;
        holidayCount = 0;
        elCount = 0;
        slCount = 0;
        clCount = 0;
        cf = 0;
        compOff = 0;
      }
      // Payable days = present + holiday + EL + SL + CL + all CF + CompOff Used
      let payableDays = presentCount + holidayCount + elCount + slCount + clCount + cf + compOff;
      if (employee.employeeId === "EFMS3254") {
        payableDays = 0;
      }
      const payableInfo = getPayableDays(empAttendance, compOff, daysInMonth);
      return [
        employee.employeeId, employee.fullName,
        ...empAttendance.map(record => {
          let fillColor: [number, number, number] = [248, 250, 252];
          let status = record.status;
          // For EFMS3254, show all days as '-'
          if (employee.employeeId === "EFMS3254") status = '-';
          if (status === 'P') fillColor = [232, 245, 233];
          else if (status === 'H') fillColor = [237, 231, 246];
          else if (status === 'A') fillColor = [253, 232, 232];
          else if (status === 'CF') fillColor = [224, 247, 250];
          else if (['EL', 'SL', 'CL', 'CompOff'].includes(status)) fillColor = [255, 248, 225];

          let textColor: [number, number, number] = [156, 163, 175];
          if (status === 'P') textColor = [27, 94, 32];
          else if (status === 'H') textColor = [94, 53, 177];
          else if (status === 'A') textColor = [183, 28, 28];
          else if (status === 'CF') textColor = [8, 145, 178];
          else if (['EL', 'SL', 'CL', 'CompOff'].includes(status)) textColor = [217, 119, 6];

          const fontStyle: 'bold' | 'normal' = ['P', 'A', 'H', 'CF', 'EL', 'SL', 'CL', 'CompOff'].includes(status) ? 'bold' : 'normal';

          return {
            content: status || '-',
            styles: {
              fillColor,
              textColor,
              fontStyle,
            }
          };
        }),
        presentCount.toString(), payableInfo.absent.toString(), holidayCount.toString(), cf.toString(),
        elCount.toString(), slCount.toString(), clCount.toString(), compOff.toString(), payableDays.toString()
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
      const daysInMonth = getDaysInMonth(year, month);
      const getCount = (status: string) => empAttendance.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return a.status === status && d <= today;
      }).length;
      const compOffUsed = employee.leaveBalance?.CompOff?.used || 0;
      const { payable, absent, cfRemain } = getPayableDays(empAttendance, compOffUsed, daysInMonth);

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
      rowData["Absent"] = absent;
      rowData["Holiday"] = getCount('H');
      rowData["CF"] = cfRemain;
      rowData["EL"] = getCount('EL');
      rowData["SL"] = getCount('SL');
      rowData["CL"] = getCount('CL');
      rowData["CompOff Used"] = compOffUsed;
      rowData["Payable Days"] = payable;

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
  
  return (
    <ManagerOpsLayout>
      <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        <div className="p-6">
          <div className={`rounded-2xl p-6 shadow-lg mb-6 ${
              theme === 'light' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-800' 
                : 'bg-gradient-to-r from-gray-700 to-gray-800'
            }`}>
              <h1 className="text-3xl font-bold text-white">Overall Attendance Summary</h1>
              <p className="text-white text-sm mt-2 opacity-90">
                View detailed attendance and leave summaries for all employees.
              </p>
            </div>
          <div className="flex gap-4 mb-6 items-center flex-wrap">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={`border rounded-lg p-2 min-w-[120px] ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
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
              className={`border rounded-lg p-2 min-w-[100px] ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
            >
              {[2025, 2024, 2023].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-4 mb-6 items-center flex-wrap">
            <button
              onClick={downloadExcel}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              title="Download as Excel"
            >
              <FaFileExcel /> Excel
            </button>
            <button
              onClick={downloadPDF}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              title="Download as PDF"
            >
              <FaFilePdf /> PDF
            </button>
          </div>

          <div className={`mb-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <h3 className="font-semibold mb-2">Attendance Legend:</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>P</span><span>Present</span></div>
              <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'}`}>A</span><span>Absent</span></div>
              <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>H</span><span>Holiday</span></div>
              <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>CF</span><span>Comp. Off</span></div>
              <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>EL/SL/CL</span><span>On Leave</span></div>
              <div className="flex items-center gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>-</span><span>Future</span></div>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : employees.length === 0 ? (
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
                    <th className="p-3 text-center font-semibold bg-yellow-600">EL</th>
                    <th className="p-3 text-center font-semibold bg-yellow-600">SL</th>
                    <th className="p-3 text-center font-semibold bg-yellow-600">CL</th>
                    <th className="p-3 text-center font-semibold bg-cyan-800">CompOff Used</th>
                    <th className="p-3 text-center font-semibold bg-blue-600">Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {employees.map((employee) => {
                    const empAttendance = attendanceData[employee.employeeId] || [];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysInMonth = getDaysInMonth(year, month);
                    const getCount = (status: string) => empAttendance.filter(a => {
                      const d = new Date(a.date);
                      d.setHours(0, 0, 0, 0);
                      return a.status === status && d <= today;
                    }).length;
                    let presentCount = getCount('P');
                    let holidayCount = getCount('H');
                    let elCount = getCount('EL');
                    let slCount = getCount('SL');
                    let clCount = getCount('CL');
                    let cfCount = getCount('CF');
                    let compOffUsed = employee.leaveBalance?.CompOff?.used || 0;
                    // For EFMS3254, set all counts to 0
                    if (employee.employeeId === "EFMS3254") {
                      presentCount = 0;
                      holidayCount = 0;
                      elCount = 0;
                      slCount = 0;
                      clCount = 0;
                      cfCount = 0;
                      compOffUsed = 0;
                    }
                    const { absent } = getPayableDays(empAttendance, compOffUsed, daysInMonth);
                    // Payable days = present + holiday + EL + SL + CL + all CF + CompOff Used
                    const payableDays = presentCount + holidayCount + elCount + slCount + clCount + cfCount + compOffUsed;

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
                          else if (['EL', 'SL', 'CL'].includes(status)) badgeColor = theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
                          else badgeColor = theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500';
                          
                          return (
                            <td key={i + 1} className="p-3 text-center font-semibold">
                              <span className={`inline-block rounded-full w-8 py-1 text-xs font-bold shadow-sm ${badgeColor}`}>{status || '-'}</span>
                            </td>
                          );
                        })}
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>{presentCount}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-red-900' : 'bg-red-100'}`}>{absent}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}>{holidayCount}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-cyan-900' : 'bg-cyan-100'}`}>{cfCount}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{elCount}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{slCount}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{clCount}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-cyan-900' : 'bg-cyan-100'}`}>{compOffUsed}</td>
                        <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>{payableDays}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ManagerOpsLayout>
  );
};

export default OverallAttendancePage;
