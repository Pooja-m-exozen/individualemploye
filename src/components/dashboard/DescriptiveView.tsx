"use client";
import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FaUsers, FaUserCheck, FaClipboardList, FaIdBadge, FaSearch, FaEye } from "react-icons/fa";
import Image from 'next/image';

interface EmployeeData {
  employeeId: string;
  fullName?: string;
  projectName?: string;
  designation?: string;
  dateOfJoining?: string;
  startDate?: string;
  endDate?: string;
  leaveType?: string;
  reason?: string;
  status?: string;
  punchInPhoto?: string;
  punchInTime?: string;
  punchOutPhoto?: string;
  punchOutTime?: string;
  date?: string;
  emergencyContact?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
}

export default function DescriptiveView() {
  const [searchTerm, setSearchTerm] = useState("");
  const { theme } = useTheme();

  // Fetch total employees from API
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [totalLoading, setTotalLoading] = useState(true);
  useEffect(() => {
    async function fetchTotal() {
      setTotalLoading(true);
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/dashboard/total-employees");
        const data = await res.json();
        setTotalEmployees(typeof data.total === 'number' ? data.total : null);
      } finally {
        setTotalLoading(false);
      }
    }
    fetchTotal();
  }, []);

  // Employee Data Section filter
  const [employeeDataFilter, setEmployeeDataFilter] = useState('new-joiners');
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [employeeDataLoading, setEmployeeDataLoading] = useState(false);
  const [employeeDataError, setEmployeeDataError] = useState<string | null>(null);

  // Project filter state
  const [projectFilter, setProjectFilter] = useState('all');

  // Pagination state (move here to avoid use before declaration)
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Get unique project names from current employeeData
  const projectOptions = Array.from(new Set(employeeData.map(item => item.projectName).filter(Boolean)));

  // Filter employeeData by project
  const filteredEmployeeData = projectFilter === 'all' ? employeeData : employeeData.filter(item => item.projectName === projectFilter);

  useEffect(() => {
    async function fetchEmployeeData() {
      setEmployeeDataLoading(true);
      setEmployeeDataError(null);
      try {
        if (employeeDataFilter === 'new-joiners') {
          const res = await fetch('https://cafm.zenapi.co.in/api/kyc/reports/new-joiners?days=7');
          const data = await res.json();
          setEmployeeData(Array.isArray(data.data) ? data.data : []);
        } else if (employeeDataFilter === 'on-leave') {
          const res = await fetch('https://cafm.zenapi.co.in/api/dashboard/on-leave-today');
          const data = await res.json();
          setEmployeeData(Array.isArray(data.onLeave) ? data.onLeave : []);
        } else if (employeeDataFilter === 'attendance') {
          const res = await fetch('https://cafm.zenapi.co.in/api/attendance/all');
          const data = await res.json();
          const today = new Date().toISOString().slice(0, 10);
          const filtered = Array.isArray(data.attendance)
            ? data.attendance.filter((a: Record<string, unknown>) =>
                typeof a.date === 'string' && a.date.slice(0, 10) === today
              )
            : [];
          console.log('Attendance data for today:', filtered);
          setEmployeeData(filtered);
        }
      } catch (err) {
        setEmployeeDataError('Failed to fetch employee data');
        setEmployeeData([]);
      } finally {
        setEmployeeDataLoading(false);
      }
    }
    fetchEmployeeData();
  }, [employeeDataFilter]);

  // Update paginatedData to use filteredEmployeeData
  const paginatedData = employeeDataFilter === 'new-joiners'
    ? filteredEmployeeData.slice((page - 1) * pageSize, page * pageSize)
    : employeeDataFilter === 'attendance'
      ? filteredEmployeeData.slice((page - 1) * pageSize, page * pageSize)
      : filteredEmployeeData;
  const totalPages = (employeeDataFilter === 'new-joiners' || employeeDataFilter === 'attendance') ? Math.ceil(filteredEmployeeData.length / pageSize) : 1;

  // Reset page to 1 when filter changes
  useEffect(() => { setPage(1); }, [employeeDataFilter, projectFilter]);

  // KYC details modal
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycModalData, setKycModalData] = useState<{ kyc: Record<string, unknown>; leave?: EmployeeData } | null>(null);
  const [kycModalLoading, setKycModalLoading] = useState(false);
  const [kycModalError, setKycModalError] = useState<string | null>(null);
  async function handleViewKYC(employeeId: string, leaveItem?: EmployeeData) {
    setKycModalOpen(true);
    setKycModalLoading(true);
    setKycModalError(null);
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
      const data = await res.json();
      setKycModalData({ kyc: data.kycData, leave: leaveItem });
    } catch (err) {
      setKycModalError('Failed to fetch KYC details');
      setKycModalData(null);
    } finally {
      setKycModalLoading(false);
    }
  }
  function closeKycModal() {
    setKycModalOpen(false);
    setKycModalData(null);
    setKycModalError(null);
  }

  // Helper for status color dot
  function StatusDot({ status, customClass }: { status: string | undefined | null, customClass?: string }) {
    let color = 'bg-gray-400';
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'approved') color = 'bg-green-500';
      else if (s === 'pending') color = 'bg-yellow-400';
      else if (s === 'rejected') color = 'bg-red-500';
    }
    return <span className={`inline-block rounded-full mr-2 align-middle ${color} ${customClass || 'w-3 h-3'}`}></span>;
  }

  // Helper for KYC info in On Leave table
  function KycInfoCell({ employeeId, field }: { employeeId: string, field: 'photo'|'name'|'project'|'designation' }) {
    const [kyc, setKyc] = React.useState<Record<string, unknown> | null>(null);
    React.useEffect(() => {
      let isMounted = true;
      async function fetchKyc() {
        try {
          const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
          const data = await res.json();
          if (isMounted && data.kycData) setKyc(data.kycData.personalDetails);
        } catch {}
      }
      fetchKyc();
      return () => { isMounted = false; };
    }, [employeeId]);
    if (!kyc) {
      if (field === 'photo') return <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">N/A</div>;
      return <span className="text-gray-400">...</span>;
    }
    if (field === 'photo' && typeof kyc.employeeImage === 'string') return <Image src={kyc.employeeImage} alt="Employee" width={40} height={40} className="w-10 h-10 rounded-full object-cover border" />;
    if (field === 'name' && typeof kyc.fullName === 'string') return <span>{kyc.fullName}</span>;
    if (field === 'project' && typeof kyc.projectName === 'string') return <span>{kyc.projectName}</span>;
    if (field === 'designation' && typeof kyc.designation === 'string') return <span>{kyc.designation}</span>;
    return null;
  }

  // At the top, with other useState hooks
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceModalLoading, setAttendanceModalLoading] = useState(false);
  const [attendanceModalError, setAttendanceModalError] = useState<string | null>(null);
  const [attendanceModalData, setAttendanceModalData] = useState<EmployeeData | null>(null);
  const [punchInAddress, setPunchInAddress] = useState('');
  const [punchOutAddress, setPunchOutAddress] = useState('');

  // Add reverse geocode utility (simple fetch, replace with your API key if needed)
  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    if (!lat || !lng) return '';
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyCqvcEKoqwRG5PBDIVp-MjHyjXKT3s4KY4`);
      const data = await res.json();
      if (data.results && data.results[0]) {
        return data.results[0].formatted_address;
      }
      return '';
    } catch {
      return '';
    }
  }

  // Add a helper function at the top of the component (after imports)
  function formatTime(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    // If it's already in HH:mm:ss or HH:mm format
    const timeMatch = dateString.match(/(\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
      return timeMatch[1];
    }
    const timeMatchShort = dateString.match(/(\d{2}:\d{2})/);
    if (timeMatchShort) {
      return timeMatchShort[1] + ':00';
    }
    // Try parsing as a full date string
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // If the time is 00:00:00, treat as missing
      const h = date.getHours();
      const m = date.getMinutes();
      const s = date.getSeconds();
      if (h === 0 && m === 0 && s === 0) return '-';
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
    return '-';
  }

  // Add a helper component for attendance punch in photo cell
  function AttendancePunchInPhotoCell({ employeeId, punchInPhoto, date }: { employeeId: string, punchInPhoto?: string, date?: string }) {
    const [photo, setPhoto] = useState<string | null>(punchInPhoto || null);
    const [loading, setLoading] = useState(false);
    const cache = useRef<{ [key: string]: string | null }>({});

    useEffect(() => {
      if (photo || !employeeId || !date) return;
      const cacheKey = `${employeeId}-${date}`;
      if (cache.current[cacheKey] !== undefined) {
        setPhoto(cache.current[cacheKey]);
        return;
      }
      setLoading(true);
      const todayStr = typeof date === 'string' ? date.slice(0, 10) : '';
      const today = new Date(todayStr);
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${month}&year=${year}`)
        .then(res => res.json())
        .then(data => {
          const todayRecord = (data.attendance || []).find((rec: Record<string, unknown>) => typeof rec.date === 'string' && rec.date.slice(0, 10) === todayStr);
          const fetchedPhoto = todayRecord?.punchInPhoto || null;
          cache.current[cacheKey] = fetchedPhoto;
          setPhoto(fetchedPhoto);
        })
        .catch(() => setPhoto(null))
        .finally(() => setLoading(false));
    }, [employeeId, date, photo]);

    if (photo) {
      return <Image src={photo} alt="Punch In" width={40} height={40} className="w-10 h-10 rounded-full object-cover border" />;
    }
    if (loading) {
      return <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg></div>;
    }
    return <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-500">N/A</div>;
  }

  // Card counts and loading states
  const [newJoinersCount, setNewJoinersCount] = useState<number | null>(null);
  const [onLeaveTodayCount, setOnLeaveTodayCount] = useState<number | null>(null);
  const [activeTodayCount, setActiveTodayCount] = useState<number | null>(null);
  const [newJoinersLoading, setNewJoinersLoading] = useState(true);
  const [onLeaveTodayLoading, setOnLeaveTodayLoading] = useState(true);
  const [activeTodayLoading, setActiveTodayLoading] = useState(true);

  useEffect(() => {
    async function fetchNewJoiners() {
      setNewJoinersLoading(true);
      try {
        const res = await fetch('https://cafm.zenapi.co.in/api/kyc/reports/new-joiners?days=7');
        const data = await res.json();
        setNewJoinersCount(Array.isArray(data.data) ? data.data.length : (data.count ?? 0));
      } catch {
        setNewJoinersCount(null);
      } finally {
        setNewJoinersLoading(false);
      }
    }
    async function fetchOnLeaveToday() {
      setOnLeaveTodayLoading(true);
      try {
        const res = await fetch('https://cafm.zenapi.co.in/api/dashboard/on-leave-today');
        const data = await res.json();
        setOnLeaveTodayCount(Array.isArray(data.onLeave) ? data.onLeave.length : 0);
      } catch {
        setOnLeaveTodayCount(null);
      } finally {
        setOnLeaveTodayLoading(false);
      }
    }
    async function fetchActiveToday() {
      setActiveTodayLoading(true);
      try {
        const res = await fetch('https://cafm.zenapi.co.in/api/attendance/active-today/count');
        const data = await res.json();
        setActiveTodayCount(typeof data.activeCount === 'number' ? data.activeCount : 0);
      } catch {
        setActiveTodayCount(null);
      } finally {
        setActiveTodayLoading(false);
      }
    }
    fetchNewJoiners();
    fetchOnLeaveToday();
    fetchActiveToday();
  }, []);

  // Card click handlers
  const handleCardClick = (filter: 'new-joiners' | 'attendance' | 'on-leave') => {
    setEmployeeDataFilter(filter);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border cursor-pointer`}
          onClick={() => handleCardClick('new-joiners')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Employees</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {totalLoading ? '...' : (totalEmployees ?? '--')}
              </p>
            </div>
            <FaUsers className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div
          className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border cursor-pointer`}
          onClick={() => handleCardClick('new-joiners')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>New Joiners</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {newJoinersLoading ? '...' : (newJoinersCount ?? '--')}
              </p>
            </div>
            <FaUserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div
          className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border cursor-pointer`}
          onClick={() => handleCardClick('attendance')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Active Today</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {activeTodayLoading ? '...' : (activeTodayCount ?? '--')}
              </p>
            </div>
            <FaClipboardList className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div
          className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border cursor-pointer`}
          onClick={() => handleCardClick('on-leave')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>On Leave Today</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {onLeaveTodayLoading ? '...' : (onLeaveTodayCount ?? '--')}
              </p>
            </div>
            <FaIdBadge className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border`}>
        {/* Table Header */}
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Employee Data</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-800'
                  }`}
                />
              </div>
              {/* Project Filter Dropdown */}
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                <option value="all">All Projects</option>
                {projectOptions.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
              
              <select
                value={employeeDataFilter}
                onChange={(e) => setEmployeeDataFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                <option value="new-joiners">New Joiners</option>
                <option value="on-leave">On Leave Today</option>
                <option value="attendance">Attendance</option>
              </select>

            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {employeeDataLoading ? (
            <div className="p-6 text-center text-gray-400">Loading...</div>
          ) : employeeDataError ? (
            <div className="p-6 text-center text-red-500">{employeeDataError}</div>
          ) : (
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-white'}>
                <tr>
                  {employeeDataFilter === 'new-joiners' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Designation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date of Joining</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {employeeDataFilter === 'on-leave' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Leave Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">No. of Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {employeeDataFilter === 'attendance' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Punch In Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-200'}`}>
                {employeeData.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-6 text-gray-400">No data</td></tr>
                ) : employeeDataFilter === 'new-joiners' ? (
                  paginatedData.map((item: EmployeeData, idx: number) => (
                    <tr key={idx} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <KycPhotoCell employeeId={item.employeeId} />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.fullName}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.employeeId}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.projectName}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.designation}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.dateOfJoining}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-500 hover:text-blue-700 transition-colors" onClick={() => handleViewKYC(item.employeeId)}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : employeeDataFilter === 'on-leave' ? (
                  employeeData.map((item, idx) => {
                    // Calculate number of days (inclusive)
                    let numDays = 1;
                    if (item.startDate && item.endDate) {
                      const start = new Date(item.startDate);
                      const end = new Date(item.endDate);
                      numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1);
                    }
                    return (
                      <tr key={idx} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="relative inline-block">
                            <KycInfoCell employeeId={item.employeeId} field="photo" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2">
                              <StatusDot status={item.status} customClass="w-4 h-4 border-2 border-white shadow-md" />
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><KycInfoCell employeeId={item.employeeId} field="name" /></td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.employeeId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><KycInfoCell employeeId={item.employeeId} field="project" /></td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.leaveType}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{numDays}</td>
                        <td className={`px-6 py-4 whitespace-normal text-sm max-w-xs break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-blue-500 hover:text-blue-700 transition-colors" onClick={() => handleViewKYC(item.employeeId, item)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  paginatedData.map((item: EmployeeData, idx: number) => (
                    <tr key={idx} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <AttendancePunchInPhotoCell employeeId={item.employeeId} punchInPhoto={item.punchInPhoto} date={item.date} />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.employeeId}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.projectName}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{typeof item.date === 'string' ? item.date.slice(0,10) : '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.punchInTime ? formatTime(item.punchInTime) : '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          className="text-blue-500 hover:underline"
                          onClick={async () => {
                            setAttendanceModalOpen(true);
                            setAttendanceModalLoading(true);
                            setAttendanceModalError(null);
                            setAttendanceModalData(null);
                            setPunchInAddress('');
                            setPunchOutAddress('');
                            try {
                              const today = new Date();
                              const month = today.getMonth() + 1;
                              const year = today.getFullYear();
                              const res = await fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${item.employeeId}&month=${month}&year=${year}`);
                              const data = await res.json();
                              // Find today's record
                              const todayStr = today.toISOString().slice(0, 10);
                              const todayRecord = (data.attendance || []).find((rec: Record<string, unknown>) => typeof rec.date === 'string' && rec.date.slice(0, 10) === todayStr);
                              setAttendanceModalData(todayRecord as EmployeeData);
                              if (todayRecord) {
                                if (todayRecord.punchInLatitude && todayRecord.punchInLongitude) {
                                  reverseGeocode(todayRecord.punchInLatitude, todayRecord.punchInLongitude).then(setPunchInAddress);
                                }
                                if (todayRecord.punchOutLatitude && todayRecord.punchOutLongitude) {
                                  reverseGeocode(todayRecord.punchOutLatitude, todayRecord.punchOutLongitude).then(setPunchOutAddress);
                                }
                              }
                            } catch (e) {
                              setAttendanceModalError('Failed to fetch attendance details.');
                            } finally {
                              setAttendanceModalLoading(false);
                            }
                          }}
                        >
                          <FaEye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {employeeData.length} of {employeeData.length} results
            </div>
          </div>
        </div>

        {/* Pagination for new joiners and attendance */}
        {(employeeDataFilter === 'new-joiners' || employeeDataFilter === 'attendance') && totalPages > 1 && (
          <div className="flex justify-end items-center gap-2 px-6 py-4 border-t border-gray-600">
            <button
              className="px-3 py-1 text-sm transition-colors rounded disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-blue-500 text-white rounded">{page}</span>
            <button
              className="px-3 py-1 text-sm transition-colors rounded disabled:opacity-50"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}

        {/* KYC Modal */}
        {kycModalOpen && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === 'dark' ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-40'}`}>
            <div className={`rounded-lg p-8 max-w-md w-full shadow-lg relative border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <button className={`absolute top-2 right-2 text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'dark:hover:text-gray-200' : ''}`} onClick={closeKycModal}>&times;</button>
              <div className={`mb-4 text-xl font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Employee Details</div>
              {kycModalLoading ? (
                <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}`}>Loading...</div>
              ) : kycModalError ? (
                <div className={`text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>{kycModalError}</div>
              ) : kycModalData && kycModalData.kyc && (
                (() => {
                  // Type guard for personalDetails
                  const personalDetails =
                    typeof kycModalData.kyc.personalDetails === 'object' &&
                    kycModalData.kyc.personalDetails !== null
                      ? (kycModalData.kyc.personalDetails as Record<string, unknown>)
                      : {};

                  return (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center">
                        <Image
                          src={typeof personalDetails.employeeImage === 'string' ? personalDetails.employeeImage : ''}
                          alt="Employee"
                          width={96}
                          height={96}
                          className="w-24 h-24 rounded-full object-cover mb-2 border"
                        />
                        <div className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {typeof personalDetails.fullName === 'string' ? personalDetails.fullName : ''}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          <span className="font-semibold">Employee ID:</span>{' '}
                          {typeof personalDetails.employeeId === 'string' ? personalDetails.employeeId : ''}
                        </div>
                        <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          <span className="font-semibold">Project:</span>{' '}
                          {typeof personalDetails.projectName === 'string' ? personalDetails.projectName : ''}
                        </div>
                        <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          <span className="font-semibold">Designation:</span>{' '}
                          {typeof personalDetails.designation === 'string' ? personalDetails.designation : ''}
                        </div>
                        <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          <span className="font-semibold">Date of Joining:</span>{' '}
                          {typeof personalDetails.dateOfJoining === 'string' ? personalDetails.dateOfJoining : ''}
                        </div>
                        <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          <span className="font-semibold">Phone:</span>{' '}
                          {typeof personalDetails.phoneNumber === 'string' ? personalDetails.phoneNumber : ''}
                        </div>
                        {/* ...add more fields as needed, always using type guards */}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* Attendance Modal */}
        {attendanceModalOpen && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 ${theme === 'dark' ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-40'}`}>
            <div className={`rounded-xl shadow-lg p-8 max-w-2xl w-full relative overflow-y-auto max-h-[90vh] border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <button
                onClick={() => setAttendanceModalOpen(false)}
                className={`absolute top-2 right-2 text-2xl font-bold text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'dark:hover:text-gray-200' : ''}`}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                Attendance Record Details
              </h2>
              {attendanceModalLoading ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}`}>Loading...</div>
              ) : attendanceModalError ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>{attendanceModalError}</div>
              ) : attendanceModalData ? (
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Date:</span>
                    <span>{attendanceModalData.date ? new Date(attendanceModalData.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Project Name:</span>
                    <span>{attendanceModalData.projectName || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Designation:</span>
                    <span>{attendanceModalData.designation || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Punch In Time:</span>
                    <span>{attendanceModalData.punchInTime ? formatTime(attendanceModalData.punchInTime) : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Punch Out Time:</span>
                    <span>{attendanceModalData.punchOutTime ? formatTime(attendanceModalData.punchOutTime) : '-'}</span>
                  </div>
                  {/* Punch In Details */}
                  <div className="flex flex-col border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium mb-2" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Punch In Details:</span>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between">
                        <span style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Time:</span>
                        <span>{attendanceModalData.punchInTime ? formatTime(attendanceModalData.punchInTime) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Location:</span>
                        <span className="text-right max-w-[70%]">{punchInAddress || (attendanceModalData.punchInLatitude && attendanceModalData.punchInLongitude ? `${attendanceModalData.punchInLatitude}, ${attendanceModalData.punchInLongitude}` : '-')}</span>
                      </div>
                    </div>
                  </div>
                  {/* Punch Out Details */}
                  <div className="flex flex-col border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium mb-2" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Punch Out Details:</span>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between">
                        <span style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Time:</span>
                        <span>{attendanceModalData.punchOutTime ? formatTime(attendanceModalData.punchOutTime) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Location:</span>
                        <span className="text-right max-w-[70%]">{punchOutAddress || (attendanceModalData.punchOutLatitude && attendanceModalData.punchOutLongitude ? `${attendanceModalData.punchOutLatitude}, ${attendanceModalData.punchOutLongitude}` : '-' )}</span>
                      </div>
                    </div>
                  </div>
                  {/* Attendance Photos */}
                  <div className="flex flex-col items-start border-b pb-2" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                    <span className="font-medium mb-1" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Attendance Photos:</span>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div>
                        <span className="text-sm block mb-1" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Punch In:</span>
                        {attendanceModalData.punchInPhoto ? (
                          <Image src={attendanceModalData.punchInPhoto} alt="Punch In" width={192} height={240} className="rounded-lg w-48 h-60 object-cover" />
                        ) : (
                          <div className="w-48 h-60 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">No Photo</div>
                        )}
                      </div>
                      <div>
                        <span className="text-sm block mb-1" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>Punch Out:</span>
                        {attendanceModalData.punchOutPhoto ? (
                          <Image src={attendanceModalData.punchOutPhoto} alt="Punch Out" width={192} height={240} className="rounded-lg w-48 h-60 object-cover" />
                        ) : (
                          <div className="w-48 h-60 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">No Photo</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No attendance data for today.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for photo cell
function KycPhotoCell({ employeeId }: { employeeId: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    async function fetchPhoto() {
      try {
        const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
        const data = await res.json();
        if (isMounted && data.kycData && data.kycData.personalDetails && data.kycData.personalDetails.employeeImage) {
          setPhotoUrl(data.kycData.personalDetails.employeeImage);
        }
      } catch {}
    }
    fetchPhoto();
    return () => { isMounted = false; };
  }, [employeeId]);
  return photoUrl ? (
    <Image src={photoUrl} alt="Employee" width={40} height={40} className="w-10 h-10 rounded-full object-cover border" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">N/A</div>
  );
} 