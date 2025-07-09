"use client";
import React, { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaClock, FaChevronDown, FaChevronRight, FaSearch, FaDownload } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

interface MonthlyHoursReport {
  employeeId: string;
  month: number;
  year: number;
  summary: {
    totalDays: number;
    present: number;
    absent: number;
    leaves: {
      total: number;
      el: number;
      sl: number;
      cl: number;
    };
    halfDays: number;
    weekOffs: number;
    holidays: number;
    requiredHours: number;
    workedHours: number;
    otHours: number;
    lopHours: number;
  };
  details: Array<{
    date: string;
    status: string;
    hoursWorked: number;
    otHours?: number;
    lopShortage?: number;
    leaveType?: string;
    type?: string;
  }>;
  dailyDetails?: Array<{
    date: string;
    status: string;
    type: string;
    hoursWorked: number;
    otHours?: number;
    lopShortage?: number;
    leaveType?: string;
  }>;
  presentDays?: number;
  absentDays?: number;
  totalWorkedHours?: number;
  totalOTHours?: number;
  totalRequiredHours?: number;
  remainingOTHours?: number;
  totalDays?: number;
  totalWorkingDays?: number;
  weekOffs?: number;
  leaves?: {
    halfDayLeaves: number;
    fullDayLeaves: number;
  };
  rawLopHours?: number;
  otHoursMatchedToLOP?: number;
}

interface KycEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
}

// Define a type for daily details
interface DailyDetail {
  date: string;
  status: string;
  type?: string;
  hoursWorked: number;
  otHours?: number;
  lopShortage?: number;
  leaveType?: string;
}

// Helper to format decimal hours as 'X hr Y min'
function formatHours(decimal: number | undefined | null): string {
  if (decimal == null || isNaN(decimal)) return '-';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (hours === 0 && minutes === 0) return '0 min';
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export default function HourlyAttendancePage() {
  const { theme } = useTheme();
  const [kycEmployees, setKycEmployees] = useState<KycEmployee[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [reports, setReports] = useState<Record<string, MonthlyHoursReport | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [modalProject, setModalProject] = useState<string>("");
  const [modalSearch, setModalSearch] = useState<string>("");
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // Export to Excel
  const handleExportToExcel = async () => {
    const XLSX = await import('xlsx');
    const exportData = filteredEmployees.map(emp => {
      const report = reports[emp.employeeId];
      return {
        EmployeeID: emp.employeeId,
        Name: emp.fullName,
        Project: emp.projectName,
        'Total Days': report?.totalDays ?? '-',
        'Working Days': report?.totalWorkingDays ?? '-',
        'Week Off': report?.weekOffs ?? '-',
        'Present Days': report?.presentDays ?? '-',
        'Half Day': report?.leaves?.halfDayLeaves ?? '-',
        'Leaves': report?.leaves?.fullDayLeaves ?? '-',
        'LOP Hours': formatHours(report?.rawLopHours),
        'OT Hours': formatHours(report?.totalOTHours),
        'OT Hours Matched to LOP': formatHours(report?.otHoursMatchedToLOP),
        'Required Hours': formatHours(report?.totalRequiredHours),
        'Worked Hours': formatHours(report?.totalWorkedHours),
        'Remaining OT Hours': formatHours(report?.remainingOTHours),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hourly Attendance');
    XLSX.writeFile(workbook, 'hourly_attendance.xlsx');
  };

  // Export to PDF
  const handleExportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.text('Hourly Based Attendance', 14, 16);
    const exportData = filteredEmployees.map(emp => {
      const report = reports[emp.employeeId];
      return [
        emp.employeeId,
        emp.fullName,
        emp.projectName,
        report?.totalDays ?? '-',
        report?.totalWorkingDays ?? '-',
        report?.weekOffs ?? '-',
        report?.presentDays ?? '-',
        report?.leaves?.halfDayLeaves ?? '-',
        report?.leaves?.fullDayLeaves ?? '-',
        formatHours(report?.rawLopHours),
        formatHours(report?.totalOTHours),
        formatHours(report?.otHoursMatchedToLOP),
        formatHours(report?.totalRequiredHours),
        formatHours(report?.totalWorkedHours),
        formatHours(report?.remainingOTHours),
      ];
    });
    autoTable(doc, {
      head: [[
        'EmployeeID', 'Name', 'Project', 'Total Days', 'Working Days', 'Week Off', 'Present Days', 'Half Day', 'Leaves', 'LOP Hours', 'OT Hours', 'OT Hours Matched to LOP', 'Required Hours', 'Worked Hours', 'Remaining OT Hours'
      ]],
      body: exportData,
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save('hourly_attendance.pdf');
  };

  // Fetch KYC employees for dropdown
  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/kyc")
      .then(res => res.json())
      .then(data => {
        type KycForm = { personalDetails: { employeeId: string; fullName: string; designation: string; projectName: string } };
        const employees = (data.kycForms || []).map((form: KycForm) => ({
          employeeId: form.personalDetails.employeeId,
          fullName: form.personalDetails.fullName,
          designation: form.personalDetails.designation,
          projectName: form.personalDetails.projectName,
        }));
        setKycEmployees(employees);
      });
  }, []);

  // Fetch monthly hours report for all employees
  useEffect(() => {
    if (kycEmployees.length === 0) return;
    setLoading(true);
    setError("");
    Promise.all(
      kycEmployees.map(emp =>
        fetch(`https://cafm.zenapi.co.in/api/attendance/${emp.employeeId}/monthly-hours-report?month=${selectedMonth}&year=${selectedYear}`)
          .then(res => res.json())
          .then(data => ({ id: emp.employeeId, data: data.success && data.data ? data.data : null }))
          .catch(() => ({ id: emp.employeeId, data: null }))
      )
    ).then(results => {
      const map: Record<string, MonthlyHoursReport | null> = {};
      results.forEach(r => { map[r.id] = r.data; });
      setReports(map);
      setLoading(false);
    }).catch(() => {
      setError('Failed to fetch hourly reports');
      setLoading(false);
    });
  }, [kycEmployees, selectedMonth, selectedYear]);

  const uniqueProjects: string[] = Array.from(new Set(kycEmployees.map((row: KycEmployee) => row.projectName)));

  // Filter employees by project and search
  const filteredEmployees = kycEmployees.filter(emp => {
    const matchesProject = selectedProject ? emp.projectName === selectedProject : true;
    const matchesSearch = searchQuery
      ? emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesProject && matchesSearch;
  });

  return (
    <AdminDashboardLayout>
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-0 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
          <div className="flex items-center gap-6">
            <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
              <FaClock className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Hourly Based Attendance</h1>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto relative">
            <button
              type="button"
              className={`p-2 rounded-lg border-none shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 hover:bg-blue-900' : 'bg-white/80 text-blue-900 hover:bg-blue-100 focus:ring-white'}`}
              title="Filter"
              onClick={() => {
                setModalProject(selectedProject);
                setModalSearch(searchQuery);
                setFilterModalOpen(true);
              }}
            >
              <FaSearch className="w-5 h-5" />
            </button>
            {/* Download Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-label="Download options"
                className={`p-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-blue-600 text-white focus:ring-blue-300'}`}
                onClick={() => setShowDownloadDropdown(v => !v)}
              >
                <FaDownload className="w-5 h-5" />
              </button>
              {showDownloadDropdown && (
                <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-[999] py-2 ${theme === 'dark' ? 'bg-[#232b3a] text-blue-100' : 'bg-white text-gray-900'}`}>
                  <div className="flex justify-end px-2 pb-1">
                    <button
                      aria-label="Close download menu"
                      className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                      onClick={() => setShowDownloadDropdown(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-t-xl"
                    onClick={() => { setShowDownloadDropdown(false); handleExportToExcel(); }}
                  >
                    <FaDownload className="w-4 h-4" /> Export to Excel
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-b-xl"
                    onClick={() => { setShowDownloadDropdown(false); handleExportToPDF(); }}
                  >
                    <FaDownload className="w-4 h-4" /> Export to PDF
                  </button>
                </div>
              )}
            </div>
            {/* End Download Dropdown */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              {[2025, 2024, 2023].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
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
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Filter Hourly Attendance</h2>
              <div className="mb-4">
                <label className="block mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Project</label>
                <select
                  value={modalProject}
                  onChange={e => setModalProject(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">All Projects</option>
                  {uniqueProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label className="block mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Search</label>
                <input
                  type="text"
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Search by name or ID"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    setSelectedProject(modalProject);
                    setSearchQuery(modalSearch);
                    setFilterModalOpen(false);
                  }}
                >
                  Apply
                </button>
                <button
                  className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                  onClick={() => {
                    setModalProject("");
                    setModalSearch("");
                    setSelectedProject("");
                    setSearchQuery("");
                    setFilterModalOpen(false);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-8">
          {loading && <div className="text-center text-blue-600 dark:text-blue-300 font-semibold">Loading...</div>}
          {error && <div className="text-center text-red-600 dark:text-red-300 font-semibold">{error}</div>}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-md" style={{ maxHeight: '60vh' }}>
            <table className="w-full min-w-[1000px] rounded-lg overflow-hidden text-sm">
              <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm' : 'bg-blue-600/90 backdrop-blur-sm'} text-white`}>
                <tr>
                  <th className="py-3 px-4 text-left font-semibold"></th>
                  <th className="py-3 px-4 text-left font-semibold">Employee</th>
                  <th className="py-3 px-4 text-left font-semibold">Project</th>
                  <th className="py-3 px-4 text-center font-semibold">Total Days</th>
                  <th className="py-3 px-4 text-center font-semibold">Working Days</th>
                  <th className="py-3 px-4 text-center font-semibold">Week Off</th>
                  <th className="py-3 px-4 text-center font-semibold">Present Days</th>
                  <th className="py-3 px-4 text-center font-semibold">Half Day</th>
                  <th className="py-3 px-4 text-center font-semibold">Leaves</th>
                  <th className="py-3 px-4 text-center font-semibold">LOP Hours</th>
                  <th className="py-3 px-4 text-center font-semibold">OT Hours</th>
                  <th className="py-3 px-4 text-center font-semibold">OT Hours Matched to LOP</th>
                  <th className="py-3 px-4 text-center font-semibold">Required Hours</th>
                  <th className="py-3 px-4 text-center font-semibold">Worked Hours</th>
                  <th className="py-3 px-4 text-center font-semibold">Remaining OT Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map(emp => {
                  const report = reports[emp.employeeId];
                  const isExpanded = expandedRows[emp.employeeId];
                  return (
                    <React.Fragment key={emp.employeeId}>
                      <tr>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => setExpandedRows(r => ({ ...r, [emp.employeeId]: !r[emp.employeeId] }))}
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            className="focus:outline-none"
                          >
                            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                          </button>
                        </td>
                        <td className="py-2 px-4 font-bold">{emp.fullName} <span className="text-xs text-gray-400">({emp.employeeId})</span></td>
                        <td className="py-2 px-4">{emp.projectName}</td>
                        <td className="py-2 px-4 text-center">{report?.totalDays ?? '-'}</td>
                        <td className="py-2 px-4 text-center">{report?.totalWorkingDays ?? '-'}</td>
                        <td className="py-2 px-4 text-center">{report?.weekOffs ?? '-'}</td>
                        <td className="py-2 px-4 text-center">{report?.presentDays ?? '-'}</td>
                        <td className="py-2 px-4 text-center">{report?.leaves?.halfDayLeaves ?? '-'}</td>
                        <td className="py-2 px-4 text-center">{report?.leaves?.fullDayLeaves ?? '-'}</td>
                        <td className="py-2 px-4 text-center whitespace-nowrap align-middle">{formatHours(report?.rawLopHours)}</td>
                        <td className="py-2 px-4 text-center whitespace-nowrap align-middle">{formatHours(report?.totalOTHours)}</td>
                        <td className="py-2 px-4 text-center whitespace-nowrap align-middle">{formatHours(report?.otHoursMatchedToLOP)}</td>
                        <td className="py-2 px-4 text-center whitespace-nowrap align-middle">{formatHours(report?.totalRequiredHours)}</td>
                        <td className="py-2 px-4 text-center whitespace-nowrap align-middle">{formatHours(report?.totalWorkedHours)}</td>
                        <td className="py-2 px-4 text-center whitespace-nowrap align-middle">{formatHours(report?.remainingOTHours)}</td>
                      </tr>
                      {isExpanded && report && (report.dailyDetails || report.details) && (
                        <tr>
                          <td colSpan={16} className="bg-gray-50 dark:bg-gray-900 p-0">
                            <div className="overflow-x-auto my-2 mx-2 rounded-2xl border border-blue-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">
                              <table className="w-full min-w-[900px] text-xs rounded-2xl overflow-hidden">
                                <thead className={theme === 'dark' ? 'bg-gray-800 text-blue-100 sticky top-0 z-10' : 'bg-blue-100 text-blue-900 sticky top-0 z-10'}>
                                  <tr>
                                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                                    <th className="py-3 px-4 text-center font-semibold">Status</th>
                                    <th className="py-3 px-4 text-center font-semibold">Type</th>
                                    <th className="py-3 px-4 text-center font-semibold">Hours Worked</th>
                                    <th className="py-3 px-4 text-center font-semibold">OT Hours</th>
                                    <th className="py-3 px-4 text-center font-semibold">LOP Shortage</th>
                                    <th className="py-3 px-4 text-center font-semibold">Leave Type</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(report.dailyDetails || report.details || []).map((day: DailyDetail, idx: number) => (
                                    <tr key={idx} className={idx % 2 === 0 ? (theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50') : ''}>
                                      <td className="py-2 px-4 align-middle whitespace-nowrap">{day.date}</td>
                                      <td className="py-2 px-4 text-center align-middle whitespace-nowrap">{day.status}</td>
                                      <td className="py-2 px-4 text-center align-middle whitespace-nowrap">{day.type || '-'}</td>
                                      <td className="py-2 px-4 text-center align-middle whitespace-nowrap">{formatHours(day.hoursWorked)}</td>
                                      <td className="py-2 px-4 text-center align-middle whitespace-nowrap">{formatHours(day.otHours)}</td>
                                      <td className="py-2 px-4 text-center align-middle whitespace-nowrap">{formatHours(day.lopShortage)}</td>
                                      <td className="py-2 px-4 text-center align-middle whitespace-nowrap">{day.leaveType ?? '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}