"use client";
import React, { useState, useMemo, useRef, ChangeEvent, FormEvent, useEffect } from "react";
import { FaProjectDiagram, FaTrash, FaDownload, FaEye } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

// Toast notification
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-[100] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-lg font-bold">&times;</button>
    </div>
  );
}

interface Project {
  _id?: string;
  projectName: string;
  address: string;
  totalManpower: number;
  designationWiseCount: Record<string, number>;
  updatedDate: string;
}

interface DesignationCount {
  designation: string;
  count: string;
}

export default function ProjectManagementPage() {
  const { theme } = useTheme();
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    projectName: string;
    address: string;
    totalManpower: string;
    designationWiseCount: DesignationCount[];
  }>({
    projectName: "",
    address: "",
    totalManpower: "",
    designationWiseCount: [{ designation: "", count: "" }],
  });
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [toast, setToast] = useState<string | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idx: number | null = null
  ) => {
    const { name, value } = e.target;
    if (idx !== null) {
      const field = name.split("-")[0] as keyof DesignationCount;
      setForm((prev) => {
        const updated = [...prev.designationWiseCount];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...prev, designationWiseCount: updated };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addDesignationField = () => {
    setForm((prev) => ({
      ...prev,
      designationWiseCount: [...prev.designationWiseCount, { designation: "", count: "" }],
    }));
  };

  const removeDesignationField = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      designationWiseCount: prev.designationWiseCount.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const designationObj: Record<string, number> = {};
    form.designationWiseCount.forEach((item) => {
      if (item.designation && item.count) {
        designationObj[item.designation] = parseInt(item.count, 10);
      }
    });
    const payload = {
      projectName: form.projectName,
      address: form.address,
      totalManpower: parseInt(form.totalManpower, 10),
      designationWiseCount: designationObj,
    };
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      setShowModal(false);
      setForm({
        projectName: "",
        address: "",
        totalManpower: "",
        designationWiseCount: [{ designation: "", count: "" }],
      });
      setToast(data.message || "Project created successfully");
      await fetchProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      setToast(message);
    }
  };

  // Fetch projects from API
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Update designation options based on fetched projects
  const designationOptions = useMemo(() => [
    "All Designations",
    ...Array.from(
      new Set(
        projects.flatMap((p) => Object.keys(p.designationWiseCount || {}))
      )
    ),
  ], [projects]);

  // Project options for dropdown
  const projectOptions = useMemo(() => [
    "All Projects",
    ...Array.from(new Set(projects.map((p) => p.projectName)))
  ], [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesDesignation =
        designationFilter === "All Designations" ||
        Object.keys(project.designationWiseCount || {}).includes(designationFilter);
      const matchesProject =
        projectFilter === "All Projects" ||
        project.projectName === projectFilter;
      return matchesDesignation && matchesProject;
    });
  }, [designationFilter, projectFilter, projects]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage]);

  // Reset to first page if filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [designationFilter, projects]);

  // Delete handler
  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/project/projects/${encodeURIComponent(deleteProject.projectName)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      const data = await res.json();
      setProjects((prev) => prev.filter((p) => p._id !== deleteProject._id));
      setToast(data.message || "Project deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete project";
      setToast(message);
    } finally {
      setDeleteProject(null);
    }
  };

  // Export to Excel
  const handleExportToExcel = async () => {
    try {
      const worksheet = filteredProjects.map(project => ({
        'Project Name': project.projectName,
        'Address': project.address,
        'Total Manpower': project.totalManpower,
        'Designation-wise Count': Object.entries(project.designationWiseCount || {})
          .map(([designation, count]) => `${designation}: ${count}`)
          .join(", "),
        'Last Updated': new Date(project.updatedDate).toLocaleDateString()
      }));

      const workbook = {
        SheetNames: ['Projects'],
        Sheets: {
          'Projects': {
            '!ref': `A1:E${worksheet.length + 1}`,
            A1: { v: 'Project Name' },
            B1: { v: 'Address' },
            C1: { v: 'Total Manpower' },
            D1: { v: 'Designation-wise Count' },
            E1: { v: 'Last Updated' },
            ...worksheet.reduce<Record<string, { v: string }>>((acc, row, idx) => {
              const rowNum = idx + 2;
              acc[`A${rowNum}`] = { v: row['Project Name'] != null ? row['Project Name'].toString() : '' };
              acc[`B${rowNum}`] = { v: row['Address'] != null ? row['Address'].toString() : '' };
              acc[`C${rowNum}`] = { v: row['Total Manpower'] != null ? row['Total Manpower'].toString() : '' };
              acc[`D${rowNum}`] = { v: row['Designation-wise Count'] != null ? row['Designation-wise Count'].toString() : '' };
              acc[`E${rowNum}`] = { v: row['Last Updated'] != null ? row['Last Updated'].toString() : '' };
              return acc;
            }, {})
          }
        }
      };

      const xlsx = await import('xlsx');
      const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-report.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      setToast('Project report exported to Excel successfully!');
    } catch {
      setToast('Failed to export to Excel');
    }
  };

  // Export to PDF
  const handleExportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Project Report', 14, 22);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
      
      // Prepare table data
      const tableData = filteredProjects.map(project => [
        project.projectName,
        project.address,
        project.totalManpower.toString(),
        Object.entries(project.designationWiseCount || {})
          .map(([designation, count]) => `${designation}: ${count}`)
          .join(", "),
        new Date(project.updatedDate).toLocaleDateString()
      ]);
      
      autoTable.default(doc, {
        head: [['Project Name', 'Address', 'Total Manpower', 'Designation-wise Count', 'Last Updated']],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      doc.save('project-report.pdf');
      setToast('Project report exported to PDF successfully!');
    } catch {
      setToast('Failed to export to PDF');
    }
  };

  return (
    <>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {/* Delete Confirmation Modal */}
      {deleteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-2xl shadow-xl p-8 w-full max-w-md relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
              onClick={() => setDeleteProject(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>Delete Project</h2>
            <p className="mb-6 text-lg">Are you sure you want to delete the project <span className="font-semibold">&quot;{deleteProject.projectName}&quot;</span>? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteProject(null)}
                className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "border-blue-900 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-red-700 text-white hover:bg-red-800" : "bg-red-600 text-white hover:bg-red-700"}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-2xl shadow-xl p-8 w-full max-w-2xl relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
              onClick={() => setSelectedProject(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className={`text-2xl font-bold mb-6 text-center ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>
              Project Details
            </h2>
            <div className="space-y-4">
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Project Name:</span>
                <span className={`font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{selectedProject.projectName}</span>
              </div>
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Address:</span>
                <span className={`text-right max-w-[60%] ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>{selectedProject.address}</span>
              </div>
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Total Manpower:</span>
                <span className={theme === "dark" ? "text-gray-100" : "text-gray-900"}>{selectedProject.totalManpower}</span>
              </div>
              <div className={`flex flex-col border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"} mb-2`}>Designation-wise Count:</span>
                <div className="ml-4 space-y-1">
                  {Object.entries(selectedProject.designationWiseCount || {}).map(([designation, count]) => (
                    <div key={designation} className="flex justify-between">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>{designation}:</span>
                      <span className={theme === "dark" ? "text-gray-100" : "text-gray-900"}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Last Updated:</span>
                <span className={theme === "dark" ? "text-gray-100" : "text-gray-900"}>{new Date(selectedProject.updatedDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedProject(null)}
                className={`px-4 py-2 rounded-lg font-semibold ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-0 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
          <div className="flex items-center gap-6">
            <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
              <FaProjectDiagram className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Project Report</h1>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className={`px-2 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              {projectOptions.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            {/* Designation Dropdown */}
            <select
              value={designationFilter}
              onChange={e => setDesignationFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-white/80 text-gray-900 focus:ring-white'}`}
            >
              {designationOptions.map((designation) => (
                <option key={designation} value={designation}>{designation}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Project Report Content */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 mt-6`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Project Management</h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-300' : 'text-gray-500'}`}>View and manage all projects and their manpower details</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Download options"
                  className={`p-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-blue-600 text-white focus:ring-blue-300'}`}
                  onClick={() => setShowDownloadDropdown(v => !v)}
                >
                  <FaDownload className="w-5 h-5" />
                </button>
                {showDownloadDropdown && (
                  <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-10 py-2 ${theme === 'dark' ? 'bg-[#232b3a] text-blue-100' : 'bg-white text-gray-900'}`}>
                    <div className="flex justify-end px-2 pb-1">
                      <button
                        aria-label="Close download menu"
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                        onClick={() => setShowDownloadDropdown(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-t-xl"
                      onClick={() => { setShowDownloadDropdown(false); handleExportToExcel(); }}
                    >
                      <FaDownload className="w-4 h-4" /> Export to Excel
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-b-xl"
                      onClick={() => { setShowDownloadDropdown(false); handleExportToPDF(); }}
                    >
                      <FaDownload className="w-4 h-4" /> Export to PDF
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowModal(true)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 focus:ring-blue-300' : 'bg-blue-600 text-white focus:ring-blue-300'}`}
              >
                + Create Project
              </button>
            </div>
          </div>
          <div className="relative">
            <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <table className="w-full text-left">
                <thead>
                  <tr className={`
                    ${theme === 'dark' ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-900'}
                    rounded-t-xl
                    text-sm font-bold tracking-tight
                    border-b border-blue-200 dark:border-blue-900
                    shadow-sm
                  `}>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tl-xl tracking-tight">Project Name</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Address</th>
                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Total Manpower</th>
                    <th className="px-3 py-3 whitespace-nowrap rounded-tr-xl tracking-tight text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">Loading projects...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={4} className="text-center text-red-500 py-8 text-xs">{error}</td></tr>
                  ) : paginatedProjects.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">No projects found</td></tr>
                  ) : (
                    paginatedProjects.map((project, idx) => (
                      <tr key={project._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{project.projectName}</td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap max-w-[300px] truncate ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{project.address}</td>
                        <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{project.totalManpower}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedProject(project)}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                              title="View Details"
                            >
                              <FaEye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteProject(project)}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-red-800 text-white hover:bg-red-900' : 'bg-red-600 text-white hover:bg-red-700'}`}
                              title="Delete"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg font-semibold border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    currentPage === page
                      ? theme === 'dark'
                        ? 'bg-blue-700 text-white border-blue-700 shadow-lg'
                        : 'bg-blue-600 text-white border-blue-600 shadow-lg'
                      : theme === 'dark'
                        ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white'
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div
              ref={modalRef}
              className={`rounded-2xl shadow-xl p-8 w-full max-w-lg relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              <button
                className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Create Project</h2>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Project Name</label>
                  <input
                    name="projectName"
                    value={form.projectName}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Total Manpower</label>
                  <input
                    name="totalManpower"
                    type="number"
                    min="1"
                    value={form.totalManpower}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Designation-wise Count</label>
                  {form.designationWiseCount.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        name={`designation-${idx}`}
                        value={item.designation}
                        onChange={e => handleFormChange(e, idx)}
                        placeholder="Designation"
                        required
                        className={`flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                      <input
                        name={`count-${idx}`}
                        type="number"
                        min="1"
                        value={item.count}
                        onChange={e => handleFormChange(e, idx)}
                        placeholder="Count"
                        required
                        className={`w-24 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                      {form.designationWiseCount.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDesignationField(idx)}
                          className="text-red-500 hover:text-red-700 text-lg px-2"
                          aria-label="Remove"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDesignationField}
                    className={`text-sm mt-1 ${theme === "dark" ? "text-blue-400 hover:underline" : "text-blue-600 hover:underline"}`}
                  >
                    + Add Designation
                  </button>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "border-blue-900 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}