'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  FaCalendarAlt, 
  FaCheckCircle, 
  
  FaExclamationCircle, 
  
  FaChevronDown, 
  FaSearch, 
  FaChevronLeft, 
  FaChevronRight,  
  FaClipboardCheck,
  
  FaClock,
  
  
  FaClock as FaClockIcon,
  FaSignInAlt,
  FaSignOutAlt,
} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { useTheme } from "@/context/ThemeContext";

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday} from 'date-fns';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { calculateHoursUtc } from '../../utils/attendanceUtils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Add TypeScript interfaces
interface Location {
  latitude: number;
  longitude: number;
}

interface AttendanceRecord {
  date: string;
  displayDate: string;
  status: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  punchInUtc: string | null;
  punchOutUtc: string | null;
  punchInLocation?: Location;
  punchOutLocation?: Location;
  punchInPhoto?: string;
  punchOutPhoto?: string;
  isLate: boolean;
  remarks?: string;
  totalHoursWorked: string;
}

interface StatusInfo {
  code: string;
  color: string;
}

function ViewAttendanceContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activities, setActivities] = useState<AttendanceRecord[]>([]);
  const [showDetailedRecordsModal, setShowDetailedRecordsModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const [selectedActivity, setSelectedActivity] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const employeeId = getEmployeeId();
        const month = selectedDate.getMonth() + 1;
        const year = selectedDate.getFullYear();
        
        const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${month}&year=${year}`);
        const data = await response.json();
        
        if (response.ok && data.attendance) {
  const transformedActivities = data.attendance.map((record: AttendanceRecord) => ({
    date: format(new Date(record.date), 'yyyy-MM-dd'),
    displayDate: format(new Date(record.date), 'EEE, MMM d, yyyy'),
    status: record.status,
    punchInTime: record.punchInTime,
    punchOutTime: record.punchOutTime,
    punchInUtc: record.punchInUtc,
    punchOutUtc: record.punchOutUtc,
    isLate: record.isLate || false,
    remarks: record.remarks,
    totalHoursWorked: record.totalHoursWorked || '0',
    punchInLocation: record.punchInLocation,
    punchOutLocation: record.punchOutLocation,
  }));
  setActivities(transformedActivities);
} else {
  setError('No attendance data found');
  setActivities([]);
}

      } catch (error) {
        console.error('Error fetching attendance:', error);
        setError('Failed to fetch attendance data');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [router, selectedDate]);

  const getCalendarDays = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start, end });
    // Add empty days at the start
    const firstDayOfWeek = start.getDay();
    const leadingEmpty = Array.from({ length: firstDayOfWeek });
    // Add empty days at the end to fill 6 rows (42 cells)
    const totalCells = 42;
    const trailingEmpty = Array.from({ length: totalCells - (leadingEmpty.length + days.length) });
    return [
      ...leadingEmpty.map(() => null),
      ...days,
      ...trailingEmpty.map(() => null)
    ];
  };

  // Update the getStatusForDate function for better contrast
const getStatusForDate = (date: Date): StatusInfo => {
  const activity = activities.find(a => a.date === format(date, 'yyyy-MM-dd'));
  if (!activity) return { code: '', color: 'text-gray-400' };

  // Handle different status types
  switch (activity.status.toLowerCase()) {
    case 'present':
      return { 
        code: 'P', 
        color: activity.isLate ? 'text-amber-700' : 'text-green-700'  // Darker shades for better contrast
      };
    case 'absent':
      return { code: 'A', color: 'text-red-700' };  // Darker red
    case 'holiday':
      return { code: 'H', color: 'text-blue-700' };  // Darker blue
    case 'weekend':
      return { code: 'W', color: 'text-gray-600' };  // Darker gray
    default:
      return { code: activity.status[0], color: 'text-gray-700' };  // Darker gray
  }
};

// Update the getDayBackgroundColor function
const getDayBackgroundColor = (activity: AttendanceRecord | undefined, isCurrentMonth: boolean) => {
  if (!isCurrentMonth) return theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50';
  if (!activity) return theme === 'dark' ? 'bg-gray-800' : 'bg-white';

  const darkModeColors = {
    present: 'bg-green-500/20',
    late: 'bg-amber-500/20',
    absent: 'bg-red-500/20',
    holiday: 'bg-blue-500/20',
    weekend: 'bg-gray-800/50'
  };

  const lightModeColors = {
    present: 'bg-green-100',
    late: 'bg-amber-100',
    absent: 'bg-red-100',
    holiday: 'bg-blue-100',
    weekend: 'bg-gray-50'
  };

  const colors = theme === 'dark' ? darkModeColors : lightModeColors;

  switch (activity.status.toLowerCase()) {
    case 'present': return activity.isLate ? colors.late : colors.present;
    case 'absent': return colors.absent;
    case 'holiday': return colors.holiday;
    case 'weekend': return colors.weekend;
    default: return theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  }
};

  // Update AttendanceLegend component
  const AttendanceLegend = () => (
    <div className={`mt-4 p-4 rounded-lg shadow-sm border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <h4 className={`text-sm font-semibold mb-2 ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>Status Legend</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/30"></div>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/30"></div>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/30"></div>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30"></div>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Holiday</span>
        </div>
      </div>
    </div>
  );

  // Add this calculation before the return statement
  const calculateWorkingStats = () => {
    if (!activities || activities.length === 0) return {
      workingDays: 0,
      presentDays: 0,
      attendanceRate: '0.00'
    };

    const workingDays = activities.filter(a => 
      a.status.toLowerCase() === 'present' || 
      a.status.toLowerCase() === 'absent' || 
      a.status.toLowerCase().includes('late')
    ).length;

    const presentDays = activities.filter(a => 
      a.status.toLowerCase() === 'present' || 
      a.status.toLowerCase().includes('late')
    ).length;

    const attendanceRate = workingDays > 0 
      ? ((presentDays / workingDays) * 100).toFixed(2) 
      : '0.00';

    return { workingDays, presentDays, attendanceRate };
  };

  const { workingDays,  attendanceRate } = calculateWorkingStats();

  // Add filtered activities computation with proper typing
  const filteredActivities = useMemo<AttendanceRecord[]>(() => {
    return activities.filter((activity: AttendanceRecord) => {
      const matchesSearch = search === '' ||
        activity.displayDate.toLowerCase().includes(search.toLowerCase()) ||
        activity.status.toLowerCase().includes(search.toLowerCase()) ||
        (activity.punchInTime && activity.punchInTime.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || activity.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activities, search, statusFilter]);

  // Add paginated activities computation with proper typing
  const paginatedActivities = useMemo<AttendanceRecord[]>(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredActivities.slice(startIndex, endIndex);
  }, [currentPage, filteredActivities, recordsPerPage]);

  // Update the totalPages calculation
  const totalPages = Math.ceil(filteredActivities.length / recordsPerPage);

  return (
    <div className={`max-w-7xl mx-auto space-y-8 py-4 md:py-8 px-2 sm:px-4 ${
      theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
    }`}>
      {/* Header */}
      <div className={`rounded-2xl p-4 sm:p-8 mb-8 shadow-lg ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-gray-800 to-gray-700'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600'
      }`}>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Monthly Overview</h2>
          <p className="text-white/90 mt-1 text-base sm:text-lg">{format(selectedDate, 'MMMM yyyy')} • {workingDays} Working Days</p>
        </div>
      </div>
      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Left: Graph + Instructions */}
        <div className={`rounded-xl shadow-sm border p-4 sm:p-6 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          {/* Attendance Distribution Graph */}
          <div className="flex justify-center items-center mb-6">
            <div className="w-32 h-32 sm:w-48 sm:h-48 mx-auto">
              <CircularProgressbar
                value={parseFloat(attendanceRate)}
                text={`${attendanceRate}%`}
                styles={buildStyles({
                  rotation: 0,
                  strokeLinecap: 'round',
                  textSize: '16px',
                  pathTransitionDuration: 0.5,
                  pathColor: theme === 'dark' ? '#22C55E' : '#10B981',
                  textColor: theme === 'dark' ? '#FFFFFF' : '#111827',
                  trailColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                  backgroundColor: 'transparent',
                })}
              />
            </div>
          </div>
          <div className={`text-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
          } mb-6 text-base sm:text-lg`}>
            Attendance Rate
          </div>
          {/* Instructions */}
          <div className={`w-full rounded-lg p-3 sm:p-4 border ${
            theme === 'dark'
              ? 'bg-gray-700/50 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}>Instructions & Notes</h3>
            <ul className={`list-decimal list-inside text-sm space-y-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <li>Your attendance is automatically recorded when you punch in and out using the mobile app.</li>
              <li>Late arrival is marked if you punch in after your scheduled start time.</li>
              <li>Each punch requires a photo and your location for verification purposes.</li>
              <li>Contact HR if you notice any discrepancies in your attendance records.</li>
            </ul>
            <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded-lg text-xs">
                  <FaExclamationCircle className="w-4 h-4 flex-shrink-0" />
              Important: Ensure your device&apos;s location services and camera permissions are enabled for accurate attendance tracking.
                </div>
              </div>
            </div>
        {/* Right: Calendar */}
        <div className={`rounded-xl shadow-sm border p-4 sm:p-6 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-4 gap-2">
            <h3 className={`text-lg sm:text-xl font-semibold ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
            }`}>
              {format(selectedDate, 'MMMM yyyy')}
            </h3>
            {/* Calendar controls (prev, today, next) */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                    className="px-2 sm:px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="px-2 sm:px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                    className="px-2 sm:px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                  >
                    &gt;
                  </button>
                </div>
              </div>
          <div className="w-full" style={{ minWidth: 0, maxWidth: 420 }}>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className={`text-center text-xs font-semibold py-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {day}
                </div>
                ))}
              {getCalendarDays().map((date, idx) => {
                if (!date) {
                  return <div key={idx} className="w-10 h-10 sm:w-14 sm:h-14" />;
                }
                
                const activity = activities.find(a => a.date === format(date, 'yyyy-MM-dd'));
                const isCurrentMonth = isSameMonth(date, selectedDate);
                const { code, color } = getStatusForDate(date);
                
                return (
                  <div
                    key={idx}
                    className={`
                      relative w-10 h-10 sm:w-14 sm:h-14 border rounded-lg flex flex-col items-center justify-center
                      ${getDayBackgroundColor(activity, isCurrentMonth)}
                      ${isToday(date) ? 'ring-2 ring-blue-400' : ''}
                      ${!isCurrentMonth ? 'opacity-40' : ''}
                      cursor-pointer hover:shadow-md transition duration-200
                      group
                    `}
                    onClick={() => activity && setSelectedActivity(activity)}
                  >
                    <span className={`absolute top-0.5 left-1 text-xs ${isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                      {format(date, 'd')}
                    </span>
                    <span className={`mt-1 sm:mt-2 text-xs sm:text-sm font-semibold ${color}`}>
                      {code}
                    </span>
                    {activity?.isLate && (
                      <div className="absolute bottom-0.5 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full" 
                           title="Late Arrival" />
                    )}
                    {activity && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-lg transition-colors" />
                    )}
                  </div>
                );
              })}
              </div>
            
            {/* Add Legend */}
            <AttendanceLegend />
            
                <button
                  onClick={() => setShowDetailedRecordsModal(true)}
                  className={`mt-6 sm:mt-8 w-full py-2 sm:py-3 rounded-lg font-medium shadow transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  <FaClipboardCheck className="inline mr-2" /> View Detailed Report
                </button>
          </div>
              </div>
            </div>
      {/* Error or Loading */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <FaClock className="animate-spin text-blue-500 w-8 h-8 mr-2" />
          <span className="text-gray-600">Loading attendance...</span>
          </div>
      )}
      {error && (
        <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
          <FaExclamationCircle className="text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      {/* Detailed Report Modal */}
      {showDetailedRecordsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-2 sm:px-0">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 max-w-5xl w-full mx-0 sm:mx-4 relative overflow-y-auto max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md">
                <FaClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-gray-900">Attendance Records</h3>
                <p className="text-gray-600 text-xs sm:text-base">Detailed view of your attendance history</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 mt-4">
              <div className="relative w-full sm:w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black placeholder:text-gray-400 text-sm"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full appearance-none bg-white pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="holiday">Holiday</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full bg-white min-w-[600px] text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"><FaCalendarAlt className="inline mr-1 text-blue-500" /> Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"><FaCheckCircle className="inline mr-1 text-green-500" /> Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"><FaSignInAlt className="inline mr-1 text-emerald-500" /> Punch In</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"><FaSignOutAlt className="inline mr-1 text-amber-500" /> Punch Out</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"><FaClockIcon className="inline mr-1 text-indigo-500" /> Hours</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 sm:px-6 py-8 sm:py-12 text-center text-gray-500">No records found</td>
                    </tr>
                  ) : paginatedActivities.map((activity: AttendanceRecord, idx: number) => {
                    const isTodayRow = activity.date === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <tr key={idx} className={`hover:bg-blue-50 transition-all duration-150 ${isTodayRow ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-base sm:text-lg text-black">
                              {format(new Date(activity.date), 'dd')}
                            </span>
                            <span className="text-xs font-bold text-black uppercase">
                              {format(new Date(activity.date), 'MMM')}
                            </span>
                            <span className="text-xs font-bold text-black">
                              {format(new Date(activity.date), 'EEEE')}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          {activity.status === 'Holiday' ? (
                            <span className="text-blue-600 font-bold">Holiday</span>
                          ) : (activity.punchInUtc && activity.punchOutUtc && activity.totalHoursWorked !== '0') ? (
                            <span className="font-bold text-xs sm:text-base text-black flex items-center gap-1 sm:gap-2">
                              <FaClockIcon className="text-indigo-500" /> {activity.totalHoursWorked}
                            </span>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          {activity.punchInTime ? (
                            <span className="font-bold text-xs sm:text-base text-black">{activity.punchInTime}</span>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          {activity.punchOutTime ? (
                            <span className="font-bold text-xs sm:text-base text-black">{activity.punchOutTime}</span>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          {activity.punchInTime && activity.punchOutTime ? (
                            <span className="font-bold text-xs sm:text-base text-black flex items-center gap-1 sm:gap-2">
                              <FaClockIcon className="text-indigo-500" /> {calculateHoursUtc(activity.punchInUtc, activity.punchOutUtc)}
                            </span>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedActivity(activity)}
                            className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium shadow-sm border border-blue-200 text-xs sm:text-base"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 sm:px-6 py-2 sm:py-4 border-t border-gray-100 mt-2 gap-2 sm:gap-0">
                <div className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-0">
                  Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredActivities.length)} of {filteredActivities.length} records
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4 sm:mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailedRecordsModal(false)}
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition font-medium shadow-sm text-xs sm:text-base"
              >
                Close
              </button>
            </div>
            {/* Details Modal */}
            {selectedActivity && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-2 sm:px-0">
                <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 max-w-md w-full mx-0 sm:mx-4 relative">
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="absolute top-2 sm:top-4 right-2 sm:right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                    <FaClipboardCheck className="text-blue-600" /> Attendance Details
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Date</span>
                      <span className="font-semibold text-base sm:text-lg text-gray-900">{selectedActivity.displayDate}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Status</span>
                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedActivity.status.toLowerCase() === 'present' ? 'bg-green-100 text-green-800' :
                        selectedActivity.status.toLowerCase() === 'absent' ? 'bg-red-100 text-red-800' :
                        selectedActivity.status.toLowerCase().includes('holiday') ? 'bg-blue-100 text-blue-800' :
                        selectedActivity.status.toLowerCase().includes('late') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedActivity.status}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Punch In Time</span>
                      <span className="font-medium text-gray-900">{selectedActivity.punchInTime || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Punch Out Time</span>
                      <span className="font-medium text-gray-900">{selectedActivity.punchOutTime || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Late?</span>
                      <span className="font-medium text-gray-900">{selectedActivity.isLate ? 'Yes' : 'No'}</span>
                    </div>
                    {selectedActivity.remarks && (
                      <div>
                        <span className="block text-xs text-gray-500 mb-1">Remarks</span>
                        <span className="text-gray-900">{selectedActivity.remarks}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 sm:mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedActivity(null)}
                      className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition font-medium shadow-sm text-xs sm:text-base"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ViewAttendancePage() {
  return (
    <DashboardLayout>
      <ViewAttendanceContent />
    </DashboardLayout>
  );
}