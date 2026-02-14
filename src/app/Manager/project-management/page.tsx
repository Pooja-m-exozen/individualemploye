"use client";
import React, { useState, useMemo, ChangeEvent, FormEvent, useEffect } from "react";
import { FaSearch, FaEdit, FaTrash } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import ExcelJS from "exceljs";

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
  updatedAt?: string;
  createdAt?: string;
}

interface DesignationCount {
  designation: string;
  count: string;
}

interface ProjectKYCData {
  totalKYC: number;
  activeCount: number;
  designationWiseKYC: Record<string, number>;
  designationWiseActive: Record<string, number>;
  designationWiseEmployeeIds: Record<string, string[]>; // All Employee IDs grouped by designation
  designationWiseActiveEmployeeIds: Record<string, string[]>; // Active Employee IDs only
}

interface KYCForm {
  _id?: string;
  personalDetails?: {
    projectName?: string;
    designation?: string;
    workType?: string;
    employeeId?: string;
    empId?: string;
  };
  projectName?: string;
  designation?: string;
  workType?: string;
  employeeId?: string;
  status?: string;
}

export default function ProjectManagementPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectKYCData, setProjectKYCData] = useState<Record<string, ProjectKYCData>>({});
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
    | "updatedAt"
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
    updatedAt: boolean;
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
    updatedAt: true,
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
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects", {
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

      const res = await fetch(`https://cafm.zenapi.co.in/api/project/projects/${encodeURIComponent(project.projectName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const data = await res.json();
      setToast("Changes saved successfully");
      setProjects((prev) => prev.map((p) => p._id === project._id ? { ...p, ...data.project, updatedAt: data.project.updatedAt || new Date().toISOString() } : p));
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
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
      // Fetch KYC data for all projects
      await fetchKYCDataForProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchKYCDataForProjects = async (projectsList: Project[]) => {
    try {
      // Fetch all KYC forms - try both endpoints
      let kycForms: KYCForm[] = [];
      try {
        const kycRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
        if (kycRes.ok) {
          const data = await kycRes.json();
          kycForms = Array.isArray(data.kycForms) ? data.kycForms : (Array.isArray(data) ? data : []);
        }
      } catch {
        // Try alternative endpoint
        try {
          const kycRes2 = await fetch("https://cafm.zenapi.co.in/api/kyc/forms");
          if (kycRes2.ok) {
            const data2 = await kycRes2.json();
            kycForms = Array.isArray(data2.kycForms) ? data2.kycForms : (Array.isArray(data2) ? data2 : []);
          }
        } catch (e2) {
          console.error("Failed to fetch KYC forms from both endpoints:", e2);
          return;
        }
      }

      if (kycForms.length === 0) {
        console.warn("No KYC forms found");
        return;
      }

      // Process KYC data per project
      const kycDataMap: Record<string, ProjectKYCData> = {};

      projectsList.forEach((project) => {
        const projectName = project.projectName;
        const designationWiseKYC: Record<string, number> = {};
        const designationWiseActive: Record<string, number> = {};
        const designationWiseEmployeeIds: Record<string, string[]> = {};
        const designationWiseActiveEmployeeIds: Record<string, string[]> = {};
        let totalKYC = 0;
        let activeCount = 0;

        // Filter KYC forms for this project - match project name exactly
        const projectKYCForms = kycForms.filter((form: KYCForm) => {
          const formProjectName = form.personalDetails?.projectName || form.projectName || "";
          // Case-insensitive comparison and trim whitespace
          return formProjectName.trim().toLowerCase() === projectName.trim().toLowerCase();
        });

        projectKYCForms.forEach((form: KYCForm) => {
          const designation = (form.personalDetails?.designation || form.designation || "Unknown").trim();
          const status = String(form.status || "").toLowerCase().trim();
          const workType = String(form.personalDetails?.workType || form.workType || "").toLowerCase().trim();
          const employeeId = (form.personalDetails?.employeeId || form.personalDetails?.empId || form.employeeId || "").trim();
          
          // Skip if no employee ID
          if (!employeeId) {
            return;
          }
          
          // Initialize arrays if needed
          if (!designationWiseEmployeeIds[designation]) {
            designationWiseEmployeeIds[designation] = [];
          }
          if (!designationWiseActiveEmployeeIds[designation]) {
            designationWiseActiveEmployeeIds[designation] = [];
          }
          
          // Count all KYC (including rejected and left)
          totalKYC++;
          designationWiseKYC[designation] = (designationWiseKYC[designation] || 0) + 1;
          
          // Add employee ID to the list (all employees)
          if (employeeId && !designationWiseEmployeeIds[designation].includes(employeeId)) {
            designationWiseEmployeeIds[designation].push(employeeId);
          }

          // Count only active (excluding rejected and left)
          const isRejected = status === "rejected";
          const isLeft = status === "exited" || status === "left" || workType === "left";
          
          if (!isRejected && !isLeft) {
            activeCount++;
            designationWiseActive[designation] = (designationWiseActive[designation] || 0) + 1;
            // Add to active employee IDs list (only if not already added)
            if (employeeId && !designationWiseActiveEmployeeIds[designation].includes(employeeId)) {
              designationWiseActiveEmployeeIds[designation].push(employeeId);
            }
          }
        });

        kycDataMap[projectName] = {
          totalKYC,
          activeCount,
          designationWiseKYC,
          designationWiseActive,
          designationWiseEmployeeIds,
          designationWiseActiveEmployeeIds,
        };
      });

      setProjectKYCData(kycDataMap);
      console.log("KYC Data loaded for projects:", Object.keys(kycDataMap));
    } catch (err) {
      console.error("Failed to fetch KYC data:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } else if (sortBy === "updatedAt") {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return (aTime - bTime) * dir;
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
      | "updatedAt"
  ) => {
    setSortBy(key);
    setSortDir(sortBy === key ? (sortDir === "asc" ? "desc" : "asc") : "asc");
  };

  const toggleColumn = (key: keyof VisibleCols) => {
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // New Excel export function matching the image format with proper UI/UX and complete data
  const exportExcelComparison = async () => {
    try {
      // Always refresh KYC data to ensure real-time accuracy
      setToast("Refreshing data, please wait...");
      
      // Fetch fresh KYC data directly
      let latestKYCData: Record<string, ProjectKYCData> = {};
      try {
        const kycRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
        if (kycRes.ok) {
          const data = await kycRes.json();
          const kycForms: KYCForm[] = Array.isArray(data.kycForms) ? data.kycForms : (Array.isArray(data) ? data : []);
          
          // Process KYC data per project with fresh data
          projects.forEach((project) => {
            const projectName = project.projectName;
            const designationWiseKYC: Record<string, number> = {};
            const designationWiseActive: Record<string, number> = {};
            const designationWiseEmployeeIds: Record<string, string[]> = {};
            const designationWiseActiveEmployeeIds: Record<string, string[]> = {};
            let totalKYC = 0;
            let activeCount = 0;

            const projectKYCForms = kycForms.filter((form: KYCForm) => {
              const formProjectName = form.personalDetails?.projectName || form.projectName || "";
              return formProjectName.trim().toLowerCase() === projectName.trim().toLowerCase();
            });

            projectKYCForms.forEach((form: KYCForm) => {
              // Get designation - try multiple possible fields, preserve original spelling
              const rawDesignation = form.personalDetails?.designation || form.designation || "Unknown";
              let designation = String(rawDesignation).trim(); // Keep original spelling (even if typo)
              
              // Get employee ID - try multiple possible fields
              const employeeId = (
                form.personalDetails?.employeeId || 
                form.personalDetails?.empId || 
                form.employeeId ||
                form._id || // Sometimes _id might be used
                ""
              ).trim();
              
              // Skip if no employee ID
              if (!employeeId) {
                console.warn(`Skipping KYC form - missing employeeId:`, {
                  designation: designation,
                  projectName: projectName,
                  formId: form._id
                });
                return;
              }
              
              // Skip if no designation (but log it)
              if (!designation || designation === "Unknown") {
                console.warn(`KYC form with missing designation (using employeeId as fallback):`, {
                  employeeId: employeeId,
                  projectName: projectName
                });
                designation = "Unknown"; // Still process it
              }
              
              const status = String(form.status || "").toLowerCase().trim();
              const workType = String(form.personalDetails?.workType || form.workType || "").toLowerCase().trim();
              
              // Initialize arrays if needed (preserve original designation spelling from KYC)
              if (!designationWiseEmployeeIds[designation]) {
                designationWiseEmployeeIds[designation] = [];
              }
              if (!designationWiseActiveEmployeeIds[designation]) {
                designationWiseActiveEmployeeIds[designation] = [];
              }
              
              // Count all KYC (including rejected and left)
              totalKYC++;
              designationWiseKYC[designation] = (designationWiseKYC[designation] || 0) + 1;
              
              // Add employee ID to all list (avoid duplicates)
              if (!designationWiseEmployeeIds[designation].includes(employeeId)) {
                designationWiseEmployeeIds[designation].push(employeeId);
              }

              // Determine if employee is active (not rejected and not left)
              const isRejected = status === "rejected";
              const isLeft = status === "exited" || status === "left" || workType === "left";
              
              if (!isRejected && !isLeft) {
                activeCount++;
                designationWiseActive[designation] = (designationWiseActive[designation] || 0) + 1;
                // Add to active employee IDs list (avoid duplicates)
                if (!designationWiseActiveEmployeeIds[designation].includes(employeeId)) {
                  designationWiseActiveEmployeeIds[designation].push(employeeId);
                }
              }
            });
            
            // Validate data accuracy - sum of designation-wise active should equal total active
            const sumOfDesignationWiseActive = Object.values(designationWiseActive).reduce((sum, count) => sum + count, 0);
            const sumOfActiveEmployeeIds = Object.values(designationWiseActiveEmployeeIds).reduce((sum, ids) => sum + ids.length, 0);
            
            if (sumOfDesignationWiseActive !== activeCount) {
              console.error(`Data mismatch for ${projectName}: Sum of designation-wise active (${sumOfDesignationWiseActive}) != Total active (${activeCount})`);
            }
            
            if (sumOfActiveEmployeeIds !== activeCount) {
              console.error(`Employee ID mismatch for ${projectName}: Sum of active employee IDs (${sumOfActiveEmployeeIds}) != Total active (${activeCount})`);
            }
            
            // Log summary for debugging
            console.log(`KYC Data Summary for ${projectName}:`, {
              totalKYC,
              activeCount,
              sumOfDesignationWiseActive,
              sumOfActiveEmployeeIds,
              designations: Object.keys(designationWiseActive),
              designationWiseActive: { ...designationWiseActive }
            });

            latestKYCData[projectName] = {
              totalKYC,
              activeCount,
              designationWiseKYC,
              designationWiseActive,
              designationWiseEmployeeIds,
              designationWiseActiveEmployeeIds,
            };
          });
        }
      } catch (err) {
        console.error("Failed to fetch fresh KYC data:", err);
        // Fallback to existing data if fetch fails
        latestKYCData = { ...projectKYCData };
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Project Employee Comparison");

      // Define columns with proper widths
      worksheet.columns = [
        { header: "SL NO", key: "slNo", width: 10 },
        { header: "PROJECT NAME", key: "projectName", width: 40 },
        { header: "TOTAL", key: "total", width: 12 },
        { header: "DESIGNATION WISE", key: "designationWise", width: 35 },
        { header: "ACTIVE", key: "active", width: 12 },
        { header: "DESIGNATION WISE ACTIVE", key: "designationWiseActive", width: 35 },
        { header: "EMP ID", key: "empId", width: 50 }, // Wider column for employee IDs
      ];

      // Style the header row - bold with borders and coloring
      const headerRow = worksheet.getRow(1);
      headerRow.font = { 
        bold: true, 
        size: 11, 
        color: { argb: "FFFFFFFF" },
        name: "Arial"
      };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" }, // Blue background like the image
      };
      headerRow.alignment = { 
        vertical: "middle", 
        horizontal: "center", 
        wrapText: true 
      };
      headerRow.height = 25;
      
      // Add borders to header - all sides with black borders
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      });

      // Function to style data rows - simple and clean UI/UX with clear project separation
      const styleDataRow = (
        row: ExcelJS.Row,
        _rowNum: number,
        isLastDesignation: boolean = false,
        empIdCount: number = 0
      ) => {
        // Calculate row height based on employee IDs - allow expansion for multiple IDs
        // Base height + additional height for each employee ID
        // Estimate: ~12 characters per ID, column width 50 = ~4 IDs per line
        const baseHeight = 20;
        const idsPerLine = 4; // Based on column width of 50
        const lineHeight = 15; // Height per line
        const estimatedLines = Math.max(1, Math.ceil(empIdCount / idsPerLine));
        const calculatedHeight = baseHeight + ((estimatedLines - 1) * lineHeight);
        // Set minimum height but allow Excel to expand further if needed
        row.height = Math.max(baseHeight, calculatedHeight);
        
        // Simple font styling
        row.font = { size: 10, name: "Arial" };
        
        // Add borders to all cells - clear separation between projects
        row.eachCell((cell, colNumber) => {
          // Determine alignment based on column
          if (colNumber === 1 || colNumber === 3 || colNumber === 5) {
            // SL NO, TOTAL, ACTIVE - center aligned for numbers
            cell.alignment = { 
              vertical: "top", // Top align for better expansion
              horizontal: "center", 
              wrapText: true 
            };
          } else if (colNumber === 7) {
            // EMP ID column - top align and wrap text to show all IDs
            cell.alignment = { 
              vertical: "top", 
              horizontal: "left", 
              wrapText: true,
              shrinkToFit: false
            };
          } else {
            // Text columns - left aligned, top aligned for expansion
            cell.alignment = { 
              vertical: "top", 
              horizontal: "left", 
              wrapText: true 
            };
          }
          
          // Clear borders - thicker bottom border to separate projects
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: isLastDesignation 
              ? { style: "thick", color: { argb: "FF000000" } } // Thick border to clearly separate projects
              : { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
          
          // No background colors - keep it simple and clean
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFFFF" }, // White background for all rows
          };
        });
      };

      let slNo = 1;
      let currentRow = 2;
      let totalProjectsExported = 0;
      let totalDesignationsExported = 0;
      let totalEmployeeIdsExported = 0;

      // Helper function to normalize designation for flexible matching (handles typos)
      const normalizeDesignation = (des: string): string => {
        return des.trim().toLowerCase().replace(/\s+/g, ' '); // Normalize spaces
      };

      // Helper function to calculate similarity between two strings (simple Levenshtein-like)
      const calculateSimilarity = (str1: string, str2: string): number => {
        const s1 = normalizeDesignation(str1);
        const s2 = normalizeDesignation(str2);
        
        if (s1 === s2) return 1.0;
        if (s1.includes(s2) || s2.includes(s1)) return 0.9;
        
        // Check for common typos (character swaps, missing/extra chars)
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.length === 0) return 1.0;
        
        // Simple similarity: count matching characters
        let matches = 0;
        for (let i = 0; i < shorter.length; i++) {
          if (longer.includes(shorter[i])) matches++;
        }
        
        return matches / longer.length;
      };

      // Helper function to find matching KYC designation (handles typos and variations)
      // Currently unused but kept for potential future use
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _findMatchingKYCDesignation = (
        projectDes: string,
        kycDesignations: string[]
      ): string | null => {
        const normalizedProjectDes = normalizeDesignation(projectDes);
        
        // First try exact match (case-insensitive)
        const exactMatch = kycDesignations.find(
          kycDes => normalizeDesignation(kycDes) === normalizedProjectDes
        );
        if (exactMatch) return exactMatch;
        
        // Try partial match (contains) - handles cases like "Security Guard" vs "Security Guard : 2"
        const partialMatch = kycDesignations.find(
          kycDes => {
            const normalizedKYC = normalizeDesignation(kycDes);
            return normalizedKYC.includes(normalizedProjectDes) ||
                   normalizedProjectDes.includes(normalizedKYC);
          }
        );
        if (partialMatch) return partialMatch;
        
        // Try fuzzy matching for typos (e.g., "Secuirty Guard" vs "Security Guard")
        // Find the best match with similarity > 0.7
        let bestMatch: string | null = null;
        let bestSimilarity = 0;
        
        kycDesignations.forEach(kycDes => {
          const similarity = calculateSimilarity(projectDes, kycDes);
          if (similarity > bestSimilarity && similarity >= 0.7) {
            bestSimilarity = similarity;
            bestMatch = kycDes;
          }
        });
        
        if (bestMatch) {
          console.log(`🔍 Fuzzy match found: "${projectDes}" matched with "${bestMatch}" (similarity: ${(bestSimilarity * 100).toFixed(1)}%)`);
          return bestMatch;
        }
        
        return null;
      };

      // Export ALL projects - use ONLY project management designations (no extra designations from KYC)
      sortedProjects.forEach((project) => {
        // Use latest KYC data to ensure real-time accuracy
        const kycData = latestKYCData[project.projectName];
        
        // Get designations from project management
        const projectDesignations = Object.keys(project.designationWiseCount || {});
        
        // Get ALL KYC designations from designationWiseActive (this is the source of truth for active designations)
        // This ensures we capture every designation that has active KYC data, including typos
        const kycActiveDesignationKeys = kycData 
          ? Array.from(new Set([
              ...Object.keys(kycData.designationWiseActive || {}), 
              ...Object.keys(kycData.designationWiseActiveEmployeeIds || {})
            ]))
          : [];
        
        // Also get all KYC designations (including inactive) for total counts
        // Currently unused but kept for potential future use
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _kycAllDesignationKeys = kycData 
          ? Array.from(new Set([
              ...Object.keys(kycData.designationWiseKYC || {}),
              ...Object.keys(kycData.designationWiseEmployeeIds || {})
            ]))
          : [];
        
        // Find KYC designations that don't match any project designation
        // Use ALL active KYC designations as the source
        const unmatchedKYCDesignations = kycActiveDesignationKeys.filter(kycDes => {
          // Check if this KYC designation matches any project designation (with fuzzy matching)
          return !projectDesignations.some(projDes => {
            const similarity = calculateSimilarity(projDes, kycDes);
            return similarity >= 0.7; // If similarity is high, it's already matched
          });
        });
        
        // Combine: Project designations first, then ALL unmatched KYC active designations
        // This ensures we show:
        // 1. All project designations (with their counts from project management)
        // 2. ALL KYC active designations that don't exist in project (shown in DESIGNATION WISE ACTIVE)
        const allDesignationsToShow = new Set([
          ...projectDesignations,
          ...kycActiveDesignationKeys // Show ALL active KYC designations, not just unmatched ones
        ]);
        
        // Debug: Log available designations
        if (kycData && kycActiveDesignationKeys.length > 0) {
          console.log(`📊 Project: ${project.projectName}`);
          console.log(`  Project designations:`, projectDesignations);
          console.log(`  ALL KYC Active designations (from designationWiseActive):`, kycActiveDesignationKeys);
          console.log(`  KYC designation sources:`, {
            fromActive: Object.keys(kycData.designationWiseActive || {}),
            fromKYC: Object.keys(kycData.designationWiseKYC || {}),
            fromActiveIds: Object.keys(kycData.designationWiseActiveEmployeeIds || {}),
            fromAllIds: Object.keys(kycData.designationWiseEmployeeIds || {})
          });
          if (unmatchedKYCDesignations.length > 0) {
            console.log(`  ✅ Unmatched KYC designations (will be shown in Excel):`, unmatchedKYCDesignations);
          } else {
            console.log(`  ℹ️ All KYC designations matched with project designations`);
          }
          console.log(`  📝 Total designations to export: ${allDesignationsToShow.size} (${projectDesignations.length} project + ${kycActiveDesignationKeys.length} KYC active)`);
          console.log(`  📋 Designation-wise Active counts:`, Object.entries(kycData.designationWiseActive || {}).map(([des, count]) => `${des}: ${count}`).join(", "));
        }
        
        // Sort designations: project designations first, then unmatched KYC designations
        // Currently unused but kept for potential future use
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _sortedDesignations = Array.from(allDesignationsToShow).sort((a, b) => {
          const aInProject = projectDesignations.includes(a);
          const bInProject = projectDesignations.includes(b);
          if (aInProject && !bInProject) return -1;
          if (!aInProject && bInProject) return 1;
          return a.localeCompare(b);
        });

        totalProjectsExported++;

        // Track all employee IDs to avoid duplicates across designations
        const allEmployeeIdsSet = new Set<string>();
        
        // Build designation-wise strings
        const designationWiseEntries: string[] = [];
        const designationWiseActiveEntries: string[] = [];
        const designationWiseActiveMap: Map<string, { count: number; empIds: string[] }> = new Map();
        
        // Process project designations first (show each only once in DESIGNATION WISE)
        const processedProjectDesignations = new Set<string>();
        projectDesignations.forEach((designation) => {
          if (processedProjectDesignations.has(designation)) return;
          processedProjectDesignations.add(designation);
          
          const projectCount = project.designationWiseCount?.[designation] || 0;
          if (projectCount > 0) {
            designationWiseEntries.push(`${designation}: ${projectCount}`);
          }
        });
        
        // Process ALL KYC active designations (including typos) for DESIGNATION WISE ACTIVE
        if (kycData) {
          Object.entries(kycData.designationWiseActive || {}).forEach(([kycDes, count]) => {
            const empIds = kycData.designationWiseActiveEmployeeIds?.[kycDes] || [];
            designationWiseActiveMap.set(kycDes, { count, empIds });
            
            // Add to designation-wise active entries
            designationWiseActiveEntries.push(`${kycDes}: ${count}`);
            
            // Add employee IDs to the set (will deduplicate later)
            empIds.forEach(id => {
              if (id && id.trim()) {
                allEmployeeIdsSet.add(id.trim());
              }
            });
          });
        }
        
        // If no designations, add one row with project info
        if (designationWiseEntries.length === 0 && designationWiseActiveEntries.length === 0) {
          const row = worksheet.addRow({
            slNo: String(slNo++),
            projectName: project.projectName || "Unknown Project",
            total: String(project.totalManpower || 0),
            designationWise: "",
            active: kycData ? String(kycData.activeCount || 0) : "0",
            designationWiseActive: "",
            empId: "",
          });
          
          styleDataRow(row, currentRow, true, 0);
          currentRow++;
        } else {
          // Create rows: one for project designations, then one for each KYC active designation
          let isFirstRow = true;
          const maxRows = Math.max(designationWiseEntries.length, designationWiseActiveEntries.length);
          
          for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const designationWiseValue = rowIndex < designationWiseEntries.length 
              ? designationWiseEntries[rowIndex] 
              : "";
            
            const designationWiseActiveValue = rowIndex < designationWiseActiveEntries.length
              ? designationWiseActiveEntries[rowIndex]
              : "";
            
            // Get employee IDs for this KYC designation (if it exists)
            let empIdsForRow: string[] = [];
            if (rowIndex < designationWiseActiveEntries.length) {
              const kycDes = designationWiseActiveEntries[rowIndex].split(":")[0].trim();
              const kycDataEntry = designationWiseActiveMap.get(kycDes);
              if (kycDataEntry) {
                empIdsForRow = kycDataEntry.empIds.filter(id => id && id.trim());
              }
            }
            
            const empIdString = empIdsForRow.length > 0 
              ? empIdsForRow.join(", ") 
              : "";
            
            totalDesignationsExported++;
            totalEmployeeIdsExported += empIdsForRow.length;
            
            const row = worksheet.addRow({
              slNo: isFirstRow ? String(slNo++) : "",
              projectName: isFirstRow ? (project.projectName || "Unknown Project") : "",
              total: isFirstRow ? String(project.totalManpower || 0) : "",
              designationWise: designationWiseValue,
              active: isFirstRow ? String(kycData?.activeCount || 0) : "",
              designationWiseActive: designationWiseActiveValue,
              empId: empIdString,
            });
            
            const isLastRow = rowIndex === maxRows - 1;
            styleDataRow(row, currentRow, isLastRow, empIdsForRow.length);
            
            currentRow++;
            isFirstRow = false;
          }
        }
      });

      // Freeze header row for better navigation
      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
          xSplit: 0,
          topLeftCell: "A2",
          activeCell: "A2",
        },
      ];

      // Set print settings for better printing
      worksheet.pageSetup = {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.7,
          right: 0.7,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
      };

      // Add auto filter to header row for easy filtering
      worksheet.autoFilter = {
        from: "A1",
        to: "G1",
      };

      // Final validation: Verify data accuracy before export
      sortedProjects.forEach((project) => {
        const kycData = latestKYCData[project.projectName];
        if (kycData) {
          const sumOfDesignationWiseActive = Object.values(kycData.designationWiseActive || {}).reduce((sum, count) => sum + count, 0);
          const sumOfActiveEmployeeIds = Object.values(kycData.designationWiseActiveEmployeeIds || {}).reduce((sum, ids) => sum + ids.length, 0);
          
          if (sumOfDesignationWiseActive !== kycData.activeCount) {
            console.error(`❌ CRITICAL: ${project.projectName} - Sum of designation-wise active (${sumOfDesignationWiseActive}) != Total active (${kycData.activeCount})`);
          }
          
          if (sumOfActiveEmployeeIds !== kycData.activeCount) {
            console.error(`❌ CRITICAL: ${project.projectName} - Sum of active employee IDs (${sumOfActiveEmployeeIds}) != Total active (${kycData.activeCount})`);
            console.log(`  Designation breakdown:`, Object.entries(kycData.designationWiseActive || {}).map(([des, count]) => ({
              designation: des,
              count,
              employeeIds: kycData.designationWiseActiveEmployeeIds?.[des] || []
            })));
          }
        }
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `project-employee-comparison-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Log export summary for verification
      console.log("✅ Excel Export Summary:", {
        totalProjects: totalProjectsExported,
        totalDesignations: totalDesignationsExported,
        totalEmployeeIds: totalEmployeeIdsExported,
        totalRows: currentRow - 1
      });
      
      // Log detailed breakdown for each project
      sortedProjects.forEach((project) => {
        const kycData = latestKYCData[project.projectName];
        if (kycData) {
          console.log(`📊 ${project.projectName}:`, {
            totalActive: kycData.activeCount,
            designationBreakdown: Object.entries(kycData.designationWiseActive || {}).map(([des, count]) => ({
              designation: des,
              activeCount: count,
              employeeIds: kycData.designationWiseActiveEmployeeIds?.[des] || []
            }))
          });
        }
      });
      
      setToast(`Excel file exported successfully! (${totalProjectsExported} projects, ${totalDesignationsExported} designations, ${totalEmployeeIdsExported} employee IDs)`);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      setToast("Failed to export Excel file. Please check console for details.");
    }
  };

  const exportCsv = () => {
    const header = [];
    if (visibleCols.rownum) header.push("#");
    if (visibleCols.projectName) header.push("Project Name");
    if (visibleCols.address) header.push("Address");
    if (visibleCols.totalManpower) header.push("Total Manpower (Project)");
    if (visibleCols.designationCounts) header.push("Designation-wise Count (Project)");
    
    // KYC Comparison Columns
    header.push("Active KYC Count (Employee Mgmt)");
    header.push("Total KYC Count (Employee Mgmt)");
    header.push("KYC vs Manpower Difference");
    header.push("⚠ ISSUE STATUS");
    header.push("❌ ISSUES FOUND");
    
    // Detailed Comparison
    header.push("Designation Mismatches");
    header.push("Designation-wise Detailed Comparison");
    header.push("Project Designations (Not in KYC)");
    header.push("KYC Designations (Not in Project)");
    
    if (visibleCols.projectManager) header.push("Project Manager");
    if (visibleCols.status) header.push("Status");
    if (visibleCols.projectCost) header.push("Project Cost");
    if (visibleCols.projectStartDate) header.push("Project Start Date");
    if (visibleCols.projectEndDate) header.push("Project End Date");
    if (visibleCols.contractStartDate) header.push("Contract Start Date");
    if (visibleCols.contractEndDate) header.push("Contract End Date");
    if (visibleCols.designationSalaries) header.push("Designation-wise Salary");
    if (visibleCols.employeeSalaries) header.push("Employee-wise Salary");
    if (visibleCols.updatedAt) header.push("Last Updated");

    const rows = sortedProjects.map((p, idx) => {
      const parts = [];
      const kycData = projectKYCData[p.projectName];
      
      if (visibleCols.rownum) parts.push(String(idx + 1));
      if (visibleCols.projectName) parts.push(p.projectName);
      if (visibleCols.address) parts.push(p.address);
      if (visibleCols.totalManpower) parts.push(String(p.totalManpower));
      if (visibleCols.designationCounts) {
        const projectDesignations = Object.entries(p.designationWiseCount || {}).map(([d, c]) => `${d}:${c}`).join("; ");
        parts.push(projectDesignations || "None");
      }
      
      // KYC Comparison Data with Issue Detection
      if (kycData) {
        parts.push(String(kycData.activeCount));
        parts.push(String(kycData.totalKYC));
        
        const diff = kycData.totalKYC - p.totalManpower;
        const activeDiff = kycData.activeCount - p.totalManpower;
        const diffText = diff > 0 
          ? `+${diff} (Total KYC exceeds Manpower - includes ${diff} rejected/left employees)` 
          : diff < 0 
          ? `${diff} (ERROR: KYC count is LESS than Manpower - missing ${Math.abs(diff)} employees)` 
          : "✓ Match";
        parts.push(diffText);
        
        // Issue Detection
        const issues: string[] = [];
        let issueStatus = "✓ OK";
        
        // Check manpower vs KYC mismatch
        if (diff > 0) {
          issues.push(`WARNING: Total KYC (${kycData.totalKYC}) exceeds Manpower (${p.totalManpower}) by ${diff} - includes rejected/left employees`);
          issueStatus = "⚠ WARNING";
        } else if (diff < 0) {
          issues.push(`ERROR: Total KYC (${kycData.totalKYC}) is LESS than Manpower (${p.totalManpower}) by ${Math.abs(diff)} - missing employees`);
          issueStatus = "❌ ERROR";
        }
        
        if (activeDiff !== 0) {
          if (activeDiff > 0) {
            issues.push(`WARNING: Active KYC (${kycData.activeCount}) exceeds Manpower (${p.totalManpower}) by ${activeDiff}`);
            if (issueStatus === "✓ OK") issueStatus = "⚠ WARNING";
          } else {
            issues.push(`INFO: Active KYC (${kycData.activeCount}) is ${Math.abs(activeDiff)} less than Manpower (${p.totalManpower}) - may have rejected/left employees`);
          }
        }
        
        // Check designation mismatches
        const projectDesignations = new Set(Object.keys(p.designationWiseCount || {}));
        const kycDesignations = new Set(Object.keys(kycData.designationWiseKYC));
        const onlyInProject = Array.from(projectDesignations).filter(d => !kycDesignations.has(d));
        const onlyInKYC = Array.from(kycDesignations).filter(d => !projectDesignations.has(d));
        
        if (onlyInProject.length > 0) {
          issues.push(`WARNING: Designations in Project but NOT in KYC: ${onlyInProject.join(", ")}`);
          if (issueStatus === "✓ OK") issueStatus = "⚠ WARNING";
        }
        
        if (onlyInKYC.length > 0) {
          issues.push(`WARNING: Designations in KYC but NOT in Project: ${onlyInKYC.join(", ")}`);
          if (issueStatus === "✓ OK") issueStatus = "⚠ WARNING";
        }
        
        // Check designation count mismatches
        const allDesignations = new Set([...projectDesignations, ...kycDesignations]);
        allDesignations.forEach(designation => {
          const projectCount = p.designationWiseCount?.[designation] || 0;
          const kycTotal = kycData.designationWiseKYC[designation] || 0;
          
          if (projectCount > 0 && kycTotal > 0) {
            const countDiff = kycTotal - projectCount;
            if (countDiff > 0) {
              issues.push(`WARNING: ${designation} - Project has ${projectCount} but KYC has ${kycTotal} (${countDiff} extra)`);
              if (issueStatus === "✓ OK") issueStatus = "⚠ WARNING";
            } else if (countDiff < 0) {
              issues.push(`ERROR: ${designation} - Project has ${projectCount} but KYC has only ${kycTotal} (missing ${Math.abs(countDiff)})`);
              if (issueStatus !== "❌ ERROR") issueStatus = "❌ ERROR";
            }
          }
        });
        
        parts.push(issueStatus);
        parts.push(issues.length > 0 ? issues.join(" | ") : "No issues found");
        
        // Designation Mismatches
        const mismatchDetails: string[] = [];
        if (onlyInProject.length > 0) {
          mismatchDetails.push(`Project Only: ${onlyInProject.join(", ")}`);
        }
        if (onlyInKYC.length > 0) {
          mismatchDetails.push(`KYC Only: ${onlyInKYC.join(", ")}`);
        }
        parts.push(mismatchDetails.length > 0 ? mismatchDetails.join(" | ") : "✓ All designations match");
        
        // Detailed Designation Comparison
        const designationComparison = Array.from(allDesignations).map((designation) => {
          const projectCount = p.designationWiseCount?.[designation] || 0;
          const kycActive = kycData.designationWiseActive[designation] || 0;
          const kycTotal = kycData.designationWiseKYC[designation] || 0;
          const countDiff = kycTotal - projectCount;
          const status = countDiff === 0 ? "✓" : countDiff > 0 ? "⚠" : "❌";
          return `${status} ${designation}: Project=${projectCount} | Active KYC=${kycActive} | Total KYC=${kycTotal} | Diff=${countDiff > 0 ? `+${countDiff}` : countDiff}`;
        }).join(" || ");
        parts.push(designationComparison || "No designation data");
        
        // Project Designations not in KYC
        parts.push(onlyInProject.length > 0 ? onlyInProject.join(", ") : "None");
        
        // KYC Designations not in Project
        parts.push(onlyInKYC.length > 0 ? onlyInKYC.join(", ") : "None");
        
      } else {
        // No KYC data - show 0 counts
        parts.push("0"); // Active KYC Count
        parts.push("0"); // Total KYC Count
        const diff = 0 - p.totalManpower;
        const diffText = diff < 0 
          ? `${diff} (No KYC data - Manpower set to ${p.totalManpower} but no employees found in Employee Management)` 
          : "0 (No KYC data)";
        parts.push(diffText);
        parts.push("⚠ WARNING");
        parts.push(`WARNING: No KYC data found for this project in Employee Management. Manpower is set to ${p.totalManpower} but no employees are registered.`);
        parts.push("No KYC data - cannot compare designations");
        parts.push("No KYC data - cannot compare designations");
        parts.push(Object.keys(p.designationWiseCount || {}).length > 0 ? Object.keys(p.designationWiseCount || {}).join(", ") : "None");
        parts.push("None");
      }
      
      if (visibleCols.projectManager) parts.push(p.projectManager ?? "");
      if (visibleCols.status) parts.push(p.status ?? "");
      if (visibleCols.projectCost) parts.push(String(p.projectCost ?? ""));
      if (visibleCols.projectStartDate) parts.push(p.projectStartDate ? new Date(p.projectStartDate).toLocaleDateString() : "");
      if (visibleCols.projectEndDate) parts.push(p.projectEndDate ? new Date(p.projectEndDate).toLocaleDateString() : "");
      if (visibleCols.contractStartDate) parts.push(p.contractStartDate ? new Date(p.contractStartDate).toLocaleDateString() : "");
      if (visibleCols.contractEndDate) parts.push(p.contractEndDate ? new Date(p.contractEndDate).toLocaleDateString() : "");
      if (visibleCols.designationSalaries) parts.push(Object.entries(p.designationWiseSalary || {}).map(([d, s]) => `${d}:${s}`).join("; "));
      if (visibleCols.employeeSalaries) parts.push((p.employeeWiseSalary || []).map(e => `${e.employeeId}:${e.salary}@${e.effectiveFrom}`).join("; "));
      if (visibleCols.updatedAt) parts.push(p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "-");
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
      const res = await fetch(`https://cafm.zenapi.co.in/api/project/projects/${encodeURIComponent(project.projectName)}`, {
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
      const res = await fetch(`https://cafm.zenapi.co.in/api/project/projects/${encodeURIComponent(deleteProject.projectName)}`, {
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
                  onClick={exportExcelComparison}
                  className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-green-700 text-white border-green-900 hover:bg-green-800" : "bg-green-600 text-white border-green-200 hover:bg-green-700"}`}
                >
                  Export Excel Comparison
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
                <table className="min-w-[1400px] text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
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
                      {visibleCols.updatedAt && (
                        <th onClick={() => onSort("updatedAt")} className={`px-2 py-1 text-left font-semibold cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Last Updated {sortBy === "updatedAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
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
                      <tr 
                        key={project._id || project.projectName} 
                        className={`${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-50"} transition even:bg-gray-50 dark:even:bg-gray-900 relative`}
                      >
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
                        {visibleCols.updatedAt && (
                          <td className={`px-2 py-1 whitespace-nowrap border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '-'}
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