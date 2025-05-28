'use client';

import React, { useState, useEffect } from 'react';
import { FaBirthdayCake, FaTrophy, FaCalendarCheck, FaUserClock, FaProjectDiagram, FaClipboardList, FaFileAlt, FaPlusCircle, FaFileUpload, FaRegCalendarPlus, FaTicketAlt } from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartOptions } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import AttendanceAnalytics from '@/components/dashboard/AttendanceAnalytics';
import Confetti from 'react-confetti';
import { useUser } from '@/context/UserContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface BirthdayResponse {
  success: boolean;
  message: string;
  data?: {
    fullName: string;
    employeeId: string;
    designation: string;
    employeeImage: string;
    personalizedWish: string;
  }[];
}

interface WorkAnniversaryResponse {
  success: boolean;
  message: string;
  data?: {
    fullName: string;
    employeeId: string;
    designation: string;
    employeeImage: string;
    yearsOfService: number;
    personalizedWish: string;
  }[];
}

interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
  pending: number;
}

interface LeaveBalances {
  EL: LeaveBalance;
  SL: LeaveBalance;
  CL: LeaveBalance;
  CompOff: LeaveBalance;
}

interface LeaveBalanceResponse {
  employeeId: string;
  employeeName: string;
  year: number;
  balances: LeaveBalances;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  totalPending: number;
}

interface EmployeeInfo {
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
}

export default function Dashboard() {
  const userDetails = useUser();
  const [birthdays, setBirthdays] = useState<BirthdayResponse | null>(null);
  const [anniversaries, setAnniversaries] = useState<WorkAnniversaryResponse | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
  const [attendanceActivities, setAttendanceActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [leaveType, setLeaveType] = useState('EL');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    numberOfDays: 1,
    isHalfDay: false,
    halfDayType: null as string | null,
    reason: '',
    emergencyContact: '',
    attachments: [] as File[],
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // Regularization Form State
  const [regularizationForm, setRegularizationForm] = useState({
    date: '',
    punchInTime: '',
    punchOutTime: '',
    reason: '',
    status: 'Present',
  });
  const [regularizationLoading, setRegularizationLoading] = useState(false);
  const [regularizationError, setRegularizationError] = useState<string | null>(null);
  const [regularizationSuccess, setRegularizationSuccess] = useState<string | null>(null);

  // Upload Document Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // State for analytics view and chart type
  const [analyticsView, setAnalyticsView] = useState<'attendance' | 'leave'>('attendance');
  const [attendanceChartType, setAttendanceChartType] = useState<'bar' | 'pie'>('bar');
  const [leaveChartType, setLeaveChartType] = useState<'bar' | 'pie'>('bar');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getWelcomeMessage = () => {
    const day = currentTime.getDay();
    const isWeekend = day === 0 || day === 6;
    
    if (isWeekend) {
      return "Enjoy your weekend! Here's your dashboard overview.";
    }
    
    const hour = currentTime.getHours();
    if (hour < 12) {
      return "Hope you have a productive day ahead!";
    } else if (hour < 17) {
      return "Keep up the great work!";
    } else {
      return "Great job today! Here's your dashboard summary.";
    }
  };

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [birthdaysRes, anniversariesRes, leaveBalanceRes, attendanceRes] = await Promise.all([
        fetch('https://cafm.zenapi.co.in/api/kyc/birthdays/today'),
        fetch('https://cafm.zenapi.co.in/api/kyc/work-anniversaries/today'),
        fetch('https://cafm.zenapi.co.in/api/leave/balance/EFMS3295'),
        fetch('https://cafm.zenapi.co.in/api/attendance/EFMS3295/recent-activities')
      ]);

      const [birthdaysData, anniversariesData, leaveBalanceData, attendanceData] = await Promise.all([
        birthdaysRes.json(),
        anniversariesRes.json(),
        leaveBalanceRes.json(),
        attendanceRes.json()
      ]);

      setBirthdays(birthdaysData);
      setAnniversaries(anniversariesData);
      setLeaveBalance(leaveBalanceData);
      if (attendanceData.status === 'success') {
        setAttendanceActivities(attendanceData.data.activities);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Polling setup
  useEffect(() => {
    fetchData();

    // Poll every 5 minutes
    const pollInterval = setInterval(() => {
      setRefreshing(true);
      fetchData(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (birthdays?.success && birthdays.data && birthdays.data.length > 0) {
      setShowCelebration(true);
      setCelebrationMessage(
        `Happy Birthday, ${birthdays.data.map(b => b.fullName).join(', ')}! 🎉\n${birthdays.data[0].personalizedWish}`
      );
    } else if (anniversaries?.success && anniversaries.data && anniversaries.data.length > 0) {
      setShowCelebration(true);
      setCelebrationMessage(
        `Happy Work Anniversary, ${anniversaries.data.map(a => a.fullName).join(', ')}! 🎊\n${anniversaries.data[0].personalizedWish}`
      );
    } else {
      setShowCelebration(false);
      setCelebrationMessage(null);
    }
  }, [birthdays, anniversaries]);

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );

  const RefreshButton = () => (
    <button
      onClick={() => {
        setRefreshing(true);
        fetchData(false);
      }}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white text-gray-600
        rounded-full text-sm font-medium transition-all duration-300 hover:shadow-md
        border border-gray-200 hover:border-gray-300"
      disabled={refreshing}
    >
      <svg
        className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {refreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  );

  // Colors for leave types
  const leaveColors = {
    EL: {
      gradient: 'from-emerald-400 to-emerald-600',
      bg: 'rgba(16, 185, 129, 0.8)',
      border: 'rgba(16, 185, 129, 1)',
      light: 'bg-emerald-50',
      text: 'text-emerald-600'
    },
    SL: {
      gradient: 'from-red-400 to-red-600',
      bg: 'rgba(239, 68, 68, 0.8)',
      border: 'rgba(239, 68, 68, 1)',
      light: 'bg-red-50',
      text: 'text-red-600'
    },
    CL: {
      gradient: 'from-blue-400 to-blue-600',
      bg: 'rgba(59, 130, 246, 0.8)',
      border: 'rgba(59, 130, 246, 1)',
      light: 'bg-blue-50',
      text: 'text-blue-600'
    },
    CompOff: {
      gradient: 'from-purple-400 to-purple-600',
      bg: 'rgba(139, 92, 246, 0.8)',
      border: 'rgba(139, 92, 246, 1)',
      light: 'bg-purple-50',
      text: 'text-purple-600'
    }
  };

  // Colors for attendance status
  const attendanceColors = {
    Present: {
      bg: 'rgba(16, 185, 129, 0.8)',
      border: 'rgba(16, 185, 129, 1)',
      text: 'text-emerald-600'
    },
    Absent: {
      bg: 'rgba(239, 68, 68, 0.8)',
      border: 'rgba(239, 68, 68, 1)',
      text: 'text-red-600'
    },
    Late: {
      bg: 'rgba(245, 158, 11, 0.8)',
      border: 'rgba(245, 158, 11, 1)',
      text: 'text-amber-600'
    }
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
    layout: {
      padding: 0
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          font: {
            family: "'Geist', sans-serif",
            size: 12,
            weight: 'normal' as 'normal'
          },
          usePointStyle: true,
          padding: 20,
          boxWidth: 10
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        bodyFont: {
          size: 13,
          family: "'Geist', sans-serif",
          weight: 'normal' as 'normal'
        },
        titleFont: {
          size: 14,
          weight: 'bold' as 'bold',
          family: "'Geist', sans-serif"
        },
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} days`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
          lineWidth: 1,
          display: true
        },
        ticks: {
          font: {
            size: 12,
            family: "'Geist', sans-serif",
            weight: 'normal' as 'normal'
          },
          color: '#64748b',
          padding: 8,
          stepSize: 1
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            family: "'Geist', sans-serif",
            weight: 'normal' as 'normal'
          },
          color: '#64748b',
          padding: 8
        }
      }
    },
    elements: {
      bar: {
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      }
    },
    datasets: {
      bar: {
        barThickness: 40,
        maxBarThickness: 60,
        barPercentage: 0.95,
        categoryPercentage: 0.95
      }
    }
  };

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 16,
        bottom: 16,
        left: 16,
        right: 16
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        align: 'center' as const,
        labels: {
          font: {
            family: "'Geist', sans-serif",
            size: 12,
            weight: 'normal' as 'normal'
          },
          usePointStyle: true,
          padding: 16,
          boxWidth: 10
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        bodyFont: {
          size: 13,
          family: "'Geist', sans-serif",
          weight: 'normal' as 'normal'
        },
        titleFont: {
          size: 14,
          weight: 'bold' as 'bold',
          family: "'Geist', sans-serif"
        },
        callbacks: {
          label: function(context) {
             return `${context.label}: ${context.formattedValue}`; // Standard pie chart tooltip format
          }
        }
      }
    }
  };

  const renderAttendanceChart = () => {
    if (!attendanceActivities || attendanceActivities.length === 0) return <p className="text-center text-gray-500">No attendance data available.</p>;

    // Filter activities for the current month and process data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyActivities = attendanceActivities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear && !['Sunday', '4th Saturday', '2nd Saturday'].includes(activity.status);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (monthlyActivities.length === 0) return <p className="text-center text-gray-500">No attendance data for the current month.</p>;

    // Calculate total counts for Present, Absent, and Late
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    monthlyActivities.forEach(activity => {
      if (activity.status === 'Present') presentCount++;
      if (activity.status === 'Absent') absentCount++;
      if (activity.isLate) lateCount++; // Count late occurrences
    });

    const barChartData = {
      labels: ['Present', 'Absent', 'Late'],
      datasets: [
        {
          label: 'Count',
          data: [presentCount, absentCount, lateCount],
          backgroundColor: [
            attendanceColors.Present.bg,
            attendanceColors.Absent.bg,
            attendanceColors.Late.bg,
          ],
          borderColor: [
            attendanceColors.Present.border,
            attendanceColors.Absent.border,
            attendanceColors.Late.border,
          ],
          borderWidth: 1,
        },
      ],
    };

    // Process data for pie chart
    const statusCounts: { [key: string]: number } = {};
     monthlyActivities.forEach(activity => {
      statusCounts[activity.status] = (statusCounts[activity.status] || 0) + 1;
    });
    // Include Late status in pie chart counts if applicable
     monthlyActivities.forEach(activity => {
       if(activity.isLate) statusCounts['Late'] = (statusCounts['Late'] || 0) + 1;
    });

    const pieChartLabels = Object.keys(statusCounts).filter(status => statusCounts[status] > 0);
    const pieChartDataValues = Object.values(statusCounts).filter(count => count > 0);

    const pieChartData = {
      labels: pieChartLabels,
      datasets: [
        {
          label: '# of Days',
          data: pieChartDataValues,
          backgroundColor: [
            attendanceColors.Present.bg,
            attendanceColors.Absent.bg,
            attendanceColors.Late.bg,
            'rgba(54, 162, 235, 0.6)', // Example additional color if needed
            'rgba(153, 102, 255, 0.6)', // Example additional color if needed
            'rgba(201, 203, 207, 0.6)', // Example additional color if needed
          ],
          borderColor: [
            attendanceColors.Present.border,
            attendanceColors.Absent.border,
            attendanceColors.Late.border,
            'rgba(54, 162, 235, 1)', // Example additional color if needed
            'rgba(153, 102, 255, 1)', // Example additional color if needed
            'rgba(201, 203, 207, 1)', // Example additional color if needed
          ],
          borderWidth: 1,
        },
      ],
    };

    if (attendanceChartType === 'bar') {
      return (
        <div className="w-full h-full max-w-3xl mx-auto">
          <div className="h-[400px]">
            <Bar
              data={barChartData}
              options={barChartOptions}
            />
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full max-w-2xl mx-auto p-4">
          <Pie data={pieChartData} options={pieChartOptions} />
        </div>
      );
    }
  };

  const renderLeaveChart = () => {
    if (!leaveBalance) return <p>No leave balance data available.</p>;

    type LeaveType = 'EL' | 'SL' | 'CL' | 'CompOff';
    const leaveTypes: LeaveType[] = ['EL', 'SL', 'CL', 'CompOff'];
    const allocatedData = leaveTypes.map((type: LeaveType) => leaveBalance.balances[type].allocated);

    const chartData = {
      labels: leaveTypes,
      datasets: [
        {
          label: 'Allocated Days',
          data: allocatedData,
          backgroundColor: [
            leaveColors.EL.bg,
            leaveColors.SL.bg,
            leaveColors.CL.bg,
            leaveColors.CompOff.bg,
          ],
          borderColor: [
            leaveColors.EL.border,
            leaveColors.SL.border,
            leaveColors.CL.border,
            leaveColors.CompOff.border,
          ],
          borderWidth: 1,
        },
      ],
    };

    if (leaveChartType === 'bar') {
      return (
        <div className="w-full h-full max-w-4xl mx-auto p-4">
          <Bar
            data={chartData}
            options={barChartOptions}
          />
        </div>
      );
    } else {
      return (
        <div className="w-full h-full max-w-2xl mx-auto p-4">
          <Pie data={chartData} options={pieChartOptions} />
        </div>
      );
    }
  };

  const renderChart = () => {
    if (analyticsView === 'attendance') {
      return renderAttendanceChart();
    } else {
      return renderLeaveChart();
    }
  };

  const renderChartTypeToggle = () => {
    const currentChartType = analyticsView === 'attendance' ? attendanceChartType : leaveChartType;
    const setChartType = analyticsView === 'attendance' ? setAttendanceChartType : setLeaveChartType;
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setChartType('bar')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${currentChartType === 'bar' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Bar Chart
        </button>
        <button
          onClick={() => setChartType('pie')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${currentChartType === 'pie' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Pie Chart
        </button>
      </div>
    );
  };

  const renderLeaveBalanceGraphs = () => {
    if (!leaveBalance) return null;

    type LeaveType = 'EL' | 'SL' | 'CL' | 'CompOff';
    const leaveTypes: LeaveType[] = ['EL', 'SL', 'CL', 'CompOff'];

    const data = {
      labels: ['Earned Leave', 'Sick Leave', 'Casual Leave', 'Comp Off'],
      datasets: [
        {
          data: leaveTypes.map(type => leaveBalance.balances[type].allocated),
          backgroundColor: leaveTypes.map(type => leaveColors[type].bg),
          borderColor: leaveTypes.map(type => leaveColors[type].border),
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 40,
        }
      ]
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leave Balance Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100
          transform transition-all duration-300 hover:shadow-xl group">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span className="text-emerald-500">📊</span>
            Leave Balance Overview
          </h3>
          <div className="transform transition-transform duration-300 group-hover:scale-[1.02]">
            <Bar
              data={data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'x',
                layout: {
                  padding: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20
                  }
                },
                plugins: {
                  legend: {
                    position: 'top' as const,
                    align: 'center' as const,
                    labels: {
                      font: {
                        family: "'Geist', sans-serif",
                        size: 12,
                        weight: 'normal' as 'normal'
                      },
                      usePointStyle: true,
                      padding: 20,
                      boxWidth: 10
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1f2937',
                    bodyColor: '#4b5563',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    padding: 12,
                    bodyFont: {
                      size: 13,
                      family: "'Geist', sans-serif",
                      weight: 'normal' as 'normal'
                    },
                    titleFont: {
                      size: 14,
                      weight: 'bold' as 'bold',
                      family: "'Geist', sans-serif"
                    },
                    callbacks: {
                      label: function(context) {
                        if ('y' in context.parsed) {
                          return `${context.dataset.label}: ${context.parsed.y} days`;
                        } else {
                          return `${context.dataset.label}: ${context.parsed}`;
                        }
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(226, 232, 240, 0.5)',
                      lineWidth: 1,
                      display: true
                    },
                    ticks: {
                      font: {
                        size: 12,
                        family: "'Geist', sans-serif",
                        weight: 'normal' as 'normal'
                      },
                      color: '#64748b',
                      padding: 8,
                      stepSize: 1
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        size: 12,
                        family: "'Geist', sans-serif",
                        weight: 'normal' as 'normal'
                      },
                      color: '#64748b',
                      padding: 8
                    }
                  }
                },
                elements: {
                  bar: {
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                  }
                },
                datasets: {
                  bar: {
                    barThickness: 40,
                    maxBarThickness: 60,
                    barPercentage: 0.95,
                    categoryPercentage: 0.95
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Leave Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          {leaveTypes.map((type, index) => {
            const balance = leaveBalance.balances[type];
            const percentage = (balance.used / balance.allocated) * 100;

            return (
              <div
                key={type}
                className={`bg-gradient-to-br ${leaveColors[type].gradient} rounded-xl p-4 text-white
                  transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
                style={{
                  animation: `fadeSlideIn 0.5s ease-out forwards ${index * 0.1}s`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium opacity-90">{type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm`}>
                    {balance.remaining} left
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs opacity-75">Used</span>
                    <span className="text-sm font-medium group-hover:font-bold transition-all">
                      {balance.used}/{balance.allocated}
                    </span>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex mb-1 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-white/20 backdrop-blur-sm">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-white/20 backdrop-blur-sm">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center
                          bg-white/40 transition-all duration-500 ease-in-out group-hover:bg-white/50"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const MetricCard = ({ icon: Icon, title, value, subtext, gradient }: {
    icon: any,
    title: string,
    value: string,
    subtext: string,
    gradient: string
  }) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-md p-4 text-white
      transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer group`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">
          <Icon className="text-2xl opacity-80" />
        </div>
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs opacity-75 mt-1">{subtext}</p>
    </div>
  );

  const handleRequestLeaveChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setLeaveRequestForm(prev => ({
        ...prev,
        [name]: checked,
        halfDayType: name === 'isHalfDay' && !checked ? null : prev.halfDayType,
      }));
    } else {
      setLeaveRequestForm(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    setRequestError(null);
    setRequestSuccess(null);
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/leave/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: userDetails?.employeeId,
          ...leaveRequestForm,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit leave request');
      }
      setRequestSuccess('Leave request submitted successfully!');
      setLeaveRequestForm({
        leaveType: '',
        startDate: '',
        endDate: '',
        numberOfDays: 1,
        isHalfDay: false,
        halfDayType: null,
        reason: '',
        emergencyContact: '',
        attachments: [],
      });
      setTimeout(() => setShowLeaveModal(false), 1500);
    } catch (err: any) {
      setRequestError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRegularizationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRegularizationForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegularizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegularizationLoading(true);
    setRegularizationError(null);
    setRegularizationSuccess(null);
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/${userDetails?.employeeId}/regularize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regularizationForm),
      });
      const data = await response.json();
      if (response.ok) {
        setRegularizationSuccess('Attendance regularization request submitted successfully!');
        setRegularizationForm({ date: '', punchInTime: '', punchOutTime: '', reason: '', status: 'Present' });
        setTimeout(() => setShowRegularizationModal(false), 1500);
      } else {
        throw new Error(data.message || 'Failed to submit regularization request');
      }
    } catch (error: any) {
      setRegularizationError(error.message || 'Failed to submit regularization request');
    } finally {
      setRegularizationLoading(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      if (!uploadFile) throw new Error('Please select a file');
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('type', uploadType);
      formData.append('description', uploadDesc);
      const response = await fetch(`https://cafm.zenapi.co.in/api/kyc/${userDetails?.employeeId}`, {
        method: 'PUT',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUploadSuccess('Document uploaded successfully!');
        setUploadFile(null);
        setUploadType('');
        setUploadDesc('');
        setTimeout(() => setShowUploadModal(false), 1500);
      } else {
        throw new Error(data.message || 'Failed to upload document');
      }
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 relative">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto space-y-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/80 backdrop-blur rounded-xl shadow-sm p-4 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-20 bg-slate-100 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-0 px-2 md:pt-0 md:px-4 relative overflow-x-hidden">
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 animate-fade-in">
          <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={400} recycle={false} />
          <div className="text-center p-8 rounded-2xl shadow-xl bg-white/90 border-4 border-yellow-300 animate-bounce-in">
            <h2 className="text-4xl font-extrabold text-yellow-500 mb-4 drop-shadow-lg">
              {celebrationMessage?.split('\n')[0]}
            </h2>
            <p className="text-lg text-gray-700 font-medium italic">
              {celebrationMessage?.split('\n')[1]}
            </p>
          </div>
        </div>
      )}
      {/* Welcome Section */}
      <div className="mt-0 mb-5">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-3 shadow flex flex-col md:flex-row md:items-center md:justify-between gap-3 relative overflow-hidden text-white">
          <div className="space-y-0.5 z-10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-full flex items-center justify-center shadow">
                <span className="text-lg">👋</span>
              </div>
              <div>
                <h1 className="text-base font-semibold">
                  Welcome back,{' '}
                  <span className="text-lg font-bold text-blue-200">
                    {userDetails?.fullName || (
                      <span className="inline-block h-5 w-28 bg-blue-300 rounded animate-pulse align-middle">&nbsp;</span>
                    )}
                  </span>
                </h1>
                <p className="text-xs opacity-90 mt-0.5">{getWelcomeMessage()}</p>
              </div>
            </div>
            {userDetails && (
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow border border-white/40 backdrop-blur-sm">
                  {userDetails.designation} • {userDetails.department}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 z-10">
            <button className="bg-white text-blue-600 px-3 py-1.5 rounded-lg shadow-md hover:bg-blue-50 transition font-medium text-xs">View My Tickets</button>
            <button className="bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-blue-600 transition font-medium text-xs">View Reports</button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl shadow-lg px-5 py-3 transition-transform duration-200 hover:scale-105 hover:shadow-2xl border border-gray-100 group">
          <div className="flex items-center justify-between mb-1">
            <div className="p-2 rounded-full bg-gradient-to-br from-blue-100 to-blue-300 group-hover:from-blue-200 group-hover:to-blue-400 transition">
              <FaUserClock className="text-xl text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-400">This Month</span>
          </div>
          <div className="mt-1">
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">18/22</h3>
            <p className="text-xs text-gray-500 mt-0.5">Present Days / Working Days</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: '82%' }}></div>
            </div>
            <p className="text-xs text-green-600 font-semibold mt-1">+2 days from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <FaCalendarCheck className="text-xl text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Leave Balance</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-gray-800">12/20</h3>
            <p className="text-xs text-gray-600">Used / Total Allocated</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-emerald-600 font-medium">8 days remaining</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-50 rounded-xl">
              <FaClipboardList className="text-xl text-amber-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Attendance Regulation</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">15</h3>
                <p className="text-xs text-gray-600">Approved</p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">3</h3>
                <p className="text-xs text-gray-600">Rejected</p>
              </div>
            </div>
            <p className="text-xs text-amber-600 font-medium">2 pending approval</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-50 rounded-xl">
              <FaFileAlt className="text-xl text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Leave Requests</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-gray-800">5</h3>
            <p className="text-xs text-gray-600">Pending Requests</p>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">2 Urgent</span>
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">3 Regular</span>
            </div>
            <p className="text-xs text-purple-600 font-medium">3 requests this week</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FaPlusCircle className="text-indigo-500" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button onClick={() => setShowLeaveModal(true)} className="bg-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600 text-gray-800 hover:text-white rounded-xl px-4 py-2 flex flex-col items-center shadow transition border border-gray-200 group">
            <FaRegCalendarPlus className="text-lg mb-1 text-indigo-500 group-hover:text-white transition" />
            <span className="font-medium text-xs">Request Leave</span>
          </button>
          <button onClick={() => setShowUploadModal(true)} className="bg-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600 text-gray-800 hover:text-white rounded-xl px-4 py-2 flex flex-col items-center shadow transition border border-gray-200 group">
            <FaFileUpload className="text-lg mb-1 text-emerald-600 group-hover:text-white transition" />
            <span className="font-medium text-xs">Upload Document</span>
          </button>
          <button onClick={() => setShowRegularizationModal(true)} className="bg-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600 text-gray-800 hover:text-white rounded-xl px-4 py-2 flex flex-col items-center shadow transition border border-gray-200 group">
            <FaRegCalendarPlus className="text-lg mb-1 text-amber-600 group-hover:text-white transition" />
            <span className="font-medium text-xs">Request Regularization</span>
          </button>
          <button onClick={() => setShowTicketModal(true)} className="bg-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600 text-gray-800 hover:text-white rounded-xl px-4 py-2 flex flex-col items-center shadow transition border border-gray-200 group">
            <FaTicketAlt className="text-lg mb-1 text-purple-600 group-hover:text-white transition" />
            <span className="font-medium text-xs">Raise Ticket</span>
          </button>
        </div>
      </div>

      {/* Dashboard Analytics Section */}
      <div className="mb-6 bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <span className="text-2xl">📈</span>
            Dashboard Analytics
          </h2>
          {refreshing && <LoadingSpinner />}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
           <div className="flex gap-3">
            <button
              onClick={() => setAnalyticsView('attendance')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${analyticsView === 'attendance' ? 'bg-blue-500 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Attendance Analytics
            </button>
            <button
              onClick={() => setAnalyticsView('leave')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${analyticsView === 'leave' ? 'bg-blue-500 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Leave Analytics
            </button>
           </div>
           <div className="flex gap-2">
             {renderChartTypeToggle()}
           </div>
        </div>
        <div className="relative w-full h-[400px] max-w-3xl mx-auto">
          <div className="w-full h-full">
            {renderChart()}
          </div>
        </div>
      </div>

      {/* Leave Balance Section (consolidated into Analytics) */}
      {/* Attendance Analytics (consolidated into Analytics) */}

      {/* Modals (scaffolded) */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-black">Request Leave</h3>
            <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Leave Type</label>
                <select name="leaveType" value={leaveRequestForm.leaveType} onChange={handleRequestLeaveChange} className="w-full border rounded px-3 py-2 text-black" required>
                  <option value="">Select Leave Type</option>
                  <option value="EL">Earned Leave</option>
                  <option value="SL">Sick Leave</option>
                  <option value="CL">Casual Leave</option>
                  <option value="CompOff">Comp Off</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">From</label>
                  <input type="date" name="startDate" value={leaveRequestForm.startDate} onChange={handleRequestLeaveChange} className="w-full border rounded px-3 py-2 text-black" required />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">To</label>
                  <input type="date" name="endDate" value={leaveRequestForm.endDate} onChange={handleRequestLeaveChange} className="w-full border rounded px-3 py-2 text-black" required />
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <input type="checkbox" name="isHalfDay" checked={leaveRequestForm.isHalfDay} onChange={handleRequestLeaveChange} />
                <label className="text-sm text-black">Half Day</label>
                {leaveRequestForm.isHalfDay && (
                  <select name="halfDayType" value={leaveRequestForm.halfDayType || ''} onChange={handleRequestLeaveChange} className="ml-2 border rounded px-2 py-1 text-black">
                    <option value="">Select</option>
                    <option value="First Half">First Half</option>
                    <option value="Second Half">Second Half</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Reason</label>
                <textarea name="reason" value={leaveRequestForm.reason} onChange={handleRequestLeaveChange} className="w-full border rounded px-3 py-2 text-black" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Emergency Contact</label>
                <input name="emergencyContact" value={leaveRequestForm.emergencyContact} onChange={handleRequestLeaveChange} className="w-full border rounded px-3 py-2 text-black" />
              </div>
              {requestError && <div className="text-red-600 text-sm">{requestError}</div>}
              {requestSuccess && <div className="text-green-600 text-sm">{requestSuccess}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 bg-red-500 text-white rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 text-white rounded" disabled={submittingRequest}>{submittingRequest ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showRegularizationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-black">Request Regularization</h3>
            <form onSubmit={handleRegularizationSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Date</label>
                <input type="date" name="date" value={regularizationForm.date} onChange={handleRegularizationChange} className="w-full border rounded px-3 py-2 text-black" required />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">Punch In Time</label>
                  <input type="time" name="punchInTime" value={regularizationForm.punchInTime} onChange={handleRegularizationChange} className="w-full border rounded px-3 py-2 text-black" required />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">Punch Out Time</label>
                  <input type="time" name="punchOutTime" value={regularizationForm.punchOutTime} onChange={handleRegularizationChange} className="w-full border rounded px-3 py-2 text-black" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Reason</label>
                <textarea name="reason" value={regularizationForm.reason} onChange={handleRegularizationChange} className="w-full border rounded px-3 py-2 text-black" required />
              </div>
              {regularizationError && <div className="text-red-600 text-sm">{regularizationError}</div>}
              {regularizationSuccess && <div className="text-green-600 text-sm">{regularizationSuccess}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRegularizationModal(false)} className="px-4 py-2 bg-red-500 text-white rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded" disabled={regularizationLoading}>{regularizationLoading ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-black">Upload Document</h3>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Document Type</label>
                <input value={uploadType} onChange={e => setUploadType(e.target.value)} className="w-full border rounded px-3 py-2 text-black" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Description</label>
                <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} className="w-full border rounded px-3 py-2 text-black" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">File</label>
                <input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="w-full border rounded px-3 py-2 text-black" required />
              </div>
              {uploadError && <div className="text-red-600 text-sm">{uploadError}</div>}
              {uploadSuccess && <div className="text-green-600 text-sm">{uploadSuccess}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 bg-red-500 text-white rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-white rounded" disabled={uploadLoading}>{uploadLoading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-black">Raise Ticket</h3>
            {/* Ticket form goes here */}
            <button onClick={() => setShowTicketModal(false)} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}