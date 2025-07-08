'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useUser } from '@/context/UserContext';
import { useTheme } from "@/context/ThemeContext";

import { getDashboardData, getMonthlyStats, getLeaveBalance } from '@/services/dashboard';
import { getEmployeeId } from '@/services/auth';
import type { LeaveBalanceResponse, MonthlyStats, AnalyticsViewType, ChartType, LeaveType } from '../../types/dashboard';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const router = useRouter();
  const userDetails = useUser();
  const { theme} = useTheme();
  const employeeId = getEmployeeId();
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [monthlyStatsCache, setMonthlyStatsCache] = useState<Record<string, MonthlyStats>>({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State for analytics view and chart type
  const [analyticsView, setAnalyticsView] = useState<AnalyticsViewType>('attendance');
  const [attendanceChartType, setAttendanceChartType] = useState<ChartType>('bar');
  const [leaveChartType, setLeaveChartType] = useState<ChartType>('bar');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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
      return "Keep up with the great work!";
    } else {
      return "Great job today! Here's your dashboard summary.";
    }
  };

  const fetchData = useCallback(async (showLoading = true, monthToFetch: number = currentMonth, yearToFetch: number = currentYear) => {
    try {
      if (showLoading) setLoading(true);
      const monthYearKey = `${monthToFetch}-${yearToFetch}`;

      // Check cache first for monthly stats
      if (monthlyStatsCache[monthYearKey]) {
        if (monthToFetch === currentMonth && yearToFetch === currentYear) {
          setMonthlyStats(monthlyStatsCache[monthYearKey]);
        }
      } else {
        // Fetch monthly stats
        const monthlyStatsData = await getMonthlyStats(employeeId || '', monthToFetch, yearToFetch);
        
        // Update monthly stats and cache
        setMonthlyStatsCache(prev => ({
          ...prev,
          [monthYearKey]: monthlyStatsData
        }));
        
        if (monthToFetch === currentMonth && yearToFetch === currentYear) {
          setMonthlyStats(monthlyStatsData);
        }
      }

      // Fetch leave balance
      const leaveBalanceData = await getLeaveBalance(employeeId || '');
      setLeaveBalance(leaveBalanceData);

      // Fetch other dashboard data
      await getDashboardData(employeeId || '', monthToFetch, yearToFetch);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentMonth, currentYear, employeeId, monthlyStatsCache]);

  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();

    // Poll every 5 minutes
    const pollInterval = setInterval(() => {
      fetchData(false, currentMonth, currentYear);
    }, 5 * 60 * 1000);

    return () => clearInterval(pollInterval);
  }, [currentMonth, currentYear, fetchData]);

  // Effect to update displayed monthly stats when currentMonth or currentYear changes
  useEffect(() => {
    if (currentMonth > 0) {
      const monthYearKey = `${currentMonth}-${currentYear}`;
      if (monthlyStatsCache[monthYearKey]) {
        setMonthlyStats(monthlyStatsCache[monthYearKey]);
      } else {
        fetchData(false, currentMonth, currentYear);
      }
    }
  }, [currentMonth, currentYear, monthlyStatsCache, fetchData]);

  // Update the chart options types to ensure properties are defined
  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.4)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 12,
            family: "'Geist', sans-serif"
          },
          color: '#64748b',
          padding: 8
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            family: "'Geist', sans-serif"
          },
          color: '#64748b',
          padding: 8,
          autoSkip: false,
          maxRotation: currentMonth === 0 ? 45 : 0
        },
        border: {
          display: false
        }
      }
    } as const,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 13,
            family: "'Geist', sans-serif",
            weight: 'bold'
          },
          color: '#334155'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} days`;
          }
        }
      }
    } as const
  } as const;

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 15,
          color: theme === 'dark' ? '#fff' : '#334155',
          font: {
            size: 12,
            family: "'Geist', sans-serif",
            weight: 500
          },
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            if (!datasets) return [];
            
            return datasets[0].data.map((value, i) => ({
              text: `${chart.data.labels?.[i]} (${value})`,
              fillStyle: Array.isArray(datasets[0].backgroundColor) 
                ? datasets[0].backgroundColor[i]
                : datasets[0].backgroundColor,
              strokeStyle: Array.isArray(datasets[0].borderColor)
                ? datasets[0].borderColor[i]
                : datasets[0].borderColor,
              lineWidth: 2,
              hidden: false,
              index: i
            }));
          }
        },
        maxWidth: 200,
        maxHeight: 400
      }
    }
  } as const;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(parseInt(e.target.value));
  };

  const renderMonthSelector = () => (
    <select
      id="month-select"
      value={currentMonth}
      onChange={handleMonthChange}
      className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm ${
        theme === 'dark' 
          ? 'bg-gray-700 border-gray-600 text-white' 
          : 'bg-white border-gray-300 text-gray-700'
      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
    >
      <option value={0}>All Months</option>
      {monthNames.map((month, index) => (
        <option key={month} value={index + 1}>
          {month} {currentYear}
        </option>
      ))}
    </select>
  );

  const renderAttendanceChart = () => {
    if (!monthlyStats?.data) return null;

    const darkModeColors = {
      present: {
        bg: 'rgba(16, 185, 129, 1)',
        border: 'rgba(16, 185, 129, 1)'
      },
      late: {
        bg: 'rgba(245, 158, 11, 1)',
        border: 'rgba(245, 158, 11, 1)'
      },
      early: {
        bg: 'rgba(75, 192, 192, 1)',
        border: 'rgba(75, 192, 192, 1)'
      },
      absent: {
        bg: 'rgba(239, 68, 68, 1)',
        border: 'rgba(239, 68, 68, 1)'
      }
    };

    const lightModeColors = {
      present: {
        bg: 'rgba(16, 185, 129, 0.8)',
        border: 'rgba(16, 185, 129, 1)'
      },
      late: {
        bg: 'rgba(245, 158, 11, 0.8)',
        border: 'rgba(245, 158, 11, 1)'
      },
      early: {
        bg: 'rgba(75, 192, 192, 0.8)',
        border: 'rgba(75, 192, 192, 1)'
      },
      absent: {
        bg: 'rgba(239, 68, 68, 0.8)',
        border: 'rgba(239, 68, 68, 1)'
      }
    };

    const colors = theme === 'dark' ? darkModeColors : lightModeColors;

    const chartData: ChartData<'bar'> = {
      labels: currentMonth === 0 ? monthNames : ['Monthly Attendance'],
      datasets: [
        {
          label: 'Present ',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyPresent || Array(12).fill(0)
            : [monthlyStats.data.presentDays],
          backgroundColor: colors.present.bg,
          borderColor: colors.present.border,
          borderWidth: 3,
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'Late Arrivals',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyLateArrivals || Array(12).fill(0)
            : [monthlyStats.data.lateArrivals],
          backgroundColor: colors.late.bg,
          borderColor: colors.late.border,
          borderWidth: 3,
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'Early Arrivals',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyEarlyArrivals || Array(12).fill(0)
            : [monthlyStats.data.earlyArrivals],
          backgroundColor: colors.early.bg,
          borderColor: colors.early.border,
          borderWidth: 3,
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'Absent',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyAbsent || Array(12).fill(0)
            : [monthlyStats.data.absentDays],
          backgroundColor: colors.absent.bg,
          borderColor: colors.absent.border,
          borderWidth: 3,
          borderRadius: 6,
          maxBarThickness: 32,
        }
      ]
    };

    const pieData: ChartData<'pie'> = {
      labels: ['Present Days', 'Late Arrivals', 'Early Arrivals', 'Absent Days'],
      datasets: [{
        data: [
          monthlyStats.data.presentDays,
          monthlyStats.data.lateArrivals,
          monthlyStats.data.earlyArrivals,
          monthlyStats.data.absentDays
        ],
        backgroundColor: [
          colors.present.bg,
          colors.late.bg,
          colors.early.bg,
          colors.absent.bg
        ],
        borderColor: [
          colors.present.border,
          colors.late.border,
          colors.early.border,
          colors.absent.border
        ],
        borderWidth: 3
      }]
    };

    const chartOptions = {
      ...barChartOptions,
      scales: {
        y: {
          ...(barChartOptions.scales?.y ?? {}),
          grid: {
            ...(barChartOptions.scales?.y?.grid ?? {}),
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.4)',
          },
          ticks: {
            ...(barChartOptions.scales?.y?.ticks ?? {}),
            color: theme === 'dark' ? '#fff' : '#64748b',
          }
        },
        x: {
          ...(barChartOptions.scales?.x ?? {}),
          ticks: {
            ...(barChartOptions.scales?.x?.ticks ?? {}),
            color: theme === 'dark' ? '#fff' : '#64748b',
          }
        }
      },
      plugins: {
        ...barChartOptions.plugins,
        legend: {
          ...(barChartOptions.plugins?.legend ?? {}),
          labels: {
            ...(barChartOptions.plugins?.legend?.labels ?? {}),
            color: theme === 'dark' ? '#fff' : '#334155',
          }
        }
      } as const
    };

    return (
      <div className="h-full">
        <div className="h-full min-h-[300px] sm:min-h-[400px] relative">
          {attendanceChartType === 'bar' ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
                <Pie data={pieData} options={{
                  ...pieChartOptions,
                  plugins: {
                    ...(pieChartOptions.plugins ?? {}),
                    legend: {
                      ...(pieChartOptions.plugins?.legend ?? {}),
                      labels: {
                        ...(pieChartOptions.plugins?.legend?.labels ?? {}),
                        color: theme === 'dark' ? '#fff' : '#334155',
                      }
                    }
                  }
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeaveChart = () => {
    if (!leaveBalance) return null;

    const leaveTypes: LeaveType[] = ['EL', 'SL', 'CL', 'CompOff'];
    const leaveLabels = ['Earned Leave', 'Sick Leave', 'Casual Leave', 'Comp Off'];

    const chartData = {
      labels: leaveLabels,
      datasets: [
        {
          label: 'Allocated',
          data: leaveTypes.map(type => leaveBalance.balances[type as LeaveType].allocated),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 3,
          borderRadius: 6,
        },
        {
          label: 'Used',
          data: leaveTypes.map(type => leaveBalance.balances[type as LeaveType].used),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 3,
          borderRadius: 6,
        },
        {
          label: 'Remaining',
          data: leaveTypes.map(type => leaveBalance.balances[type as LeaveType].remaining),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          borderRadius: 6,
        }
      ]
    };

    const pieData = {
      labels: leaveLabels,
      datasets: [{
        data: leaveTypes.map(type => leaveBalance.balances[type as LeaveType].allocated),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 3
      }]
    };

    return (
      <div className="h-full">
        <div className="h-full min-h-[300px] sm:min-h-[400px] relative">
          {leaveChartType === 'bar' ? (
            <Bar data={chartData} options={{
              ...barChartOptions,
              maintainAspectRatio: false,
              responsive: true
            }} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
                <Pie data={pieData} options={pieChartOptions} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChartTypeToggle = () => {
    const currentChartType = analyticsView === 'attendance' ? attendanceChartType : leaveChartType;
    const setChartType = analyticsView === 'attendance' ? setAttendanceChartType : setLeaveChartType;

    const isPieDisabled = analyticsView === 'attendance' && currentMonth === 0;

    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setChartType('bar')}
          className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
            currentChartType === 'bar' 
              ? 'bg-indigo-500 text-white shadow' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <span className="hidden sm:inline">Bar Chart</span>
          <span className="sm:hidden">Bar</span>
        </button>
        <button
          onClick={() => setChartType('pie')}
          className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
            currentChartType === 'pie' 
              ? 'bg-indigo-500 text-white shadow' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } ${isPieDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isPieDisabled}
        >
          <span className="hidden sm:inline">Pie Chart</span>
          <span className="sm:hidden">Pie</span>
        </button>
      </div>
    );
  };

  const handleRequestLeave = () => {
    router.push('/leave-management/request');
    setIsSidebarOpen(false);
  };

  const handleRegularization = () => {
    router.push('/attendance/regularization');
    setIsSidebarOpen(false);
  };

  const handleUploadDocument = () => {
    router.push('/kyc/upload');
    setIsSidebarOpen(false);
  };

  const handleRaiseTicket = () => {
    router.push('/helpdesk');
    setIsSidebarOpen(false);
  };

  const handleViewTickets = () => {
    router.push('/helpdesk');
  };

  const handleViewReports = () => {
    router.push('/reports');
  };

  // 1. Extract Quick Actions grid to a variable/component
  const QuickActionsGrid = (
    <div
      className={`
        flex-1 flex flex-col gap-3 overflow-x-visible pb-0 mx-0 px-0
      `}
    >
      {/* Request Leave */}
      <div className={`min-w-[220px] flex-shrink-0 rounded-xl shadow-md flex items-start gap-3 p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer touch-manipulation ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-blue-900 to-blue-800 text-white'
          : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
      }`} onClick={handleRequestLeave}>
        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm sm:text-base">Request Leave</div>
          <div className="text-xs opacity-90">Submit a leave request for approval.</div>
        </div>
      </div>
      {/* Attendance Regularization */}
      <div className={`min-w-[220px] flex-shrink-0 rounded-xl shadow-md flex items-start gap-3 p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer touch-manipulation ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-orange-800 to-orange-700'
          : 'bg-gradient-to-br from-orange-500 to-orange-600'
      } text-white`} onClick={handleRegularization}>
        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 17v-2a4 4 0 118 0v2m-4 4h.01M12 3v4m0 0a4 4 0 00-4 4v4a4 4 0 004 4h0a4 4 0 004-4v-4a4 4 0 00-4-4z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm sm:text-base">Attendance Regularization</div>
          <div className="text-xs opacity-90">Request corrections to your attendance.</div>
        </div>
      </div>
      {/* Upload Document */}
      <div className={`min-w-[220px] flex-shrink-0 rounded-xl shadow-md flex items-start gap-3 p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer touch-manipulation ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-green-800 to-green-700'
          : 'bg-gradient-to-br from-green-500 to-green-600'
      } text-white`} onClick={handleUploadDocument}>
        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm sm:text-base">Upload Document</div>
          <div className="text-xs opacity-90">Upload important documents securely.</div>
        </div>
      </div>
      {/* Raise Ticket */}
      <div className={`min-w-[220px] flex-shrink-0 rounded-xl shadow-md flex items-start gap-3 p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer touch-manipulation ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-purple-800 to-purple-700'
          : 'bg-gradient-to-br from-purple-500 to-purple-600'
      } text-white`} onClick={handleRaiseTicket}>
        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 17v-2a4 4 0 118 0v2m-4 4h.01M12 3v4m0 0a4 4 0 00-4 4v4a4 4 0 004 4h0a4 4 0 004-4v-4a4 4 0 00-4-4z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm sm:text-base">Raise Ticket</div>
          <div className="text-xs opacity-90">Report an issue or request support.</div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`min-h-screen p-4 sm:p-8 relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto space-y-6 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white/80'} backdrop-blur rounded-xl shadow-sm p-4 animate-pulse`}>
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white/90'} backdrop-blur-sm rounded-2xl shadow-lg p-6 animate-pulse`}>
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
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Welcome Section (visible on all screens, includes View Reports/My Tickets) */}
      <div className={`w-full px-4 pt-4 pb-2 lg:pt-8 lg:pb-0`}>
        <div className={`rounded-2xl shadow p-4 lg:p-6 mb-2 lg:mb-0 flex flex-col gap-1
          ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-400'}
        `}>
          <h1 className="text-white text-xl sm:text-2xl font-bold">
            Welcome back, {userDetails?.fullName || <span className="inline-block h-6 w-32 bg-gray-600 rounded animate-pulse align-middle">&nbsp;</span>}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-blue-100'}>
            {getWelcomeMessage()}
          </p>
          <div className="flex gap-3 mt-2">
            <button 
              className={`font-semibold px-4 py-2 rounded shadow transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`} 
              onClick={handleViewTickets}
            >
              View My Tickets
            </button>
            <button 
              className={`font-semibold px-4 py-2 rounded shadow transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`} 
              onClick={handleViewReports}
            >
              View Reports
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-80 lg:w-72 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } border`}>
          <div className="flex flex-col h-full p-4 lg:p-6">
            {/* Mobile Close Button */}
            <div className="flex justify-between items-center mb-4 lg:hidden">
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Quick Actions
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Actions Header */}
            <div className={`mb-4 hidden lg:block ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-gray-700 to-gray-800'
                : 'bg-gradient-to-br from-gray-50 to-gray-100'
            } p-4 rounded-xl ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            } border`}>
              <h2 className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Quick Actions</h2>
              <p className={`text-sm mt-1 font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Welcome! Use the quick actions below to manage your tasks efficiently.
              </p>
            </div>

            {/* Quick Actions for desktop */}
            {QuickActionsGrid}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {/* Quick Actions for mobile (always visible above graph) */}
            <div className="lg:hidden mb-4">
              {QuickActionsGrid}
            </div>
            <div className={`rounded-xl p-4 lg:p-6 ${theme === 'dark' ? 'bg-gray-800 ring-1 ring-gray-700' : 'bg-white'} shadow-sm min-h-[calc(100vh-140px)]`}>
              {/* Tabs and Controls */}
              <div className="flex flex-col gap-4 mb-6">
                {/* Analytics Type Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAnalyticsView('attendance')}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                      analyticsView === 'attendance'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
                    }`}
                  >
                    <span className="hidden sm:inline">Attendance Analytics</span>
                    <span className="sm:hidden">Attendance</span>
                  </button>
                  <button
                    onClick={() => setAnalyticsView('leave')}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                      analyticsView === 'leave'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
                    }`}
                  >
                    <span className="hidden sm:inline">Leave Analytics</span>
                    <span className="sm:hidden">Leave</span>
                  </button>
                </div>

                {/* Chart Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderChartTypeToggle()}
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="month-select" className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} hidden sm:block`}>
                      Month:
                    </label>
                    {renderMonthSelector()}
                  </div>
                </div>
              </div>

              {/* Chart Container */}
              <div className={`relative overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-gray-800 ring-1 ring-gray-700' 
                  : 'bg-white'
                } rounded-xl p-4 lg:p-6`}>
                <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
                  {analyticsView === 'attendance' 
                    ? renderAttendanceChart()
                    : renderLeaveChart()
                  }
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}