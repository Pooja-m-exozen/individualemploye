"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaClock, FaRegCalendarAlt } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

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
interface ProjectAttendanceApiResponse {
  attendance: ProjectAttendanceRecord[];
}

// Add KYC employee type
interface KycEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
}

// Add LocationDetail type
interface LocationDetail {
  latitude: number;
  longitude: number;
  address: string | null;
}

export default function AttendanceViewPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("View Attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [projectAttendance, setProjectAttendance] = useState<ProjectAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ProjectAttendanceRecord | null>(null);
  const [inLocationAddress, setInLocationAddress] = useState<string>("");
  const [outLocationAddress, setOutLocationAddress] = useState<string>("");
  const [kycEmployees, setKycEmployees] = useState<KycEmployee[]>([]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Add formatDate and formatTime helpers
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const formatTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  // Fetch project-wise attendance data
  const fetchProjectAttendance = async (project: string, from: string, to: string): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const url = `https://cafm.zenapi.co.in/api/attendance/project/attendance?projectName=${encodeURIComponent(project)}&fromDate=${from || "2025-01-01"}&toDate=${to || new Date().toISOString().slice(0,10)}`;
      const res = await fetch(url);
      const data: ProjectAttendanceApiResponse = await res.json();
      if (data && data.attendance) {
        setProjectAttendance(data.attendance);
      } else {
        setProjectAttendance([]);
      }
    } catch {
      setError("Failed to fetch project attendance data");
      setProjectAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch KYC employees and project options
  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/kyc")
      .then(res => res.json())
      .then(data => {
        const employees = (data.kycForms || []).map((form: any) => ({
          employeeId: form.personalDetails.employeeId,
          fullName: form.personalDetails.fullName,
          designation: form.personalDetails.designation,
          projectName: form.personalDetails.projectName,
        }));
        setKycEmployees(employees);
        setProjectOptions(Array.from(new Set(employees.map((e: KycEmployee) => e.projectName).filter(Boolean))));
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
    if (!projectFilter) return;
    setLoading(true);
    const employeesInProject = kycEmployees.filter(e => e.projectName === projectFilter);
    Promise.all(
      employeesInProject.map(emp =>
        fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${emp.employeeId}&month=${selectedMonth}&year=${selectedYear}`)
          .then(res => res.json())
          .then(data => enrichWithLocations((data.attendance || []).map((att: any) => ({
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
          }))))
      )
    ).then(results => {
      setProjectAttendance(results.flat());
      setLoading(false);
    });
  }, [projectFilter, selectedMonth, selectedYear, kycEmployees]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Set default project to 'Exozen-Ops' when switching to Project Wise Attendance
  useEffect(() => {
    if (activeTab === "Project Wise Attendance" && !projectFilter) {
      // Find if 'Exozen-Ops' exists in uniqueProjects
      const exozenProject = attendanceData.find(row => row.projectName === "Exozen-Ops");
      if (exozenProject) {
        setProjectFilter("Exozen-Ops");
      } else if (uniqueProjects.length > 0) {
        setProjectFilter(uniqueProjects[0]);
      }
    }
    // eslint-disable-next-line
  }, [activeTab, attendanceData]);

  // Fetch project attendance when project, fromDate, or toDate changes (only in Project Wise Attendance tab)
  useEffect(() => {
    if (activeTab === "Project Wise Attendance" && projectFilter) {
      fetchProjectAttendance(projectFilter, fromDate, toDate);
    }
    
  }, [activeTab, projectFilter, fromDate, toDate]);

  // Helper to get YYYY-MM-DD from a date string
  const getDateOnly = (dateStr: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  // Filtering logic
  const filterAttendance = (): AttendanceRecord[] => {
    return attendanceData.filter((record: AttendanceRecord) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        record.employeeId.toLowerCase().includes(searchLower) ||
        (record.projectName && record.projectName.toLowerCase().includes(searchLower)) ||
        (record.date && new Date(record.date).toLocaleDateString().includes(searchLower));
      // Date filter
      let matchesFrom = true, matchesTo = true;
      const recordDate = getDateOnly(record.date);
      if (fromDate) {
        matchesFrom = recordDate >= fromDate;
      }
      if (toDate) {
        matchesTo = recordDate <= toDate;
      }
      // Project filter (for Project Wise Attendance tab)
      let matchesProject = true;
      if (activeTab === "Project Wise Attendance" && projectFilter) {
        matchesProject = record.projectName === projectFilter;
      }
      return matchesSearch && matchesFrom && matchesTo && matchesProject;
    })
    .sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date desc
  };

  const filteredAttendance: AttendanceRecord[] = filterAttendance();

  // Filtered rows for Project Wise Attendance tab
  // const filteredRows = attendanceData
  //   .filter((record: AttendanceRecord) => {
  //     // Project filter
  //     if (projectFilter && record.projectName !== projectFilter) return false;
  //     // Date filter
  //     let matchesFrom = true, matchesTo = true;
  //     const recordDate = getDateOnly(record.date);
  //     if (fromDate) {
  //       matchesFrom = recordDate >= fromDate;
  //     }
  //     if (toDate) {
  //       matchesTo = recordDate <= toDate;
  //     }
  //     return matchesFrom && matchesTo;
  //   })
  //   .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date desc
  //   .map(record => ({
  //     employeeId: record.employeeId,
  //     projectName: record.projectName,
  //     date: record.date ? new Date(record.date).toLocaleDateString() : "N/A",
  //     status: record.status || "N/A"
  //   }));

  // Unique projects for filter dropdown
  const uniqueProjects: string[] = Array.from(new Set(attendanceData.map((row: AttendanceRecord) => row.projectName)));

  // Calculate hours worked
  // const calculateHours = (punchIn?: string, punchOut?: string) => {
  //   if (!punchIn || !punchOut) return "N/A";
  //   const inTime = new Date(punchIn);
  //   const outTime = new Date(punchOut);
  //   if (Number.isNaN(inTime.getTime()) || Number.isNaN(outTime.getTime())) return "N/A";
  //   const diffMs = outTime.getTime() - inTime.getTime();
  //   if (diffMs < 0) return "N/A";
  //   const hours = Math.floor(diffMs / (1000 * 60 * 60));
  //   const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  //   return `${hours}h ${mins}m`;
  // };

  // Helper: filter projectAttendance by search, fromDate, toDate
  const filterProjectAttendance = () => {
    const searchLower = searchQuery.toLowerCase();
    return projectAttendance.filter((row) => {
      const matchesSearch =
        row.employeeId.toLowerCase().includes(searchLower) ||
        (row.name && row.name.toLowerCase().includes(searchLower)) ||
        (row.designation && row.designation.toLowerCase().includes(searchLower)) ||
        (row.date && new Date(row.date).toLocaleDateString().includes(searchLower));
      let matchesFrom = true, matchesTo = true;
      const recordDate = row.date ? row.date.slice(0, 10) : "";
      if (fromDate) matchesFrom = recordDate >= fromDate;
      if (toDate) matchesTo = recordDate <= toDate;
      return matchesSearch && matchesFrom && matchesTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredProjectAttendance = filterProjectAttendance();

  // Update reverseGeocode to include debug logging
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    console.log('Geocoding request for:', { lat, lng });
    const GOOGLE_MAPS_API_KEY = 'AIzaSyCqvcEKoqwRG5PBDIVp-MjHyjXKT3s4KY4'; // Integrated valid API key
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      console.log('Geocoding URL:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('Reverse geocode response:', data);
      if (data.status === 'OK' && data.results?.[0]) {
        const result = data.results[0];
        const addressComponents = {
          streetNumber: '',
          route: '',
          locality: '',
          area: '',
          city: '',
          state: '',
          country: ''
        };
        result.address_components.forEach((component: any) => {
          if (component.types.includes('street_number')) addressComponents.streetNumber = component.long_name;
          if (component.types.includes('route')) addressComponents.route = component.long_name;
          if (component.types.includes('locality')) addressComponents.locality = component.long_name;
          if (component.types.includes('sublocality')) addressComponents.area = component.long_name;
          if (component.types.includes('administrative_area_level_2')) addressComponents.city = component.long_name;
          if (component.types.includes('administrative_area_level_1')) addressComponents.state = component.long_name;
          if (component.types.includes('country')) addressComponents.country = component.long_name;
        });
        const formattedAddress = [
          [addressComponents.streetNumber, addressComponents.route].filter(Boolean).join(' '),
          addressComponents.area,
          addressComponents.locality,
          addressComponents.city,
          addressComponents.state,
          addressComponents.country
        ].filter(Boolean).join(', ');
        return formattedAddress;
      }
      return 'Location not found';
    } catch (error) {
      console.error('Geocoding error:', error);
      return 'Error fetching location';
    }
  };

  // Update handleRowClick to set address on selectedRecord's punchInLocation and punchOutLocation
  const handleRowClick = async (record: ProjectAttendanceRecord) => {
    let updatedRecord = { ...record };
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

  return (
    <ManagerDashboardLayout>
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white'} rounded-2xl p-8 mb-8 flex items-center gap-6 shadow-lg`}>
          <div className={`${theme === 'dark' ? 'bg-gray-800 text-blue-400' : 'bg-white text-blue-600'} p-6 rounded-full flex items-center justify-center shadow-md`}>
            <FaClock className="text-3xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-lg">Manage attendance and regularization requests for employees.</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {["View Attendance", "Project Wise Attendance"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? theme === 'dark'
                    ? 'bg-blue-800 text-white shadow-lg'
                    : 'bg-blue-600 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gray-900 text-blue-200 hover:bg-blue-800 hover:text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Filters */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-4 rounded-lg shadow flex items-center gap-4`}>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Employee ID, Project, or Date"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-black border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
              />
              <FaClock className={`${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'} absolute right-3 top-2.5`} />
            </div>
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>From Date</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
                style={theme === 'dark' ? {} : { color: '#000' }}
              />
              <FaRegCalendarAlt
                className={`absolute right-3 top-2.5 pointer-events-none ${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`}
                size={18}
              />
              <style jsx global>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                  opacity: 0;
                  display: none;
                }
                input[type="date"]::-ms-input-placeholder {
                  color: transparent;
                }
                input[type="date"]::-moz-placeholder {
                  color: transparent;
                }
                input[type="date"]:-ms-input-placeholder {
                  color: transparent;
                }
                input[type="date"]::placeholder {
                  color: transparent;
                }
              `}</style>
            </div>
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>To Date</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
                style={theme === 'dark' ? {} : { color: '#000' }}
              />
              <FaRegCalendarAlt
                className={`absolute right-3 top-2.5 pointer-events-none ${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`}
                size={18}
              />
            </div>
          </div>
          {/* Project Filter only for Project Wise Attendance tab */}
          {activeTab === "Project Wise Attendance" && (
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Project</label>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-black border-gray-300 focus:ring-blue-600'}`}
              >
                {/* No 'All Projects' option, only list unique projects */}
                {uniqueProjects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {/* Tab Content */}
        {activeTab === "View Attendance" && (
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}> {/* removed overflow-x-auto from here */}
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Attendance Records</h2>
              <div className="flex gap-2">
                <button className={`${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}>Export</button>
                <button
                  className={`${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}
                  onClick={fetchAttendance}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="relative">
              <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}> {/* table scrolls vertically */}
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Employee ID</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Project</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {filteredAttendance.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400">No records found.</td></tr>
                    )}
                    {filteredAttendance.map((record, index) => {
                      return (
                        <tr key={record._id || index} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>{record.employeeId}</span>
                          </td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{record.projectName}</td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{record.date ? new Date(record.date).toLocaleDateString() : "N/A"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${record.status === "Present" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : record.status === "Absent" ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{record.status || "N/A"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === "Project Wise Attendance" && (
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Project Wise Attendance</h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-300' : 'text-gray-500'}`}>Review and manage project wise attendance</p>
              </div>
            </div>
            <div className="relative">
              <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Employee ID</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Name</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Designation</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Punch In Time</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Punch Out Time</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Status</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {projectAttendance.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400">No records found.</td></tr>
                    )}
                    {filteredProjectAttendance.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400">No records found.</td></tr>
                    )}
                    {filteredProjectAttendance.map((row) => (
                      <tr key={row.employeeId + '-' + row.date} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.employeeId}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.name}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.designation}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.date ? new Date(row.date).toLocaleDateString() : "N/A"}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.punchInTime ? row.punchInTime : 'N/A'}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{row.punchOutTime ? row.punchOutTime : 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${row.status === "Present" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : row.status === "Absent" ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{row.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
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
        )}
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
                    {formatTime(selectedRecord.punchInTime)}
                  </span>
                </div>
                <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch Out Time:</span>
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                    {formatTime(selectedRecord.punchOutTime)}
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
                        {formatTime(selectedRecord.punchInTime)}
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
                        {formatTime(selectedRecord.punchOutTime)}
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
                        <img
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
                        <img
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
    </ManagerDashboardLayout>
  );
}