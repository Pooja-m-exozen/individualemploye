'use client';

import { useEffect, useState, useRef } from 'react';
import { FaSpinner, FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaCamera, FaChartLine, FaChartPie, FaChartBar, FaUserCircle, FaMapMarkerAlt, FaRegCalendarAlt, FaRegClock, FaPlus, FaHistory, FaCalendarCheck, FaCheck, FaExclamationTriangle, FaSync, FaFilter, FaChevronDown, FaSearch } from 'react-icons/fa';
import { isAuthenticated } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface AttendanceActivity {
  date: string;
  displayDate: string;
  status: string;
  time: string | null;
  isLate: boolean;
  remarks?: string;
}

interface AttendanceResponse {
  status: string;
  data: {
    activities: AttendanceActivity[];
    totalRecords: number;
  };
}

interface MarkAttendanceResponse {
  message: string;
  attendance: {
    _id: string;
    employeeId: string;
    projectName: string;
    designation: string;
    date: string;
    punchInTime: string;
    punchInPhoto: string;
    punchOutLatitude: number;
    punchOutLongitude: number;
  };
}

interface MonthlyStats {
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  overtimeDays: number;
  lateArrivals: number;
  earlyArrivals: number;
  earlyLeaves: number;
  attendanceRate: string;
  summary: {
    totalDays: number;
    daysPresent: number;
    daysAbsent: number;
    punctualityIssues: {
      lateArrivals: number;
      earlyArrivals: number;
      earlyLeaves: number;
    };
  };
}

interface MonthlyStatsResponse {
  success: boolean;
  message: string;
  data: MonthlyStats;
}

interface RegularizationRequest {
  date: string;
  punchInTime: string;
  punchOutTime: string;
  reason: string;
  status: string;
}

// Add new skeleton loading component with better animation
const SkeletonLoader = () => (
  <div className="animate-pulse space-y-8">
    <div className="h-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl mb-8"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl"></div>
      ))}
    </div>
    <div className="h-96 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl"></div>
  </div>
);

// Add new status badge component with better styling
const StatusBadge = ({ status, isLate }: { status: string; isLate: boolean }) => {
  const getBadgeStyle = () => {
    if (status === 'Present') {
      return isLate ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200';
    } else if (status === 'Absent') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getBadgeStyle()} transition-all duration-200`}>
      {status}
    </span>
  );
};

// Add new action button component
const ActionButton = ({ icon: Icon, label, onClick, variant = 'primary' }: { icon: any; label: string; onClick: () => void; variant?: 'primary' | 'secondary' }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
      variant === 'primary'
        ? 'bg-blue-600 text-white hover:bg-blue-700'
        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

export default function AttendancePage() {
  const router = useRouter();
  const [activities, setActivities] = useState<AttendanceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    holidays: 0
  });
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [markAttendanceError, setMarkAttendanceError] = useState<string | null>(null);
  const [markAttendanceSuccess, setMarkAttendanceSuccess] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(true);
  const [monthlyStatsError, setMonthlyStatsError] = useState<string | null>(null);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [regularizationLoading, setRegularizationLoading] = useState(false);
  const [regularizationError, setRegularizationError] = useState<string | null>(null);
  const [regularizationSuccess, setRegularizationSuccess] = useState<string | null>(null);
  const [regularizationForm, setRegularizationForm] = useState<RegularizationRequest>({
    date: '',
    punchInTime: '',
    punchOutTime: '',
    reason: '',
    status: 'Present'
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [regularizationHistory, setRegularizationHistory] = useState<any[]>([]);
  const [regularizationHistoryLoading, setRegularizationHistoryLoading] = useState(true);
  const [regularizationHistoryError, setRegularizationHistoryError] = useState<string | null>(null);
  const [showRegularizationHistoryModal, setShowRegularizationHistoryModal] = useState(false);
  const [shift, setShift] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftError, setShiftError] = useState<string | null>(null);
  // Add new state for sorting and filtering
  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'status' | 'time';
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchAttendanceData();
    fetchMonthlyStats();
    fetchRegularizationHistory();
    fetchShift();
  }, [router, selectedMonth, selectedYear]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/EFMS3295/recent-activities?month=${selectedMonth}&year=${selectedYear}`);
      const data: AttendanceResponse = await response.json();
      if (data.status === 'success') {
        setActivities(data.data.activities);
        // Calculate stats
        const stats = data.data.activities.reduce((acc, activity) => {
          if (activity.status === 'Present') {
            acc.present++;
            if (activity.isLate) acc.late++;
          } else if (activity.status === 'Absent') {
            acc.absent++;
          } else if (activity.status.includes('Sunday') || 
                    activity.status.includes('Saturday') || 
                    activity.status.includes('Holiday')) {
            acc.holidays++;
          }
          return acc;
        }, { present: 0, absent: 0, late: 0, holidays: 0 });
        setStats(stats);
      }
      setLoading(false);
    } catch (error) {
      setError('Failed to load attendance data');
      setLoading(false);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const currentDate = new Date();
      const response = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/EFMS3295/monthly-stats?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
      );
      const data: MonthlyStatsResponse = await response.json();

      if (data.success) {
        setMonthlyStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch monthly stats');
      }
    } catch (error) {
      setMonthlyStatsError(error instanceof Error ? error.message : 'Failed to fetch monthly stats');
    } finally {
      setMonthlyStatsLoading(false);
    }
  };

  const fetchRegularizationHistory = async () => {
    setRegularizationHistoryLoading(true);
    setRegularizationHistoryError(null);
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/attendance/EFMS3295/regularization-history');
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setRegularizationHistory(data);
      } else if (response.ok && Array.isArray(data.data)) {
        setRegularizationHistory(data.data);
      } else {
        throw new Error('Failed to fetch regularization history');
      }
    } catch (error) {
      setRegularizationHistoryError('Failed to load regularization history');
    } finally {
      setRegularizationHistoryLoading(false);
    }
  };

  const fetchShift = async () => {
    setShiftLoading(true);
    setShiftError(null);
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/shift/shifts/employee/EFMS3295');
      const data = await response.json();
      if (data.success) {
        setShift(data.employeeShift);
      } else {
        throw new Error('Failed to fetch shift info');
      }
    } catch (error) {
      setShiftError('Failed to load shift info');
    } finally {
      setShiftLoading(false);
    }
  };

  const getStatusColor = (status: string, isLate: boolean) => {
    if (status === 'Present') {
      return isLate ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';
    } else if (status === 'Absent') {
      return 'text-red-600 bg-red-50';
    } else if (status.includes('Sunday') || status.includes('Saturday') || status.includes('Holiday')) {
      return 'text-blue-600 bg-blue-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusIcon = (status: string, isLate: boolean) => {
    if (status === 'Present') {
      return isLate ? <FaExclamationCircle className="w-5 h-5" /> : <FaCheckCircle className="w-5 h-5" />;
    } else if (status === 'Absent') {
      return <FaTimesCircle className="w-5 h-5" />;
    }
    return <FaCalendarAlt className="w-5 h-5" />;
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error('Unable to retrieve your location. Please enable location services.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

  const handleMarkAttendance = async () => {
    if (!photoPreview) {
      setMarkAttendanceError('Please capture a photo first');
      return;
    }

    setMarkingAttendance(true);
    setMarkAttendanceError(null);
    setMarkAttendanceSuccess(null);
    setLocationError(null);

    try {
      // Get current location
      const location = await getCurrentLocation();

      const response = await fetch('https://cafm.zenapi.co.in/api/attendance/EFMS3295/mark-with-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo: photoPreview,
          latitude: location.latitude,
          longitude: location.longitude
        }),
      });

      const data: MarkAttendanceResponse = await response.json();

      if (response.ok) {
        setMarkAttendanceSuccess('Attendance marked successfully!');
        setPhotoPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Refresh attendance data
        fetchAttendanceData();
      } else {
        throw new Error(data.message || 'Failed to mark attendance');
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('location')) {
          setLocationError(error.message);
        } else {
          setMarkAttendanceError(error.message);
        }
      } else {
        setMarkAttendanceError('Failed to mark attendance');
      }
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleRegularizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegularizationLoading(true);
    setRegularizationError(null);
    setRegularizationSuccess(null);

    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/attendance/EFMS3295/regularize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(regularizationForm),
      });

      const data = await response.json();

      if (response.ok) {
        setRegularizationSuccess('Attendance regularization request submitted successfully!');
        setRegularizationForm({
          date: '',
          punchInTime: '',
          punchOutTime: '',
          reason: '',
          status: 'Present'
        });
        setTimeout(() => {
          setShowRegularizationModal(false);
          fetchAttendanceData(); // Refresh attendance data
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to submit regularization request');
      }
    } catch (error) {
      setRegularizationError(error instanceof Error ? error.message : 'Failed to submit regularization request');
    } finally {
      setRegularizationLoading(false);
    }
  };

  const renderMonthYearPicker = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const years = [];
    for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);
    return (
      <div className="flex items-center gap-2 bg-white/80 rounded-xl px-3 py-2 shadow-sm border border-gray-200">
        <span className="text-gray-400"><FaCalendarAlt className="w-4 h-4" /></span>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          className="appearance-none px-2 py-1 rounded-lg border border-transparent bg-transparent text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 font-medium"
        >
          {months.map((m, i) => (
            <option value={i + 1} key={m}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="appearance-none px-2 py-1 rounded-lg border border-transparent bg-transparent text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 font-medium"
        >
          {years.map(y => (
            <option value={y} key={y}>{y}</option>
          ))}
        </select>
      </div>
    );
  };

  // Mark Attendance section (inline, no big card)
  const renderMarkAttendanceInline = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Mark Today's Attendance</h2>
        <p className="text-gray-500">Capture a photo to record your attendance</p>
      </div>
      <div className="flex gap-3 mt-4 md:mt-0">
        <button
          onClick={() => setShowMarkAttendanceModal(true)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-md hover:from-blue-700 hover:to-purple-700 transition-all text-base"
        >
          Mark Attendance
        </button>
        <button
          onClick={() => setShowRegularizationModal(true)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold shadow-md hover:from-pink-600 hover:to-orange-500 transition-all text-base"
        >
          Regularize Attendance
        </button>
        <button
          onClick={() => setShowRegularizationHistoryModal(true)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-800 transition-all text-base"
        >
          View Regularization History
        </button>
      </div>
    </div>
  );

  // Redesigned Shift Card UI (modern, visually striking, well-aligned)
  const renderShiftCard = () => (
    <div className="mb-10 w-full flex justify-center">
      {shiftLoading ? (
        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-4 rounded-xl animate-pulse w-full max-w-3xl">
          <FaSpinner className="animate-spin" /> Loading shift info...
        </div>
      ) : shiftError ? (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl w-full max-w-3xl">
          <FaExclamationCircle className="w-5 h-5" /> {shiftError}
        </div>
      ) : shift ? (
        <div className="w-full max-w-3xl flex flex-col md:flex-row items-stretch bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-3xl">
          {/* Icon Section */}
          <div className="flex items-center justify-center bg-blue-100 md:bg-blue-50 p-8 md:p-12 md:min-w-[160px]">
            <div className="bg-blue-200 rounded-2xl p-6 flex items-center justify-center">
              <FaRegClock className="w-14 h-14 text-blue-600" />
            </div>
          </div>
          {/* Divider for desktop */}
          <div className="hidden md:block w-px bg-blue-100 my-8"></div>
          {/* Details Section */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-extrabold text-blue-900">{shift.shiftId.shiftName}</h2>
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">{shift.department}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span className="flex items-center gap-2 text-gray-800 font-semibold text-base">
                <FaClock className="w-5 h-5 text-blue-500" />
                <span className="tracking-wide">{shift.shiftId.startTime} - {shift.shiftId.endTime}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {shift.shiftId.workingDays.map((day: string) => (
                  <span key={day} className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200 whitespace-nowrap shadow-sm">{day}</span>
                ))}
              </div>
            </div>
            <div className="text-gray-600 text-base mb-1 font-medium">{shift.shiftId.description}</div>
            <div className="text-gray-400 text-xs mt-1">Assigned by: {shift.assignedBy} | Status: {shift.status}</div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderMonthlyStats = () => {
    if (monthlyStatsLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading monthly statistics...</p>
          </div>
        </div>
      );
    }

    if (monthlyStatsError) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <FaExclamationCircle className="w-full h-full" />
            </div>
            <p className="text-red-600 mb-4">{monthlyStatsError}</p>
            <button 
              onClick={fetchMonthlyStats}
              className="px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors inline-flex items-center gap-2"
            >
              <FaSync className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (!monthlyStats) return null;

    const attendanceData = {
      labels: ['Present', 'Absent', 'Half Days'],
      datasets: [
        {
          data: [monthlyStats.presentDays, monthlyStats.absentDays, monthlyStats.halfDays],
          backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
          borderWidth: 0,
        },
      ],
    };

    const punctualityData = {
      labels: ['Late Arrivals', 'Early Arrivals', 'Early Leaves'],
      datasets: [
        {
          label: 'Count',
          data: [
            monthlyStats.lateArrivals,
            monthlyStats.earlyArrivals,
            monthlyStats.earlyLeaves,
          ],
          backgroundColor: ['#F59E0B', '#3B82F6', '#EF4444'],
          borderRadius: 8,
        },
      ],
    };

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl shadow-sm border border-blue-200/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-600">Attendance Rate</h3>
              <div className="p-2 bg-blue-100/50 rounded-lg border border-blue-200/50">
                <FaChartLine className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              {monthlyStats.attendanceRate}%
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl shadow-sm border border-emerald-200/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-emerald-600">Working Days</h3>
              <div className="p-2 bg-emerald-100/50 rounded-lg border border-emerald-200/50">
                <FaCalendarAlt className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
              {monthlyStats.workingDays}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-2xl shadow-sm border border-violet-200/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-violet-600">Overtime Days</h3>
              <div className="p-2 bg-violet-100/50 rounded-lg border border-violet-200/50">
                <FaClock className="w-5 h-5 text-violet-500" />
              </div>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text text-transparent">
              {monthlyStats.overtimeDays}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-2xl shadow-sm border border-amber-200/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-amber-600">Late Arrivals</h3>
              <div className="p-2 bg-amber-100/50 rounded-lg border border-amber-200/50">
                <FaExclamationTriangle className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
              {monthlyStats.lateArrivals}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/90 rounded-2xl shadow-sm border border-gray-100/80 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-6">
              Attendance Distribution
            </h3>
            <div className="h-80">
              <Pie
                data={attendanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 20,
                        font: {
                          size: 12,
                          family: "'Inter', sans-serif"
                        },
                        usePointStyle: true
                      }
                    }
                  },
                  cutout: '60%',
                  radius: '90%'
                }}
              />
            </div>
          </div>
          
          <div className="bg-white/90 rounded-2xl shadow-sm border border-gray-100/80 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-6">
              Punctuality Analysis
            </h3>
            <div className="h-80">
              <Bar
                data={punctualityData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        font: {
                          size: 12,
                          family: "'Inter', sans-serif"
                        }
                      },
                      grid: {
                        display: false
                      }
                    },
                    x: {
                      ticks: {
                        font: {
                          size: 12,
                          family: "'Inter', sans-serif"
                        }
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RegularizationModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full transform transition-all duration-300 scale-100 animate-fade-in-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Regularize Attendance
            </h2>
            <button
              onClick={() => setShowRegularizationModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimesCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleRegularizationSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={regularizationForm.date}
                  onChange={(e) => setRegularizationForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-gray-50/50"
                />
                <FaRegCalendarAlt className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Punch In Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={regularizationForm.punchInTime}
                    onChange={(e) => setRegularizationForm(prev => ({ ...prev, punchInTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-gray-50/50"
                  />
                  <FaRegClock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Punch Out Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={regularizationForm.punchOutTime}
                    onChange={(e) => setRegularizationForm(prev => ({ ...prev, punchOutTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-gray-50/50"
                  />
                  <FaRegClock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Reason
              </label>
              <textarea
                required
                value={regularizationForm.reason}
                onChange={(e) => setRegularizationForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-gray-900 bg-gray-50/50"
                placeholder="Please provide a reason for regularization..."
              />
            </div>

            {regularizationError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl animate-fade-in">
                <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{regularizationError}</p>
              </div>
            )}

            {regularizationSuccess && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl animate-fade-in">
                <FaCheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{regularizationSuccess}</p>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowRegularizationModal(false)}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={regularizationLoading}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  regularizationLoading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                {regularizationLoading ? (
                  <div className="flex items-center gap-2">
                    <FaSpinner className="animate-spin w-5 h-5" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Modal for regularization history
  const RegularizationHistoryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-auto p-8 relative flex flex-col">
        <button
          onClick={() => setShowRegularizationHistoryModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <FaTimesCircle className="w-7 h-7" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Regularization History</h2>
        {regularizationHistoryLoading ? (
          <div className="flex items-center gap-2 text-blue-600"><FaSpinner className="animate-spin" /> Loading...</div>
        ) : regularizationHistoryError ? (
          <div className="text-red-500">{regularizationHistoryError}</div>
        ) : regularizationHistory.length === 0 ? (
          <div className="text-gray-400">No regularization requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Punch In</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Punch Out</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {regularizationHistory.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-blue-50/50">
                    <td className="px-4 py-2 whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.punchInTime}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.punchOutTime}</td>
                    <td className="px-4 py-2 max-w-xs truncate" title={item.reason}>{item.reason}</td>
                    <td className="px-4 py-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'Approved' ? 'bg-green-100 text-green-700' : item.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Stats Cards (Present, Absent, Late, Holidays)
  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-green-400/10 to-green-400/5 rounded-2xl shadow-sm border border-green-200/50 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-green-600">Present</h3>
          <FaCheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-3xl font-bold text-green-700">{stats.present}</p>
      </div>
      <div className="bg-gradient-to-br from-red-400/10 to-red-400/5 rounded-2xl shadow-sm border border-red-200/50 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-red-600">Absent</h3>
          <FaTimesCircle className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-3xl font-bold text-red-700">{stats.absent}</p>
      </div>
      <div className="bg-gradient-to-br from-yellow-400/10 to-yellow-400/5 rounded-2xl shadow-sm border border-yellow-200/50 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-yellow-600">Late</h3>
          <FaExclamationCircle className="w-5 h-5 text-yellow-500" />
        </div>
        <p className="text-3xl font-bold text-yellow-700">{stats.late}</p>
      </div>
      <div className="bg-gradient-to-br from-blue-400/10 to-blue-400/5 rounded-2xl shadow-sm border border-blue-200/50 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-blue-600">Holidays</h3>
          <FaRegCalendarAlt className="w-5 h-5 text-blue-500" />
        </div>
        <p className="text-3xl font-bold text-blue-700">{stats.holidays}</p>
      </div>
    </div>
  );

  // Enhanced sorting function with month filtering
  const sortActivities = (activities: AttendanceActivity[]) => {
    const filteredByMonth = activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.getMonth() + 1 === selectedMonth && 
             activityDate.getFullYear() === selectedYear;
    });

    return [...filteredByMonth].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortConfig.key === 'time') {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return sortConfig.direction === 'asc' 
          ? a.time.localeCompare(b.time)
          : b.time.localeCompare(a.time);
      }
      return sortConfig.direction === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    });
  };

  // Enhanced filter function with search
  const filterActivities = (activities: AttendanceActivity[]) => {
    let filtered = activities;
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(activity => activity.status === filterStatus);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.displayDate.toLowerCase().includes(query) ||
        activity.status.toLowerCase().includes(query) ||
        (activity.time && activity.time.toLowerCase().includes(query)) ||
        (activity.remarks && activity.remarks.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  // Add sort handler
  const handleSort = (key: 'date' | 'status' | 'time') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Add filter handler
  const handleFilter = (status: string) => {
    setFilterStatus(status);
  };

  // Enhanced Attendance Records List
  const renderAttendanceRecords = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 backdrop-blur-sm mt-8">
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Attendance Records</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Filter by:</span>
              <select
                value={filterStatus}
                onChange={(e) => handleFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all" className="text-gray-900">All Status</option>
                <option value="Present" className="text-gray-900">Present</option>
                <option value="Absent" className="text-gray-900">Absent</option>
                <option value="Half Day" className="text-gray-900">Half Day</option>
              </select>
            </div>
            {renderMonthYearPicker()}
          </div>
        </div>

        {/* Search Bar - Reduced Width */}
        <div className="flex justify-end">
          <div className="relative w-full sm:w-64 md:w-80">
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-900" />
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FaCalendarAlt className="w-12 h-12 text-gray-900 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">No attendance records found for this month.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th 
                  className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Date</span>
                    {sortConfig.key === 'date' && (
                      <FaChevronDown className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status</span>
                    {sortConfig.key === 'status' && (
                      <FaChevronDown className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Time</span>
                    {sortConfig.key === 'time' && (
                      <FaChevronDown className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  <span className="font-semibold">Remarks</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filterActivities(sortActivities(activities)).map((activity, idx) => (
                <tr 
                  key={idx} 
                  className="border-b last:border-b-0 hover:bg-blue-50/70 transition-colors group"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {new Date(activity.date).getDate()}
                      </div>
                      <span className="text-gray-900 font-medium">{activity.displayDate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={activity.status} isLate={activity.isLate} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-gray-900">
                      {activity.time ? (
                        <>
                          <FaClock className="w-4 h-4 text-gray-900" />
                          <span className="font-medium">{activity.time}</span>
                        </>
                      ) : (
                        <span className="text-gray-900 font-medium">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate text-gray-900 group-hover:whitespace-normal group-hover:overflow-visible group-hover:bg-white group-hover:shadow-lg group-hover:rounded-lg group-hover:p-2 group-hover:absolute group-hover:z-10">
                      {activity.remarks || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Total Records:</span>
            <span className="text-sm font-bold text-gray-900">{filterActivities(sortActivities(activities)).length}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Sorted by:</span>
              <span className="text-sm font-bold text-gray-900 capitalize">{sortConfig.key}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Order:</span>
              <span className="text-sm font-bold text-gray-900 capitalize">{sortConfig.direction}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return <SkeletonLoader />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-red-500 text-center p-6 bg-red-50 rounded-xl shadow-lg max-w-md backdrop-blur-sm">
            <FaExclamationCircle className="w-12 h-12 mx-auto mb-4" />
            <p className="font-semibold text-lg mb-2">{error}</p>
            <button 
              onClick={fetchAttendanceData}
              className="mt-4 px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full flex justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen py-8">
        <div className="w-full max-w-4xl px-4 md:px-8">
          {renderShiftCard()}
          {renderMarkAttendanceInline()}
          {renderStatsCards()}
          {renderMonthlyStats()}
          {renderAttendanceRecords()}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      {renderContent()}
      {showRegularizationModal && <RegularizationModal />}
      {showMarkAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[400px] w-full h-auto p-8 relative flex flex-col">
            <button
              onClick={() => setShowMarkAttendanceModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <FaTimesCircle className="w-7 h-7" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mark Attendance</h2>
            <p className="text-gray-500 mb-6">Capture a photo to record your attendance</p>
            <div className="border-b border-gray-200 mb-6"></div>
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  ref={fileInputRef}
                  className="hidden"
                  id="photo-capture-modal"
                />
                <label
                  htmlFor="photo-capture-modal"
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-blue-700 font-medium border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-gray-50 transition-all cursor-pointer group bg-white"
                >
                  <FaCamera className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                  <span>Take Photo</span>
                </label>
              </div>
              {locationError && (
                <div className="flex items-center space-x-2 text-red-500 bg-red-50 p-4 rounded-xl animate-fade-in border border-red-200">
                  <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{locationError}</p>
                </div>
              )}
              {markAttendanceError && (
                <div className="flex items-center space-x-2 text-red-500 bg-red-50 p-4 rounded-xl animate-fade-in border border-red-200">
                  <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{markAttendanceError}</p>
                </div>
              )}
              {markAttendanceSuccess && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-xl animate-fade-in border border-green-200">
                  <FaCheckCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{markAttendanceSuccess}</p>
                </div>
              )}
              <button
                onClick={handleMarkAttendance}
                disabled={!photoPreview || markingAttendance}
                className={`w-full px-6 py-4 rounded-xl font-medium transition-all transform hover:scale-[1.02] shadow-lg text-lg flex items-center justify-center gap-2 ${
                  !photoPreview || markingAttendance
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                {markingAttendance ? (
                  <>
                    <FaSpinner className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FaCheck className="w-5 h-5" />
                    <span>Mark Attendance</span>
                  </>
                )}
              </button>
              <div className="relative">
                {photoPreview ? (
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 group shadow-lg border border-gray-200 mt-4">
                    <img
                      src={photoPreview}
                      alt="Attendance photo"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                      <button
                        onClick={() => {
                          setPhotoPreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors backdrop-blur-sm"
                      >
                        Retake Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-2xl bg-white flex flex-col items-center justify-center text-blue-700 border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors duration-300 group mt-4">
                    <FaCamera className="w-16 h-16 mb-4 transform group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-blue-700 text-center px-4">
                      No photo captured yet.<br />Click the button above to take a photo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showRegularizationHistoryModal && <RegularizationHistoryModal />}
    </DashboardLayout>
  );
}