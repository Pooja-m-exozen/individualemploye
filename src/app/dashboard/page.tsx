'use client';

import React from 'react';
import { FaUserFriends, FaBuilding, FaBriefcase, FaFileAlt } from 'react-icons/fa';
import { XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell, Legend, TooltipProps } from 'recharts';
import MetricCard from '@/components/dashboard/MetricCard';

export default function DashboardPage() {
  const metrics = {
    employees: 150,
    departments: 8,
    designations: 12,
    pendingKyc: 5
  };

  // Sample data for charts
  const employeeGrowthData = [
    { month: 'Jan', employees: 120 },
    { month: 'Feb', employees: 130 },
    { month: 'Mar', employees: 135 },
    { month: 'Apr', employees: 142 },
    { month: 'May', employees: 145 },
    { month: 'Jun', employees: 150 },
  ];

  const departmentDistribution = [
    { name: 'IT', count: 45 },
    { name: 'HR', count: 20 },
    { name: 'Sales', count: 35 },
    { name: 'Marketing', count: 25 },
    { name: 'Finance', count: 25 },
  ];

  const recentActivities = [
    { id: 1, action: 'New employee joined', department: 'IT', time: '2 hours ago' },
    { id: 2, action: 'KYC verification completed', department: 'HR', time: '4 hours ago' },
    { id: 3, action: 'Department update', department: 'Sales', time: '1 day ago' },
  ];

  // Add pie chart colors
  const COLORS = ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

  const CustomTooltip = ({ 
    active, 
    payload, 
    label 
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-100">
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="text-lg font-bold text-indigo-600">
            {payload[0].value} Employees
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 bg-white">
      <h1 className="text-3xl font-bold mb-8 text-slate-800 border-b pb-4">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Metric Cards with consistent sizing */}
        <div className="h-[160px] transform transition-all duration-300 hover:scale-105">
          <MetricCard title="Total Employees" value={metrics.employees} icon={<FaUserFriends className="text-2xl" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        </div>
        <div className="h-[160px] transform transition-all duration-300 hover:scale-105">
          <MetricCard title="Total Departments" value={metrics.departments} icon={<FaBuilding className="text-2xl" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        </div>
        <div className="h-[160px] transform transition-all duration-300 hover:scale-105">
          <MetricCard title="Total Designations" value={metrics.designations} icon={<FaBriefcase className="text-2xl" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        </div>
        <div className="h-[160px] transform transition-all duration-300 hover:scale-105">
          <MetricCard title="Pending KYC" value={metrics.pendingKyc} icon={<FaFileAlt className="text-2xl" />} color="bg-gradient-to-br from-rose-500 to-rose-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Chart cards with consistent sizing */}
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 h-[400px] relative group">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Employee Growth</h2>
              <p className="text-sm text-slate-500">Monthly employee count</p>
            </div>
            <select className="px-3 py-1 border rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={employeeGrowthData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="employeeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e2e8f0" 
                vertical={false}
              />
              <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                axisLine={false} 
                tickLine={false}
                dy={10}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis 
                stroke="#64748b" 
                axisLine={false} 
                tickLine={false}
                dx={-10}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickCount={6}
                domain={[0, 'dataMax + 20']}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar 
                dataKey="employees" 
                fill="url(#employeeGradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
                animationDuration={2000}
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Department Distribution</h2>
            <div className="flex gap-2">
              <select className="px-3 py-1 border rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option>All Departments</option>
                <option>Active Only</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={60}
                paddingAngle={5}
                dataKey="count"
              >
                {departmentDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#1e293b' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Recent Activities</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
        </div>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 transition-colors duration-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <FaUserFriends />
                </div>
                <div>
                  <p className="text-slate-800 font-medium">{activity.action}</p>
                  <p className="text-slate-500 text-sm">{activity.department}</p>
                </div>
              </div>
              <span className="text-slate-400 text-sm bg-slate-50 px-3 py-1 rounded-full">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}