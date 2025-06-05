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
  const employeeId = getEmployeeId();
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [monthlyStatsCache, setMonthlyStatsCache] = useState<Record<string, MonthlyStats>>({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Update barChartOptions with new configuration
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
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
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
    },
    datasets: {
      bar: {
        barThickness: currentMonth === 0 ? 'flex' : 20,
        maxBarThickness: currentMonth === 0 ? 16 : 26,
        barPercentage: currentMonth === 0 ? 0.8 : 0.6,
        categoryPercentage: currentMonth === 0 ? 0.8 : 0.6
      }
    }
  };

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        align: 'center',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          padding: 20,
          font: {
            size: 12,
            family: "'Geist', sans-serif"
          }
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
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value * 100) / total);
            return `${context.label}: ${percentage}%`;
          }
        }
      }
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(parseInt(e.target.value));
    // useEffect will handle updating monthlyStats and fetching if needed
    // When "All" is selected, currentMonth will be 0.
  };

  const renderMonthSelector = () => (
    <div className="flex items-center gap-2">
      <label htmlFor="month-select" className="text-gray-700 font-medium text-sm whitespace-nowrap">Select Month:</label>
      <select
        id="month-select"
        value={currentMonth}
        onChange={handleMonthChange}
        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
      >
        <option value={0}>All Months</option> {/* Added "All Months" option */}
        {monthNames.map((month, index) => (
          <option key={month} value={index + 1}>
            {month} {currentYear}
          </option>
        ))}
      </select>
    </div>
  );



  const renderAttendanceChart = () => {
    if (!monthlyStats?.data) return null;

    const chartData: ChartData<'bar'> = {
      labels: currentMonth === 0 ? monthNames : ['Monthly Attendance'],
      datasets: [
        {
          label: 'Present ',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyPresent || Array(12).fill(0)
            : [monthlyStats.data.presentDays],
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 3,
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'Late Arrivals',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyLateArrivals || Array(12).fill(0)
            : [monthlyStats.data.lateArrivals],
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 3,
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'Early Arrivals',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyEarlyArrivals || Array(12).fill(0)
            : [monthlyStats.data.earlyArrivals],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 3,
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'Absent',
          data: currentMonth === 0 
            ? monthlyStats.data.monthlyAbsent || Array(12).fill(0)
            : [monthlyStats.data.absentDays],
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 1)',
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
          'rgba(16, 185, 129, 0.2)',
          'rgba(245, 158, 11, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(239, 68, 68, 0.2)'
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 3
      }]
    };

    return (
      <div className="h-full">
        <div className="h-full min-h-[400px] relative">
          {attendanceChartType === 'bar' ? (
            <Bar data={chartData} options={{
              ...barChartOptions,
              maintainAspectRatio: false,
              responsive: true
            }} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-[320px] h-[320px]">
                <Pie data={pieData} options={pieChartOptions} />
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
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 3,
          borderRadius: 6,
        },
        {
          label: 'Used',
          data: leaveTypes.map(type => leaveBalance.balances[type as LeaveType].used),
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 3,
          borderRadius: 6,
        },
        {
          label: 'Remaining',
          data: leaveTypes.map(type => leaveBalance.balances[type as LeaveType].remaining),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
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
          'rgba(16, 185, 129, 0.2)',
          'rgba(239, 68, 68, 0.2)',
          'rgba(59, 130, 246, 0.2)',
          'rgba(139, 92, 246, 0.2)',
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
        <div className="h-full min-h-[400px] relative">
          {leaveChartType === 'bar' ? (
            <Bar data={chartData} options={{
              ...barChartOptions,
              maintainAspectRatio: false,
              responsive: true
            }} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-[320px] h-[320px]">
                <Pie data={pieData} options={pieChartOptions} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
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

    // Disable pie chart option when "All Months" is selected for attendance
    const isPieDisabled = analyticsView === 'attendance' && currentMonth === 0;

    return (
      <div className="flex gap-2">
        <button
          onClick={() => setChartType('bar')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${currentChartType === 'bar' ? 'bg-indigo-500 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Bar Chart
        </button>
        <button
          onClick={() => setChartType('pie')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${currentChartType === 'pie' ? 'bg-indigo-500 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} ${isPieDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isPieDisabled} // Disable button
        >
          Pie Chart
        </button>
      </div>
    );
  };

 


  const handleRequestLeave = () => {
    router.push('/leave-management/request');
  };

  const handleRegularization = () => {
    router.push('/attendance/regularization');
  };

  const handleUploadDocument = () => {
    router.push('/kyc/upload');
  };

  const handleRaiseTicket = () => {
    router.push('/helpdesk');
  };

  const handleViewTickets = () => {
    router.push('/helpdesk');
  };

  const handleViewReports = () => {
    router.push('/reports');
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

  const { theme } = useTheme();

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-b-2xl shadow p-6 flex justify-between items-center">
        <div>
          <h1 className="text-white text-2xl font-bold">Welcome back, {userDetails?.fullName || <span className="inline-block h-6 w-32 bg-blue-300 rounded animate-pulse align-middle">&nbsp;</span>}</h1>
          <p className="text-blue-100">{getWelcomeMessage()}</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-blue-600 font-semibold px-4 py-2 rounded shadow hover:bg-blue-50" onClick={handleViewTickets}>View My Tickets</button>
          <button className="bg-white text-blue-600 font-semibold px-4 py-2 rounded shadow hover:bg-blue-50" onClick={handleViewReports}>View Reports</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-72 p-6 flex flex-col gap-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-700">Quick Actions</h2>
            <p className="text-gray-500 text-sm font-semibold">
              Welcome! Use the quick actions below to manage your tasks efficiently.
            </p>
          </div>
          {/* Request Leave */}
          <div className="bg-blue-500 text-white rounded-xl shadow flex items-start gap-3 p-4 hover:scale-[1.02] transition-transform cursor-pointer" onClick={handleRequestLeave}>
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-base">Request Leave</div>
              <div className="text-xs opacity-90">Submit a leave request for approval.</div>
            </div>
          </div>
          {/* Attendance Regularization */}
          <div className="bg-orange-500 text-white rounded-xl shadow flex items-start gap-3 p-4 hover:scale-[1.02] transition-transform cursor-pointer" onClick={handleRegularization}>
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 17v-2a4 4 0 118 0v2m-4 4h.01M12 3v4m0 0a4 4 0 00-4 4v4a4 4 0 004 4h0a4 4 0 004-4v-4a4 4 0 00-4-4z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-base">Attendance Regularization</div>
              <div className="text-xs opacity-90">Request corrections to your attendance.</div>
            </div>
          </div>
          {/* Upload Document */}
          <div className="bg-green-500 text-white rounded-xl shadow flex items-start gap-3 p-4 hover:scale-[1.02] transition-transform cursor-pointer" onClick={handleUploadDocument}>
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-base">Upload Document</div>
              <div className="text-xs opacity-90">Upload important documents securely.</div>
            </div>
          </div>
          {/* Raise Ticket */}
          <div className="bg-purple-500 text-white rounded-xl shadow flex items-start gap-3 p-4 hover:scale-[1.02] transition-transform cursor-pointer" onClick={handleRaiseTicket}>
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 17v-2a4 4 0 118 0v2m-4 4h.01M12 3v4m0 0a4 4 0 00-4 4v4a4 4 0 004 4h0a4 4 0 004-4v-4a4 4 0 00-4-4z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-base">Raise Ticket</div>
              <div className="text-xs opacity-90">Report an issue or request support.</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800 ring-1 ring-gray-700' : 'bg-white'} shadow-sm min-h-[calc(100vh-140px)]`}>
            {/* Tabs and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setAnalyticsView('attendance')}
                  className={`px-4 py-1.5 rounded-full font-semibold transition-colors ${
                    analyticsView === 'attendance'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  Attendance Analytics
                </button>
                <button
                  onClick={() => setAnalyticsView('leave')}
                  className={`px-4 py-1.5 rounded-full font-semibold transition-colors ${
                    analyticsView === 'leave'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  Leave Analytics
                </button>
              </div>
              <div className="flex flex-wrap gap-4 items-center justify-between sm:justify-end">
                {renderChartTypeToggle()}
                {renderMonthSelector()}
              </div>
            </div>

            {/* Chart Container */}
            <div className={`relative overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gray-800 ring-1 ring-gray-700' 
                : 'bg-white'
              } rounded-xl p-4 md:p-6`}>
              <div className="min-h-[400px] md:min-h-[500px]">
                <div className="absolute inset-0 p-4">
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