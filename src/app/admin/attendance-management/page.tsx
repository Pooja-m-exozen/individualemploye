"use client";
import React, { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaClock, FaDownload } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from 'next/image';

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  projectName: string;
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
  status: string;
}

// Add new types for project-wise API
// interface ProjectEmployee {
//   employeeId: string;
//   name: string;
//   designation: string;
// }
interface ProjectAttendanceRecord {
  _id: { employeeId: string; date: string };
  status: string;
  employeeId: string;
  date: string;
  name: string;
  designation: string;
  punchInTime?: string;
  punchOutTime?: string;
  punchInPhoto?: string;
  punchOutPhoto?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  projectName: string;
  punchInLocation?: LocationDetail;
  punchOutLocation?: LocationDetail;
}

// API response types
interface AttendanceApiResponse {
  attendance: AttendanceRecord[];
}

// Add KYC employee type
interface KycEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
}

// Add KYC form type for API response
interface KycForm {
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
    // ...other fields if needed
  };
  // ...other fields if needed
}

// Add LocationDetail type
interface LocationDetail {
  latitude: number;
  longitude: number;
  address: string | null;
}

export default function AttendanceViewPage() {
  const { theme } = useTheme();
  const [activeTab] = useState("Project Wise Attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [projectAttendance, setProjectAttendance] = useState<ProjectAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ProjectAttendanceRecord | null>(null);
  const [kycEmployees, setKycEmployees] = useState<KycEmployee[]>([]);
  const [selectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [showDownloadDropdown, setShowDownloadDropdown] = React.useState(false);

  // Fetch attendance data from API
  const fetchAttendance = async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/attendance/all");
      const data: AttendanceApiResponse = await res.json();
      if (data && data.attendance) {
        setAttendanceData(data.attendance);
      } else {
        setAttendanceData([]);
      }
    } catch  {
      setError("Failed to fetch attendance data");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch KYC employees and project options
  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/kyc")
      .then(res => res.json())
      .then(data => {
        const employees = (data.kycForms || []).map((form: KycForm) => ({
          employeeId: form.personalDetails.employeeId,
          fullName: form.personalDetails.fullName,
          designation: form.personalDetails.designation,
          projectName: form.personalDetails.projectName,
        }));
        setKycEmployees(employees);
      });
  }, []);

  // Helper: enrich attendance records with punchInLocation and punchOutLocation
  const enrichWithLocations = (data: ProjectAttendanceRecord[]): ProjectAttendanceRecord[] => {
    return data.map(record => ({
      ...record,
      punchInLocation: record.punchInLatitude && record.punchInLongitude
        ? {
            latitude: record.punchInLatitude,
            longitude: record.punchInLongitude,
            address: null
          }
        : undefined,
      punchOutLocation: record.punchOutLatitude && record.punchOutLongitude
        ? {
            latitude: record.punchOutLatitude,
            longitude: record.punchOutLongitude,
            address: null
          }
        : undefined
    }));
  };

  // Fetch attendance for all employees in selected project/month/year
  useEffect(() => {
    if (activeTab !== "Project Wise Attendance" || !projectFilter) return;
    setLoading(true);
    const employeesInProject = kycEmployees.filter(e => e.projectName === projectFilter);
    Promise.all(
      employeesInProject.map(emp =>
        fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${emp.employeeId}&month=${selectedMonth}&year=${selectedYear}`)
          .then(res => res.json())
          .then(data => enrichWithLocations((data.attendance || []).map((att: ProjectAttendanceRecord) => ({
            ...att,
            name: emp.fullName,
            designation: emp.designation,
            projectName: att.projectName,
            punchInPhoto: att.punchInPhoto,
            punchOutPhoto: att.punchOutPhoto,
            punchInLatitude: att.punchInLatitude,
            punchInLongitude: att.punchInLongitude,
            punchOutLatitude: att.punchOutLatitude,
            punchOutLongitude: att.punchOutLongitude,
          })))
        )
      )
    ).then(results => {
      setProjectAttendance(results.flat());
      setLoading(false);
    });
  }, [activeTab, projectFilter, selectedMonth, selectedYear, kycEmployees]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Set default project to 'Exozen-Ops' when switching to Project Wise Attendance
  useEffect(() => {
    if (activeTab === "Project Wise Attendance" && !projectFilter) {
      if (uniqueProjects.length > 0) {
        setProjectFilter(uniqueProjects[0]);
      }
    }
    // eslint-disable-next-line
  }, [activeTab, attendanceData]);

  // Helper to extract UTC time (HH:mm:ss) from ISO string
  const getUtcTimeOnly = (isoString?: string): string => {
    if (!isoString) return 'N/A';
    const match = isoString.match(/T(\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : 'N/A';
  };

  // Add back formatDate helper
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Unique projects for filter dropdown
  const uniqueProjects: string[] = Array.from(new Set(kycEmployees.map((row: KycEmployee) => row.projectName)));

  // Helper: filter projectAttendance by search, fromDate, toDate
  const filterProjectAttendance = () => {
    const searchLower = searchQuery.toLowerCase();
    return projectAttendance.filter((row) => {
      const matchesProject = projectFilter === 'all' || row.projectName === projectFilter;
      const matchesSearch =
        row.employeeId.toLowerCase().includes(searchLower) ||
        (row.name && row.name.toLowerCase().includes(searchLower)) ||
        (row.designation && row.designation.toLowerCase().includes(searchLower)) ||
        (row.date && new Date(row.date).toLocaleDateString().includes(searchLower));
      return matchesProject && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredProjectAttendance = filterProjectAttendance();

  // Add a helper to fetch address from lat/lng using reverse geocoding
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const apiKey = 'AIzaSyCqvcEKoqwRG5PBDIVp-MjHyjXKT3s4KY4'; // Use your Google Maps API key
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results?.[0]) {
        return data.results[0].formatted_address;
      }
      return 'Location not found';
    } catch {
      return 'Error fetching location';
    }
  };

  const fetchAllAddresses = async (records: ProjectAttendanceRecord[]) => {
    const getAddress = async (lat?: number, lng?: number) => {
      if (!lat || !lng) return 'N/A';
      return await reverseGeocode(lat, lng);
    };
    const results = await Promise.all(records.map(async (record) => {
      const punchInAddress = record.punchInLatitude && record.punchInLongitude
        ? await getAddress(record.punchInLatitude, record.punchInLongitude)
        : 'N/A';
      const punchOutAddress = record.punchOutLatitude && record.punchOutLongitude
        ? await getAddress(record.punchOutLatitude, record.punchOutLongitude)
        : 'N/A';
      return {
        ...record,
        punchInResolvedAddress: punchInAddress,
        punchOutResolvedAddress: punchOutAddress,
      };
    }));
    return results;
  };

  const handleExportLocationPDF = async () => {
    // Filter records for the current view (project wise attendance)
    const recordsWithAddresses = await fetchAllAddresses(filteredProjectAttendance);
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    let yPosition = 15;
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text('Attendance Location Report', 14, yPosition);
    yPosition += 8;
    const tableHead = [['Date', 'Check-in Location', 'Check-out Location']];
    const tableRows = recordsWithAddresses.map(record => [
      record.date ? new Date(record.date).toLocaleDateString() : 'N/A',
      record.punchInResolvedAddress,
      record.punchOutResolvedAddress
    ]);
    autoTable(doc, {
      head: tableHead,
      body: tableRows,
      startY: yPosition,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 70 },
        2: { cellWidth: 70 }
      },
      margin: { left: 15 }
    });
    doc.save('location_report.pdf');
  };

  // Update handleRowClick to set address on selectedRecord's punchInLocation and punchOutLocation
  const handleRowClick = async (record: ProjectAttendanceRecord) => {
    const updatedRecord = { ...record };
    if (record.punchInLatitude && record.punchInLongitude) {
      const address = await reverseGeocode(record.punchInLatitude, record.punchInLongitude);
      updatedRecord.punchInLocation = {
        latitude: record.punchInLatitude,
        longitude: record.punchInLongitude,
        address,
      };
    }
    if (record.punchOutLatitude && record.punchOutLongitude) {
      const address = await reverseGeocode(record.punchOutLatitude, record.punchOutLongitude);
      updatedRecord.punchOutLocation = {
        latitude: record.punchOutLatitude,
        longitude: record.punchOutLongitude,
        address,
      };
    }
    setSelectedRecord(updatedRecord);
  };

  const handleExportToExcel = async () => {
    const XLSX = await import('xlsx');
    const exportData = filteredProjectAttendance.map(row => ({
      EmployeeID: row.employeeId,
      Name: row.name,
      Designation: row.designation,
      Project: row.projectName,
      Date: row.date ? new Date(row.date).toLocaleDateString() : 'N/A',
      PunchInTime: row.punchInTime ? row.punchInTime.replace(/\.\d{3}Z$/, '') : '',
      PunchOutTime: row.punchOutTime ? row.punchOutTime.replace(/\.\d{3}Z$/, '') : '',
      Status: row.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Attendance');
    XLSX.writeFile(workbook, 'project_attendance.xlsx');
  };

  const handleExportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    // Helper to calculate hours worked
    const calcHoursWorked = (inTime?: string, outTime?: string) => {
      if (!inTime || !outTime) return '';
      const inDate = new Date(inTime);
      const outDate = new Date(outTime);
      if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return '';
      let diff = (outDate.getTime() - inDate.getTime()) / 1000; // seconds
      if (diff < 0) diff += 24 * 3600; // handle overnight
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      return `${hours}h ${mins}m`;
    };

    const exportData = filteredProjectAttendance.map(row => ([
      row.employeeId,
      row.name,
      row.designation,
      row.projectName,
      row.date ? new Date(row.date).toLocaleDateString() : 'N/A',
      row.punchInTime ? row.punchInTime.slice(11, 19) : 'N/A',
      row.punchOutTime ? row.punchOutTime.slice(11, 19) : 'N/A',
      calcHoursWorked(row.punchInTime, row.punchOutTime),
      row.status,
    ]));

    doc.text('Project Wise Attendance', 14, 16);
    autoTable(doc, {
      head: [[
        'EmployeeID',
        'Name',
        'Designation',
        'Project',
        'Date',
        'PunchInTime',
        'PunchOutTime',
        'Total Hours Worked',
        'Status',
      ]],
      body: exportData,
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save('project_attendance.pdf');
  };

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
              <h1 className="text-2xl font-bold text-white mb-1">Attendance Management</h1>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((project, idx) => (
                <option key={project || idx} value={project}>{project}</option>
              ))}
            </select>
            {/* Search Bar */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Employee ID, Name, Designation, or Project"
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-64 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 placeholder-blue-200 focus:ring-blue-300' : 'bg-white/80 text-gray-900 placeholder-gray-500 focus:ring-white'}`}
            />
          </div>
        </div>
        {/* Project Wise Attendance Content Only */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 mt-6`}>
          {/* Loading and Error States */}
          {loading && (
            <div className="flex justify-center items-center mb-4">
              <span className="text-blue-600 dark:text-blue-300 font-semibold">Loading...</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Project Wise Attendance</h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-300' : 'text-gray-500'}`}>Review and manage project wise attendance</p>
            </div>
            <div className="flex items-center gap-2">
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
                  <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-10 py-2 ${theme === 'dark' ? 'bg-[#232b3a] text-blue-100' : 'bg-white text-gray-900'}`}>
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
                      className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition"
                      onClick={() => { setShowDownloadDropdown(false); handleExportToPDF(); }}
                    >
                      <FaDownload className="w-4 h-4" /> Export to PDF
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-b-xl"
                      onClick={() => { setShowDownloadDropdown(false); handleExportLocationPDF(); }}
                    >
                      <FaDownload className="w-4 h-4" /> Export Location PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <table className="w-full text-left">
                <thead>
                  <tr className={`
                    ${theme === 'dark' ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-900'}
                    rounded-t-xl
                    text-sm font-bold tracking-tight
                    border-b border-blue-200 dark:border-blue-900
                    shadow-sm
                  `}>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tl-xl tracking-tight">Name</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Project</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Date</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Punch In Time</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Punch Out Time</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Status</th>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tr-xl tracking-tight">Action</th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                  {projectAttendance.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">No records found.</td></tr>
                  )}
                  {filteredProjectAttendance.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">No records found.</td></tr>
                  )}
                  {filteredProjectAttendance.map((row) => (
                    <tr key={row.employeeId + '-' + row.date} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                      <td className={`px-3 py-2 text-xs whitespace-nowrap truncate max-w-[120px] ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.name}</td>
                      <td className={`px-3 py-2 text-xs whitespace-nowrap truncate max-w-[120px] ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.projectName}</td>
                      <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.date ? new Date(row.date).toLocaleDateString() : "N/A"}</td>
                      <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.punchInTime ? getUtcTimeOnly(row.punchInTime) : 'N/A'}</td>
                      <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.punchOutTime ? getUtcTimeOnly(row.punchOutTime) : 'N/A'}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "Present" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : row.status === "Absent" ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{row.status}</span>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <button
                          className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                          onClick={() => handleRowClick(row)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {selectedRecord && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
              <button
                onClick={() => setSelectedRecord(null)}
                className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                Attendance Record Details
              </h2>
              <div className="space-y-4">
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Date:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                    {formatDate(selectedRecord.date)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Project Name:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                    {selectedRecord.projectName || 'N/A'}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Designation:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                    {selectedRecord.designation || 'N/A'}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch In Time:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                    {getUtcTimeOnly(selectedRecord.punchInTime)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch Out Time:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                    {getUtcTimeOnly(selectedRecord.punchOutTime)}
                  </span>
                </div>
                {/* Punch In Location Details */}
                <div className={`flex flex-col border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                    Punch In Details:
                  </span>
                  <div className="ml-4 space-y-2">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Time:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {getUtcTimeOnly(selectedRecord.punchInTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                      <span className={`text-right max-w-[70%] ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {selectedRecord.punchInLocation?.address || 'Location not available'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Punch Out Location Details */}
                <div className={`flex flex-col border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                    Punch Out Details:
                  </span>
                  <div className="ml-4 space-y-2">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Time:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {getUtcTimeOnly(selectedRecord.punchOutTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                      <span className={`text-right max-w-[70%] ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {selectedRecord.punchOutLocation?.address || 'Location not available'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Attendance Photos section */}
                <div className="flex flex-col items-start border-b pb-2">
                  <span className="font-medium text-gray-500 mb-1">Attendance Photos:</span>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {selectedRecord.punchInPhoto && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Punch In:</span>
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
                        <span className="text-sm text-gray-500 block mb-1">Punch Out:</span>
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
    </AdminDashboardLayout>
  );
}