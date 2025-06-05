'use client';

import { useState, useEffect } from 'react';
import { 
  FaCheckCircle, 
  FaExclamationCircle,
  FaCalendarCheck,
  FaSync,
  FaCalendarAlt,
  FaClock,
  FaChartPie,
  FaChartBar,
  FaInfoCircle
} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  ChartOptions,
  TooltipItem,
  Scale,
  CoreScaleOptions,
  
  FontSpec
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
  pending: number;
}

interface LeaveBalanceResponse {
  employeeId: string;
  employeeName: string;
  year: number;
  balances: {
    EL: LeaveBalance;
    SL: LeaveBalance;
    CL: LeaveBalance;
    CompOff: LeaveBalance;
  };
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  totalPending: number;
}

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="mt-4 text-center text-gray-600 font-medium">Loading your data...</div>
    </div>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="p-8 text-center">
    <div className="flex items-center justify-center gap-3 p-6 bg-red-50 rounded-2xl text-red-600 mb-6 shadow-sm">
      <FaExclamationCircle className="w-8 h-8" />
      <p className="text-base font-medium">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-700 transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-blue-200"
    >
      <FaSync className="w-5 h-5" />
      Try Again
    </button>
  </div>
);

function LeaveViewContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse | null>(null);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [viewType, setViewType] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchLeaveBalance();
  }, [router]);

  const fetchLeaveBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }

      const response = await fetch(`https://cafm.zenapi.co.in/api/leave/balance/${employeeId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch leave balance');
      }

      setLeaveBalance(data);
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leave balance';
      setError(errorMessage);
      setLeaveBalance(null);
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'EL': return 'Earned Leave';
      case 'SL': return 'Sick Leave';
      case 'CL': return 'Casual Leave';
      case 'CompOff': return 'Comp Off';
      default: return type;
    }
  };

  const renderCharts = () => {
    if (!leaveBalance) return null;

    type Balance = {
      allocated: number;
      used: number;
      remaining: number;
      pending: number;
    };

    const pieData = {
      labels: ['Used', 'Remaining', 'Pending'],
      datasets: [{
        data: [
          leaveBalance.totalUsed,
          leaveBalance.totalRemaining,
          leaveBalance.totalPending
        ],
        backgroundColor: [
          'rgba(244, 63, 94, 0.9)',  // Rose red
          'rgba(16, 185, 129, 0.9)',  // Emerald
          'rgba(245, 158, 11, 0.9)'   // Amber
        ],
        borderColor: [
          'rgba(244, 63, 94, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(244, 63, 94, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 4,
        spacing: 5,
        borderRadius: 5,
      }]
    };

    const barData = {
      labels: Object.keys(leaveBalance.balances).map(getLeaveTypeLabel),
      datasets: [
        {
          label: 'Allocated',
          data: Object.values(leaveBalance.balances).map((b: Balance) => b.allocated),
          backgroundColor: 'rgba(99, 102, 241, 0.9)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
        },
        {
          label: 'Used',
          data: Object.values(leaveBalance.balances).map((b: Balance) => b.used),
          backgroundColor: 'rgba(244, 63, 94, 0.9)',
          borderColor: 'rgba(244, 63, 94, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(244, 63, 94, 1)',
        },
        {
          label: 'Remaining',
          data: Object.values(leaveBalance.balances).map((b: Balance) => b.remaining),
          backgroundColor: 'rgba(16, 185, 129, 0.9)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
        }
      ]
    };

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart' as const
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              size: 12,
              family: "'Inter', sans-serif",
              weight: 'bold' as FontSpec['weight']
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1F2937',
          bodyColor: '#1F2937',
          bodyFont: {
            size: 13,
            family: "'Inter', sans-serif",
          },
          titleFont: {
            size: 14,
            family: "'Inter', sans-serif",
            weight: 'bold' as FontSpec['weight']
          },
          padding: 12,
          boxPadding: 8,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          callbacks: {
            label: function(context: TooltipItem<'pie' | 'bar'>) {
              const label = context.dataset.label || '';
              const value = context.parsed;
              return `${label}: ${value} days`;
            }
          }
        }
      }
    };

    const barOptions: ChartOptions<'bar'> = {
      ...baseOptions,
      scales: {
        y: {
          type: 'linear' as const,
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.04)',
            display: true
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              weight: 'normal' as FontSpec['weight']
            },
            padding: 8,
            callback: function(this: Scale<CoreScaleOptions>, tickValue: number | string) {
              return `${tickValue} days`;
            }
          },
          border: {
            dash: [4, 4]
          }
        },
        x: {
          type: 'category' as const,
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              weight: 'bold' as FontSpec['weight']
            },
            padding: 8
          }
        }
      },
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          labels: {
            ...baseOptions.plugins?.legend?.labels,
            generateLabels: function(chart: ChartJS) {
              const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
              return original.map(label => ({
                ...label,
                borderRadius: 3
              }));
            }
          }
        }
      }
    };

    const pieOptions: ChartOptions<'pie'> = {
      ...baseOptions,
      cutout: '60%',
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          onClick: () => null // Disable legend click for pie chart
        }
      }
    };

    return (
      <div className="relative h-full w-full">
        {chartType === 'pie' ? (
          <div className="relative h-full flex items-center justify-center">
            <Pie data={pieData} options={pieOptions} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {leaveBalance.totalAllocated}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  Total Days
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Bar data={barData} options={barOptions} />
        )}
      </div>
    );
  };

  // const renderLeaveTypes = () => {
  //   if (!leaveBalance) return null;

  //   return (
  //     <div className="bg-white rounded-3xl shadow-xl overflow-hidden mt-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
  //       <div className="p-8 border-b border-gray-100">
  //         <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
  //           Leave Type Details
  //         </h3>
  //       </div>
  //       <div className="overflow-x-auto">
  //         <table className="w-full">
  //           <thead>
  //             <tr className="bg-gray-50/80">
  //               <th className="px-8 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
  //                 Leave Type
  //               </th>
  //               <th className="px-8 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
  //                 Allocated
  //               </th>
  //               <th className="px-8 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
  //                 Used
  //               </th>
  //               <th className="px-8 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
  //                 Remaining
  //               </th>
  //               <th className="px-8 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
  //                 Pending
  //               </th>
  //             </tr>
  //           </thead>
  //           <tbody className="bg-white divide-y divide-gray-100">
  //             {Object.entries(leaveBalance.balances).map(([type, balance]) => (
  //               <tr key={type} className="hover:bg-gray-50/80 transition-colors group">
  //                 <td className="px-8 py-6 whitespace-nowrap">
  //                   <div className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
  //                     {getLeaveTypeLabel(type)}
  //                   </div>
  //                 </td>
  //                 <td className="px-8 py-6 whitespace-nowrap">
  //                   <div className="text-base font-medium text-blue-600 opacity-90 group-hover:opacity-100">
  //                     {balance.allocated}
  //                   </div>
  //                 </td>
  //                 <td className="px-8 py-6 whitespace-nowrap">
  //                   <div className="text-base font-medium text-rose-600 opacity-90 group-hover:opacity-100">
  //                     {balance.used}
  //                   </div>
  //                 </td>
  //                 <td className="px-8 py-6 whitespace-nowrap">
  //                   <div className="text-base font-medium text-emerald-600 opacity-90 group-hover:opacity-100">
  //                     {balance.remaining}
  //                   </div>
  //                 </td>
  //                 <td className="px-8 py-6 whitespace-nowrap">
  //                   <div className="text-base font-medium text-amber-600 opacity-90 group-hover:opacity-100">
  //                     {balance.pending}
  //                   </div>
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FaCalendarCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Leave Balance</h1>
              <p className="text-blue-100 mt-1">View your leave allocation and usage</p>
            </div>
          </div>
          <button
            onClick={fetchLeaveBalance}
            className="p-2.5 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors rounded-lg"
            title="Refresh"
          >
            <FaSync className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchLeaveBalance} />
      ) : leaveBalance ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Charts and Analytics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                  Leave Overview
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl backdrop-blur-sm mr-4">
                    <button
                      onClick={() => setViewType('chart')}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                        viewType === 'chart'
                          ? 'bg-white text-blue-600 shadow-md scale-105'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                      }`}
                    >
                      Chart View
                    </button>
                    <button
                      onClick={() => setViewType('table')}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                        viewType === 'table'
                          ? 'bg-white text-blue-600 shadow-md scale-105'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                      }`}
                    >
                      Table View
                    </button>
                  </div>
                  {viewType === 'chart' && (
                    <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl backdrop-blur-sm">
                      <button
                        onClick={() => setChartType('pie')}
                        className={`p-3 rounded-xl transition-all duration-300 ${
                          chartType === 'pie' 
                            ? 'bg-white text-blue-600 shadow-md scale-105' 
                            : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                        }`}
                        title="Pie Chart View"
                      >
                        <FaChartPie className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setChartType('bar')}
                        className={`p-3 rounded-xl transition-all duration-300 ${
                          chartType === 'bar' 
                            ? 'bg-white text-blue-600 shadow-md scale-105' 
                            : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                        }`}
                        title="Bar Chart View"
                      >
                        <FaChartBar className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[400px] flex items-center justify-center">
                {viewType === 'chart' ? (
                  renderCharts()
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50 text-left text-sm font-bold text-blue-900 uppercase tracking-wider rounded-tl-xl">
                            <div className="flex items-center gap-2">
                              <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                              Leave Type
                            </div>
                          </th>
                          <th className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <FaChartBar className="w-4 h-4 text-blue-600" />
                              Allocated
                            </div>
                          </th>
                          <th className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <FaCheckCircle className="w-4 h-4 text-blue-600" />
                              Used
                            </div>
                          </th>
                          <th className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <FaSync className="w-4 h-4 text-blue-600" />
                              Remaining
                            </div>
                          </th>
                          <th className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50 text-left text-sm font-bold text-blue-900 uppercase tracking-wider rounded-tr-xl">
                            <div className="flex items-center gap-2">
                              <FaClock className="w-4 h-4 text-blue-600" />
                              Pending
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(leaveBalance?.balances || {}).map(([type, balance], index) => (
                          <tr 
                            key={type} 
                            className={`
                              transition-all duration-200 
                              hover:bg-blue-50/30 
                              ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                            `}
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {getLeaveTypeLabel(type)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {type === 'EL' && 'Earned Leave'}
                                    {type === 'SL' && 'Sick Leave'}
                                    {type === 'CL' && 'Casual Leave'}
                                    {type === 'CompOff' && 'Compensatory Off'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-blue-600">
                                  {balance.allocated}
                                </span>
                                <div className="w-16 h-1 mt-2 rounded-full bg-blue-100">
                                  <div 
                                    className="h-full rounded-full bg-blue-600"
                                    style={{ width: '100%' }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-rose-600">
                                  {balance.used}
                                </span>
                                <div className="w-16 h-1 mt-2 rounded-full bg-rose-100">
                                  <div 
                                    className="h-full rounded-full bg-rose-600"
                                    style={{ width: `${(balance.used / balance.allocated) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-emerald-600">
                                  {balance.remaining}
                                </span>
                                <div className="w-16 h-1 mt-2 rounded-full bg-emerald-100">
                                  <div 
                                    className="h-full rounded-full bg-emerald-600"
                                    style={{ width: `${(balance.remaining / balance.allocated) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-amber-600">
                                  {balance.pending}
                                </span>
                                <div className="w-16 h-1 mt-2 rounded-full bg-amber-100">
                                  <div 
                                    className="h-full rounded-full bg-amber-600"
                                    style={{ width: `${(balance.pending / balance.allocated) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Allocated</p>
                    <p className="text-2xl font-bold text-blue-600">{leaveBalance?.totalAllocated}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <FaCheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Available Balance</p>
                    <p className="text-2xl font-bold text-green-600">{leaveBalance?.totalRemaining}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 space-y-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaInfoCircle className="text-blue-600" />
                Leave Balance Information
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Leave Conditions</h4>
                    <p className="text-sm text-gray-600">
                      • EL (Earned Leave): 1.5 days are added next month for every full month of work <br />
                      • SL (Sick Leave): Medical-related absences<br />
                      • CL (Casual Leave): Short-notice personal time<br />
                      • Comp-off: Extra work compensation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaChartPie className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Balance Tracking</h4>
                    <p className="text-sm text-gray-600">
                      • Allocated: Total leaves granted for the current month<br />
                      • Used: Leaves taken and approved<br />
                      • Remaining: Available balance for use<br />
                      • Pending: Leaves awaiting approval
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaClock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Important Notes</h4>
                    <p className="text-sm text-gray-600">
                      • Leave year runs from January to December<br />
                      • Sick leave requires medical documentation<br />
                      • Comp-off must be used within 30 days
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h4>
                  <p className="text-sm text-blue-600">
                    • HR Portal: <span className="font-medium">hr.zenployee.com</span><br />
                    • Email: <span className="font-medium">hr@zenployee.com</span><br />
                    • Extension: <span className="font-medium">HRMS (4767)</span>
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  For leave policy updates and detailed information, please refer to the employee handbook.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LeaveViewPage() {
  return (
    <DashboardLayout>
      <LeaveViewContent />
    </DashboardLayout>
  );
} 