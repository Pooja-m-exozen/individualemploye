"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { 
  FaChartBar, 
  FaUsers, 
  FaUserCheck, 
  FaArrowUp, 
  FaArrowDown, 
  FaEye, 
  FaProjectDiagram,
  FaCalendarAlt,
  FaChartArea
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

// Define interfaces for leave and regularization
interface Leave { startDate?: string; }
interface Regularization { date?: string; }

// Define a type for designation details
interface DesignationEmployee {
  employeeId: string;
  fullName?: string;
  projectName?: string;
  dateOfJoining?: string;
  phoneNumber?: string;
  email?: string;
  // Add other fields as needed
}

export default function AnalyticsView() {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
    total: number;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Add after other state declarations
  const [leaveAnalytics, setLeaveAnalytics] = useState<{ [date: string]: number }>({});
  const [regularizationAnalytics, setRegularizationAnalytics] = useState<{ [date: string]: number }>({});
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [designationDetails, setDesignationDetails] = useState<{ [key: string]: DesignationEmployee[] }>({});

  // Add state for KYC and Requests modals
  const [showKYCDailyModal, setShowKYCDailyModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

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
      } catch {
        setError('An error occurred');
        console.error('Error fetching projects');
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
        const details: { [key: string]: DesignationEmployee[] } = {};
        (data.kycForms || []).forEach((form: { personalDetails?: Record<string, unknown> }) => {
          const personalDetails = form.personalDetails;
          const designation = (personalDetails?.designation as string) || 'Unknown';
          counts[designation] = (counts[designation] || 0) + 1;
          if (!details[designation]) details[designation] = [];
          if (personalDetails && typeof personalDetails.employeeId === 'string') {
            details[designation].push(personalDetails as unknown as DesignationEmployee);
          }
        });
        setDesignationCounts(counts);
        setDesignationDetails(details);
      } catch {
        setDesignationCounts({});
        setDesignationDetails({});
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
      } catch {
        setKycDailyError('An error occurred while fetching KYC daily trends');
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

        // Get yesterday's date in YYYY-MM-DD format
        const yesterdayDateObj = new Date();
        yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
        const yesterday = yesterdayDateObj.toISOString().split('T')[0];

        // Find yesterday's attendance data
        if (data.trend && data.trend.length > 0) {
          const yesterdayEntry = data.trend.find((entry: Record<string, unknown>) => entry.date === yesterday);
          if (yesterdayEntry) {
            setPresentCount(yesterdayEntry.present ?? null);
            setPresentDate(yesterdayEntry.date ?? null);
          } else {
            // If yesterday's data is not available, show 0 or null
            setPresentCount(0);
            setPresentDate(yesterday);
          }
        } else {
          setPresentCount(null);
          setPresentDate(null);
        }
      } catch (error) {
        setPresentCount(null);
        setPresentDate(null);
      }
      setPresentLoading(false);
    };
    fetchPresentCount();
  }, []);

  useEffect(() => {
    async function fetchRequestsAnalytics() {
      setRequestsLoading(true);
      setRequestsError(null);
      try {
        // Get last 7 days (including today)
        const today = new Date();
        const last7Days: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          last7Days.push(d.toISOString().slice(0, 10));
        }
        // Fetch leave data
        const leaveRes = await fetch('https://cafm.zenapi.co.in/api/leave/all');
        const leaveJson = await leaveRes.json();
        const leaveCounts: { [date: string]: number } = {};
        (leaveJson.leaves || []).forEach((leave: Leave) => {
          const date = leave.startDate?.slice(0, 10);
          if (date && last7Days.includes(date)) {
            leaveCounts[date] = (leaveCounts[date] || 0) + 1;
          }
        });
        // Fetch regularization data
        const regRes = await fetch('https://cafm.zenapi.co.in/api/attendance/regularization-history/all');
        const regJson = await regRes.json();
        const regCounts: { [date: string]: number } = {};
        (regJson.data?.regularizations || []).forEach((reg: Regularization) => {
          const date = reg.date?.slice(0, 10);
          if (date && last7Days.includes(date)) {
            regCounts[date] = (regCounts[date] || 0) + 1;
          }
        });
        setLeaveAnalytics(leaveCounts);
        setRegularizationAnalytics(regCounts);
      } catch {
        setRequestsError('Failed to fetch requests analytics');
      } finally {
        setRequestsLoading(false);
      }
    }
    fetchRequestsAnalytics();
  }, []);

  // Calculate metrics from project data
  const totalProjects = projects.length;

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
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Present(Yesterday)</p>
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
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
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
          {typeof totalManpower === 'number' && totalManpower > 0 ? (
            <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg p-4 flex items-center justify-center`}>
              {(() => {
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
              })()}
            </div>
          ) : (
            <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg p-4 flex items-center justify-center text-center text-gray-400 mb-4`}>No data</div>
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
            <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors" onClick={() => setShowDesignationModal(true)}>
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
          {/* Designation Details Modal */}
          {showDesignationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-4xl w-full p-6 relative overflow-y-auto max-h-[80vh]`}>
                <button className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowDesignationModal(false)}>&times;</button>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Designation Details</h2>
                <div className="overflow-x-auto">
                  {Object.entries(designationDetails).map(([designation, employees]) => (
                    <div key={designation} className="mb-8">
                      <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-900'}`}>{designation} ({employees.length})</h3>
                      <table className="min-w-full border text-xs mb-4">
                        <thead>
                          <tr className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}>
                            <th className="px-2 py-1 border">Employee ID</th>
                            <th className="px-2 py-1 border">Name</th>
                            <th className="px-2 py-1 border">Project</th>
                            <th className="px-2 py-1 border">Date of Joining</th>
                            <th className="px-2 py-1 border">Phone</th>
                            <th className="px-2 py-1 border">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employees.map((emp, idx) => (
                            <tr key={emp.employeeId || idx} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'}>
                              <td className="px-2 py-1 border">{emp.employeeId}</td>
                              <td className="px-2 py-1 border">{emp.fullName}</td>
                              <td className="px-2 py-1 border">{emp.projectName}</td>
                              <td className="px-2 py-1 border">{emp.dateOfJoining}</td>
                              <td className="px-2 py-1 border">{emp.phoneNumber}</td>
                              <td className="px-2 py-1 border">{emp.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Additional Charts Section (remove Designation Distribution from here) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC Status Chart */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>KYC Daily Trends</h3>
            <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors" onClick={() => setShowKYCDailyModal(true)}>
              <FaEye className="w-4 h-4" />
              View
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
            <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg p-4`}>
              {/* Enhanced Bar Graph */}
              <div className="relative w-full h-64">
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
                      rejected: found ? Number(found.rejected) : 0,
                    });
                  }
                  
                  // Find the max value for scaling
                  const maxValue = Math.max(
                    ...last7Days.map(t => Math.max(t.submitted, t.approved, t.rejected)),
                    1 // avoid div by zero
                  );
                  
                  // Chart dimensions
                  const chartHeight = 200;
                  const chartWidth = 400;
                  const margin = { top: 20, right: 30, bottom: 40, left: 40 };
                  const width = chartWidth - margin.left - margin.right;
                  const height = chartHeight - margin.top - margin.bottom;
                  
                  const barWidth = (width - (last7Days.length - 1) * 8) / last7Days.length;
                  
                  return (
                    <div className="w-full overflow-x-auto">
                      <svg width={chartWidth} height={chartHeight} className="block mx-auto">
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
                          const y = margin.top + height * (1 - tick);
                          return (
                            <g key={i}>
                              <line
                                x1={margin.left}
                                y1={y}
                                x2={margin.left + width}
                                y2={y}
                                stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                                strokeWidth="1"
                                strokeDasharray="2,2"
                              />
                              <text
                                x={margin.left - 8}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="10"
                                fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                              >
                                {Math.round(maxValue * tick)}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Bars for Submitted */}
                        {last7Days.map((trend, i) => {
                          const x = margin.left + i * (barWidth + 8);
                          const submittedHeight = (trend.submitted / maxValue) * height;
                          const approvedHeight = (trend.approved / maxValue) * height;
                          const rejectedHeight = (trend.rejected / maxValue) * height;
                          const total = trend.submitted + trend.approved + trend.rejected;
                          
                          return (
                            <g key={trend.date} className="group">
                              {/* Submitted bar */}
                              <rect
                                x={x}
                                y={margin.top + height - submittedHeight}
                                width={barWidth}
                                height={Math.max(submittedHeight, 2)}
                                fill="#f59e42"
                                rx={3}
                                className="transition-all duration-200 hover:opacity-80"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltipData({
                                    date: trend.date,
                                    submitted: trend.submitted,
                                    approved: trend.approved,
                                    rejected: trend.rejected,
                                    total
                                  });
                                  setTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10
                                  });
                                  setShowTooltip(true);
                                }}
                                onMouseLeave={() => setShowTooltip(false)}
                              />
                              
                              {/* Approved bar */}
                              <rect
                                x={x}
                                y={margin.top + height - submittedHeight - approvedHeight}
                                width={barWidth}
                                height={Math.max(approvedHeight, 2)}
                                fill="#10b981"
                                rx={3}
                                className="transition-all duration-200 hover:opacity-80"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltipData({
                                    date: trend.date,
                                    submitted: trend.submitted,
                                    approved: trend.approved,
                                    rejected: trend.rejected,
                                    total
                                  });
                                  setTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10
                                  });
                                  setShowTooltip(true);
                                }}
                                onMouseLeave={() => setShowTooltip(false)}
                              />
                              
                              {/* Rejected bar */}
                              <rect
                                x={x}
                                y={margin.top + height - submittedHeight - approvedHeight - rejectedHeight}
                                width={barWidth}
                                height={Math.max(rejectedHeight, 2)}
                                fill="#ef4444"
                                rx={3}
                                className="transition-all duration-200 hover:opacity-80"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltipData({
                                    date: trend.date,
                                    submitted: trend.submitted,
                                    approved: trend.approved,
                                    rejected: trend.rejected,
                                    total
                                  });
                                  setTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10
                                  });
                                  setShowTooltip(true);
                                }}
                                onMouseLeave={() => setShowTooltip(false)}
                              />
                              
                              {/* Value labels */}
                              {trend.submitted > 0 && (
                                <text
                                  x={x + barWidth / 2}
                                  y={margin.top + height - submittedHeight / 2}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="#fff"
                                  fontWeight="bold"
                                  className="pointer-events-none"
                                >
                                  {trend.submitted}
                                </text>
                              )}
                              
                              {trend.approved > 0 && (
                                <text
                                  x={x + barWidth / 2}
                                  y={margin.top + height - submittedHeight - approvedHeight / 2}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="#fff"
                                  fontWeight="bold"
                                  className="pointer-events-none"
                                >
                                  {trend.approved}
                                </text>
                              )}
                              
                              {trend.rejected > 0 && (
                                <text
                                  x={x + barWidth / 2}
                                  y={margin.top + height - submittedHeight - approvedHeight - rejectedHeight / 2}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="#fff"
                                  fontWeight="bold"
                                  className="pointer-events-none"
                                >
                                  {trend.rejected}
                                </text>
                              )}
                              
                              {/* Date labels */}
                              <text
                                x={x + barWidth / 2}
                                y={chartHeight - 8}
                                textAnchor="middle"
                                fontSize="10"
                                fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                className="pointer-events-none"
                              >
                                {new Date(trend.date).getDate().toString().padStart(2, '0')}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Y-axis */}
                        <line
                          x1={margin.left}
                          y1={margin.top}
                          x2={margin.left}
                          y2={margin.top + height}
                          stroke={theme === 'dark' ? '#4b5563' : '#d1d5db'}
                          strokeWidth="1"
                        />
                        
                        {/* X-axis */}
                        <line
                          x1={margin.left}
                          y1={margin.top + height}
                          x2={margin.left + width}
                          y2={margin.top + height}
                          stroke={theme === 'dark' ? '#4b5563' : '#d1d5db'}
                          strokeWidth="1"
                        />
                      </svg>
                    </div>
                  );
                })()}
              </div>
              
              {/* Tooltip */}
              {showTooltip && tooltipData && (
                <div
                  className={`fixed z-50 px-3 py-2 text-sm rounded-lg shadow-lg border ${
                    theme === 'dark' 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-800'
                  }`}
                  style={{
                    left: tooltipPosition.x,
                    top: tooltipPosition.y,
                    transform: 'translateX(-50%) translateY(-100%)',
                    pointerEvents: 'none'
                  }}
                >
                  <div className="font-semibold mb-1">
                    {new Date(tooltipData.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span>Submitted:</span>
                      </span>
                      <span className="font-semibold">{tooltipData.submitted}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Approved:</span>
                      </span>
                      <span className="font-semibold">{tooltipData.approved}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Rejected:</span>
                      </span>
                      <span className="font-semibold">{tooltipData.rejected}</span>
                    </div>
                    <div className="border-t pt-1 mt-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold">{tooltipData.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Legend */}
              <div className="flex justify-center mt-4 space-x-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded"></div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Submitted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Rejected</span>
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
          {/* KYC Daily Trends Modal */}
          {showKYCDailyModal && kycDailyData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-3xl w-full p-6 relative overflow-y-auto max-h-[80vh]`}>
                <button className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowKYCDailyModal(false)}>&times;</button>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>KYC Daily Trends Details</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-xs mb-4">
                    <thead>
                      <tr className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">Submitted</th>
                        <th className="px-2 py-1 border">Approved</th>
                        <th className="px-2 py-1 border">Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kycDailyData.dailyTrends.map((trend, idx) => (
                        <tr key={trend.date || idx} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'}>
                          <td className="px-2 py-1 border">{trend.date}</td>
                          <td className="px-2 py-1 border">{trend.submitted}</td>
                          <td className="px-2 py-1 border">{trend.approved}</td>
                          <td className="px-2 py-1 border">{trend.rejected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Requests Analysis */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Requests Analysis</h3>
            <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors" onClick={() => setShowRequestsModal(true)}>
              <FaEye className="w-4 h-4" />
              View
            </button>
          </div>
          <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg p-4 w-full`}>
            <div className={`h-64 flex flex-col items-center justify-center relative`}>
              {requestsLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading requests analytics...</p>
                </div>
              ) : requestsError ? (
                <div className="text-center">
                  <FaChartArea className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className={`text-red-500 mb-1`}>Error loading data</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{requestsError}</p>
                </div>
              ) : (
                (() => {
                  // Prepare last 7 days
                  const today = new Date();
                  const last7Days: string[] = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    last7Days.push(d.toISOString().slice(0, 10));
                  }
                  // Find max value for scaling
                  const maxValue = Math.max(
                    ...last7Days.map(date => (leaveAnalytics[date] || 0) + (regularizationAnalytics[date] || 0)),
                    1
                  );
                  // Chart dimensions
                  const chartHeight = 180;
                  const chartWidth = 340;
                  const margin = { top: 20, right: 20, bottom: 32, left: 36 };
                  const width = chartWidth - margin.left - margin.right;
                  const height = chartHeight - margin.top - margin.bottom;
                  const barGroupWidth = (width - (last7Days.length - 1) * 12) / last7Days.length;
                  const barWidth = Math.max(barGroupWidth / 3, 12);
                  return (
                    <>
                      <div className="w-full overflow-x-auto">
                        <svg width={chartWidth} height={chartHeight} className="block mx-auto">
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
                            const y = margin.top + height * (1 - tick);
                            return (
                              <g key={i}>
                                <line
                                  x1={margin.left}
                                  y1={y}
                                  x2={margin.left + width}
                                  y2={y}
                                  stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                                  strokeWidth="1"
                                  strokeDasharray="2,2"
                                />
                                <text
                                  x={margin.left - 8}
                                  y={y + 4}
                                  textAnchor="end"
                                  fontSize="10"
                                  fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                >
                                  {Math.round(maxValue * tick)}
                                </text>
                              </g>
                            );
                          })}
                          {/* Bars */}
                          {last7Days.map((date, i) => {
                            const leaveCount = leaveAnalytics[date] || 0;
                            const regCount = regularizationAnalytics[date] || 0;
                            const x = margin.left + i * (barGroupWidth + 12);
                            const leaveHeight = (leaveCount / maxValue) * height;
                            const regHeight = (regCount / maxValue) * height;
                            return (
                              <g key={date}>
                                {/* Leave bar */}
                                <rect
                                  x={x}
                                  y={margin.top + height - leaveHeight}
                                  width={barWidth}
                                  height={Math.max(leaveHeight, 2)}
                                  fill="#2563eb"
                                  rx={3}
                                  className="transition-all duration-200 hover:opacity-80"
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={e => {
                                    setTooltipData({
                                      date,
                                      submitted: leaveCount,
                                      approved: 0,
                                      rejected: 0,
                                      total: leaveCount
                                    });
                                  }}
                                  onMouseLeave={() => setShowTooltip(false)}
                                />
                                {/* Regularization bar */}
                                <rect
                                  x={x + barWidth + 4}
                                  y={margin.top + height - regHeight}
                                  width={barWidth}
                                  height={Math.max(regHeight, 2)}
                                  fill="#f59e42"
                                  rx={3}
                                  className="transition-all duration-200 hover:opacity-80"
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={e => {
                                    setTooltipData({
                                      date,
                                      submitted: 0,
                                      approved: regCount,
                                      rejected: 0,
                                      total: regCount
                                    });
                                  }}
                                  onMouseLeave={() => setShowTooltip(false)}
                                />
                                {/* Date label */}
                                <text
                                  x={x + barWidth}
                                  y={chartHeight - 8}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                  className="pointer-events-none"
                                >
                                  {(() => {
                                    const d = new Date(date);
                                    return `${d.getDate().toString().padStart(2, '0')}`;
                                  })()}
                                </text>
                              </g>
                            );
                          })}
                          {/* Y-axis */}
                          <line
                            x1={margin.left}
                            y1={margin.top}
                            x2={margin.left}
                            y2={margin.top + height}
                            stroke={theme === 'dark' ? '#4b5563' : '#d1d5db'}
                            strokeWidth="1"
                          />
                          {/* X-axis */}
                          <line
                            x1={margin.left}
                            y1={margin.top + height}
                            x2={margin.left + width}
                            y2={margin.top + height}
                            stroke={theme === 'dark' ? '#4b5563' : '#d1d5db'}
                            strokeWidth="1"
                          />
                        </svg>
                      </div>
                      {/* Legend below chart, horizontally centered, styled like KYC Daily Trends */}
                      <div className="flex justify-center mt-4 space-x-6">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-600 rounded"></div>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Leave</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-400 rounded"></div>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Regularization</span>
                        </div>
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>
          {/* Requests Analysis Modal */}
          {showRequestsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-3xl w-full p-6 relative overflow-y-auto max-h-[80vh]`}>
                <button className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowRequestsModal(false)}>&times;</button>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Requests Analysis Details</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-xs mb-4">
                    <thead>
                      <tr className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">Leave Requests</th>
                        <th className="px-2 py-1 border">Regularization Requests</th>
                        <th className="px-2 py-1 border">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const today = new Date();
                        const last7Days: string[] = [];
                        for (let i = 6; i >= 0; i--) {
                          const d = new Date(today);
                          d.setDate(today.getDate() - i);
                          last7Days.push(d.toISOString().slice(0, 10));
                        }
                        return last7Days.map((date, idx) => (
                          <tr key={date || idx} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'}>
                            <td className="px-2 py-1 border">{date}</td>
                            <td className="px-2 py-1 border">{leaveAnalytics[date] || 0}</td>
                            <td className="px-2 py-1 border">{regularizationAnalytics[date] || 0}</td>
                            <td className="px-2 py-1 border">{(leaveAnalytics[date] || 0) + (regularizationAnalytics[date] || 0)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 