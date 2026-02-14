"use client";

import React, { useEffect, useState } from "react";
import { FaUsers, FaProjectDiagram, FaFileAlt, FaChartBar, FaSearch } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

// Add type for summary 

type SummaryItem = {
  label: string;
  value: number | string | null;
  icon: React.ReactNode;
};


type ProjectDistributionItem = {
  _id: string;
  count: number;
  totalManpower: number;
  shortageManpower: number;
};

type EmployeeItem = {
  _id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  status: string;
  joinDate: string;
};

type ProjectItem = {
  _id: string;
  projectName: string;
  address: string;
  status: string;
  totalManpower: number;
  designationWiseCount: Record<string, number>;
};

// PIE CHART COLORS
const PIE_COLORS = [
  '#6366f1', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#fb7185', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#f59e42', '#eab308', '#84cc16', '#14b8a6', '#0ea5e9', '#a3e635', '#f43f5e'
];

export default function CoordinatorDashboardPage() {
  const { theme } = useTheme();

  // View toggle state
  const [activeView, setActiveView] = useState<'overview' | 'employees' | 'projects'>('overview');

  // State for dashboard summary
  const [summary, setSummary] = useState<SummaryItem[]>([
    { label: "Total Employees", value: null, icon: <FaUsers className="w-7 h-7" /> },
    { label: "Active Projects", value: null, icon: <FaProjectDiagram className="w-7 h-7" /> },
    { label: "Pending KYC", value: null, icon: <FaFileAlt className="w-7 h-7" /> },
  ]);
  const [loading, setLoading] = useState(true);
  const [projectDistribution, setProjectDistribution] = useState<ProjectDistributionItem[]>([]);
  const [projectDistributionSearch, setProjectDistributionSearch] = useState('');

  // Table data states
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Filter states
  const [empSearchFilter, setEmpSearchFilter] = useState('');
  const [empProjectFilter, setEmpProjectFilter] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');
  const [projSearchFilter, setProjSearchFilter] = useState('');
  const [projProjectFilter, setProjProjectFilter] = useState('');

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [empRes, projRes, kycRes] = await Promise.all([
          fetch("https://cafm.zenapi.co.in/api/dashboard/total-employees"),
          fetch("https://cafm.zenapi.co.in/api/dashboard/total-projects"),
          fetch("https://cafm.zenapi.co.in/api/dashboard/pending-kyc"),
        ]);
        const empData = await empRes.json() as { total: number };
        const projData = await projRes.json() as { total: number };
        const kycData = await kycRes.json() as { pending: number };
        setSummary([
          { label: "Total Employees", value: empData.total, icon: <FaUsers className="w-7 h-7" /> },
          { label: "Active Projects", value: projData.total, icon: <FaProjectDiagram className="w-7 h-7" /> },
          { label: "Pending KYC", value: kycData.pending, icon: <FaFileAlt className="w-7 h-7" /> },
        ]);
      } catch {
        setSummary([
          { label: "Total Employees", value: null, icon: <FaUsers className="w-7 h-7" /> },
          { label: "Active Projects", value: null, icon: <FaProjectDiagram className="w-7 h-7" /> },
          { label: "Pending KYC", value: null, icon: <FaFileAlt className="w-7 h-7" /> },
        ]);
      }
      setLoading(false);
    }
    fetchDashboardData();
  }, []);

  useEffect(() => {
    async function fetchProjectDistribution() {
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/dashboard/project-distribution");
        const data = await res.json() as { distribution: Array<{ _id: string; count: number }> };
        
        if (data.distribution && Array.isArray(data.distribution)) {
          console.log('Project Distribution API Data:', data.distribution.slice(0, 5)); // Log first 5 entries
          
          // Map the API response to our format and add totalManpower from projects API
          const distribution = data.distribution.map((item: { _id: string; count: number }) => ({
            _id: item._id,
            count: item.count,
            totalManpower: 0, // Will be populated from projects API
            shortageManpower: 0 // Will be calculated after getting manpower data
          }));
          
          // Fetch projects data to get manpower information
          try {
            const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
            const projectsData = await projectsRes.json() as Array<{ projectName?: string; totalManpower?: number; manpower?: number; total_manpower?: number }>;
            
            if (Array.isArray(projectsData)) {
              // Create a map of project names to total manpower
              const manpowerMap: { [key: string]: number } = {};
              
              projectsData.forEach((project: { projectName?: string; totalManpower?: number; manpower?: number; total_manpower?: number }) => {
                const projectName = project.projectName || 'Unknown Project';
                const manpower = project.totalManpower || project.manpower || project.total_manpower || 0;
                
                if (!manpowerMap[projectName]) {
                  manpowerMap[projectName] = 0;
                }
                manpowerMap[projectName] += Number(manpower) || 0;
              });
              
              // Update distribution with manpower data and calculate shortage
              const updatedDistribution = distribution.map((item: { _id: string; count: number; totalManpower: number; shortageManpower: number }) => ({
                ...item,
                totalManpower: manpowerMap[item._id] || 0,
                shortageManpower: (manpowerMap[item._id] || 0) - item.count
              })).sort((a: ProjectDistributionItem, b: ProjectDistributionItem) => b.totalManpower - a.totalManpower); // Sort by manpower descending
              
              console.log('Final Distribution with Manpower:', updatedDistribution.slice(0, 5));
              setProjectDistribution(updatedDistribution);
            }
          } catch (projectsError) {
            console.error('Error fetching projects data:', projectsError);
            // Use distribution without manpower data
            setProjectDistribution(distribution);
          }
        }
      } catch (error) {
        console.error('Error fetching project distribution:', error);
        setProjectDistribution([] as ProjectDistributionItem[]);
      }
    }
    fetchProjectDistribution();
  }, []);


  // Fetch employees data
  useEffect(() => {
    async function fetchEmployees() {
      if (activeView === 'employees') {
        setEmployeesLoading(true);
        try {
          const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
          const data = await res.json() as { kycForms: Array<{ _id: string; personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; status?: string; joinDate?: string }; status?: string; createdAt?: string }> };
          if (data.kycForms) {
            const employeeData = data.kycForms.map((kyc: { _id: string; personalDetails?: { employeeId?: string; fullName?: string; designation?: string; projectName?: string; status?: string; joinDate?: string }; status?: string; createdAt?: string }) => ({
              _id: kyc._id,
              employeeId: kyc.personalDetails?.employeeId || 'N/A',
              fullName: kyc.personalDetails?.fullName || 'N/A',
              designation: kyc.personalDetails?.designation || 'N/A',
              projectName: kyc.personalDetails?.projectName || 'N/A',
              status: kyc.status || 'Active',
              joinDate: kyc.createdAt ? new Date(kyc.createdAt).toLocaleDateString() : 'N/A'
            }));
            setEmployees(employeeData);
          }
        } catch {
          setEmployees([]);
        }
        setEmployeesLoading(false);
      }
    }
    fetchEmployees();
  }, [activeView]);

  // Fetch projects data
  useEffect(() => {
    async function fetchProjects() {
      if (activeView === 'projects') {
        setProjectsLoading(true);
        try {
          const res = await fetch("https://cafm.zenapi.co.in/api/project/projects");
          const data = await res.json() as Array<{ _id: string; projectName?: string; address?: string; status?: string; totalManpower?: number; designationWiseCount?: Record<string, number> }>;
          if (Array.isArray(data)) {
            const projectData = data.map((proj: { _id: string; projectName?: string; address?: string; status?: string; totalManpower?: number; designationWiseCount?: Record<string, number> }) => ({
              _id: proj._id,
              projectName: proj.projectName || 'N/A',
              address: proj.address || 'N/A',
              status: proj.status || 'Planned',
              totalManpower: proj.totalManpower || 0,
              designationWiseCount: proj.designationWiseCount || {}
            }));
            setProjects(projectData);
          }
        } catch {
          setProjects([]);
        }
        setProjectsLoading(false);
      }
    }
    fetchProjects();
  }, [activeView]);

  // Filtered data
  const filteredEmployees = employees.filter(emp =>
    (empSearchFilter === '' || 
      emp.employeeId.toLowerCase().includes(empSearchFilter.toLowerCase()) ||
      emp.fullName.toLowerCase().includes(empSearchFilter.toLowerCase())) &&
    (empProjectFilter === '' || emp.projectName === empProjectFilter) &&
    (empStatusFilter === '' || emp.status === empStatusFilter)
  );

  const filteredProjects = projects.filter(proj =>
    (projSearchFilter === '' || 
      proj.projectName.toLowerCase().includes(projSearchFilter.toLowerCase()) ||
      proj.address.toLowerCase().includes(projSearchFilter.toLowerCase())) &&
    (projProjectFilter === '' || proj.projectName === projProjectFilter)
  );

  // Unique values for filters
  const uniqueEmpProjects = Array.from(new Set(employees.map(emp => emp.projectName).filter(Boolean)));
  const uniqueEmpStatuses = Array.from(new Set(employees.map(emp => emp.status).filter(Boolean)));
  const uniqueProjProjects = Array.from(new Set(projects.map(proj => proj.projectName).filter(Boolean)));

  // Filtered project distribution
  const filteredProjectDistribution = projectDistribution.filter(project =>
    project._id.toLowerCase().includes(projectDistributionSearch.toLowerCase())
  );

  // Pie chart calculations
  const totalProjects = filteredProjectDistribution.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="font-sans transition-colors duration-300 flex flex-col">
        
        {/* Navigation Tabs */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-4 items-center w-full">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="view"
                  value="overview"
                  checked={activeView === 'overview'}
                  onChange={(e) => setActiveView(e.target.value as 'overview' | 'employees' | 'projects')}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaChartBar className="inline mr-2" />
                  Overview
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="view"
                  value="employees"
                  checked={activeView === 'employees'}
                  onChange={(e) => setActiveView(e.target.value as 'overview' | 'employees' | 'projects')}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaUsers className="inline mr-2" />
                  Employees
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="view"
                  value="projects"
                  checked={activeView === 'projects'}
                  onChange={(e) => setActiveView(e.target.value as 'overview' | 'employees' | 'projects')}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaProjectDiagram className="inline mr-2" />
                  Projects
                </span>
              </label>
            </div>
        </div>
        </div>

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="px-4 py-6 space-y-6">
      {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.map((item) => (
          <div
            key={item.label}
                  className={`rounded-lg border p-4 ${
              theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
            }`}
          >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-blue-900" : "bg-blue-100"
                      }`}>
                        {item.label === "Total Employees" && <FaUsers className="w-5 h-5" color={theme === "dark" ? "#fff" : "#2563eb"} />}
                        {item.label === "Active Projects" && <FaProjectDiagram className="w-5 h-5" color={theme === "dark" ? "#fff" : "#2563eb"} />}
                        {item.label === "Pending KYC" && <FaFileAlt className="w-5 h-5" color={theme === "dark" ? "#fff" : "#2563eb"} />}
                      </div>
                      <div>
                        <div className={`text-xl font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                          {loading || item.value === null ? <span className="animate-pulse">...</span> : item.value}
                        </div>
                        <div className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>{item.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Project Distribution Table */}
            <div className={`rounded-lg border ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    Project Distribution
                  </h3>
                  <div className="relative w-64">
                    <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={projectDistributionSearch}
                      onChange={e => setProjectDistributionSearch(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className={theme === "dark" ? "bg-gray-700" : "bg-gray-50"}>
                    <tr>
                      <th className={`px-4 py-3 text-left font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        Project Name
                      </th>
                      <th className={`px-4 py-3 text-left font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        Active Count
                      </th>
                      <th className={`px-4 py-3 text-left font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        Total Manpower
                      </th>
                      <th className={`px-4 py-3 text-left font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        Shortage Manpower
                      </th>
                      <th className={`px-4 py-3 text-left font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        Percentage
                      </th>
                      <th className={`px-4 py-3 text-left font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        Visual
                      </th>
                    </tr>
                  </thead>
                  <tbody className={theme === "dark" ? "divide-y divide-gray-700" : "divide-y divide-gray-200"}>
                    {filteredProjectDistribution.map((project, index) => {
                      console.log(`Rendering project: ${project._id}, manpower: ${project.totalManpower}`); // Debug log
                      return (
                      <tr key={project._id} className={theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                        <td className={`px-4 py-3 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-900"
                        }`}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                            ></div>
                            {project._id}
                          </div>
                        </td>
                      <td className={`px-4 py-3 font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}>
                        {project.count}
                      </td>
                        <td className={`px-4 py-3 font-semibold ${
                          theme === "dark" ? "text-gray-200" : "text-gray-900"
                        }`}>
                          {project.totalManpower}
                        </td>
                        <td className={`px-4 py-3 font-semibold ${
                          project.shortageManpower >= 0 
                            ? theme === "dark" ? "text-green-300" : "text-green-600"
                            : theme === "dark" ? "text-red-300" : "text-red-600"
                        }`}>
                          {project.shortageManpower >= 0 ? `+${project.shortageManpower}` : project.shortageManpower}
                        </td>
                        <td className={`px-4 py-3 ${
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}>
                          {totalProjects > 0 ? ((project.count / totalProjects) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="px-4 py-3">
                          <div className={`w-full h-2 rounded-full ${
                            theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                          }`}>
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: totalProjects > 0 ? `${(project.count / totalProjects) * 100}%` : '0%',
                                background: PIE_COLORS[index % PIE_COLORS.length]
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                    {filteredProjectDistribution.length === 0 && (
                      <tr>
                        <td colSpan={5} className={`px-4 py-8 text-center ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          {projectDistributionSearch ? 'No projects found matching your search' : 'No project data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeView === 'employees' && (
          <>
            {/* Filters */}
            <div className="px-4 mb-4">
              <div className="flex flex-row flex-wrap gap-2 items-center">
                <div className="flex-1 min-w-[180px] max-w-xs">
                  <select
                    value={empProjectFilter}
                    onChange={e => setEmpProjectFilter(e.target.value)}
                    className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">All Projects</option>
                    {uniqueEmpProjects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
      </div>
                <div className="relative w-44 min-w-[130px]">
                  <select
                    value={empStatusFilter}
                    onChange={e => setEmpStatusFilter(e.target.value)}
                    className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">All Status</option>
                    {uniqueEmpStatuses.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={empSearchFilter}
                    onChange={e => setEmpSearchFilter(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Employees Table */}
            <div className="flex-1 overflow-auto px-3 md:px-4 pb-4">
              <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
                {employeesLoading ? (
                  <div className="py-12 text-center text-lg font-semibold">Loading employees...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 font-semibold">No employees found matching your filters.</div>
                ) : (
                  <table className="w-full text-xs table-fixed border-separate" style={{ borderSpacing: 0 }}>
                    <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                      <tr>
                        <th className={`px-1 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '3%' }}>#</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '12%' }}>Employee ID</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '20%' }}>Full Name</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '15%' }}>Designation</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '20%' }}>Project</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Status</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Join Date</th>
                      </tr>
                    </thead>
                    <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                      {filteredEmployees.map((emp, idx) => (
                        <tr key={emp._id} className={`${theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"} even:bg-gray-50 dark:even:bg-gray-900`}>
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                          <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{emp.employeeId}</td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={emp.fullName}>{emp.fullName}</div></td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={emp.designation}>{emp.designation}</div></td>
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={emp.projectName}>{emp.projectName}</div></td>
                          <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                              emp.status === 'Active' 
                                ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                                : theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{emp.joinDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
          )}
        </div>
            </div>
          </>
        )}

        {/* Projects Tab */}
        {activeView === 'projects' && (
          <>
            {/* Filters */}
            <div className="px-4 mb-4">
              <div className="flex flex-row flex-wrap gap-2 items-center">
                <div className="flex-1 min-w-[180px] max-w-xs">
                  <select
                    value={projProjectFilter}
                    onChange={e => setProjProjectFilter(e.target.value)}
                    className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">All Projects</option>
                    {uniqueProjProjects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projSearchFilter}
                    onChange={e => setProjSearchFilter(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                      theme === "dark"
                        ? "bg-gray-800 border-blue-900 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  />
                </div>
                      </div>
                    </div>

            {/* Projects Table */}
            <div className="flex-1 overflow-auto px-3 md:px-4 pb-4">
              <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
                {projectsLoading ? (
                  <div className="py-12 text-center text-lg font-semibold">Loading projects...</div>
                ) : filteredProjects.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 font-semibold">No projects found matching your filters.</div>
                ) : (
                  <table className="w-full text-xs table-fixed border-separate" style={{ borderSpacing: 0 }}>
                    <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                      <tr>
                        <th className={`px-1 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '3%' }}>#</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '25%' }}>Project Name</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '40%' }}>Location</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '12%' }}>Total Manpower</th>
                        <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '20%' }}>Designations</th>
                      </tr>
                    </thead>
                    <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                      {filteredProjects.map((proj, idx) => (
                        <tr key={proj._id} className={`${theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"} even:bg-gray-50 dark:even:bg-gray-900`}>
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                          <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>
                            <div className="truncate" title={proj.projectName}>{proj.projectName}</div>
                          </td>
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            <div className="truncate" title={proj.address}>{proj.address}</div>
                          </td>
                          <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                            <span className="font-semibold">{proj.totalManpower}</span>
                          </td>
                          <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                            <div className="text-xs">
                              {Object.entries(proj.designationWiseCount).map(([designation, count]) => (
                                <div key={designation} className="truncate" title={`${designation}: ${count}`}>
                                  {designation}: <span className="font-semibold">{count}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
              </>
            )}
    </div>
  );
}

