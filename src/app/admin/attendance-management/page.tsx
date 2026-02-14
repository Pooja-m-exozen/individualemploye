"use client";
import React, { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { FaDownload, FaSearch, FaEye, FaCheck, FaTimes } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from 'next/image';
import { fetchAllRegularizationsPaginated } from "@/services/regularization";
import type { RegularizationRecord } from "@/types/regularization";

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

// Add HourlyReport type
interface HourlyReport {
  totalDays: number;
  totalWorkingDays: number;
  weekOffs: number;
  presentDays: number;
  leaves: {
    halfDayLeaves: number;
    fullDayLeaves: number;
  };
  rawLopHours: number;
  totalOTHours: number;
  otHoursMatchedToLOP: number;
  totalRequiredHours: number;
  totalWorkedHours: number;
  remainingOTHours: number;
}

// Add LocationDetail type
interface LocationDetail {
  latitude: number;
  longitude: number;
  address: string | null;
}

export default function AttendanceViewPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("Project Wise Attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [projectAttendance, setProjectAttendance] = useState<ProjectAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ProjectAttendanceRecord | null>(null);
  const [kycEmployees, setKycEmployees] = useState<KycEmployee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showDownloadDropdown, setShowDownloadDropdown] = React.useState(false);
  
  // Hourly-based state
  const [hourlyReports, setHourlyReports] = useState<Record<string, HourlyReport | null>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  // Regularization state
  const [regularizationRecords, setRegularizationRecords] = useState<RegularizationRecord[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, { fullName: string; employeeImage: string }>>({});
  const [viewRecord, setViewRecord] = useState<RegularizationRecord | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateSort, setDateSort] = useState<string>("desc");

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

  // Fetch hourly reports
  useEffect(() => {
    if (activeTab === "Hourly Based" && kycEmployees.length > 0) {
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
        const map: Record<string, HourlyReport | null> = {};
        results.forEach(r => { map[r.id] = r.data; });
        setHourlyReports(map);
        setLoading(false);
      }).catch(() => {
        setError('Failed to fetch hourly reports');
        setLoading(false);
      });
    }
  }, [activeTab, kycEmployees, selectedMonth, selectedYear]);

  // Fetch regularization records
  useEffect(() => {
    if (activeTab === "Regularization") {
      setLoading(true);
      setError("");
      fetchAllRegularizationsPaginated()
        .then((all) => {
          const unique = Array.from(new Map((all || []).map(item => [item._id, item])).values());
          setRegularizationRecords(unique);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to fetch regularization data");
          setLoading(false);
        });
    }
  }, [activeTab]);

  // Fetch employee data for regularization
  useEffect(() => {
    if (activeTab === "Regularization" && regularizationRecords.length > 0) {
      const uniqueIds = Array.from(new Set(regularizationRecords.map(r => r.employeeId)));
      if (uniqueIds.length === 0) return;
      Promise.all(uniqueIds.map(id =>
        fetch(`https://cafm.zenapi.co.in/api/kyc/${id}`)
          .then(res => res.json())
          .then(data => ({
            id,
            fullName: data.kycData?.personalDetails?.fullName || id,
            employeeImage: data.kycData?.personalDetails?.employeeImage || "/placeholder-user.jpg"
          }))
          .catch(() => ({ id, fullName: id, employeeImage: "/placeholder-user.jpg" }))
      )).then(results => {
        const map: Record<string, { fullName: string; employeeImage: string }> = {};
        results.forEach(r => { map[r.id] = { fullName: r.fullName, employeeImage: r.employeeImage }; });
        setEmployeeMap(map);
      });
    }
  }, [activeTab, regularizationRecords]);

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

  // Helper to format decimal hours as 'X hr Y min'
  const formatHours = (decimal: number | undefined | null): string => {
    if (decimal == null || isNaN(decimal)) return '-';
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    if (hours === 0 && minutes === 0) return '0 min';
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
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

  // Filter employees for hourly view
  const filteredHourlyEmployees = kycEmployees.filter(emp => {
    const matchesProject = projectFilter === 'all' || emp.projectName === projectFilter;
    const matchesSearch = searchQuery
      ? emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesProject && matchesSearch;
  });

  // Filter regularization records
  const filteredRegularizationRecords = React.useMemo(() => {
    let filtered = regularizationRecords;
    if (searchQuery) {
      filtered = filtered.filter((rec) =>
        rec.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employeeMap[rec.employeeId]?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== "All") {
      filtered = filtered.filter(rec => rec.regularizationStatus === statusFilter);
    }
    // Add project filter for regularization
    if (projectFilter !== 'all') {
      filtered = filtered.filter(rec => {
        const employee = kycEmployees.find(emp => emp.employeeId === rec.employeeId);
        return employee?.projectName === projectFilter;
      });
    }
    filtered = filtered.slice(); // copy
    filtered.sort((a, b) => {
      if (dateSort === "pending") {
        if (a.regularizationStatus === "Pending" && b.regularizationStatus !== "Pending") return -1;
        if (a.regularizationStatus !== "Pending" && b.regularizationStatus === "Pending") return 1;
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      }
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateSort === "desc" ? dateB - dateA : dateA - dateB;
    });
    return filtered;
  }, [searchQuery, regularizationRecords, statusFilter, dateSort, employeeMap, projectFilter, kycEmployees]);

  // Regularization action handlers
  const handleRegularizationAction = async (id: string, action: string) => {
    setLoading(true);
    setError("");
    try {
      if (action === "approve") {
        const res = await fetch(`https://cafm.zenapi.co.in/api/attendance/regularize/${id}/approve`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Approved", approvedBy: "Manager" })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Approval failed");
        setRegularizationRecords((prev) => prev.map((rec) =>
          rec._id === id ? { ...rec, regularizationStatus: "Approved" } : rec
        ));
      }
    } catch {
      setError("Action failed");
    }
    setLoading(false);
  };

  const handleReject = (id: string) => {
    setRejectId(id);
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/attendance/regularize/${rejectId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Rejected", rejectionReason: rejectReason })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Rejection failed");
      setRegularizationRecords((prev) => prev.map((rec) =>
        rec._id === rejectId ? { ...rec, regularizationStatus: "Rejected" } : rec
      ));
      setShowRejectModal(false);
      setRejectReason("");
      setRejectId(null);
    } catch {
      setError("Action failed");
    }
    setLoading(false);
  };

  // Helper to format date only (YYYY-MM-DD)
  const formatRegularizationDate = (dt?: string) => {
    if (!dt) return "-";
    const dateObj = new Date(dt);
    if (isNaN(dateObj.getTime())) return dt.split(' ')[0] || dt;
    return dateObj.toISOString().split('T')[0];
  };

  // Add a helper to fetch address from lat/lng using reverse geocoding (Nominatim - free)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Validate coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      console.warn('Invalid coordinates:', { lat, lng });
      return 'Invalid coordinates';
    }

    try {
      // Using Nominatim (OpenStreetMap) - completely free, no API key required
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&zoom=18`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EmployeeManagementApp/1.0' // Required by Nominatim
        }
      });

      if (!response.ok) {
        console.warn(`Nominatim API error: ${response.status} ${response.statusText}`);
        return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        // Extract address components from Nominatim response
        const address = data.address || {};
        
        // Build a readable address from available components
        const addressParts = [
          address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
          address.suburb || address.neighbourhood,
          address.city || address.town || address.village,
          address.state,
          address.country
        ].filter(Boolean);

        return addressParts.join(', ') || data.display_name;
      } else if (data && data.error) {
        console.warn('Nominatim error:', data.error);
        return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
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
    let exportData: Record<string, string | number>[];
    let fileName: string;
    
    if (activeTab === "Project Wise Attendance") {
      exportData = filteredProjectAttendance.map(row => ({
      EmployeeID: row.employeeId,
      Name: row.name,
      Designation: row.designation,
      Project: row.projectName,
      Date: row.date ? new Date(row.date).toLocaleDateString() : 'N/A',
      PunchInTime: row.punchInTime ? row.punchInTime.replace(/\.\d{3}Z$/, '') : '',
      PunchOutTime: row.punchOutTime ? row.punchOutTime.replace(/\.\d{3}Z$/, '') : '',
      Status: row.status,
    }));
      fileName = 'project_attendance.xlsx';
    } else if (activeTab === "Hourly Based") {
      exportData = filteredHourlyEmployees.map(emp => {
        const report = hourlyReports[emp.employeeId];
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
      fileName = 'hourly_attendance.xlsx';
    } else {
      exportData = filteredRegularizationRecords.map(rec => {
        const employee = kycEmployees.find(emp => emp.employeeId === rec.employeeId);
        return {
          EmployeeID: rec.employeeId,
          EmployeeName: employeeMap[rec.employeeId]?.fullName || rec.employeeId,
          Project: employee?.projectName || '-',
          Date: formatRegularizationDate(rec.date),
          Status: rec.status,
          Reason: rec.regularizationReason || '-',
          RegularizationStatus: rec.regularizationStatus,
          OriginalStatus: rec.originalStatus || '-',
        };
      });
      fileName = 'regularization_records.xlsx';
    }
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    if (activeTab === "Project Wise Attendance") {
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
    } else if (activeTab === "Hourly Based") {
      const exportData = filteredHourlyEmployees.map(emp => {
        const report = hourlyReports[emp.employeeId];
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

      doc.text('Hourly Based Attendance', 14, 16);
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
    } else {
      const exportData = filteredRegularizationRecords.map(rec => {
        const employee = kycEmployees.find(emp => emp.employeeId === rec.employeeId);
        return [
          rec.employeeId,
          employeeMap[rec.employeeId]?.fullName || rec.employeeId,
          employee?.projectName || '-',
          formatRegularizationDate(rec.date),
          rec.status,
          rec.regularizationReason || '-',
          rec.regularizationStatus,
          rec.originalStatus || '-',
        ];
      });

      doc.text('Regularization Records', 14, 16);
      autoTable(doc, {
        head: [[
          'EmployeeID', 'Employee Name', 'Project', 'Date', 'Status', 'Reason', 'Regularization Status', 'Original Status'
        ]],
        body: exportData,
        startY: 22,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });
      doc.save('regularization_records.pdf');
    }
  };

  return (
    <AdminDashboardLayout>
      <div className={`flex flex-col gap-4 p-2 lg:p-4 w-full font-sans ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'
      }`}>
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("Project Wise Attendance")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "Project Wise Attendance"
                ? theme === 'dark' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Project Wise Attendance
          </button>
          <button
            onClick={() => setActiveTab("Hourly Based")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "Hourly Based"
                ? theme === 'dark' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Hourly Based
          </button>
          <button
            onClick={() => setActiveTab("Regularization")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "Regularization"
                ? theme === 'dark' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Regularization
          </button>
            </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center w-full sm:w-auto mb-4">
            {/* Project Dropdown */}
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((project, idx) => (
                <option key={project || idx} value={project}>{project}</option>
              ))}
            </select>
            {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search employees..."
              className={`pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full ${theme === 'dark' ? 'bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-blue-300' : 'bg-white text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
            />
          </div>
          {/* Month/Year for Hourly Based */}
          {activeTab === "Hourly Based" && (
            <>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
              >
                {[2025, 2024, 2023].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </>
          )}
          {/* Regularization Filters */}
          {activeTab === "Regularization" && (
            <>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={dateSort}
                onChange={e => setDateSort(e.target.value)}
                className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
                <option value="pending">Pending First</option>
              </select>
            </>
          )}
          {/* Export Button */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Download options"
              className={`p-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-blue-600 text-white focus:ring-blue-300'}`}
                  onClick={() => setShowDownloadDropdown(v => !v)}
                >
                  <FaDownload className="w-5 h-5" />
                </button>
                {showDownloadDropdown && (
              <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-10 py-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
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
                {activeTab === "Project Wise Attendance" && (
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-b-xl"
                      onClick={() => { setShowDownloadDropdown(false); handleExportLocationPDF(); }}
                    >
                      <FaDownload className="w-4 h-4" /> Export Location PDF
                    </button>
                )}
                  </div>
                )}
              </div>
            </div>
        {/* Loading and Error States */}
        {loading && (
          <div className="flex justify-center items-center mb-4">
            <span className={`font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>Loading...</span>
          </div>
        )}
        {error && (
          <div className={`mb-4 p-3 rounded border ${theme === 'dark' ? 'bg-red-900 text-red-200 border-red-700' : 'bg-red-100 text-red-700 border-red-300'}`}>
            {error}
          </div>
        )}
        {/* Excel-style Table */}
        <div className="w-full">
          <div className="overflow-x-auto w-full custom-scrollbar">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                  <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                    <tr>
                      <th className={`px-2 py-3 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                      {activeTab === "Project Wise Attendance" ? (
                        <>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Name</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-28 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Punch In</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-28 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Punch Out</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Action</th>
                        </>
                      ) : activeTab === "Hourly Based" ? (
                        <>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Total Days</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Working Days</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Present</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Leaves</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Worked Hours</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>OT Hours</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Action</th>
                        </>
                      ) : (
                        <>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Reason</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Regularization Status</th>
                          <th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Original Status</th>
                          <th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === "Project Wise Attendance" ? (
                      filteredProjectAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            No records found.
                      </td>
                        </tr>
                      ) : (
                        filteredProjectAttendance.map((row, index) => (
                          <tr key={`${row.employeeId}-${row.date}-${index}`} className={`${
                            index % 2 === 0 
                              ? (theme === 'dark' ? 'bg-gray-800' : 'bg-white') 
                              : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50')
                          } hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-blue-50'} transition-colors`}>
                            <td className={`px-2 py-2 text-center font-medium border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {index + 1}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {row.name}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {row.projectName}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {row.date ? new Date(row.date).toLocaleDateString() : "N/A"}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {row.punchInTime ? getUtcTimeOnly(row.punchInTime) : 'N/A'}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {row.punchOutTime ? getUtcTimeOnly(row.punchOutTime) : 'N/A'}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.status === "Present" 
                                  ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') 
                                  : row.status === "Absent" 
                                  ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') 
                                  : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className={`px-2 py-2 text-center border ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}>
                        <button
                          onClick={() => handleRowClick(row)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                        ))
                      )
                    ) : activeTab === "Hourly Based" ? (
                      filteredHourlyEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={9} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        filteredHourlyEmployees.map((emp, index) => {
                          const report = hourlyReports[emp.employeeId];
                          return (
                            <tr key={emp.employeeId} className={`${
                              index % 2 === 0 
                                ? (theme === 'dark' ? 'bg-gray-800' : 'bg-white') 
                                : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50')
                            } hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-blue-50'} transition-colors`}>
                              <td className={`px-2 py-2 text-center font-medium border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {index + 1}
                              </td>
                              <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {emp.fullName} <span className="text-xs text-gray-400">({emp.employeeId})</span>
                              </td>
                              <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {emp.projectName}
                              </td>
                              <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {report?.totalDays ?? '-'}
                              </td>
                              <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {report?.totalWorkingDays ?? '-'}
                              </td>
                              <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {report?.presentDays ?? '-'}
                              </td>
                              <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {report?.leaves?.fullDayLeaves ?? '-'}
                              </td>
                              <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {formatHours(report?.totalWorkedHours)}
                              </td>
                              <td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                                {formatHours(report?.totalOTHours)}
                              </td>
                              <td className={`px-2 py-2 text-center border ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}>
                                <button
                                  onClick={() => setExpandedRows(r => ({ ...r, [emp.employeeId]: !r[emp.employeeId] }))}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  }`}
                                >
                                  {expandedRows[emp.employeeId] ? 'Collapse' : 'Expand'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      filteredRegularizationRecords.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        filteredRegularizationRecords.map((rec, index) => (
                          <tr key={rec._id || index} className={`${
                            index % 2 === 0 
                              ? (theme === 'dark' ? 'bg-gray-800' : 'bg-white') 
                              : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50')
                          } hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-blue-50'} transition-colors`}>
                            <td className={`px-2 py-2 text-center font-medium border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {index + 1}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              <div className="flex items-center gap-2">
                                <Image 
                                  src={employeeMap[rec.employeeId]?.employeeImage || "/placeholder-user.jpg"} 
                                  alt={employeeMap[rec.employeeId]?.fullName || rec.employeeId} 
                                  width={24} 
                                  height={24} 
                                  className="rounded-full border border-blue-200 dark:border-blue-800" 
                                />
                                <span>{employeeMap[rec.employeeId]?.fullName || rec.employeeId}</span>
                              </div>
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {(() => {
                                const employee = kycEmployees.find(emp => emp.employeeId === rec.employeeId);
                                return employee?.projectName || '-';
                              })()}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {formatRegularizationDate(rec.date)}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {rec.status}
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              <div className="max-w-[120px] truncate">
                                {rec.regularizationReason || '-'}
                              </div>
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                rec.regularizationStatus === "Approved" 
                                  ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') 
                                  : rec.regularizationStatus === "Rejected" 
                                  ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') 
                                  : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                              }`}>
                                {rec.regularizationStatus}
                              </span>
                            </td>
                            <td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
                              {rec.originalStatus || '-'}
                            </td>
                            <td className={`px-2 py-2 text-center border ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}>
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => setViewRecord(rec)}
                                  className={`p-1 rounded transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  }`}
                                  title="View Details"
                                >
                                  <FaEye className="w-3 h-3" />
                                </button>
                                {rec.regularizationStatus === "Pending" && (
                                  <>
                                    <button
                                      onClick={() => handleRegularizationAction(rec._id, "approve")}
                                      disabled={loading}
                                      className={`p-1 rounded transition-colors ${
                                        theme === 'dark'
                                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                                      }`}
                                      title="Approve"
                                    >
                                      <FaCheck className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleReject(rec._id)}
                                      disabled={loading}
                                      className={`p-1 rounded transition-colors ${
                                        theme === 'dark'
                                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                                      }`}
                                      title="Reject"
                                    >
                                      <FaTimes className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                </tbody>
              </table>
              </div>
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
        
        {/* Regularization View Modal */}
        {viewRecord && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
              <button
                onClick={() => setViewRecord(null)}
                className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                Regularization Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b pb-2">
                  <Image 
                    src={employeeMap[viewRecord.employeeId]?.employeeImage || "/placeholder-user.jpg"} 
                    alt={employeeMap[viewRecord.employeeId]?.fullName || viewRecord.employeeId} 
                    width={40} 
                    height={40} 
                    className="rounded-full border border-blue-200 dark:border-blue-800" 
                  />
                  <span className={`font-medium text-lg ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                    {employeeMap[viewRecord.employeeId]?.fullName || viewRecord.employeeId}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Date:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{formatRegularizationDate(viewRecord.date)}</span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch In:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.punchInTime || '-'}</span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch Out:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.punchOutTime || '-'}</span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Status:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.status}</span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Reason:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.regularizationReason || '-'}</span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Regularization Status:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.regularizationStatus}</span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Original Status:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.originalStatus || '-'}</span>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => setViewRecord(null)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Regularization Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
              <button
                onClick={() => setShowRejectModal(false)}
                className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                Reject Regularization
              </h2>
              <div className="mb-4">
                <label className="block mb-2 font-semibold">Reason for rejection:</label>
                <textarea
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Cancel</button>
                <button onClick={submitReject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" disabled={!rejectReason.trim()}>Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}