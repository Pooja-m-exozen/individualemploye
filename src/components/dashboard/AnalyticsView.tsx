"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { 
  FaChartBar, 
  FaUsers, 
  FaUserCheck, 
  FaClipboardList, 
  FaIdBadge, 
  FaArrowUp, 
  FaArrowDown, 
  FaEye, 
  FaDownload,
  FaProjectDiagram,
  FaCalendarAlt,
  FaUserTie,
  FaChartPie,
  FaChartLine,
  FaChartArea,
  FaPoll
} from "react-icons/fa";

interface Project {
  _id: string;
  projectName: string;
  address: string;
  totalManpower: number;
  designationWiseCount: { [key: string]: number };
  updatedDate: string;
  __v: number;
}

interface KYCWeeklyTrend {
  statusCounts: Array<{
    status: string;
    count: number;
  }>;
  totalSubmitted: number;
  year: number;
  week: number;
  weekLabel: string;
  submitted: number;
  approved: number;
  rejected: number;
}

interface KYCDailyTrend {
  statusCounts: Array<{
    status: string;
    count: number;
  }>;
  totalSubmitted: number;
  date: string;
  submitted: number;
  approved: number;
  rejected: number;
}

interface KYCChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }>;
}

interface KYCWeeklyResponse {
  success: boolean;
  message: string;
  filters: {
    startDate: string;
    endDate: string;
    projectName: string;
  };
  summary: {
    totalWeeks: number;
    totalSubmitted: number;
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    averageSubmittedPerWeek: string;
    averageApprovedPerWeek: string;
    averageRejectedPerWeek: string;
  };
  weeklyTrends: KYCWeeklyTrend[];
  chartData: KYCChartData;
}

interface KYCDailyResponse {
  success: boolean;
  message: string;
  filters: {
    startDate: string;
    endDate: string;
    projectName: string;
  };
  summary: {
    totalDays: number;
    totalSubmitted: number;
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    averageSubmittedPerDay: string;
    averageApprovedPerDay: string;
    averageRejectedPerDay: string;
  };
  dailyTrends: KYCDailyTrend[];
  approvalRateTrends: Array<{
    date: string;
    approvalRate: string;
    rejectionRate: string;
    pendingRate: string;
  }>;
  peakDays: Array<{
    date: string;
    totalSubmitted: number;
    approved: number;
    rejected: number;
    pending: number;
  }>;
  chartData: KYCChartData;
}

// PIE CHART COLORS
const PIE_COLORS = [
  '#6366f1', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#fb7185', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#f59e42', '#eab308', '#84cc16', '#14b8a6', '#0ea5e9', '#a3e635', '#f43f5e'
];

export default function AnalyticsView() {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showProjectLegend, setShowProjectLegend] = useState(false);
  const [designationCounts, setDesignationCounts] = useState<{ [key: string]: number }>({});
  const [kycLoading, setKycLoading] = useState(true);
  const [totalManpower, setTotalManpower] = useState<number | null>(null);
  const [manpowerLoading, setManpowerLoading] = useState(true);
  const [onLeaveCount, setOnLeaveCount] = useState<number | null>(null);
  const [onLeaveLoading, setOnLeaveLoading] = useState(true);
  const [presentCount, setPresentCount] = useState<number | null>(null);
  const [presentLoading, setPresentLoading] = useState(true);
  const [presentDate, setPresentDate] = useState<string | null>(null);
  
  // New state for KYC trends
  const [kycDailyData, setKycDailyData] = useState<KYCDailyResponse | null>(null);
  const [kycDailyLoading, setKycDailyLoading] = useState(true);
  const [kycDailyError, setKycDailyError] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://cafm.zenapi.co.in/api/project/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchKyc = async () => {
      setKycLoading(true);
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc');
        const data = await response.json();
        const counts: { [key: string]: number } = {};
        (data.kycForms || []).forEach((form: any) => {
          const designation = form.personalDetails?.designation || 'Unknown';
          counts[designation] = (counts[designation] || 0) + 1;
        });
        setDesignationCounts(counts);
      } catch (err) {
        setDesignationCounts({});
      }
      setKycLoading(false);
    };
    fetchKyc();
  }, []);

  useEffect(() => {
    const fetchKYCDaily = async () => {
      setKycDailyLoading(true);
      setKycDailyError(null);
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/trends/daily');
        if (!response.ok) {
          throw new Error('Failed to fetch KYC daily trends data');
        }
        const data: KYCDailyResponse = await response.json();
        setKycDailyData(data);
      } catch (err) {
        setKycDailyError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching KYC daily trends:', err);
      } finally {
        setKycDailyLoading(false);
      }
    };
    fetchKYCDaily();
  }, []);

  useEffect(() => {
    const fetchTotalManpower = async () => {
      setManpowerLoading(true);
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/dashboard/total-employees');
        const data = await response.json();
        setTotalManpower(data.total ?? null);
      } catch {
        setTotalManpower(null);
      }
      setManpowerLoading(false);
    };
    fetchTotalManpower();
  }, []);

  useEffect(() => {
    const fetchOnLeave = async () => {
      setOnLeaveLoading(true);
      try {
        const response = await fetch('https://cafm.zenapi.co.in/api/dashboard/on-leave-today');
        const data = await response.json();
        setOnLeaveCount(Array.isArray(data.onLeave) ? data.onLeave.length : null);
      } catch {
        setOnLeaveCount(null);
      }
      setOnLeaveLoading(false);
    };
    fetchOnLeave();
  }, []);

  useEffect(() => {
    const fetchPresentCount = async () => {
      setPresentLoading(true);
      try {
        // Add cache-busting parameter to ensure fresh data
        const response = await fetch('https://cafm.zenapi.co.in/api/dashboard/attendance-trend?t=' + Date.now());
        const data = await response.json();
        
        console.log('Attendance trend data:', data); // Debug log
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        console.log('Today\'s date:', today); // Debug log
        
        // Find today's attendance data
        if (data.trend && data.trend.length > 0) {
          const todayEntry = data.trend.find((entry: any) => entry.date === today);
          console.log('Today\'s entry:', todayEntry); // Debug log
          
          if (todayEntry) {
            setPresentCount(todayEntry.present ?? null);
            setPresentDate(todayEntry.date ?? null);
          } else {
            // If today's data is not available, show 0 or null
            setPresentCount(0);
            setPresentDate(today);
          }
        } else {
          setPresentCount(null);
          setPresentDate(null);
        }
      } catch (error) {
        console.error('Error fetching present count:', error); // Debug log
        setPresentCount(null);
        setPresentDate(null);
      }
      setPresentLoading(false);
    };
    fetchPresentCount();
  }, []);

  // Calculate metrics from project data
  const totalProjects = projects.length;
  
  // Calculate project status distribution (simplified - you can enhance this based on your business logic)
  const activeProjects = Math.floor(totalProjects * 0.7); // 70% active
  const completedProjects = Math.floor(totalProjects * 0.2); // 20% completed
  const pendingProjects = totalProjects - activeProjects - completedProjects; // 10% pending

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading project data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className={`text-red-500 mb-2`}>Error loading data</p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Projects</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{totalProjects}</p>
              <div className="flex items-center gap-1 mt-2">
                <FaArrowUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+12%</span>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>from last month</span>
              </div>
            </div>
            <FaProjectDiagram className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Manpower</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{manpowerLoading ? <span className="animate-pulse">...</span> : totalManpower ?? '--'}</p>
              <div className="flex items-center gap-1 mt-2">
                <FaArrowUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+8%</span>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>from last month</span>
              </div>
            </div>
            <FaUserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>On Leave</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{onLeaveLoading ? <span className="animate-pulse">...</span> : onLeaveCount ?? '--'}</p>
              <div className="flex items-center gap-1 mt-2">
                <FaArrowDown className="w-3 h-3 text-red-500" />
                <span className="text-xs text-red-500">-5%</span>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>from last month</span>
              </div>
            </div>
            <FaCalendarAlt className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Present Employees</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{presentLoading ? <span className="animate-pulse">...</span> : presentCount ?? '--'}</p>
              {presentDate && (
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Date: {presentDate}</p>
              )}
              <div className="flex items-center gap-1 mt-2">
                <FaArrowUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+15%</span>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>from last month</span>
              </div>
            </div>
            <FaUsers className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Distribution Chart */}
        <div
          className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border flex flex-col items-center`}
        >
          <div className="flex items-center justify-between mb-4 w-full">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Project Distribution</div>
            <button
              className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
              onClick={() => setShowProjectLegend((prev) => !prev)}
            >
              <FaEye className="w-4 h-4" />
              View Details
            </button>
          </div>
          {typeof totalManpower === 'number' && totalManpower > 0 ? (() => {
            const tm = totalManpower;
            const r = 90;
            let acc = 0;
            return (
              <svg width={220} height={220} viewBox="0 0 220 220" className="mb-4">
                {projects.map((p, i) => {
                  const start = acc;
                  const angle = (p.totalManpower / tm) * 360;
                  acc += angle;
                  const largeArc = angle > 180 ? 1 : 0;
                  const x1 = 110 + r * Math.cos((Math.PI * (start - 90)) / 180);
                  const y1 = 110 + r * Math.sin((Math.PI * (start - 90)) / 180);
                  const x2 = 110 + r * Math.cos((Math.PI * (start + angle - 90)) / 180);
                  const y2 = 110 + r * Math.sin((Math.PI * (start + angle - 90)) / 180);
                  return (
                    <path
                      key={p._id}
                      d={`M110,110 L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                })}
              </svg>
            );
          })() : (
            <div className="text-center text-gray-400 mb-4">No data</div>
          )}
          {showProjectLegend && (
            <div className="flex flex-wrap gap-2 justify-center">
              {projects.map((p, i) => (
                <span key={p._id} className="flex items-center gap-2 text-xs font-medium">
                  <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                  <span className={theme === "dark" ? "text-blue-200" : "text-blue-900"} title={p.projectName} style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block'}}>
                    {p.projectName}
                  </span>
                  <span className={theme === "dark" ? "text-blue-300 font-semibold" : "text-blue-700 font-semibold"}>{totalManpower !== null ? p.totalManpower : '--'}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Designation Distribution Chart (moved here) */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Designation Distribution</h3>
            <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors">
              <FaEye className="w-4 h-4" />
              View Details
            </button>
          </div>
          <div className={`h-64 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg p-4 overflow-y-auto`}>
            {kycLoading ? (
              <div className="text-center text-gray-400">Loading...</div>
            ) : (
              <div className="space-y-4 min-w-0">
                {Object.entries(designationCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([designation, count]) => {
                    const maxCount = Math.max(...Object.values(designationCounts));
                    const percent = ((count / maxCount) * 100).toFixed(0);
                    return (
                      <div key={designation} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-900'} truncate max-w-xs`} title={designation}>
                            {designation}
                          </span>
                          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>{count} <span className="ml-1 text-[10px] text-gray-400">({percent}%)</span></span>
                        </div>
                        <div className="w-full h-3 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                              background: `linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)`,
                              boxShadow: '0 2px 8px 0 rgba(37,99,235,0.10)'
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Additional Charts Section (remove Designation Distribution from here) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC Status Chart */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>KYC Daily Trends</h3>
            <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors">
              <FaDownload className="w-4 h-4" />
              Export
            </button>
          </div>
          
          {kycDailyLoading ? (
            <div className={`h-48 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg flex items-center justify-center`}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading KYC daily trends...</p>
              </div>
            </div>
          ) : kycDailyError ? (
            <div className={`h-48 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg flex items-center justify-center`}>
              <div className="text-center">
                <FaChartBar className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <p className={`text-red-500 mb-1`}>Error loading data</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{kycDailyError}</p>
              </div>
            </div>
          ) : kycDailyData ? (
            <div className="space-y-4">
              {/* Bar + Dotted Line Graph */}
              <div className="relative w-full h-48 flex items-end justify-center">
                {(() => {
                  // Sort by date ascending
                  const sortedTrends = [...kycDailyData.dailyTrends].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  // Find the latest date in the data
                  const lastDate = new Date(sortedTrends[sortedTrends.length - 1].date);
                  // Build an array of the last 7 calendar days
                  const last7Days = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(lastDate);
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toISOString().slice(0, 10);
                    const found = sortedTrends.find(t => t.date === dateStr);
                    last7Days.push({
                      date: dateStr,
                      submitted: found ? Number(found.submitted) : 0,
                      approved: found ? Number(found.approved) : 0,
                    });
                  }
                  // Find the max value among submitted and approved for scaling
                  const maxValue = Math.max(
                    ...last7Days.map(t => Math.max(t.submitted, t.approved)),
                    1 // avoid div by zero
                  );
                  // Responsive SVG dimensions
                  const numBars = last7Days.length;
                  const barWidth = 24;
                  const barGap = 16;
                  const chartLeftPad = 32;
                  const chartRightPad = 32;
                  const chartBottomPad = 28;
                  const chartTopPad = 20;
                  const chartHeight = 160;
                  const chartWidth = chartLeftPad + chartRightPad + numBars * barWidth + (numBars - 1) * barGap;
                  const usableHeight = chartHeight - chartBottomPad - chartTopPad;
                  return (
                    <div className="w-full overflow-x-auto">
                      <svg width={chartWidth} height={chartHeight} className="block mx-auto">
                        {/* Bars for Submitted */}
                        {last7Days.map((trend, i) => {
                          const barHeight = trend.submitted > 0 ? Math.max((trend.submitted / maxValue) * usableHeight, 4) : 4;
                          const x = chartLeftPad + i * (barWidth + barGap);
                          return (
                            <g key={trend.date}>
                              <rect
                                x={x}
                                y={chartHeight - chartBottomPad - barHeight}
                                width={barWidth}
                                height={barHeight}
                                fill="#f59e42"
                                rx={4}
                                opacity={trend.submitted > 0 ? 1 : 0.2}
                                onMouseEnter={() => setHoveredBar(i)}
                                onMouseLeave={() => setHoveredBar(null)}
                                style={{ cursor: 'pointer' }}
                              />
                              {/* Vertical count label inside the bar */}
                              <text
                                x={x + barWidth / 2}
                                y={chartHeight - chartBottomPad - barHeight / 2}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                fill="#fff"
                                fontWeight="bold"
                                fontSize="14"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                              >
                                {trend.submitted}
                              </text>
                            </g>
                          );
                        })}
                        {/* X-axis labels */}
                        {last7Days.map((trend, i) => {
                          const x = chartLeftPad + i * (barWidth + barGap) + barWidth / 2;
                          const date = new Date(trend.date);
                          const formattedDate = `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('default', { month: 'short' })}`;
                          return (
                            <text
                              key={trend.date}
                              x={x}
                              y={chartHeight - 6}
                              textAnchor="middle"
                              alignmentBaseline="middle"
                              fill="#cbd5e1"
                              fontSize="12"
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                              {formattedDate}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
              <div className="flex justify-center mt-4 space-x-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded"></div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Submitted</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={`h-48 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg flex items-center justify-center`}>
              <div className="text-center">
                <FaChartBar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No KYC data available</p>
              </div>
            </div>
          )}
        </div>
        {/* Requests Analysis */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Requests Analysis</h3>
            <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors">
              <FaDownload className="w-4 h-4" />
              Export
            </button>
          </div>
          <div className={`h-48 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg flex items-center justify-center`}>
            <div className="text-center">
              <FaChartArea className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Requests Histogram</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Leave, KYC, Uniform requests</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 