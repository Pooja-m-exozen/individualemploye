"use client";
import React, { useState, useMemo, ChangeEvent, FormEvent, useEffect } from "react";
import { FaSearch, FaEdit, FaTrash } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

// Toast notification component
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
  location: string;
  totalManpower: number;
  designationWiseCount: Record<string, number>;
  projectStartDate: string;
  projectEndDate: string;
  contractStartDate: string;
  contractEndDate: string;
  projectCost: number;
  designationWiseSalary: Record<string, number>;
  employeeWiseSalary: { employeeId: string; salary: number; effectiveFrom: string; _id?: string }[];
  clientName: string;
  clientContact: string;
  projectManager: string;
  status: string;
  description: string;
  notes: string;
  documents: string[];
  servicesProvided: string[];
  updatedDate?: string;
  createdDate?: string;
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
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state management
  const [form, setForm] = useState({
    projectName: "",
    address: "",
    location: "",
    totalManpower: "",
    designationWiseCount: [{ designation: "", count: "" }],
    projectStartDate: "",
    projectEndDate: "",
    contractStartDate: "",
    contractEndDate: "",
    projectCost: "",
    designationWiseSalary: {},
    employeeWiseSalary: [],
    clientName: "",
    clientContact: "",
    projectManager: "",
    status: "",
    description: "",
    notes: "",
    documents: "",
    servicesProvided: "",
  });
  

  // Edit and delete states
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({
    address: "",
    totalManpower: "",
    designationWiseCount: [{ designation: "", count: "" }],
    projectStartDate: "",
    projectEndDate: "",
    contractStartDate: "",
    contractEndDate: "",
    projectCost: "",
    projectManager: "",
    status: "",
    clientName: "",
    clientContact: "",
    description: "",
    notes: "",
    designationWiseSalary: {} as Record<string, number>,
    documents: "",
    servicesProvided: "",
  });

  // Row editing states
  const [rowDrafts, setRowDrafts] = useState<Record<string, { 
    address: string; 
    totalManpower: string; 
    projectManager: string; 
    projectCost: string;
    status: string;
    projectStartDate: string;
    projectEndDate: string;
    contractStartDate: string;
    contractEndDate: string;
    designationWiseSalary: Record<string, number>;
  }>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDesignationDrafts, setRowDesignationDrafts] = useState<Record<string, DesignationCount[]>>({});
  const [sortBy, setSortBy] = useState<
    | "projectName"
    | "address"
    | "projectManager"
    | "status"
    | "projectCost"
    | "projectStartDate"
    | "projectEndDate"
    | "contractStartDate"
    | "contractEndDate"
    | "updatedDate"
    | "totalManpower"
    | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showColsMenu, setShowColsMenu] = useState(false);

  type VisibleCols = {
    rownum: boolean;
    projectName: boolean;
    address: boolean;
    totalManpower: boolean;
    designationCounts: boolean;
    projectManager: boolean;
    status: boolean;
    projectCost: boolean;
    projectStartDate: boolean;
    projectEndDate: boolean;
    contractStartDate: boolean;
    contractEndDate: boolean;
    designationSalaries: boolean;
    employeeSalaries: boolean;
    updatedDate: boolean;
    action: boolean;
  };
  const [visibleCols, setVisibleCols] = useState<VisibleCols>({
    rownum: true,
    projectName: true,
    address: true,
    totalManpower: true,
    designationCounts: true,
    projectManager: true,
    status: true,
    projectCost: true,
    projectStartDate: true,
    projectEndDate: true,
    contractStartDate: false,
    contractEndDate: false,
    designationSalaries: false,
    employeeSalaries: false,
    updatedDate: true,
    action: true,
  });
  

  // Removed unused designationWiseSalaryStr and employeeWiseSalaryStr variables

  const SERVICE_OPTIONS = useMemo(
    () => [
      "Cleaning",
      "Security",
      "Maintenance",
      "Housekeeping",
      "Gardening",
      "HVAC",
      "Electrical",
      "Plumbing",
      "Pest Control",
      "Waste Management",
      "Parking",
      "Fire Safety",
      "Front Desk",
      "Concierge",
      "CCTV Monitoring",
      "Lift Maintenance",
      "Landscaping",
    ],
    []
  );

  const getServicesArray = (): string[] => {
    if (Array.isArray(form.servicesProvided)) return form.servicesProvided as unknown as string[];
    if (typeof form.servicesProvided === "string" && form.servicesProvided.trim()) {
      try {
        if (form.servicesProvided.trim().startsWith("[")) return JSON.parse(form.servicesProvided);
      } catch {}
      return form.servicesProvided.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const toggleService = (service: string) => {
    const current = new Set(getServicesArray());
    if (current.has(service)) current.delete(service); else current.add(service);
    setForm((prev) => ({ ...prev, servicesProvided: Array.from(current).join(",") }));
  };

  // Form change handler
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, idx: number | null = null) => {
    const { name, value } = e.target;
    if (idx !== null) {
      const field = name.split("-")[0] as keyof DesignationCount;
      setForm((prev) => {
        const updated = [...prev.designationWiseCount];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...prev, designationWiseCount: updated };
      });
    } else {
      if (name === "designationWiseSalary") {
        try {
          setForm((prev) => ({ ...prev, designationWiseSalary: value ? JSON.parse(value) : {} }));
        } catch {
          setForm((prev) => ({ ...prev, designationWiseSalary: {} }));
        }
      } else if (name === "employeeWiseSalary") {
        try {
          setForm((prev) => ({ ...prev, employeeWiseSalary: value ? JSON.parse(value) : [] }));
        } catch {
          setForm((prev) => ({ ...prev, employeeWiseSalary: [] }));
        }
      } else if (name === "documents" || name === "servicesProvided") {
        let arr: string[] = [];
        try {
          arr = value.startsWith("[") ? JSON.parse(value) : value.split(",").map(s => s.trim()).filter(Boolean);
        } catch {
          arr = value.split(",").map(s => s.trim()).filter(Boolean);
        }
        // store as comma-separated string to keep state type consistent
        setForm((prev) => ({ ...prev, [name]: arr.join(",") }));
      } else {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
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

  const handleSalaryChange = (designation: string, salaryValue: string) => {
    const parsed = parseInt(salaryValue, 10);
    setForm((prev) => ({
      ...prev,
      designationWiseSalary: {
        ...(prev.designationWiseSalary || {}),
        [designation]: isNaN(parsed) ? 0 : parsed,
      },
    }));
  };

  const handleDocumentsSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      readers.push(new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
        fr.onerror = () => resolve("");
        fr.readAsDataURL(file);
      }));
    }
    const dataUrls = (await Promise.all(readers)).filter(Boolean);
    setForm((prev) => {
      const existing = Array.isArray(prev.documents)
        ? (prev.documents as unknown as string[])
        : (typeof prev.documents === "string" && prev.documents
            ? prev.documents.split(",").map((s) => s.trim()).filter(Boolean)
            : []);
      const merged = [...existing, ...dataUrls];
      return {
        ...prev,
        documents: merged.join(","),
      };
    });
    // reset input so selecting the same files again will trigger change
    e.target.value = "";
  };

  // Create project handler
  const handleCreateProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const designationObj: Record<string, number> = {};
    form.designationWiseCount.forEach((item) => {
      if (item.designation && item.count) {
        designationObj[item.designation] = parseInt(item.count, 10) || 0;
      }
    });

    let documentsArr: string[] = [];
    try {
      if (Array.isArray(form.documents)) {
        documentsArr = form.documents as unknown as string[];
      } else if (typeof form.documents === "string") {
        const v = form.documents.trim();
        if (v) {
          documentsArr = v.startsWith("[") ? JSON.parse(v) : v.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
    } catch {}

    let servicesArr: string[] = [];
    try {
      if (Array.isArray(form.servicesProvided)) {
        servicesArr = form.servicesProvided as unknown as string[];
      } else if (typeof form.servicesProvided === "string") {
        const v = form.servicesProvided.trim();
        if (v) {
          servicesArr = v.startsWith("[") ? JSON.parse(v) : v.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
    } catch {}
    const designationSalaryObj = (form.designationWiseSalary && typeof form.designationWiseSalary === "object") ? form.designationWiseSalary : {};
    const employeeSalaryArr = Array.isArray(form.employeeWiseSalary) ? form.employeeWiseSalary : [];

    const payload = {
      projectName: form.projectName,
      address: form.address,
      location: form.location,
      totalManpower: parseInt(form.totalManpower, 10) || 0,
      designationWiseCount: designationObj,
      projectStartDate: form.projectStartDate || undefined,
      projectEndDate: form.projectEndDate || undefined,
      contractStartDate: form.contractStartDate || undefined,
      contractEndDate: form.contractEndDate || undefined,
      projectCost: parseInt(form.projectCost, 10) || 0,
      designationWiseSalary: designationSalaryObj,
      employeeWiseSalary: employeeSalaryArr,
      clientName: form.clientName,
      clientContact: form.clientContact,
      projectManager: form.projectManager,
      status: form.status,
      description: form.description,
      notes: form.notes,
      documents: documentsArr,
      servicesProvided: servicesArr,
    } as const;

    try {
      const res = await fetch("http://localhost:5000/api/project/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let message = "Failed to create project";
        try {
          const errText = await res.text();
          message = errText || message;
        } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      setShowCreate(false);
      setForm({
        projectName: "",
        address: "",
        location: "",
        totalManpower: "",
        designationWiseCount: [{ designation: "", count: "" }],
        projectStartDate: "",
        projectEndDate: "",
        contractStartDate: "",
        contractEndDate: "",
        projectCost: "",
        designationWiseSalary: {},
        employeeWiseSalary: [],
        clientName: "",
        clientContact: "",
        projectManager: "",
        status: "",
        description: "",
        notes: "",
        documents: "",
        servicesProvided: "",
      });
      setToast(data.message || "Project created successfully");
      if (data.project) {
        setProjects((prev) => [data.project, ...prev.filter(p => p._id !== data.project._id)]);
      }
      await fetchProjects();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to create project");
      console.error("Create project error:", err);
    }
  };

  

  // Save row changes
  const saveRow = async (project: Project) => {
    const draft = rowDrafts[project._id || project.projectName] || {};
    const nextAddress = draft.address || project.address;
    const nextTM = draft.totalManpower || String(project.totalManpower);
    const nextProjectManager = draft.projectManager || project.projectManager;
    const nextProjectCost = draft.projectCost || String(project.projectCost || 0);
    const nextStatus = draft.status || project.status;
    const nextProjectStartDate = draft.projectStartDate || project.projectStartDate;
    const nextProjectEndDate = draft.projectEndDate || project.projectEndDate;
    const nextContractStartDate = draft.contractStartDate || project.contractStartDate;
    const nextContractEndDate = draft.contractEndDate || project.contractEndDate;
    const nextDesignationWiseSalary = draft.designationWiseSalary || project.designationWiseSalary;
    const idKey = project._id || project.projectName;
    const designationDrafts = rowDesignationDrafts[idKey] || [];
    const nextDesignationObj: Record<string, number> = designationDrafts.reduce((acc, item) => {
      if (item.designation && item.count) acc[item.designation] = parseInt(item.count, 10) || 0;
      return acc;
    }, {} as Record<string, number>);

    try {
      const payload: Partial<Project> = {
        address: nextAddress,
        totalManpower: parseInt(nextTM, 10) || 0,
        projectManager: nextProjectManager,
        projectCost: parseInt(nextProjectCost, 10) || 0,
        status: nextStatus,
        projectStartDate: nextProjectStartDate,
        projectEndDate: nextProjectEndDate,
        contractStartDate: nextContractStartDate,
        contractEndDate: nextContractEndDate,
        designationWiseSalary: nextDesignationWiseSalary,
        designationWiseCount: Object.keys(nextDesignationObj).length ? nextDesignationObj : project.designationWiseCount,
      };

      const res = await fetch(`http://localhost:5000/api/project/projects/${encodeURIComponent(project.projectName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const data = await res.json();
      setToast("Changes saved successfully");
      setProjects((prev) => prev.map((p) => p._id === project._id ? { ...p, ...data.project, updatedDate: data.project.updatedDate || new Date().toISOString() } : p));
      setEditingRowId(null);
      setRowDesignationDrafts((prev) => {
        const newDrafts = { ...prev };
        delete newDrafts[idKey];
        return newDrafts;
      });
      setRowDrafts((prev) => {
        const newDrafts = { ...prev };
        delete newDrafts[idKey];
        return newDrafts;
      });
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/project/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Memoized options
  const designationOptions = useMemo(() => [
    "All Designations",
    ...Array.from(new Set(projects.flatMap((p) => Object.keys(p.designationWiseCount || {})))),
  ], [projects]);

  const projectOptions = useMemo(() => [
    "All Projects",
    ...Array.from(new Set(projects.map((p) => p.projectName))),
  ], [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = search === "" ||
        project.projectName.toLowerCase().includes(search.toLowerCase()) ||
        project.address.toLowerCase().includes(search.toLowerCase());
      const matchesDesignation = designationFilter === "All Designations" ||
        Object.keys(project.designationWiseCount || {}).includes(designationFilter);
      const matchesProject = projectFilter === "All Projects" ||
        project.projectName === projectFilter;
      return matchesSearch && matchesDesignation && matchesProject;
    });
  }, [search, designationFilter, projectFilter, projects]);

  const sortedProjects = useMemo(() => {
    const items = [...filteredProjects];
    if (!sortBy) return items;
    const dir = sortDir === "asc" ? 1 : -1;
    return items.sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (sortBy === "projectName") {
        aVal = a.projectName || "";
        bVal = b.projectName || "";
      } else if (sortBy === "address") {
        aVal = a.address || "";
        bVal = b.address || "";
      } else if (sortBy === "projectManager") {
        aVal = a.projectManager || "";
        bVal = b.projectManager || "";
      } else if (sortBy === "status") {
        aVal = a.status || "";
        bVal = b.status || "";
      } else if (sortBy === "totalManpower") {
        return ((a.totalManpower || 0) - (b.totalManpower || 0)) * dir;
      } else if (sortBy === "projectCost") {
        return ((a.projectCost || 0) - (b.projectCost || 0)) * dir;
      } else if (sortBy === "projectStartDate") {
        return (new Date(a.projectStartDate ?? "").getTime() - new Date(b.projectStartDate ?? "").getTime()) * dir;
      } else if (sortBy === "projectEndDate") {
        return (new Date(a.projectEndDate ?? "").getTime() - new Date(b.projectEndDate ?? "").getTime()) * dir;
      } else if (sortBy === "contractStartDate") {
        return (new Date(a.contractStartDate ?? "").getTime() - new Date(b.contractStartDate ?? "").getTime()) * dir;
      } else if (sortBy === "contractEndDate") {
        return (new Date(a.contractEndDate ?? "").getTime() - new Date(b.contractEndDate ?? "").getTime()) * dir;
      } else if (sortBy === "updatedDate") {
        return (new Date(a.updatedDate ?? "").getTime() - new Date(b.updatedDate ?? "").getTime()) * dir;
      }
      return aVal.localeCompare(bVal, undefined, { sensitivity: "base" }) * dir;
    });
  }, [filteredProjects, sortBy, sortDir]);

  const onSort = (
    key:
      | "projectName"
      | "address"
      | "projectManager"
      | "status"
      | "totalManpower"
      | "projectCost"
      | "projectStartDate"
      | "projectEndDate"
      | "contractStartDate"
      | "contractEndDate"
      | "updatedDate"
  ) => {
    setSortBy(key);
    setSortDir(sortBy === key ? (sortDir === "asc" ? "desc" : "asc") : "asc");
  };

  const toggleColumn = (key: keyof VisibleCols) => {
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportCsv = () => {
    const header = [];
    if (visibleCols.rownum) header.push("#");
    if (visibleCols.projectName) header.push("Project Name");
    if (visibleCols.address) header.push("Address");
    if (visibleCols.totalManpower) header.push("Total Manpower");
    if (visibleCols.designationCounts) header.push("Designation-wise Count");
    if (visibleCols.projectManager) header.push("Project Manager");
    if (visibleCols.status) header.push("Status");
    if (visibleCols.projectCost) header.push("Project Cost");
    if (visibleCols.projectStartDate) header.push("Project Start Date");
    if (visibleCols.projectEndDate) header.push("Project End Date");
    if (visibleCols.contractStartDate) header.push("Contract Start Date");
    if (visibleCols.contractEndDate) header.push("Contract End Date");
    if (visibleCols.designationSalaries) header.push("Designation-wise Salary");
    if (visibleCols.employeeSalaries) header.push("Employee-wise Salary");
    if (visibleCols.updatedDate) header.push("Last Updated");
    if (visibleCols.action) header.push("Action");

    const rows = sortedProjects.map((p, idx) => {
      const parts = [];
      if (visibleCols.rownum) parts.push(String(idx + 1));
      if (visibleCols.projectName) parts.push(p.projectName);
      if (visibleCols.address) parts.push(p.address);
      if (visibleCols.totalManpower) parts.push(String(p.totalManpower));
      if (visibleCols.designationCounts) parts.push(Object.entries(p.designationWiseCount || {}).map(([d, c]) => `${d}:${c}`).join("; "));
      if (visibleCols.projectManager) parts.push(p.projectManager ?? "");
      if (visibleCols.status) parts.push(p.status ?? "");
      if (visibleCols.projectCost) parts.push(String(p.projectCost ?? ""));
      if (visibleCols.projectStartDate) parts.push(p.projectStartDate ? new Date(p.projectStartDate).toLocaleDateString() : "");
      if (visibleCols.projectEndDate) parts.push(p.projectEndDate ? new Date(p.projectEndDate).toLocaleDateString() : "");
      if (visibleCols.contractStartDate) parts.push(p.contractStartDate ? new Date(p.contractStartDate).toLocaleDateString() : "");
      if (visibleCols.contractEndDate) parts.push(p.contractEndDate ? new Date(p.contractEndDate).toLocaleDateString() : "");
      if (visibleCols.designationSalaries) parts.push(Object.entries(p.designationWiseSalary || {}).map(([d, s]) => `${d}:${s}`).join("; "));
      if (visibleCols.employeeSalaries) parts.push((p.employeeWiseSalary || []).map(e => `${e.employeeId}:${e.salary}@${e.effectiveFrom}`).join("; "));
      if (visibleCols.updatedDate) parts.push(p.updatedDate ? new Date(p.updatedDate).toLocaleDateString() : "");
      if (visibleCols.action) parts.push("");
      return parts.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "projects.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Edit handlers
  const closeEditModal = () => {
    setEditId(null);
    setEditForm({ address: "", totalManpower: "", designationWiseCount: [{ designation: "", count: "" }], projectStartDate: "", projectEndDate: "", contractStartDate: "", contractEndDate: "", projectCost: "", projectManager: "", status: "", clientName: "", clientContact: "", description: "", notes: "", designationWiseSalary: {} as Record<string, number>, documents: "", servicesProvided: "" });
  };

  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | ChangeEvent<HTMLSelectElement>, idx: number | null = null) => {
    const { name, value } = e.target;
    if (idx !== null) {
      const field = name.split("-")[0] as keyof DesignationCount;
      setEditForm((prev) => {
        const updated = [...prev.designationWiseCount];
        updated[idx] = { ...updated[idx], [field]: value } as DesignationCount;
        return { ...prev, designationWiseCount: updated };
      });
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
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

  const handleEditSalaryChange = (designation: string, salaryValue: string) => {
    const parsed = parseInt(salaryValue, 10);
    setEditForm((prev) => ({
      ...prev,
      designationWiseSalary: {
        ...(prev.designationWiseSalary || {}),
        [designation]: isNaN(parsed) ? 0 : parsed,
      },
    }));
  };

  const getEditServicesArray = (): string[] => {
    if (Array.isArray(editForm.servicesProvided)) return editForm.servicesProvided as string[];
    if (typeof editForm.servicesProvided === "string" && editForm.servicesProvided.trim()) {
      try {
        if (editForm.servicesProvided.trim().startsWith("[")) return JSON.parse(editForm.servicesProvided);
      } catch {}
      return editForm.servicesProvided.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const toggleEditService = (service: string) => {
    const current = new Set(getEditServicesArray());
    if (current.has(service)) current.delete(service); else current.add(service);
    setEditForm((prev) => ({ ...prev, servicesProvided: Array.from(current).join(",") }));
  };

  const handleEditDocumentsSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      readers.push(new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
        fr.onerror = () => resolve("");
        fr.readAsDataURL(file);
      }));
    }
    const dataUrls = (await Promise.all(readers)).filter(Boolean);
    setEditForm((prev) => {
      const existing = Array.isArray(prev.documents)
        ? (prev.documents as unknown as string[])
        : (typeof prev.documents === "string" && prev.documents
            ? prev.documents.split(",").map((s) => s.trim()).filter(Boolean)
            : []);
      const merged = [...existing, ...dataUrls];
      return { ...prev, documents: merged.join(",") };
    });
    e.target.value = "";
  };

  const handleEditProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editId) return;
    const project = projects.find((p) => p._id === editId);
    if (!project) return;

    const designationObj: Record<string, number> = {};
    editForm.designationWiseCount.forEach((item) => {
      if (item.designation && item.count) {
        designationObj[item.designation] = parseInt(item.count, 10) || 0;
      }
    });

    let documentsArr: string[] = [];
    try {
      if (Array.isArray(editForm.documents)) {
        documentsArr = editForm.documents as string[];
      } else if (typeof editForm.documents === "string") {
        const v = editForm.documents.trim();
        if (v) documentsArr = v.startsWith("[") ? JSON.parse(v) : v.split(",").map((s) => s.trim()).filter(Boolean);
      }
    } catch {}

    let servicesArr: string[] = [];
    try {
      if (Array.isArray(editForm.servicesProvided)) {
        servicesArr = editForm.servicesProvided as string[];
      } else if (typeof editForm.servicesProvided === "string") {
        const v = editForm.servicesProvided.trim();
        if (v) servicesArr = v.startsWith("[") ? JSON.parse(v) : v.split(",").map((s) => s.trim()).filter(Boolean);
      }
    } catch {}

    const payload: Record<string, unknown> = {
      address: editForm.address,
      totalManpower: parseInt(editForm.totalManpower, 10) || 0,
      designationWiseCount: designationObj,
      projectStartDate: editForm.projectStartDate || undefined,
      projectEndDate: editForm.projectEndDate || undefined,
      contractStartDate: editForm.contractStartDate || undefined,
      contractEndDate: editForm.contractEndDate || undefined,
      projectCost: parseInt(editForm.projectCost, 10) || 0,
      designationWiseSalary: editForm.designationWiseSalary || {},
      projectManager: editForm.projectManager,
      status: editForm.status,
      clientName: editForm.clientName,
      clientContact: editForm.clientContact,
      description: editForm.description,
      notes: editForm.notes,
      documents: documentsArr,
      servicesProvided: servicesArr,
    };

    try {
      const res = await fetch(`http://localhost:5000/api/project/projects/${encodeURIComponent(project.projectName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update project");
      const data = await res.json();
      setProjects((prev) => prev.map((p) => p._id === editId ? { ...p, ...data.project } : p));
      setToast(data.message || "Project updated successfully");
      closeEditModal();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to update project");
    }
  };

  // Delete handler
  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    try {
      const res = await fetch(`http://localhost:5000/api/project/projects/${encodeURIComponent(deleteProject.projectName)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      const data = await res.json();
      setProjects((prev) => prev.filter((p) => p._id !== deleteProject._id));
      setToast(data.message || "Project deleted successfully");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleteProject(null);
    }
  };

  return (
    <>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
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
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
              <div className="relative w-44 min-w-[130px]">
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-200 text-black"
                  }`}
                >
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-44 min-w-[130px]">
                <select
                  value={designationFilter}
                  onChange={(e) => setDesignationFilter(e.target.value)}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-200 text-black"
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
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                    theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-200 text-black"
                  }`}
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowColsMenu((p) => !p)}
                    className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-blue-700"}`}
                  >
                    Columns
                  </button>
                  {showColsMenu && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg p-3 border z-40 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-black"}`}>
                      {(Object.keys(visibleCols) as Array<keyof VisibleCols>).map((key) => (
                        <label key={key} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                          <input type="checkbox" checked={visibleCols[key]} onChange={() => toggleColumn(key)} />
                          <span className="capitalize">{key}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={exportCsv}
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-blue-700"}`}
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setShowCreate((p) => !p)}
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-blue-700 text-white border-blue-900 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-200 hover:bg-blue-700"}`}
                >
                  {showCreate ? "Close Create" : "Create Project"}
                </button>
                
              </div>
            </div>
          </div>
          
          {showCreate && (
            <div className={`rounded-2xl shadow-xl p-4 mb-4 border ${theme === "dark" ? "bg-gray-900 text-white border-blue-900" : "bg-white border-blue-100"}`}>
              <h2 className={`text-2xl font-bold mb-3 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Create Project</h2>
              <form onSubmit={handleCreateProject}>
                <div className={`overflow-x-auto ${theme === "dark" ? "" : ""}`}>
                  <table className="min-w-full text-xs md:text-sm table-fixed border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900" : "bg-blue-50"}>
                  <tr>
                        <th className="px-2 py-1 text-left font-semibold">Project Name</th>
                        <th className="px-2 py-1 text-left font-semibold">Address</th>
                        <th className="px-2 py-1 text-left font-semibold">Total Manpower</th>
                        <th className="px-2 py-1 text-left font-semibold">Designation-wise Count</th>
                        <th className="px-2 py-1 text-left font-semibold">Project Start</th>
                        <th className="px-2 py-1 text-left font-semibold">Project End</th>
                        <th className="px-2 py-1 text-left font-semibold">Contract Start</th>
                        <th className="px-2 py-1 text-left font-semibold">Contract End</th>
                        <th className="px-2 py-1 text-left font-semibold">Cost</th>
                        <th className="px-2 py-1 text-left font-semibold">Manager</th>
                        <th className="px-2 py-1 text-left font-semibold">Status</th>
                        <th className="px-2 py-1 text-left font-semibold">Client Name</th>
                        <th className="px-2 py-1 text-left font-semibold">Client Contact</th>
                        <th className="px-2 py-1 text-left font-semibold">Designation Salary</th>
                        <th className="px-2 py-1 text-left font-semibold">Documents</th>
                        <th className="px-2 py-1 text-left font-semibold">Services</th>
                        <th className="px-2 py-1 text-left font-semibold">Description</th>
                        <th className="px-2 py-1 text-left font-semibold">Notes</th>
                        <th className="px-2 py-1 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                        <td className="border-t px-2 py-1">
                          <input name="projectName" value={form.projectName} onChange={handleFormChange} required className={`w-48 md:w-56 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </td>
                        <td className="border-t px-2 py-1">
                          <input name="address" value={form.address} onChange={handleFormChange} required className={`w-64 md:w-72 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </td>
                        <td className="border-t px-2 py-1 w-28">
                          <input name="totalManpower" type="number" min="1" value={form.totalManpower} onChange={handleFormChange} className={`w-24 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </td>
                        <td className="border-t px-2 py-1 align-top">
                          <div className="flex flex-col gap-1 min-w-[200px] max-h-12 overflow-auto pr-1">
                            {form.designationWiseCount.map((item, idx) => (
                              <div key={idx} className="flex gap-1 items-center">
                                <input name={`designation-${idx}`} value={item.designation} onChange={(e) => handleFormChange(e, idx)} placeholder="Designation" className={`flex-1 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                                <input name={`count-${idx}`} type="number" min="1" value={item.count} onChange={(e) => handleFormChange(e, idx)} placeholder="Count" className={`w-20 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                                {form.designationWiseCount.length > 1 && (
                                  <button type="button" onClick={() => removeDesignationField(idx)} className="text-red-500 hover:text-red-700 text-lg px-1" aria-label="Remove">&times;</button>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={addDesignationField} className={theme === "dark" ? "text-xs mt-1 text-blue-400" : "text-xs mt-1 text-blue-600"}>+ Add</button>
                          </div>
                        </td>
                        <td className="border-t px-2 py-1">
                          <input name="projectStartDate" type="date" value={form.projectStartDate} onChange={handleFormChange} className={`w-40 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1">
                          <input name="projectEndDate" type="date" value={form.projectEndDate} onChange={handleFormChange} className={`w-40 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1">
                          <input name="contractStartDate" type="date" value={form.contractStartDate} onChange={handleFormChange} className={`w-40 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1">
                          <input name="contractEndDate" type="date" value={form.contractEndDate} onChange={handleFormChange} className={`w-40 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1 w-28">
                          <input name="projectCost" type="number" min="0" value={form.projectCost} onChange={handleFormChange} className={`w-28 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1">
                          <input name="projectManager" value={form.projectManager} onChange={handleFormChange} className={`w-40 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1">
                          <select
                            name="status"
                            value={form.status}
                            onChange={handleFormChange}
                            className={`w-40 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                          >
                            <option value="">Select status</option>
                            <option value="Planned">Planned</option>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="border-t px-2 py-1">
                          <input name="clientName" value={form.clientName} onChange={handleFormChange} className={`w-48 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1">
                          <input name="clientContact" value={form.clientContact} onChange={handleFormChange} className={`w-44 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1 align-top">
                          <div className="flex flex-col gap-1 min-w-[220px] max-h-12 overflow-auto pr-1">
                            {form.designationWiseCount.map((item, idx) => (
                              <div key={`sal-${idx}`} className="flex items-center gap-2">
                              <input
                                value={item.designation}
                                  readOnly
                                  className={`w-32 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                              />
                              <input
                                type="number"
                                  min={0}
                                  value={String((form.designationWiseSalary as Record<string, number>)?.[item.designation] ?? "")}
                                  onChange={(e) => handleSalaryChange(item.designation, e.target.value)}
                                  placeholder="Salary"
                                  className={`w-28 border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                />
                            </div>
                          ))}
                        </div>
                    </td>
                        <td className="border-t px-2 py-1 align-top">
                          <div className="flex flex-col gap-2 min-w-[240px]">
                            <input
                              type="file"
                              multiple
                              onChange={handleDocumentsSelected}
                              className={`block w-full text-xs ${theme === "dark" ? "file:bg-blue-800 file:text-white text-gray-300" : "file:bg-blue-100 file:text-blue-700 text-gray-700"}`}
                            />
                            <div className={`max-h-12 overflow-auto text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                              {(() => {
                                const docs = Array.isArray(form.documents)
                                  ? (form.documents as unknown as string[])
                                  : (typeof form.documents === "string" && form.documents
                                      ? form.documents.split(",").map((s)=>s.trim()).filter(Boolean)
                                      : []);
                                if (docs.length === 0) return <div className="italic opacity-70">No files selected</div>;
                                return (
                                  <>
                                    <div className="mb-1 opacity-80">{docs.length} file(s) attached</div>
                                    {docs.map((doc, idx) => (
                                      <div key={`doc-${idx}`} className="flex items-center gap-2 py-0.5">
                                        <span className="text-green-600">✔</span>
                                        <span className="truncate">
                                          {doc.startsWith("data:") ? (doc.split(";")[0].replace("data:", "") || "file") : "link"}
                                        </span>
                      </div>
                    ))}
                                  </>
                                );
                              })()}
                  </div>
                  </div>
                        </td>
                        <td className="border-t px-2 py-1 align-top">
                          <div className={`grid grid-cols-2 gap-2 min-w-[260px] max-h-12 overflow-auto pr-1 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                            {SERVICE_OPTIONS.map((svc) => {
                              const checked = getServicesArray().includes(svc);
                              return (
                                <label key={svc} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleService(svc)}
                                  />
                                  <span className="truncate">{svc}</span>
                                </label>
                              );
                            })}
                  </div>
                        </td>
                        <td className="border-t px-2 py-1">
                          <textarea name="description" value={form.description} onChange={handleFormChange} className={`w-64 h-12 resize-none border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1">
                          <textarea name="notes" value={form.notes} onChange={handleFormChange} className={`w-64 h-12 resize-none border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </td>
                        <td className="border-t px-2 py-1 align-top">
                          <div className="flex flex-col gap-2">
                            <button type="submit" className={theme === "dark" ? "px-4 py-2 rounded font-semibold bg-blue-700 text-white hover:bg-blue-800" : "px-4 py-2 rounded font-semibold bg-blue-600 text-white hover:bg-blue-700"}>Create</button>
                            <button type="button" onClick={() => setShowCreate(false)} className={theme === "dark" ? "px-4 py-2 rounded font-semibold bg-gray-700 text-white hover:bg-gray-800" : "px-4 py-2 rounded font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"}>Cancel</button>
                  </div>
                    </td>
                  </tr>
                </tbody>
              </table>
                  </div>
                </form>
            </div>
          )}
          <div className={`flex-1 w-full max-w-full rounded-none bg-transparent overflow-visible`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading projects...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="min-w-[1400px] min-w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                  <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                    <tr>
                      {visibleCols.rownum && (<th className={`px-2 py-1 text-left font-semibold sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: 56 }}>#</th>)}
                      {visibleCols.projectName && (
                        <th onClick={() => onSort("projectName")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border sticky z-20 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ left: visibleCols.rownum ? 56 : 0 }}>
        Project Name {sortBy === "projectName" ? (sortDir === "asc" ? "▲" : "▼") : ""}
      </th>
                      )}
                      {visibleCols.address && (
                        <th onClick={() => onSort("address")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Address {sortBy === "address" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.totalManpower && (
                        <th onClick={() => onSort("totalManpower")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Total Manpower {sortBy === "totalManpower" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.designationCounts && (
                        <th className={`px-2 py-1 text-left font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation-wise Count</th>
                      )}
                      {visibleCols.projectManager && (
                        <th onClick={() => onSort("projectManager")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project Manager {sortBy === "projectManager" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.contractStartDate && (
                        <th onClick={() => onSort("contractStartDate")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Contract Start {sortBy === "contractStartDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.contractEndDate && (
                        <th onClick={() => onSort("contractEndDate")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Contract End {sortBy === "contractEndDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.status && (
                        <th onClick={() => onSort("status")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status {sortBy === "status" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.projectCost && (
                        <th onClick={() => onSort("projectCost")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project Cost {sortBy === "projectCost" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.projectStartDate && (
                        <th onClick={() => onSort("projectStartDate")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project Start {sortBy === "projectStartDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.projectEndDate && (
                        <th onClick={() => onSort("projectEndDate")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project End {sortBy === "projectEndDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.designationSalaries && (
                        <th className={`px-2 py-1 text-left font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation-wise Salary</th>
                      )}
                      {visibleCols.employeeSalaries && (
                        <th className={`px-2 py-1 text-left font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee-wise Salary</th>
                      )}
                      {visibleCols.updatedDate && (
                        <th onClick={() => onSort("updatedDate")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Last Updated {sortBy === "updatedDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                      )}
                      {visibleCols.action && (
                        <th className={`px-2 py-1 text-center font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`px-4 py-12 text-center border ${theme === "dark" ? "text-gray-400 border-blue-800" : "text-gray-500 border-blue-200"}`}>No projects found</td>
                      </tr>
                    ) : sortedProjects.map((project, idx) => (
                      <tr key={project._id || project.projectName} className={`${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-50"} transition even:bg-gray-50 dark:even:bg-gray-900`}>
                        {visibleCols.rownum && (
                          <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === "dark" ? "bg-gray-800 text-gray-300 border-blue-800" : "bg-white text-gray-600 border-blue-200"}`} style={{ width: 56 }}>
                            {idx + 1}
                          </td>
                        )}
                        {visibleCols.projectName && (
                          <td className={`px-2 py-1 font-semibold border sticky z-10 ${theme === "dark" ? "text-blue-200 bg-gray-800 border-blue-800" : "text-blue-800 bg-white border-blue-200"}`}
                              style={{ left: visibleCols.rownum ? 56 : 0 }}
                          >
                            <span className="rounded-sm px-0.5">{project.projectName}</span>
                          </td>
                        )}
                        {visibleCols.address && (
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.address ?? project.address}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      address: e.target.value,
                                    },
                                  }));
                                }}
                              />
                            ) : (
                              <span className="block whitespace-pre-wrap break-words leading-5" title={project.address}>{project.address}</span>
                            )}
                          </td>
                        )}
                        {visibleCols.totalManpower && (
                          <td className={`px-2 py-1 w-36 whitespace-nowrap border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                type="number"
                                min={1}
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.totalManpower ?? String(project.totalManpower)}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      totalManpower: e.target.value,
                                    },
                                  }));
                                }}
                              />
                            ) : (
                              <span>{project.totalManpower}</span>
                            )}
                          </td>
                        )}
                        {visibleCols.designationCounts && (
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <div className="flex flex-col gap-2">
                                {(rowDesignationDrafts[project._id || project.projectName] ?? Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }))).map((item, dIdx) => (
                                  <div key={dIdx} className="flex gap-2 items-center">
                                    <input
                                      className={`flex-1 border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                      value={item.designation}
                                      onChange={(e) => {
                                        const id = project._id || project.projectName;
                                        const list = rowDesignationDrafts[id] ? [...rowDesignationDrafts[id]] : Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }));
                                        list[dIdx] = { ...list[dIdx], designation: e.target.value };
                                        setRowDesignationDrafts((prev) => ({ ...prev, [id]: list }));
                                      }}
                                      placeholder="Designation"
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      className={`w-24 border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                      value={item.count}
                                      onChange={(e) => {
                                        const id = project._id || project.projectName;
                                        const list = rowDesignationDrafts[id] ? [...rowDesignationDrafts[id]] : Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }));
                                        list[dIdx] = { ...list[dIdx], count: e.target.value };
                                        setRowDesignationDrafts((prev) => ({ ...prev, [id]: list }));
                                      }}
                                      placeholder="Count"
                                    />
                                    {(rowDesignationDrafts[project._id || project.projectName]?.length ?? Object.keys(project.designationWiseCount || {}).length) > 1 && (
                                      <button
                                        onClick={() => {
                                          const id = project._id || project.projectName;
                                          const list = rowDesignationDrafts[id] ? [...rowDesignationDrafts[id]] : Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) }));
                                          const next = list.filter((_, i) => i !== dIdx);
                                          setRowDesignationDrafts((prev) => ({ ...prev, [id]: next }));
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
                                    setRowDesignationDrafts((prev) => ({ ...prev, [id]: [...list, { designation: "", count: "" }] }));
                                  }}
                                  className={theme === "dark" ? "text-blue-400 text-sm" : "text-blue-600 text-sm"}
                                >
                                  + Add Designation
                                </button>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap leading-5 break-words">
                                {Object.entries(project.designationWiseCount || {}).map(([designation, count]) => `${designation}: ${count}`).join("\n")}
                              </div>
                            )}
                          </td>
                        )}
                        {visibleCols.projectManager && (
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.projectManager ?? project.projectManager}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      projectManager: e.target.value,
                                    },
                                  }));
                                }}
                                placeholder="Enter project manager"
                              />
                            ) : (
                              <span className="block whitespace-pre-wrap break-words leading-5">{project.projectManager || '-'}</span>
                            )}
                          </td>
                        )}
                        {visibleCols.contractStartDate && (
                          <td className={`px-2 py-1 whitespace-nowrap border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                type="date"
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.contractStartDate ?? project.contractStartDate}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      contractStartDate: e.target.value,
                                    },
                                  }));
                                }}
                              />
                            ) : (
                              <span className="text-xs">
                                {project.contractStartDate ? new Date(project.contractStartDate).toLocaleDateString() : '-'}
                              </span>
                            )}
                          </td>
                        )}
                        {visibleCols.contractEndDate && (
                          <td className={`px-2 py-1 whitespace-nowrap border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                type="date"
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.contractEndDate ?? project.contractEndDate}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      contractEndDate: e.target.value,
                                    },
                                  }));
                                }}
                              />
                            ) : (
                              <span className="text-xs">
                                {project.contractEndDate ? new Date(project.contractEndDate).toLocaleDateString() : '-'}
                              </span>
                            )}
                          </td>
                        )}
                        {visibleCols.status && (
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <select
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.status ?? project.status}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      status: e.target.value,
                                    },
                                  }));
                                }}
                              >
                                <option value="">Select status</option>
                                <option value="Planned">Planned</option>
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            ) : (
                              <span className="block whitespace-pre-wrap break-words leading-5">{project.status || '-'}</span>
                            )}
                          </td>
                        )}
                        {visibleCols.projectCost && (
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                type="number"
                                min="0"
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.projectCost ?? String(project.projectCost || 0)}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      projectCost: e.target.value,
                                    },
                                  }));
                                }}
                                placeholder="Enter project cost"
                              />
                            ) : (
                              <span className="block whitespace-pre-wrap break-words leading-5">{project.projectCost?.toLocaleString?.() ?? (project.projectCost || '-')}</span>
                            )}
                          </td>
                        )}
                        {visibleCols.projectStartDate && (
                          <td className={`px-2 py-1 whitespace-nowrap border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                type="date"
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.projectStartDate ?? project.projectStartDate}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      projectStartDate: e.target.value,
                                    },
                                  }));
                                }}
                              />
                            ) : (
                              <span className="text-xs">
                                {project.projectStartDate ? new Date(project.projectStartDate).toLocaleDateString() : '-'}
                              </span>
                            )}
                          </td>
                        )}
                        {visibleCols.projectEndDate && (
                          <td className={`px-2 py-1 whitespace-nowrap border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <input
                                type="date"
                                className={`w-full border rounded px-1 py-1 text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                value={rowDrafts[project._id || project.projectName]?.projectEndDate ?? project.projectEndDate}
                                onChange={(e) => {
                                  const old = rowDrafts[project._id || project.projectName] || {};
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [project._id || project.projectName]: {
                                      ...old,
                                      projectEndDate: e.target.value,
                                    },
                                  }));
                                }}
                              />
                            ) : (
                              <span className="text-xs">
                                {project.projectEndDate ? new Date(project.projectEndDate).toLocaleDateString() : '-'}
                              </span>
                            )}
                          </td>
                        )}
                        {visibleCols.designationSalaries && (
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <div className="space-y-1 max-h-20 overflow-auto">
                                {Object.entries(project.designationWiseCount || {}).map(([designation]) => (
                                  <div key={designation} className="flex gap-1 items-center">
                                    <span className="text-xs w-20 truncate" title={designation}>{designation}:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      className={`w-16 border rounded px-1 py-1 text-xs ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                                      value={String((rowDrafts[project._id || project.projectName]?.designationWiseSalary || project.designationWiseSalary || {})[designation] ?? "")}
                                      onChange={(e) => {
                                        const newSalary = parseInt(e.target.value, 10) || 0;
                                        setRowDrafts((prev) => ({
                                          ...prev,
                                          [project._id || project.projectName]: {
                                            ...(prev[project._id || project.projectName] || {}),
                                            designationWiseSalary: {
                                              ...(prev[project._id || project.projectName]?.designationWiseSalary || project.designationWiseSalary || {}),
                                              [designation]: newSalary,
                                            },
                                          },
                                        }));
                                      }}
                                      placeholder="0"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap leading-5 break-words">
                                {Object.keys(project.designationWiseCount || {}).length === 0 ? (
                                  <span className="italic opacity-70">-</span>
                                ) : (
                                  Object.entries(project.designationWiseCount || {}).map(([designation]) => {
                                    const salary = (project.designationWiseSalary || {})[designation];
                                    return (
                                      <div key={designation}>{designation}: {salary !== undefined ? salary : <span className="italic opacity-70">-</span>}</div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        {visibleCols.employeeSalaries && (
                          <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            <div className="whitespace-pre-wrap leading-5 break-words">
                              {(project.employeeWiseSalary && project.employeeWiseSalary.length > 0) ? (
                                <ul className="list-disc pl-4">
                                  {project.employeeWiseSalary.map((e, i) => (
                                    <li key={e._id || e.employeeId || i}>
                                      {e.employeeId || <span className="italic opacity-70">-</span>}: {e.salary ?? <span className="italic opacity-70">-</span>} @ {e.effectiveFrom ? new Date(e.effectiveFrom).toLocaleDateString() : <span className="italic opacity-70">-</span>}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="italic opacity-70">-</span>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleCols.updatedDate && (
                          <td className={`px-2 py-1 whitespace-nowrap border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {new Date(project.updatedDate ?? "").toLocaleDateString()}
                          </td>
                        )}
                        {visibleCols.action && (
                          <td className={`px-2 py-1 flex items-center justify-center gap-3 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {editingRowId === (project._id || project.projectName) ? (
                              <>
                                <button
                                  onClick={() => saveRow(project)}
                                  type="button"
                                  className={theme === "dark" ? "px-3 py-1 rounded font-semibold bg-green-700 text-white hover:bg-green-800" : "px-3 py-1 rounded font-semibold bg-green-600 text-white hover:bg-green-700"}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRowId(null);
                                    setRowDrafts((prev) => {
                                      const newDrafts = { ...prev };
                                      delete newDrafts[project._id || project.projectName];
                                      return newDrafts;
                                    });
                                    setRowDesignationDrafts((prev) => {
                                      const newDrafts = { ...prev };
                                      delete newDrafts[project._id || project.projectName];
                                      return newDrafts;
                                    });
                                  }}
                                  type="button"
                                  className={theme === "dark" ? "px-3 py-1 rounded font-semibold bg-gray-700 text-white hover:bg-gray-800" : "px-3 py-1 rounded font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"}
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
                                    setRowDrafts((prev) => ({
                                      ...prev,
                                      [id]: {
                                        address: project.address,
                                        totalManpower: String(project.totalManpower),
                                        projectManager: project.projectManager || '',
                                        projectCost: String(project.projectCost || 0),
                                        status: project.status || '',
                                        projectStartDate: project.projectStartDate || '',
                                        projectEndDate: project.projectEndDate || '',
                                        contractStartDate: project.contractStartDate || '',
                                        contractEndDate: project.contractEndDate || '',
                                        designationWiseSalary: project.designationWiseSalary || {},
                                      } 
                                    }));
                                    setRowDesignationDrafts((prev) => ({
                                      ...prev,
                                      [id]: Object.entries(project.designationWiseCount || {}).map(([designation, count]) => ({ designation, count: String(count) })),
                                    }));
                                  }}
                                  type="button"
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Edit inline"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => setDeleteProject(project)}
                                  type="button"
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Address</label>
                    <textarea
                      name="address"
                      value={editForm.address}
                      onChange={handleEditFormChange}
                      required
                      className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                    />
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Total Manpower</label>
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
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Designation-wise Count</label>
                    {editForm.designationWiseCount.map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          name={`designation-${idx}`}
                          value={item.designation}
                          onChange={(e) => handleEditFormChange(e, idx)}
                          placeholder="Designation"
                          required
                          className={`flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                        />
                        <input
                          name={`count-${idx}`}
                          type="number"
                          min="1"
                          value={item.count}
                          onChange={(e) => handleEditFormChange(e, idx)}
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
                      className={theme === "dark" ? "text-sm mt-1 text-blue-400 hover:underline" : "text-sm mt-1 text-blue-600 hover:underline"}
                    >
                      + Add Designation
                    </button>
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Project Start / End</label>
                    <div className="flex gap-2">
                      <input name="projectStartDate" type="date" value={editForm.projectStartDate} onChange={handleEditFormChange} className={`w-1/2 border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                      <input name="projectEndDate" type="date" value={editForm.projectEndDate} onChange={handleEditFormChange} className={`w-1/2 border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </div>
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Contract Start / End</label>
                    <div className="flex gap-2">
                      <input name="contractStartDate" type="date" value={editForm.contractStartDate} onChange={handleEditFormChange} className={`w-1/2 border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                      <input name="contractEndDate" type="date" value={editForm.contractEndDate} onChange={handleEditFormChange} className={`w-1/2 border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </div>
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Project Cost</label>
                    <input name="projectCost" type="number" min="0" value={editForm.projectCost} onChange={handleEditFormChange} className={`w-full border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Project Manager</label>
                      <input name="projectManager" value={editForm.projectManager} onChange={handleEditFormChange} className={`w-full border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </div>
                    <div>
                      <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Status</label>
                      <select name="status" value={editForm.status} onChange={handleEditSelectChange} className={`w-full border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}>
                        <option value="">Select status</option>
                        <option value="Planned">Planned</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Client Name</label>
                      <input name="clientName" value={editForm.clientName} onChange={handleEditFormChange} className={`w-full border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </div>
                    <div>
                      <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Client Contact</label>
                      <input name="clientContact" value={editForm.clientContact} onChange={handleEditFormChange} className={`w-full border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                    </div>
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Designation-wise Salary</label>
                    <div className="flex flex-col gap-2">
                      {editForm.designationWiseCount.map((item, idx) => (
                        <div key={`edsal-${idx}`} className="flex items-center gap-2">
                          <input value={item.designation} readOnly className={`w-40 border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                          <input type="number" min={0} value={String((editForm.designationWiseSalary as Record<string, number>)?.[item.designation] ?? "")} onChange={(e)=>handleEditSalaryChange(item.designation, e.target.value)} placeholder="Salary" className={`w-40 border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Documents</label>
                    <input type="file" multiple onChange={handleEditDocumentsSelected} className={`block w-full text-sm ${theme === "dark" ? "file:bg-blue-800 file:text-white text-gray-300" : "file:bg-blue-100 file:text-blue-700 text-gray-700"}`} />
                    <div className={`mt-1 max-h-24 overflow-auto text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      {(() => {
                        const docs = Array.isArray(editForm.documents) ? (editForm.documents as string[]) : (typeof editForm.documents === 'string' && editForm.documents ? editForm.documents.split(',').map(s=>s.trim()).filter(Boolean) : []);
                        if (docs.length === 0) return <div className="italic opacity-70">No files selected</div>;
                        return (
                          <>
                            <div className="mb-1 opacity-80">{docs.length} file(s) attached</div>
                            {docs.map((doc:string, idx:number) => (
                              <div key={`eddoc-${idx}`} className="flex items-center gap-2 py-0.5">
                                <span className="text-green-600">✔</span>
                                <span className="truncate">{doc.startsWith('data:') ? (doc.split(';')[0].replace('data:','') || 'file') : 'link'}</span>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Services Provided</label>
                    <div className={`grid grid-cols-2 gap-2 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                      {SERVICE_OPTIONS.map((svc) => {
                        const checked = getEditServicesArray().includes(svc);
                        return (
                          <label key={`ed-${svc}`} className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleEditService(svc)} />
                            <span className="truncate">{svc}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Description</label>
                    <textarea name="description" value={editForm.description} onChange={handleEditFormChange} className={`w-full border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
                  </div>
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium mb-1 text-gray-300" : "block text-sm font-medium mb-1 text-gray-700"}>Notes</label>
                    <textarea name="notes" value={editForm.notes} onChange={handleEditFormChange} className={`w-full border rounded-lg px-3 py-2 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} />
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
                      className={theme === "dark" ? "px-6 py-2 rounded-lg font-semibold shadow bg-blue-700 text-white hover:bg-blue-800" : "px-6 py-2 rounded-lg font-semibold shadow bg-blue-600 text-white hover:bg-blue-700"}
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