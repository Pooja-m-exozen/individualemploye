"use client";

import React, { JSX, useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { useTheme } from "@/context/ThemeContext";
import { FaSpinner, FaClipboard,  FaFilePdf, FaFileExcel, FaInfoCircle, } from "react-icons/fa";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";
// import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
// import { Popover } from "@headlessui/react";
import Image from 'next/image';

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  imageUrl: string; // Added for employee image
}

interface Attendance {
  date: string;
  status: string;
  punchInTime?: string;
  punchOutTime?: string;
}

// interface MonthSummary {
//   totalDays: number;
//   presentDays: number;
//   halfDays: number;
//   partiallyAbsentDays: number;
//   weekOffs: number;
//   holidays: number;
//   el: number;
//   sl: number;
//   cl: number;
//   compOff: number;
//   lop: number;
// }

const GOVERNMENT_HOLIDAYS = [
  { date: '2024-01-26', description: 'Republic Day' },
  { date: '2024-08-15', description: 'Independence Day' },
  // Add more holidays as needed
];

const isSecondOrFourthSaturday = (date: Date): boolean => {
  if (date.getDay() !== 6) return false;
  const saturday = Math.floor((date.getDate() - 1) / 7) + 1;
  return saturday === 2 || saturday === 4;
};

const isHoliday = (date: Date): boolean => {
  const day = date.getDay();
  const dateString = date.toISOString().split('T')[0];
  
  // Check for Sunday
  if (day === 0) return true;
  
  // Check for 2nd and 4th Saturday
  if (isSecondOrFourthSaturday(date)) return true;
  
  // Check for government holidays
  return GOVERNMENT_HOLIDAYS.some(holiday => holiday.date === dateString);
};

// Update getAttendanceStatus function
const getAttendanceStatus = (date: Date, status?: string, punchInTime?: string, punchOutTime?: string): string => {
  if (isHoliday(date)) {
    // If it's a holiday but has both punch in and punch out, show CF
    if (punchInTime && punchOutTime) return 'CF';
    return 'H';
  }
  // Only show P if both punch in and punch out times are present
  return (status === 'Present' && punchInTime && punchOutTime) ? 'P' : 'A';
};

// Add this helper function for time formatting
// function formatTimeHMSS(dateString: string | undefined): string {
//   if (!dateString) return '';
//   const date = new Date(dateString);
//   const h = date.getHours();
//   const m = String(date.getMinutes()).padStart(2, '0');
//   const s = String(date.getSeconds()).padStart(2, '0');
//   return `${h}:${m}:${s}`;
// }

// Helper to extract time as H:mm:ss from a date string
// function extractTimeHMS(dateString: string | undefined): string {
//   if (!dateString) return '';
//   const date = new Date(dateString);
//   const h = date.getHours();
//   const m = String(date.getMinutes()).padStart(2, '0');
//   const s = String(date.getSeconds()).padStart(2, '0');
//   return `${h}:${m}:${s}`;
// }

// Helper to get week offs (Sundays and 2nd/4th Saturdays) for a month
type WeekOffType = 'sunday' | 'saturday';
const getWeekOffs = (year: number, month: number): { date: string, type: WeekOffType }[] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekOffs: { date: string, type: WeekOffType }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) {
      weekOffs.push({ date: date.toISOString().split('T')[0], type: 'sunday' });
    } else if (isSecondOrFourthSaturday(date)) {
      weekOffs.push({ date: date.toISOString().split('T')[0], type: 'saturday' });
    }
  }
  return weekOffs;
};

// Helper to get payable days (Present + Week Offs)
const getPayableDays = (attendance: Attendance[], year: number, month: number): number => {
  const presentDays = attendance.filter(a => a.status === 'P').length;
  const weekOffs = getWeekOffs(year, month).filter(wo => {
    // Only count as week off if not a government holiday
    return !GOVERNMENT_HOLIDAYS.some(h => h.date === wo.date);
  }).length;
  return presentDays + weekOffs;
};

// Enhanced base64 image helper with error handling and retries
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

// Helper to add logo to PDF with fallback
const addLogoToPDF = async (doc: jsPDF, x: number, y: number, width: number, height: number): Promise<void> => {
  try {
    // Try primary logo first
    const logoBase64 = await getBase64FromUrl("/v1/employee/exozen_logo1.png");
    doc.addImage(logoBase64, 'PNG', x, y, width, height);
  } catch  {
    console.warn('Failed to load primary logo, trying fallback logo');
    try {
      // Try fallback logo
      const fallbackLogoBase64 = await getBase64FromUrl('/exozen_logo.png');
      doc.addImage(fallbackLogoBase64, 'PNG', x, y, width, height);
    } catch (fallbackError) {
      console.error('Failed to load both logos:', fallbackError);
      // Add text placeholder if both logos fail
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('EXOZEN', x, y + height/2);
    }
  }
};

// Define types for KYC and Attendance API responses
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

const OverallAttendancePage = (): JSX.Element => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data: KycApiResponse = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter((form: KycForm) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: KycForm) => ({
              employeeId: form.personalDetails.employeeId,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              imageUrl: form.personalDetails.employeeImage || "/default-avatar.png",
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
    const fetchAttendance = async () => {
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
              status: getAttendanceStatus(currentDate, dayRecord?.status, dayRecord?.punchInTime, dayRecord?.punchOutTime),
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

    if (employees.length > 0) {
      fetchAttendance();
    }
  }, [employees, month, year]);

  // // Update the getStatusColor function
  // const getStatusColor = (status: string, punchInTime?: string): string => {
  //   if (theme === 'dark') {
  //     if (status === 'P' && punchInTime) {
  //       return "bg-green-900 text-green-300 relative hover:bg-green-800";
  //     }
  //     if (status === 'A') {
  //       return "bg-red-900 text-red-300";
  //     }
  //     if (status === 'H') {
  //       return "bg-purple-900 text-purple-300";
  //     }
  //     return "bg-gray-700 text-gray-300";
  //   } else {
  //     if (status === 'P' && punchInTime) {
  //       return "bg-green-100 text-green-700 relative hover:bg-green-200";
  //     }
  //     if (status === 'A') {
  //       return "bg-red-100 text-red-700";
  //     }
  //     if (status === 'H') {
  //       return "bg-purple-100 text-purple-700";
  //     }
  //     return "bg-gray-100 text-gray-700";
  //   }
  // };

  // // Update the normalizeStatus function
  // const normalizeStatus = (status: string): string => {
  //   return status === "Present" ? "P" : "A";
  // };

  // Download functions
  const downloadPDF = async () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = 10;
    let yPosition = 12;
    const logoWidth = 60;
    const logoHeight = 25;
    const logoX = (pageWidth - logoWidth) / 2;
    await addLogoToPDF(doc, logoX, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 6;

    // Report Title
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('Monthly Attendance Report', pageWidth / 2, yPosition + 8, { align: 'center' });

    // Period
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`, pageWidth / 2, yPosition + 18, { align: 'center' });

    // Remove summary box from PDF (no summaryBox, no doc.roundedRect, no doc.text for summary)
    // Table headers
    const daysInMonth = getDaysInMonth(year, month);
    const tableHeaders = [
      [
        'Emp ID',
        'Name',
        ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()),
        'Present',
        'Absent',
        'Holiday',
        'Payable Days',
      ]
    ];

    // Table data with payable days calculation and CF logic
    const tableData = employees.map(employee => {
      const employeeAttendance = attendanceData[employee.employeeId] || [];
      const presentCount = employeeAttendance.filter(a => a.status === 'P').length;
      const absentCount = employeeAttendance.filter(a => a.status === 'A').length;
      const holidayCount = employeeAttendance.filter(a => a.status === 'H').length;
      const payableDays = getPayableDays(employeeAttendance, year, month);
      return [
        employee.employeeId,
        employee.fullName,
        ...employeeAttendance.map(record => {
          const fillColor: [number, number, number] = record.status === 'P'
            ? [232, 245, 233]
            : record.status === 'H'
              ? [237, 231, 246]
              : record.status === 'CF'
                ? [255, 249, 196]
                : [253, 232, 232];
          const textColor: [number, number, number] = record.status === 'P'
            ? [27, 94, 32]
            : record.status === 'H'
              ? [94, 53, 177]
              : record.status === 'CF'
                ? [255, 152, 0]
                : [183, 28, 28];
          if (['P', 'A', 'H', 'CF'].includes(record.status)) {
            return {
              content: record.status,
              styles: {
                fillColor,
                textColor,
                fontStyle: 'bold' as const,
              }
            };
          } else {
            return record.status;
          }
        }),
        presentCount.toString(),
        absentCount.toString(),
        holidayCount.toString(),
        payableDays.toString(),
      ];
    });

    // Generate table with improved styling
    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: yPosition + 28, // Add space after period
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'middle',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 }
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      margin: { left: margins, right: margins },
      didDrawPage: (data) => {
        // Add page number
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth - margins,
          pageHeight - 5,
          { align: 'right' }
        );
      }
    });

    // Signature section with improved styling
    const signatureY = pageHeight - 25;
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.line(margins, signatureY, margins + 60, signatureY);
    doc.line(pageWidth - margins - 60, signatureY, pageWidth - margins, signatureY);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Authorized Signatory', margins, signatureY + 5);
    doc.text('HR Manager', pageWidth - margins - 60, signatureY + 5);

    // Save with proper naming
    const fileName = `Attendance_Report_${new Date(year, month - 1).toLocaleString('default', { month: 'long' })}_${year}.pdf`;
    doc.save(fileName);
  };
  const downloadExcel = () => {
    const worksheetData = employees.map((employee) => {
      const employeeAttendance = attendanceData[employee.employeeId] || [];
      const presentCount = employeeAttendance.filter(a => a.status === 'P').length;
      const absentCount = employeeAttendance.filter(a => a.status === 'A').length;
      const holidayCount = employeeAttendance.filter(a => a.status === 'H').length;
      const payableDays = getPayableDays(employeeAttendance, year, month);

      return {
        "Employee ID": employee.employeeId,
        "Employee Name": employee.fullName,
        ...Object.fromEntries(
          Array.from({ length: getDaysInMonth(year, month) }, (_, i) => {
            const date = new Date(year, month - 1, i + 1).toISOString().split("T")[0];
            const attendanceRecord = employeeAttendance.find(
              (record) => record.date === date
            );
            // Use the same logic as getAttendanceStatus for CF
            const status = attendanceRecord ? attendanceRecord.status : "A";
            return [
              new Date(year, month - 1, i + 1).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "short",
              }),
              status,
            ];
          })
        ),
        "Present Days": presentCount,
        "Absent Days": absentCount,
        "Holidays": holidayCount,
        "Payable Days": payableDays,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Overall Attendance");
    XLSX.writeFile(workbook, "Overall_Attendance_Report.xlsx");
  };

  // Add this helper function
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  // Enhanced Loading State
  const LoadingSkeleton = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
      <span className="text-lg text-gray-500 dark:text-gray-300">Loading attendance data...</span>
    </div>
  );

  // Empty State
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
          {/* Header */}
          <div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-gray-800 to-gray-700'
              : 'bg-gradient-to-r from-blue-500 to-blue-800'
          }`}>
            <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
              <FaClipboard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Overall Attendance Report
              </h1>
              <p className="text-white text-base opacity-90">
                View and analyze attendance records for all employees
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6 items-center flex-wrap">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={`border rounded-lg p-2 min-w-[120px] ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-black border-gray-300'
              }`}
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
              className={`border rounded-lg p-2 min-w-[100px] ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-black border-gray-300'
              }`}
            >
              {[2025, 2024, 2023].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            
          </div>

          {/* Download Buttons */}
          <div className="flex justify-end gap-4 mb-6 items-center flex-wrap">
            {/* <span className="font-medium text-gray-600 dark:text-gray-300 mr-2">Download:</span> */}
            <button
              onClick={downloadExcel}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              title="Download as Excel"
            >
              <FaFileExcel />
              Excel
            </button>
            <button
              onClick={downloadPDF}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              title="Download as PDF"
            >
              <FaFilePdf />
              PDF
            </button>
          </div>

          {/* Attendance Table */}
          {loading ? (
            <LoadingSkeleton />
          ) : employees.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
              <table className={`w-full min-w-[900px] rounded-lg overflow-hidden text-sm ${
                theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'
              }`}>
                <thead className={`sticky top-0 z-10 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-gray-700 to-gray-600'
                    : 'bg-gradient-to-r from-blue-600 to-blue-800'
                } text-white`}>
                  <tr>
                    <th className="p-4 text-left font-semibold sticky left-0 bg-inherit z-20">Employee Image</th>
                    <th className="p-4 text-left font-semibold">Employee ID</th>
                    <th className="p-4 text-left font-semibold">Employee Name</th>
                    {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => (
                      <th key={i + 1} className="p-4 text-center font-semibold">
                        {new Date(year, month - 1, i + 1).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr 
                      key={employee.employeeId} 
                      className={`border-b transition-colors duration-150 ${
                        theme === 'dark'
                          ? 'border-gray-700 hover:bg-gray-700 text-gray-200'
                          : 'hover:bg-blue-50 text-gray-700'
                      }`}
                    >
                      <td className={`p-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} sticky left-0 bg-inherit z-10`}>
                        <Image
                          src={employee.imageUrl}
                          alt={employee.fullName}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full border border-gray-300 hover:ring-2 hover:ring-blue-400 transition-all"
                        />
                      </td>
                      <td className={`p-4 font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{employee.employeeId}</td>
                      <td className={`p-4 font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{employee.fullName}</td>
                      {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => {
                        const currentDate = new Date(year, month - 1, i + 1);
                        const dateString = currentDate.toISOString().split('T')[0];
                        const attendanceRecord = attendanceData[employee.employeeId]?.find(
                          (record) => record.date === dateString
                        );
                        let status = attendanceRecord?.status || 'A';
                        // If holiday and has punch in/out, show CF
                        if (status === 'H' && attendanceRecord?.punchInTime && attendanceRecord?.punchOutTime) {
                          status = 'CF';
                        }
                        // Badge color
                        let badgeColor = '';
                        if (status === 'P') badgeColor = theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700';
                        else if (status === 'A') badgeColor = theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700';
                        else if (status === 'H') badgeColor = theme === 'dark' ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700';
                        else if (status === 'CF') badgeColor = theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
                        else badgeColor = theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
                        return (
                          <td
                            key={i + 1}
                            className={`p-2 text-center font-semibold relative group`}
                          >
                            <span className={`inline-block rounded-full px-2 py-1 text-xs font-bold shadow-sm ${badgeColor}`}>{status}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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