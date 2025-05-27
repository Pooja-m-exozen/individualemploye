import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { FaSpinner, FaExclamationCircle, FaSync } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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
}

interface MonthlyStatsResponse {
  success: boolean;
  message: string;
  data: MonthlyStats;
}

export default function AttendanceAnalytics() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMonthlyStats();
  }, []);

  const fetchMonthlyStats = async () => {
    try {
      setLoading(true);
      setError(null);
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
      setError(error instanceof Error ? error.message : 'Failed to fetch monthly stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading attendance analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <FaExclamationCircle className="w-full h-full" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
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
  );
} 