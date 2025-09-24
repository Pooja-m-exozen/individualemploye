"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSearch } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  projectName: string;
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
  status: string;
}

interface ProjectAttendanceRecord {
  _id: { employeeId: string; date: string } | string;
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

interface AttendanceApiResponse {
  attendance: AttendanceRecord[];
}

interface KycEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  employeeImage?: string;
}

interface KycForm {
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
    employeeImage?: string;
  };
}

interface LocationDetail {
  latitude: number;
  longitude: number;
  address: string | null;
}

export default function AttendanceViewPage() {
  const { theme } = useTheme();
  const [activeTab] = useState("View Attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [, setProjectAttendance] = useState<ProjectAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ProjectAttendanceRecord | null>(null);
  const [kycEmployees, setKycEmployees] = useState<KycEmployee[]>([]);
  const [selectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear] = useState<number>(new Date().getFullYear());

  // Utility function must come before filterAttendance
  const getDateOnly = (dateStr: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  // Filtering logic must come next
  const filterAttendance = (): AttendanceRecord[] => {
    return attendanceData
      .filter((record: AttendanceRecord) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          record.employeeId.toLowerCase().includes(searchLower) ||
          (record.projectName && record.projectName.toLowerCase().includes(searchLower)) ||
          (record.date && new Date(record.date).toLocaleDateString().includes(searchLower));
        let matchesFrom = true,
          matchesTo = true;
        const recordDate = getDateOnly(record.date);
        if (fromDate) {
          matchesFrom = recordDate >= fromDate;
        }
        if (toDate) {
          matchesTo = recordDate <= toDate;
        }
        let matchesProject = true;
        if (activeTab === "Project Wise Attendance" && projectFilter) {
          matchesProject = record.projectName === projectFilter;
        }
        return matchesSearch && matchesFrom && matchesTo && matchesProject;
      })
      .sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  const filteredAttendance: AttendanceRecord[] = filterAttendance();


  // Inline filter states
  const [empIdFilter, setEmpIdFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [projectFilterHeader, setProjectFilterHeader] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Unique designations and projects for dropdowns
  const uniqueDesignations = Array.from(new Set(kycEmployees.map(e => e.designation).filter(Boolean)));
  const uniqueProjectsAll = Array.from(new Set(kycEmployees.map(e => e.projectName).filter(Boolean)));
  const uniqueStatus = Array.from(new Set(attendanceData.map(e => e.status).filter(Boolean)));

  // Filtered attendance with header filters
  const filteredAttendanceWithHeader = filteredAttendance.filter(record => {
    const kyc = kycEmployees.find(e => e.employeeId === record.employeeId);
    const matchesEmpId = empIdFilter === "" || record.employeeId.toLowerCase().includes(empIdFilter.toLowerCase());
    const matchesName = nameFilter === "" || (kyc?.fullName || "").toLowerCase().includes(nameFilter.toLowerCase());
    const matchesDesignation = designationFilter === "" || (kyc?.designation || "").toLowerCase() === designationFilter.toLowerCase();
    const matchesProject = projectFilterHeader === "" || (record.projectName || "").toLowerCase() === projectFilterHeader.toLowerCase();
    const matchesDate = dateFilter === "" || (record.date && record.date.slice(0, 10) === dateFilter);
    const matchesStatus = statusFilter === "" || (record.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesEmpId && matchesName && matchesDesignation && matchesProject && matchesDate && matchesStatus;
  });

  // Helper to get photo from kycEmployees
  const getEmployeePhoto = (employeeId: string) => {
    const kyc = kycEmployees.find(e => e.employeeId === employeeId);
    return kyc?.employeeImage || "/placeholder-user.jpg";
  };

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
    } catch {
      setError("Failed to fetch attendance data");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/kyc")
      .then((res) => res.json())
      .then((data) => {
        const employees = (data.kycForms || []).map((form: KycForm) => ({
          employeeId: form.personalDetails.employeeId,
          fullName: form.personalDetails.fullName,
          designation: form.personalDetails.designation,
          projectName: form.personalDetails.projectName,
          employeeImage: form.personalDetails.employeeImage || undefined,
        }));
        setKycEmployees(employees);
      });
  }, []);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setFromDate(todayStr);
    setToDate(todayStr);
  }, []);


  useEffect(() => {
    if (activeTab !== "Project Wise Attendance" || !projectFilter) return;
    
    const enrichWithLocations = (data: ProjectAttendanceRecord[]): ProjectAttendanceRecord[] => {
      return data.map((record) => ({
        ...record,
        punchInLocation: record.punchInLatitude && record.punchInLongitude
          ? {
              latitude: record.punchInLatitude,
              longitude: record.punchInLongitude,
              address: null,
            }
          : undefined,
        punchOutLocation: record.punchOutLatitude && record.punchOutLongitude
          ? {
              latitude: record.punchOutLatitude,
              longitude: record.punchOutLongitude,
              address: null,
            }
          : undefined,
      }));
    };
    
    setLoading(true);
    const employeesInProject = kycEmployees.filter((e) => e.projectName === projectFilter);
    Promise.all(
      employeesInProject.map((emp) =>
        fetch(
          `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${emp.employeeId}&month=${selectedMonth}&year=${selectedYear}`
        )
          .then((res) => res.json())
          .then((data) =>
            enrichWithLocations(
              (data.attendance || []).map((att: ProjectAttendanceRecord) => ({
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
              }))
            )
          )
      )
    ).then((results) => {
      setProjectAttendance(results.flat());
      setLoading(false);
    });
  }, [activeTab, projectFilter, selectedMonth, selectedYear, kycEmployees]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    if (activeTab === "Project Wise Attendance" && !projectFilter) {
      if (uniqueProjectsAll.length > 0) {
        setProjectFilter(uniqueProjectsAll[0]);
      }
    }
  }, [activeTab, attendanceData, projectFilter, uniqueProjectsAll]);



  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return "Invalid coordinates";
    }
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&zoom=18`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "EmployeeManagementApp/1.0",
        },
      });
      if (!response.ok) {
        return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
      const data = await response.json();
      if (data && data.display_name) {
        const address = data.address || {};
        const addressParts = [
          address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
          address.suburb || address.neighbourhood,
          address.city || address.town || address.village,
          address.state,
          address.country,
        ].filter(Boolean);
        return addressParts.join(", ") || data.display_name;
      }
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch {
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };


  // Removed unused handleExportLocationPDF function

  const handleRowClick = async (record: AttendanceRecord) => {
    try {
      // Fetch detailed attendance data for the specific employee and date
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      
      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${record.employeeId}&month=${month}&year=${year}`);
      const data = await response.json();
      
      if (data.attendance && Array.isArray(data.attendance)) {
        // Find the attendance record for the specific date
        const recordDate = record.date ? record.date.slice(0, 10) : '';
        const attendanceRecord = data.attendance.find((att: ProjectAttendanceRecord) => 
          att.date && att.date.slice(0, 10) === recordDate
        );
        
        if (attendanceRecord) {
          const updatedRecord = {
            ...attendanceRecord,
            employeeId: record.employeeId,
            projectName: record.projectName,
            name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
            designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
          };
          
          // Fetch location data if coordinates are available
          if (attendanceRecord.punchInLatitude && attendanceRecord.punchInLongitude) {
            const punchInAddress = await reverseGeocode(attendanceRecord.punchInLatitude, attendanceRecord.punchInLongitude);
      updatedRecord.punchInLocation = {
              latitude: attendanceRecord.punchInLatitude,
              longitude: attendanceRecord.punchInLongitude,
              address: punchInAddress,
            };
          }
          
          if (attendanceRecord.punchOutLatitude && attendanceRecord.punchOutLongitude) {
            const punchOutAddress = await reverseGeocode(attendanceRecord.punchOutLatitude, attendanceRecord.punchOutLongitude);
      updatedRecord.punchOutLocation = {
              latitude: attendanceRecord.punchOutLatitude,
              longitude: attendanceRecord.punchOutLongitude,
              address: punchOutAddress,
            };
          }
          
    setSelectedRecord(updatedRecord);
        } else {
          // Fallback to basic record if detailed data not found
          setSelectedRecord({
            ...record,
            _id: { employeeId: record.employeeId, date: record.date },
            name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
            designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
            punchInLocation: { latitude: 0, longitude: 0, address: null },
            punchOutLocation: { latitude: 0, longitude: 0, address: null },
          });
        }
      } else {
        // Fallback to basic record
        setSelectedRecord({
          ...record,
          _id: { employeeId: record.employeeId, date: record.date },
          name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
          designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
          punchInLocation: { latitude: 0, longitude: 0, address: null },
          punchOutLocation: { latitude: 0, longitude: 0, address: null },
        });
      }
    } catch (error) {
      console.error('Error fetching attendance details:', error);
      // Fallback to basic record
      setSelectedRecord({
        ...record,
        _id: { employeeId: record.employeeId, date: record.date },
        name: kycEmployees.find(e => e.employeeId === record.employeeId)?.fullName || record.employeeId,
        designation: kycEmployees.find(e => e.employeeId === record.employeeId)?.designation || '',
        punchInLocation: { latitude: 0, longitude: 0, address: null },
        punchOutLocation: { latitude: 0, longitude: 0, address: null },
      });
    }
  };

  // Removed unused utility functions: getUtcTimeOnly, formatDate, handleExportToExcel, handleExportToPDF

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Projects</option>
                {uniqueProjectsAll.map((project: string, idx: number) => (
                  <option key={project || idx} value={project}>{project}</option>
                ))}
              </select>
            </div>
            {/* Designation Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Designations</option>
                {uniqueDesignations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {/* Status Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Status</option>
                {uniqueStatus.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="From Date"
              />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="To Date"
              />
              <button
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                onClick={fetchAttendance}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading attendance records...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-16 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Photo</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee ID</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee Name</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Date</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Punch In Time</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Punch Out Time</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className={`px-2 py-1 sticky left-0 z-20 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 w-16 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={empIdFilter} 
                        onChange={e => setEmpIdFilter(e.target.value)} 
                        placeholder="Filter ID" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        value={nameFilter} 
                        onChange={e => setNameFilter(e.target.value)} 
                        placeholder="Filter Name" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={designationFilter} 
                        onChange={e => setDesignationFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={projectFilterHeader} 
                        onChange={e => setProjectFilterHeader(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueProjectsAll.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input 
                        type="date"
                        value={dateFilter} 
                        onChange={e => setDateFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {uniqueStatus.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {filteredAttendanceWithHeader.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No attendance records found</td>
                    </tr>
                  ) : filteredAttendanceWithHeader.map((record, index) => {
                    const kyc = kycEmployees.find(e => e.employeeId === record.employeeId);
                    return (
                      <tr key={record._id || index} className={`${theme === "dark" ? "hover:bg-blue-900 transition even:bg-gray-900" : "hover:bg-blue-50 transition even:bg-gray-50"}`}>
                        <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{index + 1}</td>
                        <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <Image
                            src={getEmployeePhoto(record.employeeId)}
                            alt={kyc?.fullName || record.employeeId}
                            width={32}
                            height={32}
                            className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                          />
                        </td>
                        <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{record.employeeId}</td>
                        <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={kyc?.fullName || "-"}>{kyc?.fullName || "-"}</div></td>
                        <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={kyc?.designation || "-"}>{kyc?.designation || "-"}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={record.projectName}>{record.projectName}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{record.date ? new Date(record.date).toLocaleDateString() : "N/A"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{record.punchInTime ? new Date(record.punchInTime).toLocaleTimeString() : "-"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{record.punchOutTime ? new Date(record.punchOutTime).toLocaleTimeString() : "-"}</td>
                        <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                            record.status === 'Present' 
                              ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              : record.status === 'Absent'
                              ? theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                              : theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {record.status || "N/A"}
                          </span>
                        </td>
                        <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                          <button
                            onClick={() => handleRowClick(record)}
                            title="View Details"
                            className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                              theme === 'dark' 
                                ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                            }`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>
      </div>

        {/* Attendance Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold" onClick={() => setSelectedRecord(null)}>✕</button>
              <h2 className="text-2xl font-bold mb-4 text-center">Attendance Record Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Image src={getEmployeePhoto(selectedRecord.employeeId)} alt="Employee" width={64} height={64} className="w-16 h-16 rounded-full object-cover border" />
                  <div>
                    <div className="font-bold text-lg">{selectedRecord.name || selectedRecord.employeeId}</div>
                    <div className="text-xs text-gray-500">{selectedRecord.employeeId}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><b>Project:</b> {selectedRecord.projectName || '-'}</div>
                  <div><b>Designation:</b> {selectedRecord.designation || '-'}</div>
                  <div><b>Date:</b> {selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '-'}</div>
                  <div><b>Status:</b> {selectedRecord.status || '-'}</div>
                  <div><b>Punch In Time:</b> {selectedRecord.punchInTime ? new Date(selectedRecord.punchInTime).toLocaleTimeString() : '-'}</div>
                  <div><b>Punch Out Time:</b> {selectedRecord.punchOutTime ? new Date(selectedRecord.punchOutTime).toLocaleTimeString() : '-'}</div>
                  <div className="col-span-2">
                    <b>Punch In Location:</b> 
                    {selectedRecord.punchInLocation?.address ? (
                      <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedRecord.punchInLocation.address}</span>
                    ) : selectedRecord.punchInLatitude && selectedRecord.punchInLongitude ? (
                      <span className="ml-2 text-gray-500">Loading location...</span>
                    ) : (
                      <span className="ml-2 text-gray-500">No location data</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <b>Punch Out Location:</b> 
                    {selectedRecord.punchOutLocation?.address ? (
                      <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedRecord.punchOutLocation.address}</span>
                    ) : selectedRecord.punchOutLatitude && selectedRecord.punchOutLongitude ? (
                      <span className="ml-2 text-gray-500">Loading location...</span>
                    ) : (
                      <span className="ml-2 text-gray-500">No location data</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Punch In Photo</div>
                    {selectedRecord.punchInPhoto && selectedRecord.punchInPhoto !== '' ? (
                      <Image
                        src={selectedRecord.punchInPhoto}
                        alt="Punch In"
                        width={192} 
                        height={240} 
                        className="rounded-lg w-48 h-60 object-cover border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-48 h-60 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 border ${selectedRecord.punchInPhoto && selectedRecord.punchInPhoto !== '' ? 'hidden' : ''}`}>
                      {selectedRecord.punchInPhoto === '' ? 'No Photo Available' : 'No Photo'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Punch Out Photo</div>
                    {selectedRecord.punchOutPhoto && selectedRecord.punchOutPhoto !== '' ? (
                      <Image
                        src={selectedRecord.punchOutPhoto}
                        alt="Punch Out"
                        width={192} 
                        height={240} 
                        className="rounded-lg w-48 h-60 object-cover border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-48 h-60 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 border ${selectedRecord.punchOutPhoto && selectedRecord.punchOutPhoto !== '' ? 'hidden' : ''}`}>
                      {selectedRecord.punchOutPhoto === '' ? 'No Photo Available' : 'No Photo'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </ManagerDashboardLayout>
  );
}