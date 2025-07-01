"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaUsers, FaChevronRight, FaCheckCircle, FaIdCard, FaTshirt, FaCalendarAlt, FaPlaneDeparture, FaMoneyBillWave, FaFileAlt } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

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
}

const workflowSteps: { key: WorkflowKey; label: string; icon: React.ReactNode }[] = [
  { key: "kyc", label: "KYC", icon: <FaFileAlt className="w-5 h-5" /> },
  { key: "idCard", label: "ID Card", icon: <FaIdCard className="w-5 h-5" /> },
  { key: "uniform", label: "Uniform", icon: <FaTshirt className="w-5 h-5" /> },
  { key: "attendance", label: "Attendance", icon: <FaCalendarAlt className="w-5 h-5" /> },
  { key: "leave", label: "Leave", icon: <FaPlaneDeparture className="w-5 h-5" /> },
  { key: "payslip", label: "Payslip", icon: <FaMoneyBillWave className="w-5 h-5" /> },
];

export default function EmployeeManagementPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithSummary | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowKey | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [projectOptions, setProjectOptions] = useState<string[]>(["All Projects"]);
  const pageSize = 6;

  useEffect(() => {
    setLoading(true);
    setError(null);
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
          };
        }).filter((emp: { employeeId: string }) => emp.employeeId);
        // Fetch summary for each employee
        const summaryPromises = baseEmployees.map(async (emp: BaseEmployee) => {
          try {
            const summaryRes = await fetch(`https://cafm.zenapi.co.in/api/employees/${emp.employeeId}/summary`);
            if (!summaryRes.ok) throw new Error();
            const summary: EmployeeSummary = await summaryRes.json();
            return {
              ...emp,
              workflow: {
                kyc: summary.kyc && summary.kyc.status === "Approved",
                idCard: summary.idCard && summary.idCard.status === "Issued",
                uniform: summary.uniform && Array.isArray(summary.uniform.items) && summary.uniform.items.length > 0,
                attendance: summary.attendance && Array.isArray(summary.attendance.recent) && summary.attendance.recent.length > 0,
                leave: summary.leave && Array.isArray(summary.leave.recent) && summary.leave.recent.length > 0,
                payslip: summary.payroll && Array.isArray(summary.payroll) && summary.payroll.length > 0,
              },
              summary,
              personalDetails: emp.personalDetails,
              projectName: emp.projectName,
            } as EmployeeWithSummary;
          } catch {
            return {
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
            } as EmployeeWithSummary;
          }
        });
        const employeesWithWorkflow: EmployeeWithSummary[] = await Promise.all(summaryPromises);
        setEmployees(employeesWithWorkflow);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
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
      return matchesSearch && matchesDesignation && matchesProject;
    });
  }, [search, employees, designationFilter, projectFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, employees]);

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
      className={`min-h-screen font-sans transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div
          className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r ${
            theme === "dark"
              ? "from-blue-900 to-blue-700"
              : "from-blue-500 to-blue-800"
          }`}
        >
          <div
            className={`rounded-xl p-4 flex items-center justify-center ${
              theme === "dark" ? "bg-blue-900 bg-opacity-40" : "bg-blue-600 bg-opacity-30"
            }`}
          >
            <FaUsers className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Employee Management</h1>
            <p className="text-white text-base opacity-90">Search and manage individual employee workflows.</p>
          </div>
        </div>
        {/* Search, Designation Filters */}
        <div className="flex flex-row flex-wrap gap-2 mb-6 items-center w-full">
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
                  const found = filteredEmployees.find(emp =>
                    emp.employeeId.toLowerCase() === search.toLowerCase() ||
                    emp.fullName.toLowerCase() === search.toLowerCase()
                  );
                  if (found) {
                    setSelectedEmployee(found);
                    const idx = filteredEmployees.findIndex(emp => emp.employeeId === found.employeeId);
                    setCurrentPage(Math.floor(idx / pageSize) + 1);
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
        </div>
        {/* Table */}
        <div className={`overflow-x-auto rounded-xl border shadow-xl ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
          {loading ? (
            <div className="py-12 text-center text-lg font-semibold">Loading employees...</div>
          ) : error ? (
            <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
          ) : (
            <>
            <table className="min-w-full divide-y">
              <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Employee ID</th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Name</th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Designation</th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Workflow</th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Action</th>
                </tr>
              </thead>
              <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No employees found</td>
                  </tr>
                ) : paginatedEmployees.map((emp, idx) => (
                  <tr key={idx} className={theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"}>
                    <td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{emp.employeeId}</td>
                    <td className="px-4 py-3">{emp.fullName}</td>
                    <td className="px-4 py-3">{emp.designation}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {workflowSteps.map((step, i) => (
                          <span key={step.key} className="flex items-center">
                            <button
                              type="button"
                              className={`rounded-full p-2 focus:outline-none cursor-pointer transition ring-0 ${emp.workflow[step.key]
                                ? theme === "dark"
                                  ? 'bg-green-900 text-green-300'
                                  : 'bg-green-100 text-green-700'
                                : theme === "dark"
                                  ? 'bg-gray-800 text-gray-500'
                                  : 'bg-gray-100 text-gray-400'
                              } hover:ring-2 hover:ring-blue-400 hover:bg-blue-100`}
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setSelectedStep(step.key);
                              }}
                              title={`View ${step.label} details`}
                              tabIndex={0}
                            >
                              {step.icon}
                            </button>
                            {i < workflowSteps.length - 1 && <FaChevronRight className={theme === "dark" ? "mx-1 text-gray-600" : "mx-1 text-gray-300"} />}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className={`px-4 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                      >
                        View Workflow
                      </button>
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
              <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Employee Workflow</h2>
              <div className="mb-4">
                <div className={`font-semibold text-lg ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>{selectedEmployee.fullName} <span className={theme === "dark" ? "text-gray-400 text-base" : "text-gray-500 text-base"}>({selectedEmployee.employeeId})</span></div>
                <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>{selectedEmployee.designation}</div>
              </div>
              <div className="flex flex-col gap-6">
                {workflowSteps.map((step,) => (
                  <div key={step.key} className="flex items-center gap-4">
                    <button
                      type="button"
                      className={`rounded-full p-2 focus:outline-none cursor-pointer transition ring-0 ${selectedEmployee.workflow[step.key]
                        ? theme === "dark"
                          ? 'bg-green-900 text-green-300'
                          : 'bg-green-100 text-green-700'
                        : theme === "dark"
                          ? 'bg-gray-800 text-gray-500'
                          : 'bg-gray-100 text-gray-400'
                      } hover:ring-2 hover:ring-blue-400 hover:bg-blue-100`}
                      onClick={() => {
                        setSelectedStep(step.key);
                      }}
                      title={`View ${step.label} details`}
                      tabIndex={0}
                    >
                      {step.icon}
                    </button>
                    <span className="font-medium text-lg w-32 select-none">{step.label}</span>
                    {selectedEmployee.workflow[step.key] ? (
                      <FaCheckCircle className="text-green-500 w-5 h-5" />
                    ) : (
                      <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>Pending</span>
                    )}
                  </div>
                ))}
              </div>
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