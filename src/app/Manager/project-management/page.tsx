"use client";
import React, { useState, useMemo, useRef, ChangeEvent, FormEvent, useEffect } from "react";
import { FaSearch, FaEdit, FaTrash } from "react-icons/fa";
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
  const [search, setSearch] = useState("");
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
  const pageSize = 4;
  const [toast, setToast] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<{
    address: string;
    totalManpower: string;
    designationWiseCount: DesignationCount[];
  }>({
    address: "",
    totalManpower: "",
    designationWiseCount: [{ designation: "", count: "" }],
  });

  // Row edit mode state
  const [rowDrafts, setRowDrafts] = useState<Record<string, { address: string; totalManpower: string }>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<{ projectName: string; address: string; totalManpower: string }>({ projectName: "", address: "", totalManpower: "" });
  const [rowDesignationDrafts, setRowDesignationDrafts] = useState<Record<string, DesignationCount[]>>({});
  const [quickDesignations, setQuickDesignations] = useState<DesignationCount[]>([]);

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

  // Quick add from grid top row (excel-like)
  const handleQuickAdd = async () => {
    if (!newRow.projectName || !newRow.address || !newRow.totalManpower) return;
    const designationObj: Record<string, number> = {};
    quickDesignations.forEach((item) => {
      if (item.designation && item.count) {
        designationObj[item.designation] = parseInt(item.count, 10);
      }
    });
    const payload = {
      projectName: newRow.projectName,
      address: newRow.address,
      totalManpower: parseInt(newRow.totalManpower, 10),
      designationWiseCount: designationObj,
    };
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create project");
      setToast("Project created");
      setNewRow({ projectName: "", address: "", totalManpower: "" });
      setQuickDesignations([]);
      await fetchProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      setToast(message);
    }
  };

  // Save current row
  const saveRow = async (project: Project) => {
    const draft = rowDrafts[project._id || project.projectName];
    const nextAddress = draft?.address ?? project.address;
    const nextTM = draft?.totalManpower ?? String(project.totalManpower);
    const idKey = project._id || project.projectName;
    const designationDrafts = rowDesignationDrafts[idKey];
    const nextDesignationObj: Record<string, number> = {};
    if (designationDrafts && designationDrafts.length > 0) {
      designationDrafts.forEach((item) => {
        if (item.designation && item.count) {
          nextDesignationObj[item.designation] = parseInt(item.count, 10);
        }
      });
    } else {
      Object.entries(project.designationWiseCount || {}).forEach(([designation, count]) => {
        nextDesignationObj[designation] = Number(count);
      });
    }
    try {
      const payload: Partial<Project> = {
        address: nextAddress,
        totalManpower: parseInt(nextTM || "0", 10),
        designationWiseCount: nextDesignationObj,
      } as Partial<Project>;
      const res = await fetch(`https://cafm.zenapi.co.in/api/project/projects/${encodeURIComponent(project.projectName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save change");
      setToast("Saved");
      // Merge into local state
      setProjects(prev => prev.map(p => p._id === project._id ? { ...p, ...payload, updatedDate: new Date().toISOString() } as Project : p));
      setEditingRowId(null);
      setRowDesignationDrafts(prev => ({ ...prev, [idKey]: [] }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
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
      const matchesSearch =
        search === "" ||
        project.projectName.toLowerCase().includes(search.toLowerCase()) ||
        project.address.toLowerCase().includes(search.toLowerCase());
      const matchesDesignation =
        designationFilter === "All Designations" ||
        Object.keys(project.designationWiseCount || {}).includes(designationFilter);
      const matchesProject =
        projectFilter === "All Projects" ||
        project.projectName === projectFilter;
      return matchesSearch && matchesDesignation && matchesProject;
    });
  }, [search, designationFilter, projectFilter, projects]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage]);

  // Reset to first page if filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, designationFilter, projects]);

  // Edit handlers
  const closeEditModal = () => {
    setEditId(null);
    setEditForm({ address: "", totalManpower: "", designationWiseCount: [{ designation: "", count: "" }] });
  };
  const handleEditFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idx: number | null = null
  ) => {
    const { name, value } = e.target;
    if (idx !== null) {
      const field = name.split("-")[0] as keyof DesignationCount;
      setEditForm((prev) => {
        const updated = [...prev.designationWiseCount];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...prev, designationWiseCount: updated };
      });
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };
  const addEditDesignationField = () => {
    setEditForm((prev) => ({
      ...prev,
      designationWiseCount: [...prev.designationWiseCount, { designation: "", count: "" }],
    }));
  };
  const removeEditDesignationField = (idx: number) => {
    setEditForm((prev) => ({
      ...prev,
      designationWiseCount: prev.designationWiseCount.filter((_, i) => i !== idx),
    }));
  };
  const handleEditProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editId) return;
    const project = projects.find((p) => p._id === editId);
    if (!project) return;
    const designationObj: Record<string, number> = {};
    editForm.designationWiseCount.forEach((item) => {
      if (item.designation && item.count) {
        designationObj[item.designation] = parseInt(item.count, 10);
      }
    });
    const payload = {
      address: editForm.address,
      totalManpower: parseInt(editForm.totalManpower, 10),
      designationWiseCount: designationObj,
    };
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/project/projects/${encodeURIComponent(project.projectName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update project");
      const data = await res.json();
      setProjects((prev) => prev.map((p) => (p._id === editId ? { ...p, ...data } : p)));
      setToast("Project updated successfully");
      closeEditModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update project";
      setToast(message);
    }
  };

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
      <div
        className={`min-h-screen font-sans transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
            : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
        }`}
      >
        <div className="p-6">
          {/* Header removed */}
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
              {/* Project Dropdown */}
              <div className="relative w-44 min-w-[130px]">
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-blue-900 text-white"
                      : "bg-white border-gray-200 text-black"
                  }`}
                >
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              {/* Designation Dropdown */}
              <div className="relative w-44 min-w-[130px]">
                <select
                  value={designationFilter}
                  onChange={e => setDesignationFilter(e.target.value)}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-800 border-blue-900 text-white"
                      : "bg-white border-gray-200 text-black"
                  }`}
                >
                  {designationOptions.map((designation) => (
                    <option key={designation} value={designation}>{designation}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search project name or address..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                    theme === "dark"
                      ? "bg-gray-800 border-blue-900 text-white"
                      : "bg-white border-gray-200 text-black"
                  }`}
                />
              </div>
            </div>
          </div>
          {/* Quick Add Row (Excel-like) */}
          <div className={`overflow-x-auto rounded-xl border shadow-xl mb-4 ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            <table className="min-w-full text-sm">
              <thead className={theme === "dark" ? "bg-blue-900" : "bg-blue-50"}>
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">New Project Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Address</th>
                  <th className="px-3 py-2 text-left font-semibold">Total Manpower</th>
                  <th className="px-3 py-2 text-left font-semibold">Designation-wise Count</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-t px-3 py-2">
                    <input className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} value={newRow.projectName} onChange={e => setNewRow(r => ({ ...r, projectName: e.target.value }))} placeholder="e.g. ABC Mall" />
                  </td>
                  <td className="border-t px-3 py-2">
                    <input className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} value={newRow.address} onChange={e => setNewRow(r => ({ ...r, address: e.target.value }))} placeholder="Address" />
                  </td>
                  <td className="border-t px-3 py-2 w-36">
                    <input type="number" min={1} className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} value={newRow.totalManpower} onChange={e => setNewRow(r => ({ ...r, totalManpower: e.target.value }))} placeholder="0" />
                  </td>
                  <td className="border-t px-3 py-2">
                    {quickDesignations.length === 0 ? (
                      <button
                        onClick={() => setQuickDesignations([{ designation: "", count: "" }])}
                        className={`${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                      >
                        + Add Designation
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {quickDesignations.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              className={`flex-1 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                              placeholder="Designation"
                              value={item.designation}
                              onChange={e => {
                                const list = [...quickDesignations];
                                list[idx] = { ...list[idx], designation: e.target.value };
                                setQuickDesignations(list);
                              }}
                            />
                            <input
                              type="number"
                              min={1}
                              className={`w-24 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                              placeholder="Count"
                              value={item.count}
                              onChange={e => {
                                const list = [...quickDesignations];
                                list[idx] = { ...list[idx], count: e.target.value };
                                setQuickDesignations(list);
                              }}
                            />
                            {quickDesignations.length > 1 && (
                              <button
                                onClick={() => setQuickDesignations(prev => prev.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 px-2"
                                title="Remove"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setQuickDesignations(prev => [...prev, { designation: "", count: "" }])}
                          className={`${theme === "dark" ? "text-blue-400" : "text-blue-600"} text-sm`}
                        >
                          + Add another
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="border-t px-3 py-2 w-32">
                    <button onClick={handleQuickAdd} className={`w-full px-3 py-1 rounded font-semibold ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}>Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
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
          {/* Table */}
          <div className={`overflow-x-auto rounded-xl border shadow-xl ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading projects...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
                <table className="min-w-full text-sm border-collapse">
                  <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                    <tr>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Project Name</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Address (edit)</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Total Manpower (edit)</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Designation-wise Count</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Last Updated</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No projects found</td>
                      </tr>
                    ) : paginatedProjects.map((project, idx) => (
                      <tr key={project._id || idx} className={theme === "dark" ? "hover:bg-blue-900 transition border-t border-blue-900" : "hover:bg-blue-50 transition border-t border-blue-100"}>
                        <td className={`px-3 py-2 font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{project.projectName}</td>
                        <td className="px-3 py-2">
                          {editingRowId === (project._id || project.projectName) ? (
                            <input
                              className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                              value={(rowDrafts[project._id || project.projectName]?.address) ?? project.address}
                              onChange={e => setRowDrafts(prev => ({ ...prev, [project._id || project.projectName]: { ...(prev[project._id || project.projectName] || { address: project.address, totalManpower: String(project.totalManpower) }), address: e.target.value } }))}
                            />
                          ) : (
                            <span>{project.address}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 w-36">
                          {editingRowId === (project._id || project.projectName) ? (
                            <input
                              type="number"
                              min={1}
                              className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                              value={(rowDrafts[project._id || project.projectName]?.totalManpower) ?? String(project.totalManpower)}
                              onChange={e => setRowDrafts(prev => ({ ...prev, [project._id || project.projectName]: { ...(prev[project._id || project.projectName] || { address: project.address, totalManpower: String(project.totalManpower) }), totalManpower: e.target.value } }))}
                            />
                          ) : (
                            <span>{project.totalManpower}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {editingRowId === (project._id || project.projectName) ? (
                            <div className="flex flex-col gap-2">
                              {(rowDesignationDrafts[project._id || project.projectName] ?? Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }))).map((item, dIdx) => (
                                <div key={dIdx} className="flex gap-2 items-center">
                                  <input
                                    className={`flex-1 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                    value={item.designation}
                                    onChange={e => {
                                      const id = project._id || project.projectName;
                                      const list = rowDesignationDrafts[id] ? [...rowDesignationDrafts[id]] : Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }));
                                      list[dIdx] = { ...list[dIdx], designation: e.target.value };
                                      setRowDesignationDrafts(prev => ({ ...prev, [id]: list }));
                                    }}
                                    placeholder="Designation"
                                  />
                                  <input
                                    type="number"
                                    min={1}
                                    className={`w-24 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                    value={item.count}
                                    onChange={e => {
                                      const id = project._id || project.projectName;
                                      const list = rowDesignationDrafts[id] ? [...rowDesignationDrafts[id]] : Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }));
                                      list[dIdx] = { ...list[dIdx], count: e.target.value };
                                      setRowDesignationDrafts(prev => ({ ...prev, [id]: list }));
                                    }}
                                    placeholder="Count"
                                  />
                                  {(rowDesignationDrafts[project._id || project.projectName]?.length ?? Object.keys(project.designationWiseCount || {}).length) > 1 && (
                                    <button
                                      onClick={() => {
                                        const id = project._id || project.projectName;
                                        const list = (rowDesignationDrafts[id] ? [...rowDesignationDrafts[id]] : Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) })));
                                        const next = list.filter((_, i) => i !== dIdx);
                                        setRowDesignationDrafts(prev => ({ ...prev, [id]: next }));
                                      }}
                                      className="text-red-500 hover:text-red-700 px-2"
                                      title="Remove"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const id = project._id || project.projectName;
                                  const list = rowDesignationDrafts[id] ? [...rowDesignationDrafts[id]] : Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }));
                                  setRowDesignationDrafts(prev => ({ ...prev, [id]: [...list, { designation: "", count: "" }] }));
                                }}
                                className={`${theme === "dark" ? "text-blue-400" : "text-blue-600"} text-sm`}
                              >
                                + Add Designation
                              </button>
                            </div>
                          ) : (
                            <span>
                              {Object.entries(project.designationWiseCount || {})
                                .map(([designation, count]) => `${designation}: ${count}`)
                                .join(", ")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{new Date(project.updatedDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 flex items-center gap-2">
                          {editingRowId === (project._id || project.projectName) ? (
                            <>
                              <button
                                onClick={() => saveRow(project)}
                                className={`px-3 py-1 rounded font-semibold ${theme === "dark" ? "bg-green-700 text-white hover:bg-green-800" : "bg-green-600 text-white hover:bg-green-700"}`}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingRowId(null); setRowDrafts(prev => ({ ...prev, [project._id || project.projectName]: { address: project.address, totalManpower: String(project.totalManpower) } })); }}
                                className={`px-3 py-1 rounded font-semibold ${theme === "dark" ? "bg-gray-700 text-white hover:bg-gray-800" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  const id = project._id || project.projectName;
                                  setEditingRowId(id);
                                  setRowDrafts(prev => ({ ...prev, [id]: { address: project.address, totalManpower: String(project.totalManpower) } }));
                                  setRowDesignationDrafts(prev => ({
                                    ...prev,
                                    [id]: Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }))
                                  }));
                                }}
                                className="text-blue-500 hover:text-blue-700 p-1"
                                title="Edit inline"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => setDeleteProject(project)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-end items-center gap-2 px-4 py-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${
                        currentPage === 1
                          ? "opacity-50 cursor-not-allowed"
                          : theme === "dark"
                          ? "bg-gray-800 border-blue-900 text-white hover:bg-blue-900"
                          : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-sm font-semibold">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${
                        currentPage === totalPages
                          ? "opacity-50 cursor-not-allowed"
                          : theme === "dark"
                          ? "bg-gray-800 border-blue-900 text-white hover:bg-blue-900"
                          : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Edit Modal */}
          {editId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className={`rounded-2xl shadow-xl p-8 w-full max-w-lg relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}>
                <button
                  className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                  onClick={closeEditModal}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Edit Project</h2>
                <form onSubmit={handleEditProject} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Address</label>
                    <textarea
                      name="address"
                      value={editForm.address}
                      onChange={handleEditFormChange}
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
                      value={editForm.totalManpower}
                      onChange={handleEditFormChange}
                      required
                      className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Designation-wise Count</label>
                    {editForm.designationWiseCount.map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          name={`designation-${idx}`}
                          value={item.designation}
                          onChange={e => handleEditFormChange(e, idx)}
                          placeholder="Designation"
                          required
                          className={`flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        />
                        <input
                          name={`count-${idx}`}
                          type="number"
                          min="1"
                          value={item.count}
                          onChange={e => handleEditFormChange(e, idx)}
                          placeholder="Count"
                          required
                          className={`w-24 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        />
                        {editForm.designationWiseCount.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEditDesignationField(idx)}
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
                      onClick={addEditDesignationField}
                      className={`text-sm mt-1 ${theme === "dark" ? "text-blue-400 hover:underline" : "text-blue-600 hover:underline"}`}
                    >
                      + Add Designation
                    </button>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "border-blue-900 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      Update
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}