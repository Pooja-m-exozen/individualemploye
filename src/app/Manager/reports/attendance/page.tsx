"use client";

import React, { JSX, useEffect, useState } from "react";
import ManagerLayout from "@/components/dashboard/ManagerDashboardLayout";
import { useTheme } from "@/context/ThemeContext";
import { FaSpinner,  FaFilePdf, FaFileExcel, FaInfoCircle } from "react-icons/fa";
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
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

	return (
		<div className={`min-h-screen font-sans ${theme === "dark" ? "bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950" : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"}`}>
			<div className="p-6">
				{/* Header */}
				<div
					className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${
						theme === "dark"
							? "bg-[#323a48]"
							: "bg-gradient-to-r from-blue-500 to-blue-800"
					}`}
				>
					<div
						className={`$${
							theme === "dark" ? "bg-[#232a36]" : "bg-blue-600 bg-opacity-30"
						} rounded-xl p-4 flex items-center justify-center`}
					>
						<FaCalendarAlt className="w-10 h-10 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-white mb-1">
							Attendance Report
						</h1>
						<p className={theme === "dark" ? "text-blue-200 text-base" : "text-white text-base opacity-90"}>
							View and export attendance details for employees.
						</p>
					</div>
				</div>
				{/* Filters, Search, Export */}
				<div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-2 w-full md:flex-row md:items-center md:w-auto md:flex-wrap md:gap-2">
						<div className="relative w-full min-w-[140px] md:w-40">
							<select
								value={projectFilter}
								onChange={(e) => setProjectFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
							>
								<option value="All Projects">All Projects</option>
								{projectOptions.map((project) => (
									<option key={project} value={project}>
										{project}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full min-w-[130px] md:w-44">
							<select
								value={designationFilter}
								onChange={(e) => setDesignationFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
							>
								<option value="All Designations">All Designations</option>
								{designationOptions.map((designation) => (
									<option key={designation} value={designation}>
										{designation}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full min-w-[120px] md:w-40">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
							>
								<option value="All Statuses">All Statuses</option>
								{statusOptions.map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full min-w-[180px] max-w-full md:flex-1 md:max-w-xs">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Search employee name or ID..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end sm:items-center sm:w-auto">
						<button
							onClick={downloadExcel}
							className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center gap-2 justify-center transition-colors ${
								theme === "dark"
									? "bg-green-700 text-white hover:bg-green-800"
									: "bg-green-500 text-white hover:bg-green-600"
							}`}
						>
							<FaFileExport /> Export Excel
						</button>
						<button
							onClick={downloadPDF}
							className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center gap-2 justify-center transition-colors ${
								theme === "dark"
									? "bg-red-700 text-white hover:bg-red-800"
									: "bg-red-500 text-white hover:bg-red-600"
							}`}
						>
							<FaFileExport /> Export PDF
						</button>
					</div>
				</div>
				{/* Table */}
				<div
					className={`rounded-xl border shadow-xl ${
						theme === "dark" ? "border-gray-700 bg-gray-900" : "border-blue-100 bg-white"
					}`}
				>
					{loading ? (
						<div className="p-8 text-center text-blue-500">Loading...</div>
					) : error ? (
						<div className="p-8 text-center text-red-500">{error}</div>
					) : (
						<div className="overflow-x-auto max-h-[500px] overflow-y-auto">
							<table
								className={`min-w-[600px] sm:min-w-full divide-y ${
									theme === "dark" ? "divide-gray-700" : "divide-blue-100"
								}`}
							>
								<thead
									className={
										theme === "dark"
										? "bg-blue-950 sticky top-0 z-10"
										: "bg-blue-50 sticky top-0 z-10"
									}
								>
									<tr>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Employee ID</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Project</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Designation</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Date</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Status</th>
									</tr>
								</thead>
								<tbody
									className={
										theme === "dark"
										? "divide-y divide-gray-800"
										: "divide-y divide-blue-50"
									}
								>
									{paginatedRecords.length === 0 ? (
										<tr>
											<td colSpan={5} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No records found</td>
										</tr>
									) : (
										paginatedRecords.map((rec, idx) => (
											<tr key={rec._id || idx} className={theme === "dark" ? "hover:bg-blue-950 transition" : "hover:bg-blue-50 transition"}>
												<td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{rec.employeeId}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.projectName}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{designationMap[rec.employeeId] || "-"}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.date ? new Date(rec.date).toLocaleDateString() : "-"}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.status}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					)}
					{/* Pagination Controls */}
					{totalPages > 1 && (
						<div className="flex justify-end items-center gap-2 mt-4">
							<button
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								className="px-3 py-1 rounded bg-blue-500 text-white disabled:opacity-50"
							>
								Prev
							</button>
							<span className="px-2">Page {currentPage} of {totalPages}</span>
							<button
								disabled={currentPage === totalPages}
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								className="px-3 py-1 rounded bg-blue-500 text-white disabled:opacity-50"
							>
								Next
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}