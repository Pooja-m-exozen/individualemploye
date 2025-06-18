"use client";

import React, { JSX, useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { useTheme } from "@/context/ThemeContext";
import { FaSpinner } from "react-icons/fa";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";

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

interface MonthSummary {
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
}

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
const getAttendanceStatus = (date: Date, status?: string, punchInTime?: string): string => {
  if (isHoliday(date)) return 'H';
  return status === 'Present' && punchInTime ? 'P' : 'A';
};

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
        const data = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter((form: any) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: any) => ({
              employeeId: form.personalDetails.employeeId,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              imageUrl: form.personalDetails.employeeImage || "/default-avatar.png", // Corrected property for employee image
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
        const data = await response.json();
        
        const attendanceMap: Record<string, Attendance[]> = {};
        
        employees.forEach((employee) => {
          const employeeAttendance = data.attendance.filter((record: any) => 
            record.employeeId === employee.employeeId && 
            record.projectName === "Exozen - Ops"
          );

          const daysInMonth = new Date(year, month, 0).getDate();
          const monthAttendance: Attendance[] = [];

          for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            const dateString = currentDate.toISOString().split('T')[0];
            
            const dayRecord = employeeAttendance.find((record: any) => {
              const recordDate = new Date(record.date);
              return recordDate.getFullYear() === currentDate.getFullYear() &&
                     recordDate.getMonth() === currentDate.getMonth() &&
                     recordDate.getDate() === currentDate.getDate();
            });
            
            monthAttendance.push({
              date: dateString,
              status: getAttendanceStatus(currentDate, dayRecord?.status, dayRecord?.punchInTime),
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

  // Update the getStatusColor function
  const getStatusColor = (status: string, punchInTime?: string): string => {
    if (theme === 'dark') {
      if (status === 'P' && punchInTime) {
        return "bg-green-900 text-green-300 relative hover:bg-green-800";
      }
      if (status === 'A') {
        return "bg-red-900 text-red-300";
      }
      if (status === 'H') {
        return "bg-purple-900 text-purple-300";
      }
      return "bg-gray-700 text-gray-300";
    } else {
      if (status === 'P' && punchInTime) {
        return "bg-green-100 text-green-700 relative hover:bg-green-200";
      }
      if (status === 'A') {
        return "bg-red-100 text-red-700";
      }
      if (status === 'H') {
        return "bg-purple-100 text-purple-700";
      }
      return "bg-gray-100 text-gray-700";
    }
  };

  // Update the normalizeStatus function
  const normalizeStatus = (status: string): string => {
    return status === "Present" ? "P" : "A";
  };

  // Download functions
  const downloadPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = 10;

    // Company Header
    doc.setFontSize(24);
    doc.setTextColor(41, 128, 185);
    doc.text('EXOZEN', pageWidth / 2, 20, { align: 'center' });

    // Report Title
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('Monthly Attendance Report', pageWidth / 2, 30, { align: 'center' });
    
    // Period
    doc.setFontSize(12);
    doc.text(`${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`, pageWidth / 2, 35, { align: 'center' });

    // Generate Report Summary
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const summaryBox = {
      x: margins,
      y: 45,
      width: pageWidth - (margins * 2),
      height: 25
    };

    // Summary Box
    doc.setFillColor(247, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(summaryBox.x, summaryBox.y, summaryBox.width, summaryBox.height, 3, 3, 'FD');

    // Summary Content
    doc.text(`Total Employees: ${employees.length}`, margins + 5, summaryBox.y + 8);
    doc.text(`Working Days: ${getDaysInMonth(year, month)}`, margins + 5, summaryBox.y + 18);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, pageWidth - 60, summaryBox.y + 8);

    // Create table header with correct typing
    const daysInMonth = getDaysInMonth(year, month);
    const tableHeaders = [
      [
        { content: 'Emp ID', styles: { fillColor: [41, 128, 185] as [number, number, number], textColor: 255, fontStyle: 'bold' as const }},
        { content: 'Name', styles: { fillColor: [41, 128, 185] as [number, number, number], textColor: 255, fontStyle: 'bold' as const }},
        ...Array.from({ length: daysInMonth }, (_, i) => ({
          content: (i + 1).toString(),
          styles: { fillColor: [41, 128, 185] as [number, number, number], textColor: 255, fontStyle: 'bold' as const }
        })),
        { content: 'Present', styles: { fillColor: [41, 128, 185] as [number, number, number], textColor: 255, fontStyle: 'bold' as const }},
        { content: 'Absent', styles: { fillColor: [41, 128, 185] as [number, number, number], textColor: 255, fontStyle: 'bold' as const }},
        { content: 'Holiday', styles: { fillColor: [41, 128, 185] as [number, number, number], textColor: 255, fontStyle: 'bold' as const }}
      ]
    ];

    // Prepare table data with correct typing
    const tableData = employees.map(employee => {
      const employeeAttendance = attendanceData[employee.employeeId] || [];
      const presentCount = employeeAttendance.filter(a => a.status === 'P').length;
      const absentCount = employeeAttendance.filter(a => a.status === 'A').length;
      const holidayCount = employeeAttendance.filter(a => a.status === 'H').length;

      return [
        employee.employeeId,
        employee.fullName,
        ...employeeAttendance.map(record => ({
          content: record.status,
          styles: {
            fillColor: record.status === 'P' ? [232, 245, 233] as [number, number, number] : 
                      record.status === 'H' ? [237, 231, 246] as [number, number, number] : 
                      [253, 232, 232] as [number, number, number],
            textColor: record.status === 'P' ? [27, 94, 32] as [number, number, number] :
                      record.status === 'H' ? [94, 53, 177] as [number, number, number] :
                      [183, 28, 28] as [number, number, number]
          }
        })),
        presentCount.toString(),
        absentCount.toString(),
        holidayCount.toString()
      ];
    });

    // Generate table with typed configuration
    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: summaryBox.y + summaryBox.height + 10,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'middle',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [226, 232, 240] as [number, number, number]
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 }
      },
      headStyles: {
        fillColor: [41, 128, 185] as [number, number, number],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      margin: { left: margins, right: margins },
      didDrawPage: (data) => {
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

    // Add legend
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Legend box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(247, 250, 252);
    doc.roundedRect(margins, finalY, 80, 30, 2, 2, 'FD');

    // Legend items
    const legendItems = [
      { label: 'P - Present', color: [232, 245, 233], text: [27, 94, 32] },
      { label: 'A - Absent', color: [253, 232, 232], text: [183, 28, 28] },
      { label: 'H - Holiday', color: [237, 231, 246], text: [94, 53, 177] }
    ];

    legendItems.forEach((item, index) => {
      const yPos = finalY + 8 + (index * 8);
      // Legend box
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(margins + 5, yPos, 5, 5, 'F');
      // Legend text
      doc.setTextColor(item.text[0], item.text[1], item.text[2]);
      doc.setFontSize(8);
      doc.text(item.label, margins + 15, yPos + 4);
    });

    // Signature section
    const signatureY = pageHeight - 25;
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    
    // Signature lines
    doc.line(margins, signatureY, margins + 60, signatureY);
    doc.line(pageWidth - margins - 60, signatureY, pageWidth - margins, signatureY);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Authorized Signatory', margins, signatureY + 5);
    doc.text('HR Manager', pageWidth - margins - 60, signatureY + 5);

    doc.save(`Attendance_Report_${month}_${year}.pdf`);
  };

  const downloadExcel = () => {
    const worksheetData = employees.map((employee) => ({
      "Employee ID": employee.employeeId,
      "Employee Name": employee.fullName,
      ...Object.fromEntries(
        Array.from({ length: 31 }, (_, i) => {
          const date = new Date(year, month - 1, i + 1).toISOString().split("T")[0];
          const attendanceRecord = attendanceData[employee.employeeId]?.find(
            (record) => record.date === date
          );
          const status = attendanceRecord
            ? attendanceRecord.status
            : "A";
          return [
            new Date(year, month - 1, i + 1).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
            }),
            status,
          ];
        })
      ),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Overall Attendance");
    XLSX.writeFile(workbook, "Overall_Attendance_Report.xlsx");
  };

  // Add this helper function
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  return (
    <ManagerOpsLayout>
      <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        <div className="p-6">
          {/* Header */}
          <div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-blue-900 to-blue-700'
              : 'bg-gradient-to-r from-blue-500 to-blue-800'
          }`}>
            <h1 className="text-3xl font-bold text-white">Overall Attendance Report</h1>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
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
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
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
              {[2025, 2024, 2023].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Download Buttons */}
          <div className="flex justify-end gap-4 mb-6">
            <button
              onClick={downloadExcel}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Download Excel
            </button>
            <button
              onClick={downloadPDF}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Download PDF
            </button>
          </div>

          {/* Attendance Table */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className={`animate-spin ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              } w-12 h-12`} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full rounded-lg shadow-md overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'
              }`}>
                <thead className={`${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-gray-700 to-gray-600'
                    : 'bg-gradient-to-r from-blue-600 to-blue-800'
                } text-white`}>
                  <tr>
                    <th className="p-4 text-left font-semibold">Employee Image</th>
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
                      className={`border-b ${
                        theme === 'dark'
                          ? 'border-gray-700 hover:bg-gray-700 text-gray-200'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <td className={`p-4 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        <img
                          src={employee.imageUrl}
                          alt={employee.fullName}
                          className="w-12 h-12 rounded-full border border-gray-300"
                        />
                      </td>
                      <td className={`p-4 font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>{employee.employeeId}</td>
                      <td className={`p-4 font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>{employee.fullName}</td>
                      {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => {
                        const currentDate = new Date(year, month - 1, i + 1);
                        const dateString = currentDate.toISOString().split('T')[0];
                        const attendanceRecord = attendanceData[employee.employeeId]?.find(
                          (record) => record.date === dateString
                        );
                        const status = attendanceRecord?.status || 'A';
                        
                        return (
                          <td
                            key={i + 1}
                            className={`p-4 text-center ${getStatusColor(status, attendanceRecord?.punchInTime)} font-semibold relative group`}
                          >
                            <div className="flex flex-col items-center">
                              <span>{status}</span>
                              {attendanceRecord?.punchInTime && (
                                <div className={`hidden group-hover:block absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 p-2 rounded-md shadow-lg ${
                                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                                } w-48 text-xs`}>
                                  <p>In: {new Date(attendanceRecord.punchInTime).toLocaleTimeString()}</p>
                                  {attendanceRecord.punchOutTime && (
                                    <p>Out: {new Date(attendanceRecord.punchOutTime).toLocaleTimeString()}</p>
                                  )}
                                </div>
                              )}
                            </div>
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