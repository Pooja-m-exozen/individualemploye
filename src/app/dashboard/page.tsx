'use client';

import React, { useState, useEffect } from 'react';
import { FaBirthdayCake, FaTrophy, FaCalendarCheck, FaUserClock, FaProjectDiagram, FaClipboardList } from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import AttendanceAnalytics from '@/components/dashboard/AttendanceAnalytics';

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
  const [birthdays, setBirthdays] = useState<BirthdayResponse | null>(null);
  const [anniversaries, setAnniversaries] = useState<WorkAnniversaryResponse | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchEmployeeInfo = async () => {
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/employee/profile');
      const data = await response.json();
      if (data.success) {
        setEmployeeInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching employee info:', error);
    }
  };

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
      await fetchEmployeeInfo();
      const [birthdaysRes, anniversariesRes, leaveBalanceRes] = await Promise.all([
        fetch('https://cafm.zenapi.co.in/api/kyc/birthdays/today'),
        fetch('https://cafm.zenapi.co.in/api/kyc/work-anniversaries/today'),
        fetch('https://cafm.zenapi.co.in/api/leave/balance/EFMS3295')
      ]);

      const [birthdaysData, anniversariesData, leaveBalanceData] = await Promise.all([
        birthdaysRes.json(),
        anniversariesRes.json(),
        leaveBalanceRes.json()
      ]);

      setBirthdays(birthdaysData);
      setAnniversaries(anniversariesData);
      setLeaveBalance(leaveBalanceData);
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

  const renderLeaveBalanceGraphs = () => {
    if (!leaveBalance) return null;

    type LeaveType = 'EL' | 'SL' | 'CL' | 'CompOff';
    const leaveTypes: LeaveType[] = ['EL', 'SL', 'CL', 'CompOff'];
    const colors: Record<LeaveType, [string, string, string]> = {
      EL: ['rgba(99, 102, 241, 0.8)', 'rgba(99, 102, 241, 1)', 'from-indigo-400 to-indigo-600'],
      SL: ['rgba(16, 185, 129, 0.8)', 'rgba(16, 185, 129, 1)', 'from-emerald-400 to-emerald-600'],
      CL: ['rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 1)', 'from-amber-400 to-amber-600'],
      CompOff: ['rgba(139, 92, 246, 0.8)', 'rgba(139, 92, 246, 1)', 'from-purple-400 to-purple-600']
    };

    const data = {
      labels: leaveTypes,
      datasets: [
        {
          data: leaveTypes.map(type => leaveBalance.balances[type].allocated),
          backgroundColor: leaveTypes.map(type => colors[type][0]),
          borderColor: leaveTypes.map(type => colors[type][1]),
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 40,
        }
      ]
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leave Balance Overview */}
        <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-6 shadow-lg border border-indigo-100
          transform transition-all duration-300 hover:shadow-xl group">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span className="text-indigo-500">📊</span>
            Leave Balance Overview
          </h3>
          <div className="transform transition-transform duration-300 group-hover:scale-[1.02]">
            <Bar
              data={data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1f2937',
                    bodyColor: '#4b5563',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    usePointStyle: true,
                    bodyFont: {
                      size: 13
                    },
                    titleFont: {
                      size: 14,
                      weight: 'bold'
                    },
                    callbacks: {
                      label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.raw as number;
                        return `${label} ${value} days`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(99, 102, 241, 0.1)'
                    },
                    ticks: {
                      font: {
                        size: 12,
                        weight: 'bold'
                      },
                      color: '#4b5563',
                      padding: 10
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        size: 12,
                        weight: 'bold'
                      },
                      color: '#4b5563',
                      padding: 10
                    }
                  }
                },
                animation: {
                  duration: 2000,
                  easing: 'easeInOutQuart'
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
            const [bgColor, textColor] = balance.remaining > 0 
              ? ['bg-emerald-100 text-emerald-700', 'text-emerald-600'] 
              : ['bg-rose-100 text-rose-700', 'text-rose-600'];

            return (
              <div
                key={type}
                className={`bg-gradient-to-br ${colors[type][2]} rounded-xl p-4 text-white
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8 relative">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {getGreeting()}, {employeeInfo?.fullName || 'Welcome'}!
                </h1>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <p className="text-indigo-100">{getWelcomeMessage()}</p>
                {employeeInfo && (
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {employeeInfo.designation} • {employeeInfo.department}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-indigo-100">Today is</p>
                  <p className="font-semibold">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <RefreshButton />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            icon={FaUserClock}
            title="Today's Attendance"
            value="92%"
            subtext="+5% from yesterday"
            gradient="from-emerald-500 to-teal-600"
          />
          <MetricCard
            icon={FaProjectDiagram}
            title="Active Projects"
            value="24"
            subtext="3 due this week"
            gradient="from-violet-500 to-purple-600"
          />
          <MetricCard
            icon={FaCalendarCheck}
            title="Leave Requests"
            value="7"
            subtext="Pending approval"
            gradient="from-amber-500 to-orange-600"
          />
          <MetricCard
            icon={FaClipboardList}
            title="Tasks"
            value="12"
            subtext="4 high priority"
            gradient="from-blue-500 to-indigo-600"
          />
        </div>

        {/* Celebrations Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Birthday Cards */}
          <div className="bg-white rounded-2xl shadow-lg border border-pink-100 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-400 to-fuchsia-500 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaBirthdayCake className="text-xl text-white" />
                  <h2 className="text-base font-bold text-white">Today's Birthdays</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <span className="text-white text-xs">{birthdays?.data?.length || 0} Today</span>
                  </div>
                  {refreshing && <LoadingSpinner />}
                </div>
              </div>
            </div>
            <div className="p-3">
              {birthdays?.success && birthdays.data && birthdays.data.length > 0 ? (
                <div className="grid gap-3">
                  {birthdays.data.map((person, index) => (
                    <div
                      key={person.employeeId}
                      className="group bg-gradient-to-br from-white to-pink-50 rounded-xl p-4
                        border border-pink-100 hover:border-pink-200 transition-all duration-300
                        hover:shadow-lg hover:shadow-pink-100/30 transform hover:-translate-y-1"
                      style={{
                        animation: `fadeSlideIn 0.5s ease-out forwards ${index * 0.1}s`,
                        opacity: 0,
                        transform: 'translateY(20px)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-fuchsia-500 
                              flex items-center justify-center text-white font-bold text-xl transform 
                              group-hover:scale-110 transition-all duration-300 shadow-lg">
                              {person.fullName.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md">
                              <span className="text-lg">🎂</span>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-base group-hover:text-pink-600 transition-colors">
                              {person.fullName}
                            </h3>
                            <p className="text-sm text-gray-600">{person.designation}</p>
                          </div>
                        </div>
                        <button 
                          className="flex items-center gap-1 bg-pink-50 hover:bg-pink-100 text-pink-600 
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-md
                            active:scale-95"
                          onClick={() => {
                            // Add wish sending functionality
                            console.log('Sending wishes to:', person.fullName);
                          }}
                        >
                          <span>🎉</span>
                          Send Wishes
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-700 italic bg-white/50 p-2 rounded-lg border border-pink-50">
                        {person.personalizedWish}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-3">
                    <FaBirthdayCake className="text-3xl text-pink-300" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">No Birthdays Today</p>
                  <p className="text-sm text-gray-500">Check back tomorrow for more celebrations!</p>
                </div>
              )}
            </div>
          </div>

          {/* Anniversary Cards */}
          <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaTrophy className="text-xl text-white" />
                  <h2 className="text-base font-bold text-white">Work Anniversaries</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <span className="text-white text-xs">{anniversaries?.data?.length || 0} Today</span>
                  </div>
                  {refreshing && <LoadingSpinner />}
                </div>
              </div>
            </div>
            <div className="p-3">
              {anniversaries?.success && anniversaries.data && anniversaries.data.length > 0 ? (
                <div className="grid gap-3">
                  {anniversaries.data.map((person, index) => (
                    <div
                      key={person.employeeId}
                      className="group bg-gradient-to-br from-white to-blue-50 rounded-xl p-4
                        border border-blue-100 hover:border-blue-200 transition-all duration-300
                        hover:shadow-lg hover:shadow-blue-100/30 transform hover:-translate-y-1"
                      style={{
                        animation: `fadeSlideIn 0.5s ease-out forwards ${index * 0.1}s`,
                        opacity: 0,
                        transform: 'translateY(20px)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 
                              flex items-center justify-center text-white font-bold text-xl transform 
                              group-hover:scale-110 transition-all duration-300 shadow-lg">
                              {person.fullName.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md">
                              <span className="text-lg">🏆</span>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors">
                              {person.fullName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-600">{person.designation}</p>
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
                                {person.yearsOfService} Years
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-md
                            active:scale-95"
                          onClick={() => {
                            // Add congratulation functionality
                            console.log('Congratulating:', person.fullName);
                          }}
                        >
                          <span>👏</span>
                          Congratulate
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-700 italic bg-white/50 p-2 rounded-lg border border-blue-50">
                        {person.personalizedWish}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                    <FaTrophy className="text-3xl text-blue-300" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">No Work Anniversaries Today</p>
                  <p className="text-sm text-gray-500">Check back tomorrow for more milestones!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leave Balance Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-indigo-100
          transform transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-2xl">📊</span>
              Leave Balance
            </h2>
            {refreshing && <LoadingSpinner />}
          </div>
          {renderLeaveBalanceGraphs()}
        </div>

        {/* Attendance Analytics */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-emerald-100
          transform transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-2xl">📈</span>
              Attendance Analytics
            </h2>
            {refreshing && <LoadingSpinner />}
          </div>
          <AttendanceAnalytics />
        </div>
      </div>
    </div>
  );
}

const FloatingParticles = ({ color }: { color: string }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full mix-blend-multiply filter blur-xl animate-float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 40 + 20}px`,
          height: `${Math.random() * 40 + 20}px`,
          background: `hsl(${Math.random() * 60 + 280}, 70%, 70%)`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 10}s`
        }}
      />
    ))}
  </div>
);

// Add these animations to the styles
const styles = `
  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0) translateX(0);
    }
    25% {
      transform: translateY(-15px) translateX(15px);
    }
    50% {
      transform: translateY(-25px) translateX(-15px);
    }
    75% {
      transform: translateY(-15px) translateX(15px);
    }
  }

  .animate-float {
    animation: float linear infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}