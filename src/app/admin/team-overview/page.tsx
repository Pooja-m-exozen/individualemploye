"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaCheckCircle, FaEye, FaSpinner } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import ViewKYCModal from '@/components/dashboard/ViewKYCModal';
import IDCardModal, { IDCardData } from '@/components/dashboard/IDCardModal';
import UniformModal from '@/components/dashboard/UniformModal';
import AttendanceModal from '@/components/dashboard/AttendanceModal';

// Define KYCData interface locally
interface KYCData {
  personalDetails: {
    employeeId: string;
    projectName: string;
    fullName: string;
    fathersName: string;
    mothersName: string;
    gender: string;
    dob: string;
    phoneNumber: string;
    designation: string;
    dateOfJoining: string;
    nationality: string;
    religion: string;
    maritalStatus: string;
    bloodGroup: string;
    uanNumber: string;
    esicNumber: string;
    experience: string;
    educationalQualification: string;
    languages: string[];
    employeeImage: string;
    email: string;
    workType: string;
  };
  addressDetails: {
    permanentAddress: {
      state: string;
      city: string;
      street: string;
      postalCode: string;
    };
    currentAddress: {
      state: string;
      city: string;
      street: string;
      postalCode: string;
    };
  };
  bankDetails: {
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
  };
  identificationDetails: {
    identificationType: string;
    identificationNumber: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
    aadhar: string;
  };
  documents: Array<{
    type: string;
    url: string;
    uploadedAt: string;
    _id: string;
  }>;
  status: string;
}

type WorkflowKey = 'kyc' | 'idCard' | 'uniform' | 'attendance' | 'leave' | 'payslip';

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  workflow: Record<WorkflowKey, boolean>;
}

// Extend KycForm and Employee types to include projectName and employeeImage
interface KycForm {
  personalDetails?: {
    employeeId?: string;
    empId?: string;
    fullName?: string;
    name?: string;
    designation?: string;
    projectName?: string;
    employeeImage?: string;
    // ...other fields
  };
  // ...other fields
}
interface KycDocument {
  url: string;
  type: string;
  uploadedAt: string;
}
interface KycSummary {
  status?: string;
  documents?: KycDocument[];
  projectName?: string;
}
interface IdCardSummary {
  status?: string;
  issuedDate?: string;
}
interface UniformItem {
  name?: string;
}
interface UniformSummary {
  items?: UniformItem[];
}
interface AttendanceRecordSummary {
  date: string;
  status: string;
  punchInTime?: string;
}
interface AttendanceSummary {
  recent?: AttendanceRecordSummary[];
}
interface LeaveRecordSummary {
  leaveType: string;
  status: string;
  startDate: string;
  endDate: string;
  reason?: string;
}
interface LeaveSummary {
  recent?: LeaveRecordSummary[];
}
interface PayrollSummary {
  month?: string;
}
interface EmployeeSummary {
  kyc?: KycSummary;
  idCard?: IdCardSummary;
  uniform?: UniformSummary;
  attendance?: AttendanceSummary;
  leave?: LeaveSummary;
  payroll?: PayrollSummary[];
}
interface EmployeeWithSummary extends Employee {
  summary: EmployeeSummary | null;
  projectName?: string;
  personalDetails?: {
    employeeImage?: string;
    projectName?: string;
    // ...other fields
  };
  kycForm?: KycForm; // Add this field
}

// Removed unused workflowSteps array

export default function EmployeeManagementPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithSummary | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowKey | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  
  // Cache for employee summaries to prevent re-fetching (using ref to avoid dependency issues)
  const summaryCacheRef = React.useRef(new Map<string, { data: EmployeeSummary; timestamp: number }>());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  // Excel-like full-screen grid (no pagination)
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [projectOptions, setProjectOptions] = useState<string[]>(["All Projects"]);
  // Excel-like header filters and selection
  const [empIdFilter, setEmpIdFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [sortBy, setSortBy] = useState<"employeeId" | "name" | "designation" | "project" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showColsMenu, setShowColsMenu] = useState(false);
  type VisibleCols = {
    rownum: boolean;
    photo: boolean;
    employeeId: boolean;
    name: boolean;
    designation: boolean;
    project: boolean;
    kyc: boolean;
    idCard: boolean;
    uniform: boolean;
    attendance: boolean;
    payslip: boolean;
  };
  const [visibleCols, setVisibleCols] = useState<VisibleCols>({
    rownum: true,
    photo: true,
    employeeId: true,
    name: true,
    designation: true,
    project: true,
    kyc: true,
    idCard: true,
    uniform: true,
    attendance: true,
    payslip: true,
  });
  // Track failed image URLs to show a placeholder instead of broken image
  const [brokenImgUrls, setBrokenImgUrls] = useState<Record<string, boolean>>({});
  // Track which employee row's workflow dropdown is open
  // Removed unused openWorkflow state
  const [kycModal, setKycModal] = useState<{ open: boolean, kycData: KYCData | null }>({ open: false, kycData: null });
  const [idCardModal, setIdCardModal] = useState<{ open: boolean, cardData: IDCardData | null }>({ open: false, cardData: null });
  const [uniformModal, setUniformModal] = useState<{ open: boolean, employeeId: string | null }>({ open: false, employeeId: null });
  const [attendanceModal, setAttendanceModal] = useState<{ open: boolean, employeeId: string | null, employeeName: string | null }>({ open: false, employeeId: null, employeeName: null });

  const placeholderSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop offset='0%' stop-color='%23cfe3ff'/>
        <stop offset='100%' stop-color='%2399c2ff'/>
      </linearGradient>
    </defs>
    <rect width='64' height='64' fill='url(%23g)'/>
    <circle cx='32' cy='24' r='12' fill='white' fill-opacity='0.9'/>
    <path d='M10 56c4-12 16-18 22-18s18 6 22 18' fill='white' fill-opacity='0.9'/>
  </svg>`;
  const PLACEHOLDER_DATA_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(placeholderSvg)}`;
  const resolveImg = (url?: string) => {
    if (!url) return "/placeholder-user.jpg";
    if (brokenImgUrls[url]) return "/placeholder-user.jpg";
    return url;
  };
  

  useEffect(() => {
    setLoading(true);
    setError(null);
    setLoadingProgress({ current: 0, total: 0 });
    
    fetch("https://cafm.zenapi.co.in/api/kyc")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch employees");
        const data = await res.json();
        const kycForms: KycForm[] = Array.isArray(data.kycForms) ? data.kycForms : [];
        // Collect unique project names
        const projects = Array.from(new Set(kycForms.map(f => f.personalDetails?.projectName).filter((p): p is string => Boolean(p))));
        setProjectOptions(["All Projects", ...projects]);
        // Prepare employee base info
        const baseEmployees: BaseEmployee[] = kycForms.map((form: KycForm) => {
          const pd = form.personalDetails || {};
          return {
            employeeId: pd.employeeId || pd.empId || "",
            fullName: pd.fullName || pd.name || "",
            designation: pd.designation || "",
            projectName: pd.projectName || "",
            personalDetails: pd, // for image
            kycForm: form, // store the full KYC form
          };
        }).filter((emp: { employeeId: string }) => emp.employeeId);
        
        // Set total for progress tracking
        setLoadingProgress({ current: 0, total: baseEmployees.length });
        
        // Show base employees immediately (without summaries)
        const baseEmployeesWithDefaults: EmployeeWithSummary[] = baseEmployees.map((emp) => ({
          ...emp,
          workflow: {
            kyc: false,
            idCard: false,
            uniform: false,
            attendance: false,
            leave: false,
            payslip: false,
          },
          summary: null,
          personalDetails: emp.personalDetails,
          projectName: emp.projectName,
        } as EmployeeWithSummary));
        setEmployees(baseEmployeesWithDefaults);
        
        // Fetch summaries in batches to avoid overwhelming the server
        const BATCH_SIZE = 10;
        const DELAY_BETWEEN_BATCHES = 50; // 50ms delay between batches
        
        for (let i = 0; i < baseEmployees.length; i += BATCH_SIZE) {
          const batch = baseEmployees.slice(i, i + BATCH_SIZE);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (emp: BaseEmployee) => {
            // Check cache first
            const cached = summaryCacheRef.current.get(emp.employeeId);
            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
              return { emp, summary: cached.data };
            }
            
            try {
              const summaryRes = await fetch(`https://cafm.zenapi.co.in/api/employees/${emp.employeeId}/summary`);
              if (!summaryRes.ok) throw new Error();
              const summary: EmployeeSummary = await summaryRes.json();
              // Cache successful responses
              summaryCacheRef.current.set(emp.employeeId, { data: summary, timestamp: Date.now() });
              return { emp, summary };
            } catch {
              return { emp, summary: null };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          // Update employees progressively as batches complete
          setEmployees((prev) => {
            const updated = [...prev];
            batchResults.forEach(({ emp, summary }) => {
              const index = updated.findIndex((e) => e.employeeId === emp.employeeId);
              if (index !== -1) {
                updated[index] = {
                  ...updated[index],
                  workflow: {
                    kyc: summary && summary.kyc && summary.kyc.status === "Approved",
                    idCard: summary && summary.idCard && summary.idCard.status === "Issued",
                    uniform: summary && summary.uniform && Array.isArray(summary.uniform.items) && summary.uniform.items.length > 0,
                    attendance: summary && summary.attendance && Array.isArray(summary.attendance.recent) && summary.attendance.recent.length > 0,
                    leave: summary && summary.leave && Array.isArray(summary.leave.recent) && summary.leave.recent.length > 0,
                    payslip: summary && summary.payroll && Array.isArray(summary.payroll) && summary.payroll.length > 0,
                  },
                  summary,
                } as EmployeeWithSummary;
              }
            });
            return updated;
          });
          
          // Update progress
          setLoadingProgress({ current: Math.min(i + BATCH_SIZE, baseEmployees.length), total: baseEmployees.length });
          
          // Add delay between batches to avoid overwhelming the server
          if (i + BATCH_SIZE < baseEmployees.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          }
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setLoadingProgress({ current: 0, total: 0 });
      });
  }, []);

  // Get unique designations for dropdowns
  const designationOptions = useMemo(() => [
    "All Designations",
    ...Array.from(new Set(employees.map(e => e.designation).filter(Boolean)))
  ], [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: EmployeeWithSummary) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(search.toLowerCase());
      const matchesDesignation =
        designationFilter === "All Designations" ||
        emp.designation === designationFilter;
      const matchesProject =
        projectFilter === "All Projects" ||
        emp.projectName === projectFilter;
      const matchesHeaderEmpId = empIdFilter === "" || emp.employeeId.toLowerCase().includes(empIdFilter.toLowerCase());
      const matchesHeaderName = nameFilter === "" || emp.fullName.toLowerCase().includes(nameFilter.toLowerCase());
      return matchesSearch && matchesDesignation && matchesProject && matchesHeaderEmpId && matchesHeaderName;
    });
  }, [search, employees, designationFilter, projectFilter, empIdFilter, nameFilter]);

  const sortedEmployees = useMemo(() => {
    const items = [...filteredEmployees];
    if (!sortBy) return items;
    const dir = sortDir === "asc" ? 1 : -1;
    items.sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (sortBy === "employeeId") {
        aVal = a.employeeId || "";
        bVal = b.employeeId || "";
      } else if (sortBy === "name") {
        aVal = a.fullName || "";
        bVal = b.fullName || "";
      } else if (sortBy === "designation") {
        aVal = a.designation || "";
        bVal = b.designation || "";
      } else if (sortBy === "project") {
        aVal = a.projectName || "";
        bVal = b.projectName || "";
      }
      return aVal.localeCompare(bVal, undefined, { sensitivity: 'base' }) * dir;
    });
    return items;
  }, [filteredEmployees, sortBy, sortDir]);

  const onSort = (key: "employeeId" | "name" | "designation" | "project") => {
    if (sortBy === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const toggleColumn = (key: keyof VisibleCols) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportCsv = () => {
    const header: string[] = [];
    if (visibleCols.rownum) header.push("#");
    if (visibleCols.photo) header.push("Photo");
    if (visibleCols.employeeId) header.push("Employee ID");
    if (visibleCols.name) header.push("Name");
    if (visibleCols.designation) header.push("Designation");
    if (visibleCols.project) header.push("Project");
    const rows = sortedEmployees.map((emp, idx) => {
      const parts: string[] = [];
      if (visibleCols.rownum) parts.push(String(idx + 1));
      if (visibleCols.photo) parts.push("");
      if (visibleCols.employeeId) parts.push(emp.employeeId || "");
      if (visibleCols.name) parts.push(emp.fullName || "");
      if (visibleCols.designation) parts.push(emp.designation || "");
      if (visibleCols.project) parts.push(emp.projectName || "");
      return parts.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "employees.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Dummy data for each step
  const getStepDetails = (step: WorkflowKey, emp: EmployeeWithSummary) => {
    const summary = emp.summary || {};
    // Get image, name, employeeId, designation, projectName
    const empName = emp.fullName;
    const empId = emp.employeeId;
    const empDesignation = emp.designation;
    const projectName = emp.projectName || summary.kyc?.projectName;
    // Always use profile image from personalDetails for KYC
    let empImageUrl = emp.personalDetails?.employeeImage;
    // fallback for idCard/uniform if not present
    if (!empImageUrl && summary.kyc?.documents && summary.kyc.documents.length > 0) {
      const imgDoc = summary.kyc.documents.find((doc: KycDocument) => doc.type.toLowerCase().includes("image") || doc.url.match(/\.(jpg|jpeg|png|gif)$/i));
      if (imgDoc) empImageUrl = imgDoc.url;
    }
    if (!empImageUrl && summary.kyc && (summary.kyc as KycSummary & { personalDetails?: { employeeImage?: string } }).personalDetails?.employeeImage) {
      empImageUrl = (summary.kyc as KycSummary & { personalDetails?: { employeeImage?: string } }).personalDetails?.employeeImage;
    }
    if (!empImageUrl && (emp as EmployeeWithSummary).personalDetails?.employeeImage) {
      empImageUrl = (emp as EmployeeWithSummary).personalDetails?.employeeImage;
    }
    // fallback: use empImageUrl from KYC summary or emp object
    switch (step) {
      case "kyc": {
        const kycStatus = summary.kyc?.status || "Pending";
        const isKycApproved = kycStatus === "Approved";
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">KYC Details</h3>
            <div className="flex items-center gap-4 mb-4">
              {empImageUrl && (
                <Image src={empImageUrl} alt="Employee" width={80} height={80} className="w-20 h-20 rounded-full object-cover border border-gray-300" />
              )}
              <div>
                <div className="font-semibold text-lg">{empName}</div>
                <div className="text-gray-500 text-sm">Employee ID: {empId}</div>
                <div className="text-gray-500 text-sm">Designation: {empDesignation}</div>
                {projectName && <div className="text-gray-500 text-sm">Project: {projectName}</div>}
              </div>
            </div>
            <p className={`flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
              KYC status: {isKycApproved ? (
                <span className={`flex items-center gap-1 font-semibold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                  <FaCheckCircle className={`inline-block ${theme === "dark" ? "text-green-300" : "text-green-500"}`} /> Approved
                </span>
              ) : (
                <span className={`${kycStatus === "Pending" ? (theme === "dark" ? "text-yellow-400" : "text-yellow-600") : (theme === "dark" ? "text-red-400" : "text-red-600") } font-medium`}>{kycStatus}</span>
              )}
            </p>
            {summary.kyc?.documents && summary.kyc.documents.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Documents:</div>
                <ul className="list-disc ml-6">
                  {summary.kyc.documents.map((doc: KycDocument, i: number) => (
                    <li key={i} className="mb-1">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{doc.type}</a> <span className="text-xs text-gray-500">({new Date(doc.uploadedAt).toLocaleDateString()})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
      case "idCard": {
        const idStatus = summary.idCard?.status || "Pending";
        const statusColor = idStatus === "Issued" ? (theme === "dark" ? "text-green-400" : "text-green-600") : idStatus === "Pending" ? (theme === "dark" ? "text-yellow-400" : "text-yellow-600") : (theme === "dark" ? "text-red-400" : "text-red-600");
  return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">ID Card</h3>
            <div className="flex items-center gap-4 mb-4">
              {empImageUrl && (
                <Image src={empImageUrl} alt="Employee" width={80} height={80} className="w-20 h-20 rounded-full object-cover border border-gray-300" />
              )}
              <div>
                <div className="font-semibold text-lg">{empName}</div>
                <div className="text-gray-500 text-sm">Employee ID: {empId}</div>
                <div className="text-gray-500 text-sm">Designation: {empDesignation}</div>
                {projectName && <div className="text-gray-500 text-sm">Project: {projectName}</div>}
              </div>
            </div>
            <p className={`flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
              ID Card status: <span className={`font-semibold ${statusColor}`}>{idStatus}</span>
            </p>
            {summary.idCard?.issuedDate && <p className="text-gray-500 text-sm mt-2">Issued on: {new Date(summary.idCard.issuedDate).toLocaleDateString()}</p>}
          </div>
        );
      }
      case "uniform": {
        const issued = summary.uniform && summary.uniform.items && summary.uniform.items.length > 0;
        const statusColor = issued ? (theme === "dark" ? "text-green-400" : "text-green-600") : (theme === "dark" ? "text-red-400" : "text-red-600");
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Uniform</h3>
            <div className="flex items-center gap-4 mb-4">
              {empImageUrl && (
                <Image src={empImageUrl} alt="Employee" width={80} height={80} className="w-20 h-20 rounded-full object-cover border border-gray-300" />
              )}
            <div>
                <div className="font-semibold text-lg">{empName}</div>
                <div className="text-gray-500 text-sm">Employee ID: {empId}</div>
                <div className="text-gray-500 text-sm">Designation: {empDesignation}</div>
                {projectName && <div className="text-gray-500 text-sm">Project: {projectName}</div>}
              </div>
            </div>
            <p className={`flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
              Uniform status: <span className={`font-semibold ${statusColor}`}>{issued ? "Issued" : "Not Issued"}</span>
            </p>
            {summary.uniform?.items && summary.uniform.items.length > 0 && (
              <ul className="list-disc ml-6 mt-2">
                {summary.uniform.items.map((item: UniformItem, i: number) => (
                  <li key={i}>{item.name || "Uniform Item"}</li>
                ))}
              </ul>
            )}
          </div>
        );
      }
      case "attendance":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Attendance</h3>
            <p className="text-gray-700">Attendance status: {summary.attendance?.recent && summary.attendance.recent.length > 0 ? "Active" : "Inactive"}</p>
            {summary.attendance?.recent && summary.attendance.recent.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Recent Attendance:</div>
                <ul className="list-disc ml-6">
                  {summary.attendance.recent.slice(0, 5).map((att: AttendanceRecordSummary, i: number) => (
                    <li key={i}>
                      {att.date}: {att.status} {att.punchInTime && (<span className="text-xs text-gray-500">(In: {new Date(att.punchInTime).toLocaleTimeString()})</span>)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case "leave":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Leave</h3>
            <p className="text-gray-700">Leave status: {summary.leave?.recent && summary.leave.recent.length > 0 ? "Available" : "Not Available"}</p>
            {summary.leave?.recent && summary.leave.recent.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Recent Leaves:</div>
                <ul className="list-disc ml-6">
                  {summary.leave.recent.slice(0, 5).map((lv: LeaveRecordSummary, i: number) => (
                    <li key={i}>
                      {lv.leaveType} ({lv.status}): {lv.startDate} to {lv.endDate} <span className="text-xs text-gray-500">{lv.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case "payslip":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Payslip</h3>
            <p className="text-gray-700">Payslip status: {summary.payroll && summary.payroll.length > 0 ? "Available" : "Not Available"}</p>
            {summary.payroll && summary.payroll.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Payslip(s):</div>
                <ul className="list-disc ml-6">
                  {summary.payroll.slice(0, 5).map((pay: PayrollSummary, i: number) => (
                    <li key={i}>{pay.month || "Payslip"}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}
    >
      <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
        {/* Header removed */}
        {/* Search, Designation Filters */}
        <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Project Dropdown */}
          <div className="flex-1 min-w-[180px] max-w-xs">
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
            {/* Search Bar */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
              placeholder="Search employee name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const found = sortedEmployees.find(emp =>
                    emp.employeeId.toLowerCase() === search.toLowerCase() ||
                    emp.fullName.toLowerCase() === search.toLowerCase()
                  );
                  if (found) {
                    setSelectedEmployee(found);
                    document.getElementById(`emp-${found.employeeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                theme === "dark"
                  ? "bg-gray-800 border-blue-900 text-white"
                  : "bg-white border-gray-200 text-black"
              }`}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowColsMenu(p => !p)}
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'bg-white border-blue-200 text-blue-700'}`}
              >
                Columns
              </button>
              {showColsMenu && (
                <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg p-3 border z-40 ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'bg-white border-blue-200 text-black'}`}>
                  {(Object.keys(visibleCols) as Array<keyof VisibleCols>).map((key) => (
                    <label key={String(key)} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                      <input type="checkbox" checked={visibleCols[key]} onChange={() => toggleColumn(key)} />
                      <span className="capitalize">{String(key)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={exportCsv}
              className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-gray-800 border-blue-900 text-white' : 'bg-white border-blue-200 text-blue-700'}`}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl min-w-[300px]">
            <FaSpinner className="animate-spin text-4xl text-blue-600 dark:text-blue-400" />
            <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Loading employees...
            </p>
            {loadingProgress.total > 0 && (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  />
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {loadingProgress.current} of {loadingProgress.total} employees loaded
                </p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Table - Excel-like compact grid full screen */}
      <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
        <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {error ? (
            <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
          ) : (
            <>
                      <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                        <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                          <tr>
                  {visibleCols.rownum && (<th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>)}
                  {visibleCols.photo && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-16 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Photo</th>)}
                  {visibleCols.employeeId && (<th onClick={() => onSort('employeeId')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee ID {sortBy === 'employeeId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                  {visibleCols.name && (<th onClick={() => onSort('name')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                  {visibleCols.designation && (<th onClick={() => onSort('designation')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation {sortBy === 'designation' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                  {visibleCols.project && (<th onClick={() => onSort('project')} className={`px-2 py-2 text-left font-bold uppercase cursor-pointer select-none whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project {sortBy === 'project' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>)}
                  {visibleCols.kyc && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>KYC</th>)}
                  {visibleCols.idCard && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>ID Card</th>)}
                  {visibleCols.uniform && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Uniform</th>)}
                  {visibleCols.attendance && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Attendance</th>)}
                  {visibleCols.payslip && (<th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Payslip</th>)}
                </tr>
                {/* Inline header filters */}
                <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                  {visibleCols.rownum && (<th className={`px-2 py-1 sticky left-0 z-20 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>)}
                  {visibleCols.photo && (<th className={`px-2 py-1 w-16 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>)}
                  {visibleCols.employeeId && (
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input
                        value={empIdFilter}
                        onChange={e => setEmpIdFilter(e.target.value)}
                        placeholder="Filter ID"
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                    </th>
                  )}
                  {visibleCols.name && (
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <input
                        value={nameFilter}
                        onChange={e => setNameFilter(e.target.value)}
                        placeholder="Filter name"
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                    </th>
                  )}
                  {visibleCols.designation && (
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select
                        value={designationFilter}
                        onChange={e => setDesignationFilter(e.target.value)}
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        {designationOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </th>
                  )}
                  {visibleCols.project && (
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                      <select
                        value={projectFilter}
                        onChange={e => setProjectFilter(e.target.value)}
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="All Projects">All Projects</option>
                        {projectOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </th>
                  )}
                  {visibleCols.kyc && (<th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>)}
                  {visibleCols.idCard && (<th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>)}
                  {visibleCols.uniform && (<th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>)}
                  {visibleCols.attendance && (<th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>)}
                  {visibleCols.payslip && (<th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>)}
                          </tr>
                        </thead>
              <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                {sortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`px-4 py-12 text-center border ${theme === "dark" ? "text-gray-400 border-blue-800" : "text-gray-500 border-blue-200"}`}>No employees found</td>
                  </tr>
                ) : sortedEmployees.map((emp, idx) => (
                  <tr key={emp.employeeId} id={`emp-${emp.employeeId}`} className={`${theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"} even:bg-gray-50 dark:even:bg-gray-900`}>
                    {visibleCols.rownum && (<td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>)}
                    {visibleCols.photo && (
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                                    <Image
                          src={brokenImgUrls[emp.personalDetails?.employeeImage || ""] ? PLACEHOLDER_DATA_URL : resolveImg(emp.personalDetails?.employeeImage)}
                          alt={emp.fullName}
                                      width={32}
                                      height={32}
                          className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement & { src: string };
                            const failedUrl = emp.personalDetails?.employeeImage;
                            if (failedUrl) {
                              setBrokenImgUrls(prev => ({ ...prev, [failedUrl]: true }));
                            }
                            target.src = PLACEHOLDER_DATA_URL;
                          }}
                        />
                      </td>
                    )}
                    {visibleCols.employeeId && (<td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>{emp.employeeId}</td>)}
                    {visibleCols.name && (
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={emp.fullName}>{emp.fullName}</div></td>
                    )}
                    {visibleCols.designation && (
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}><div className="truncate" title={emp.designation}>{emp.designation}</div></td>
                    )}
                    {visibleCols.project && (
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={emp.projectName}>{emp.projectName}</div></td>
                    )}
                    {visibleCols.kyc && (
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <button className="px-3 py-1 rounded font-semibold shadow text-gray-700 hover:bg-gray-100" onClick={() => setKycModal({ open: true, kycData: emp.kycForm ? (emp.kycForm as unknown as KYCData) : null })}>
                          <FaEye />
                        </button>
                              </td>
                    )}
                    {visibleCols.idCard && (
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <button className="px-3 py-1 rounded font-semibold shadow text-gray-700 hover:bg-gray-100" onClick={() => {
                          const bloodGroup = (emp.personalDetails as Record<string, unknown>)?.bloodGroup as string || '';
                          let employeeImage = (emp.personalDetails as Record<string, unknown>)?.employeeImage as string;
                          if (!employeeImage) employeeImage = '/placeholder-user.jpg';
                          setIdCardModal({
                            open: true,
                            cardData: {
                              fullName: emp.fullName || '',
                              employeeId: emp.employeeId || '',
                              designation: emp.designation || '',
                              projectName: emp.projectName || '',
                              bloodGroup,
                              employeeImage,
                              qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(emp.employeeId || '')}`,
                              validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
                            }
                          });
                        }}>
                          <FaEye />
                        </button>
                              </td>
                    )}
                    {visibleCols.uniform && (
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <button className="px-3 py-1 rounded font-semibold shadow text-gray-700 hover:bg-gray-100" onClick={() => setUniformModal({ open: true, employeeId: emp.employeeId })}>
                          <FaEye />
                        </button>
                              </td>
                    )}
                    {visibleCols.attendance && (
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <button className="px-3 py-1 rounded font-semibold shadow text-gray-700 hover:bg-gray-100" onClick={() => setAttendanceModal({ open: true, employeeId: emp.employeeId, employeeName: emp.fullName })}>
                          <FaEye />
                        </button>
                              </td>
                    )}
                    {visibleCols.payslip && (
                      <td className={`px-2 py-1 text-center border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <button className="px-3 py-1 rounded font-semibold shadow text-gray-700 hover:bg-gray-100" onClick={() => alert('View Payslip')}>
                          <FaEye />
                                </button>
                              </td>
                    )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
            </>
          )}
        </div>
        {/* Workflow Modal */}
        {selectedEmployee && !selectedStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`rounded-2xl shadow-xl p-8 w-full max-w-xl relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Employee Details</h2>
              <div className="mb-4">
                <div className={`font-semibold text-lg ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>{selectedEmployee.fullName} <span className={theme === "dark" ? "text-gray-400 text-base" : "text-gray-500 text-base"}>({selectedEmployee.employeeId})</span></div>
                <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>{selectedEmployee.designation}</div>
                {selectedEmployee.summary?.kyc?.projectName && (
                  <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>Project: {selectedEmployee.summary.kyc.projectName}</div>
                )}
                    </div>
              {getStepDetails("kyc", selectedEmployee)}
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  Close
                </button>
                  </div>
                </div>
              </div>
            )}
        {/* Step Details Modal */}
        {selectedStep && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`rounded-2xl shadow-xl p-8 w-full max-w-md relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}>
              <button 
                className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                onClick={() => {
                  setSelectedStep(null);
                  setSelectedEmployee(null); // Ensure both are cleared so table is shown
                }}
                aria-label="Close"
              >
                &times;
              </button>
              {/* Basic Info at top of step details modal */}
              <div className="mb-4">
                <div className={`font-semibold text-lg ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>{selectedEmployee.fullName} <span className={theme === "dark" ? "text-gray-400 text-base" : "text-gray-500 text-base"}>({selectedEmployee.employeeId})</span></div>
                <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>{selectedEmployee.designation}</div>
                {selectedEmployee.summary?.kyc?.projectName && (
                  <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>Project: {selectedEmployee.summary.kyc.projectName}</div>
                    )}
                  </div>
              {getStepDetails(selectedStep, selectedEmployee)}
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => {
                    setSelectedStep(null);
                    setSelectedEmployee(null); // Ensure both are cleared so table is shown
                  }}
                  className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* KYC Full Details Modal */}
      {kycModal.open && kycModal.kycData && (
        <ViewKYCModal open={kycModal.open} onClose={() => setKycModal({ open: false, kycData: null })} kycData={kycModal.kycData} />
      )}
      {/* ID Card Modal */}
      {idCardModal.open && idCardModal.cardData && (
        <IDCardModal isOpen={idCardModal.open} onClose={() => setIdCardModal({ open: false, cardData: null })} cardData={idCardModal.cardData} theme={theme} />
      )}
      {/* Uniform Modal */}
      {uniformModal.open && uniformModal.employeeId && (
        <UniformModal isOpen={uniformModal.open} onClose={() => setUniformModal({ open: false, employeeId: null })} employeeId={uniformModal.employeeId} theme={theme} />
      )}
      {/* Attendance Modal */}
      {attendanceModal.open && attendanceModal.employeeId && attendanceModal.employeeName && (
        <AttendanceModal 
          isOpen={attendanceModal.open} 
          onClose={() => setAttendanceModal({ open: false, employeeId: null, employeeName: null })} 
          employeeId={attendanceModal.employeeId} 
          employeeName={attendanceModal.employeeName}
          theme={theme} 
        />
      )}
    </div>
  );
}

// Add this interface above EmployeeWithSummary
type BaseEmployee = {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName?: string;
  personalDetails?: {
    employeeImage?: string;
    projectName?: string;
    // ...other fields
  };
};