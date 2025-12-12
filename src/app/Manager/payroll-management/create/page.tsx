"use client";

import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import {
  FaMoneyBillWave,
  FaUser,
  FaBuilding,
  FaBriefcase,
  FaCheckCircle,
  FaArrowLeft,
  FaInfoCircle,
  FaPlus,
  FaExclamationCircle,
  FaFileInvoiceDollar,
  FaEye,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { createPayroll } from "@/services/payroll";
import { getAllKYCRecords } from "@/services/kyc";
import { KYCRecord } from "@/types/kyc";

interface Employee {
  employeeId: string;
  fullName: string;
  projectName: string;
  designation: string;
  employeeImage: string;
  hasPayroll: boolean;
}

const steps = [
  { id: 1, title: "Select Employee" },
  { id: 2, title: "Payroll Details" },
  { id: 3, title: "Confirmation" },
];

const guidelines = [
  "Select an employee to create payroll.",
  "If payroll/HR details are missing, add them before proceeding.",
  "Ensure all details are correct before submission.",
  "Review and confirm payroll before finishing.",
];

const monthOptions = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PayrollCreatePage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showCreateDetails, setShowCreateDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payrollForm, setPayrollForm] = useState({ month: "", year: "", amount: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [payableDays, setPayableDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>([]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ employeeId: string; fullName: string }[]>([]);

  React.useEffect(() => {
    getAllKYCRecords().then((res) => {
      setKycRecords(res.kycForms || []);
      const projects = Array.from(
        new Set((res.kycForms || []).map((k) => k.personalDetails.projectName).filter(Boolean))
      );
      setProjectOptions(projects);
      const designations = Array.from(
        new Set((res.kycForms || []).map((k) => k.personalDetails.designation).filter(Boolean))
      );
      setDesignationOptions(designations);
      const employees = (res.kycForms || []).map((k) => ({
        employeeId: k.personalDetails.employeeId,
        fullName: k.personalDetails.fullName,
      }));
      const seen = new Set();
      const uniqueEmployees = employees.filter((e) => {
        if (!e.employeeId || seen.has(e.employeeId)) return false;
        seen.add(e.employeeId);
        return true;
      });
      setEmployeeOptions(uniqueEmployees);
    });
  }, []);

  const filteredKycEmployees = kycRecords.filter((k) =>
    (projectFilter ? k.personalDetails.projectName === projectFilter : true) &&
    (designationFilter ? k.personalDetails.designation === designationFilter : true) &&
    (employeeFilter ? k.personalDetails.employeeId === employeeFilter : true) &&
    (k.personalDetails.fullName.toLowerCase().includes(search.toLowerCase()) ||
      k.personalDetails.employeeId.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    if (emp.hasPayroll) {
      setPayrollForm((f) => ({ ...f, month: monthFilter || f.month }));
      setActiveStep(2);
    } else {
      setShowCreateDetails(true);
    }
  };

  const handleCreateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setShowCreateDetails(false);
    setActiveStep(2);
    setError(null);
    setSuccess("Payroll/HR details created. You can now create payroll.");
  };

  const handlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setConfirmed(false);
    if (!selectedEmployee) {
      setError("No employee selected.");
      setLoading(false);
      return;
    }
    try {
      const monthIndex = monthOptions.findIndex((m) => m === payrollForm.month) + 1;
      const monthStr = monthIndex < 10 ? `0${monthIndex}` : `${monthIndex}`;
      const monthValue = payrollForm.year && payrollForm.month ? `${payrollForm.year}-${monthStr}` : "";
      const payload = {
        employeeId: selectedEmployee.employeeId,
        month: monthValue,
        year: payrollForm.year,
        amount: Number(payrollForm.amount),
        payableDays: payableDays || 0,
        status: "Pending",
      };
      await createPayroll(payload);
      setActiveStep(3);
      setSuccess("Payroll record created successfully.");
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response === "object" &&
        (err as { response?: { data?: { message?: string } } }).response !== null &&
        "data" in ((err as { response?: { data?: { message?: string } } }).response ?? {})
      ) {
        setError(
          ((err as { response?: { data?: { message?: string } } }).response?.data?.message) ||
            "Failed to create payroll record."
        );
      } else {
        setError("Failed to create payroll record.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setSuccess("Payroll created and confirmed successfully!");
    setConfirmed(true);
  };

  const handleViewPayroll = () => {
    router.push("/Manager/payroll-management/view");
  };

  const handleCreateAnother = () => {
    setActiveStep(1);
    setSelectedEmployee(null);
    setPayrollForm({ month: "", year: "", amount: "" });
    setSuccess(null);
    setConfirmed(false);
    setPayableDays(0);
  };

  return (
    <ManagerDashboardLayout>
      <div
        className={`min-h-screen transition-colors duration-300 ${theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
          }`}
      >
        <div className="max-w-7xl mx-auto">
          <table
            className={`w-full text-sm min-w-[1200px] table-fixed ${theme === "dark"
              ? "bg-gray-900"
              : "bg-white"
              }`}
          >
            <thead
              className={theme === "dark" ? "bg-gray-800" : "bg-blue-50"}
            >
              <tr>
                <th
                  className={`px-3 py-2 text-left font-semibold ${theme === "dark"
                    ? "text-gray-200"
                    : "text-blue-700"
                    } w-1/6`}
                >
                  Section
                </th>
                <th
                  className={`px-3 py-2 text-left font-semibold ${theme === "dark"
                    ? "text-gray-200"
                    : "text-blue-700"
                    } w-5/6`}
                >
                  Content
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Header Section */}
              <tr className={theme === "dark" ? "bg-gray-900" : "bg-white"}>
                <td className="px-3 py-2 w-1/6" rowSpan={2}>
                  <div
                    className={`p-2 ${theme === "dark" ? "bg-gray-800" : "bg-blue-50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className="w-5 h-5" />
                      <span
                        className={theme === "dark" ? "text-gray-200" : "text-blue-700"}
                      >
                        Payroll Creation
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 w-5/6">
                  <div
                    className={`rounded-b-2xl shadow p-6 bg-gradient-to-r ${theme === "dark"
                      ? "from-blue-900 to-blue-700"
                      : "from-blue-600 to-blue-400"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl ${theme === "dark"
                          ? "bg-white/10 backdrop-blur-sm"
                          : "bg-white/20 backdrop-blur-sm"
                          }`}
                      >
                        <FaMoneyBillWave className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-white">
                          Payroll Creation
                        </h1>
                        <p
                          className={
                            theme === "dark" ? "text-blue-200" : "text-blue-100"
                          }
                        >
                          Create and manage employee payrolls
                        </p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Stepper Section */}
              <tr className={theme === "dark" ? "bg-gray-900" : "bg-white"}>
                <td className="px-3 py-2 w-5/6">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl shadow-sm overflow-hidden mb-6 border transition-colors duration-300 ${theme === "dark"
                      ? "bg-gray-900 border-gray-800"
                      : "bg-white border-gray-200"
                      }`}
                  >
                    <div className="flex justify-between items-center w-full px-6 pt-6">
                      {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center relative">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold transition-colors duration-300 ${activeStep > step.id
                                ? "bg-green-500"
                                : activeStep === step.id
                                  ? theme === "dark"
                                    ? "bg-blue-800"
                                    : "bg-blue-600"
                                  : theme === "dark"
                                    ? "bg-gray-800"
                                    : "bg-gray-200"
                                }`}
                            >
                              {activeStep > step.id ? (
                                <FaCheckCircle className="w-5 h-5" />
                              ) : (
                                step.id
                              )}
                            </div>
                            <p
                              className={`text-sm font-medium mt-3 ${activeStep > step.id
                                ? "text-green-500"
                                : activeStep === step.id
                                  ? theme === "dark"
                                    ? "text-blue-300"
                                    : "text-blue-600"
                                  : theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                }`}
                            >
                              {step.title}
                            </p>
                          </div>
                          {idx !== steps.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 mx-4 ${activeStep > step.id
                                ? "bg-green-500"
                                : theme === "dark"
                                  ? "bg-gray-800"
                                  : "bg-gray-200"
                                }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </td>
              </tr>

              {/* Guidelines Section */}
              <tr className={theme === "dark" ? "bg-gray-900" : "bg-white"}>
                <td className="px-3 py-2 w-5/6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`rounded-xl p-6 sticky top-8 border transition-colors duration-300 ${theme === "dark"
                      ? "bg-gray-900 border-gray-800"
                      : "bg-white border-gray-200"
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`p-2 rounded-lg ${theme === "dark"
                          ? "bg-blue-900 text-blue-200"
                          : "bg-blue-50 text-blue-600"
                          }`}
                      >
                        <FaInfoCircle className="w-5 h-5" />
                      </div>
                      <h2
                        className={`text-lg font-semibold ${theme === "dark"
                          ? "text-gray-100"
                          : "text-gray-900"
                          }`}
                      >
                        Guidelines
                      </h2>
                    </div>
                    <ul className="space-y-4">
                      {guidelines.map((g, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span
                            className={`p-2 rounded-lg ${theme === "dark"
                              ? "bg-green-900 text-green-200"
                              : "bg-green-50 text-green-600"
                              }`}
                          >
                            <FaCheckCircle className="w-4 h-4" />
                          </span>
                          <span
                            className={`text-sm leading-relaxed ${theme === "dark"
                              ? "text-gray-300"
                              : "text-gray-700"
                              }`}
                          >
                            {g}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div
                      className={`mt-8 p-4 rounded-xl border transition-colors duration-300 ${theme === "dark"
                        ? "bg-blue-900 border-blue-800 text-blue-200"
                        : "bg-blue-50 border-blue-100 text-blue-700"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FaMoneyBillWave className="w-4 h-4" />
                        <span className="font-semibold">Need Help?</span>
                      </div>
                      <p className="text-sm">
                        Contact{" "}
                        <span className="font-medium">payroll@zenployee.com</span>
                        for support.
                      </p>
                    </div>
                  </motion.div>
                </td>
              </tr>

              {/* Main Content Section */}
              <tr className={theme === "dark" ? "bg-gray-900" : "bg-white"}>
                <td className="px-3 py-2 w-5/6">
                  <div className="lg:col-span-8 space-y-6">
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`flex items-center gap-4 p-6 rounded-xl border transition-colors duration-300 ${theme === "dark"
                            ? "text-red-300 bg-red-950 border-red-900"
                            : "text-red-600 bg-red-50 border-red-100"
                            }`}
                        >
                          <div
                            className={`p-3 rounded-xl ${theme === "dark"
                              ? "bg-red-900"
                              : "bg-red-100"
                              }`}
                          >
                            <FaExclamationCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">Error</h3>
                            <p className="text-sm">{error}</p>
                          </div>
                        </motion.div>
                      )}
                      {success && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`flex items-center gap-4 p-6 rounded-xl border transition-colors duration-300 ${theme === "dark"
                            ? "text-green-300 bg-green-950 border-green-900"
                            : "text-green-600 bg-green-50 border-green-100"
                            }`}
                        >
                          <div
                            className={`p-3 rounded-xl ${theme === "dark"
                              ? "bg-green-900"
                              : "bg-green-100"
                              }`}
                          >
                            <FaCheckCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">Success</h3>
                            <p className="text-sm">{success}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      {activeStep === 1 && (
                        <motion.div
                          key="select-employee"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`rounded-2xl p-6 border transition-colors duration-300 ${theme === "dark"
                            ? "bg-gray-900 border-gray-800"
                            : "bg-white border-gray-200"
                            }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                            <div className="relative">
                              <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search by name, project, designation, or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900 placeholder-gray-400"
                                  : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500 placeholder-gray-500"
                                  }`}
                              />
                            </div>
                            <div>
                              <select
                                value={projectFilter}
                                onChange={(e) => {
                                  setProjectFilter(e.target.value);
                                  setEmployeeFilter("");
                                }}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900"
                                  : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"
                                  }`}
                              >
                                <option value="">All Projects</option>
                                {projectOptions.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <select
                                value={designationFilter}
                                onChange={(e) => {
                                  setDesignationFilter(e.target.value);
                                  setEmployeeFilter("");
                                }}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900"
                                  : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"
                                  }`}
                              >
                                <option value="">All Designations</option>
                                {designationOptions.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <select
                                value={employeeFilter}
                                onChange={(e) => setEmployeeFilter(e.target.value)}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900"
                                  : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"
                                  }`}
                              >
                                <option value="">All Employees</option>
                                {employeeOptions.map((emp) => (
                                  <option
                                    key={emp.employeeId}
                                    value={emp.employeeId}
                                  >
                                    {emp.fullName} ({emp.employeeId})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <select
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900"
                                  : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"
                                  }`}
                              >
                                <option value="">All Months</option>
                                {monthOptions.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div></div>
                          </div>
                          <div className="grid grid-cols-1 gap-6">
                            {filteredKycEmployees.length === 0 ? (
                              <div
                                className={`text-center py-12 ${theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-500"
                                  }`}
                              >
                                No employees found.
                              </div>
                            ) : (
                              filteredKycEmployees.map((k) => (
                                <div
                                  key={k.personalDetails.employeeId}
                                  className={`flex items-center gap-6 rounded-xl p-6 border shadow-sm hover:shadow-md transition ${theme === "dark"
                                    ? "bg-blue-950 border-blue-900"
                                    : "bg-blue-50 border-blue-100"
                                    }`}
                                >
                                  <div
                                    className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${theme === "dark"
                                      ? "bg-blue-900"
                                      : "bg-blue-100"
                                      }`}
                                  >
                                    {k.personalDetails.employeeImage ? (
                                      <Image
                                        src={k.personalDetails.employeeImage}
                                        alt={k.personalDetails.fullName}
                                        width={64}
                                        height={64}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <FaUser className="w-8 h-8 text-blue-500" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex flex-wrap gap-2 items-center mb-1">
                                      <span
                                        className={`font-bold text-lg ${theme === "dark"
                                          ? "text-blue-200"
                                          : "text-blue-900"
                                          }`}
                                      >
                                        {k.personalDetails.fullName}
                                      </span>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full font-semibold ${theme === "dark"
                                          ? "bg-blue-900 text-blue-200"
                                          : "bg-blue-200 text-blue-800"
                                          }`}
                                      >
                                        {k.personalDetails.employeeId}
                                      </span>
                                    </div>
                                    <div
                                      className={`flex flex-wrap gap-4 text-sm ${theme === "dark"
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                        }`}
                                    >
                                      <span className="flex items-center gap-1">
                                        <FaBuilding className="w-4 h-4 text-blue-400" />{" "}
                                        {k.personalDetails.projectName}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaBriefcase className="w-4 h-4 text-blue-400" />{" "}
                                        {k.personalDetails.designation}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    className={`px-5 py-2 rounded-lg font-semibold text-base transition flex items-center gap-2 ${theme === "dark"
                                      ? "bg-blue-800 text-white hover:bg-blue-900"
                                      : "bg-blue-600 text-white hover:bg-blue-700"
                                      }`}
                                    onClick={() =>
                                      handleSelectEmployee({
                                        employeeId: k.personalDetails.employeeId,
                                        fullName: k.personalDetails.fullName,
                                        projectName: k.personalDetails.projectName,
                                        designation: k.personalDetails.designation,
                                        employeeImage:
                                          k.personalDetails.employeeImage,
                                        hasPayroll: false,
                                      })
                                    }
                                  >
                                    <FaPlus className="w-4 h-4" /> Create Payroll
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                      {activeStep === 2 && selectedEmployee && (
                        <motion.div
                          key="payroll-details"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`rounded-2xl p-6 border transition-colors duration-300 ${theme === "dark"
                            ? "bg-gray-900 border-gray-800"
                            : "bg-white border-gray-200"
                            }`}
                        >
                          <button
                            className={`mb-4 flex items-center gap-2 hover:underline transition-colors duration-200 ${theme === "dark"
                              ? "text-blue-300"
                              : "text-blue-600"
                              }`}
                            onClick={() => {
                              setActiveStep(1);
                              setSelectedEmployee(null);
                            }}
                          >
                            <FaArrowLeft className="w-4 h-4" /> Back to
                            Employee List
                          </button>
                          <div className="flex items-center gap-4 mb-6">
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${theme === "dark"
                                ? "bg-blue-900"
                                : "bg-blue-100"
                                }`}
                            >
                              {selectedEmployee.employeeImage ? (
                                <Image
                                  src={selectedEmployee.employeeImage}
                                  alt={selectedEmployee.fullName}
                                  width={64}
                                  height={64}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <FaUser className="w-8 h-8 text-blue-500" />
                              )}
                            </div>
                            <div>
                              <div
                                className={`font-bold text-lg ${theme === "dark"
                                  ? "text-blue-200"
                                  : "text-blue-900"
                                  }`}
                              >
                                {selectedEmployee.fullName}
                              </div>
                              <div
                                className={`text-xs px-2 py-1 rounded-full font-semibold inline-block ${theme === "dark"
                                  ? "bg-blue-900 text-blue-200"
                                  : "bg-blue-200 text-blue-800"
                                  }`}
                              >
                                {selectedEmployee.employeeId}
                              </div>
                              <div
                                className={`flex flex-wrap gap-4 text-sm mt-1 ${theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-700"
                                  }`}
                              >
                                <span className="flex items-center gap-1">
                                  <FaBuilding className="w-4 h-4 text-blue-400" />{" "}
                                  {selectedEmployee.projectName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FaBriefcase className="w-4 h-4 text-blue-400" />{" "}
                                  {selectedEmployee.designation}
                                </span>
                              </div>
                            </div>
                          </div>
                          <form
                            className="space-y-6"
                            onSubmit={(e) => {
                              setPayrollForm({ ...payrollForm });
                              handlePayrollSubmit(e);
                            }}
                          >
                            <div>
                              <label
                                className={`block text-sm font-medium mb-1 ${theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-700"
                                  }`}
                              >
                                Month
                              </label>
                              <select
                                className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100"
                                  : "border-gray-200"
                                  }`}
                                value={payrollForm.month}
                                onChange={(e) =>
                                  setPayrollForm((f) => ({
                                    ...f,
                                    month: e.target.value,
                                  }))
                                }
                                required
                              >
                                <option value="">Select Month</option>
                                {monthOptions.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label
                                className={`block text-sm font-medium mb-1 ${theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-700"
                                  }`}
                              >
                                Year
                              </label>
                              <input
                                type="number"
                                className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100"
                                  : "border-gray-200"
                                  }`}
                                placeholder="2025"
                                value={payrollForm.year}
                                onChange={(e) =>
                                  setPayrollForm((f) => ({
                                    ...f,
                                    year: e.target.value,
                                  }))
                                }
                                required
                              />
                            </div>
                            <div>
                              <label
                                className={`block text-sm font-medium mb-1 ${theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-700"
                                  }`}
                              >
                                Amount
                              </label>
                              <input
                                type="number"
                                className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100"
                                  : "border-gray-200"
                                  }`}
                                placeholder="Amount"
                                value={payrollForm.amount}
                                onChange={(e) =>
                                  setPayrollForm((f) => ({
                                    ...f,
                                    amount: e.target.value,
                                  }))
                                }
                                required
                              />
                            </div>
                            <div>
                              <label
                                className={`block text-sm font-medium mb-1 ${theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-700"
                                  }`}
                              >
                                Payable Days
                              </label>
                              <input
                                type="number"
                                className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark"
                                  ? "bg-gray-900 border-gray-700 text-gray-100"
                                  : "border-gray-200"
                                  }`}
                                placeholder="Payable Days"
                                value={payableDays}
                                onChange={(e) =>
                                  setPayableDays(Number(e.target.value))
                                }
                                required
                              />
                            </div>
                            <button
                              type="submit"
                              className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold text-base transition ${theme === "dark"
                                ? "bg-blue-800 text-white hover:bg-blue-900"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              disabled={loading}
                            >
                              {loading ? "Submitting..." : "Continue"}
                            </button>
                          </form>
                        </motion.div>
                      )}
                      {activeStep === 3 && selectedEmployee && (
                        <motion.div
                          key="confirmation"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`rounded-2xl p-6 border transition-colors duration-300 ${theme === "dark"
                            ? "bg-gray-900 border-gray-800"
                            : "bg-white border-gray-200"
                            }`}
                        >
                          <div className="flex items-center gap-4 mb-6">
                            <FaCheckCircle className="w-10 h-10 text-green-500" />
                            <div>
                              <div
                                className={`font-bold text-lg ${theme === "dark"
                                  ? "text-blue-200"
                                  : "text-blue-900"
                                  }`}
                              >
                                Payroll Confirmation
                              </div>
                              <div
                                className={`text-sm ${theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-600"
                                  }`}
                              >
                                Please review the payroll details before
                                finishing.
                              </div>
                            </div>
                          </div>
                          <div className="mb-6">
                            <div className="flex items-center gap-4 mb-2">
                              <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${theme === "dark"
                                  ? "bg-blue-900"
                                  : "bg-blue-100"
                                  }`}
                              >
                                {selectedEmployee.employeeImage ? (
                                  <Image
                                    src={selectedEmployee.employeeImage}
                                    alt={selectedEmployee.fullName}
                                    width={64}
                                    height={64}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <FaUser className="w-8 h-8 text-blue-500" />
                                )}
                              </div>
                              <div>
                                <div
                                  className={`font-bold text-lg ${theme === "dark"
                                    ? "text-blue-200"
                                    : "text-blue-900"
                                    }`}
                                >
                                  {selectedEmployee.fullName}
                                </div>
                                <div
                                  className={`text-xs px-2 py-1 rounded-full font-semibold inline-block ${theme === "dark"
                                    ? "bg-blue-900 text-blue-200"
                                    : "bg-blue-200 text-blue-800"
                                    }`}
                                >
                                  {selectedEmployee.employeeId}
                                </div>
                                <div
                                  className={`flex flex-wrap gap-4 text-sm mt-1 ${theme === "dark"
                                    ? "text-gray-300"
                                    : "text-gray-700"
                                    }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <FaBuilding className="w-4 h-4 text-blue-400" />{" "}
                                    {selectedEmployee.projectName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FaBriefcase className="w-4 h-4 text-blue-400" />{" "}
                                    {selectedEmployee.designation}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div
                                className={`rounded-xl p-4 ${theme === "dark"
                                  ? "bg-blue-950"
                                  : "bg-blue-50"
                                  }`}
                              >
                                <div
                                  className={`text-xs mb-1 ${theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                    }`}
                                >
                                  Month
                                </div>
                                <div
                                  className={`font-semibold ${theme === "dark"
                                    ? "text-blue-200"
                                    : "text-blue-800"
                                    }`}
                                >
                                  {payrollForm.month}
                                </div>
                              </div>
                              <div
                                className={`rounded-xl p-4 ${theme === "dark"
                                  ? "bg-blue-950"
                                  : "bg-blue-50"
                                  }`}
                              >
                                <div
                                  className={`text-xs mb-1 ${theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                    }`}
                                >
                                  Year
                                </div>
                                <div
                                  className={`font-semibold ${theme === "dark"
                                    ? "text-blue-200"
                                    : "text-blue-800"
                                    }`}
                                >
                                  {payrollForm.year}
                                </div>
                              </div>
                              <div
                                className={`rounded-xl p-4 ${theme === "dark"
                                  ? "bg-blue-950"
                                  : "bg-blue-50"
                                  }`}
                              >
                                <div
                                  className={`text-xs mb-1 ${theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                    }`}
                                >
                                  Amount
                                </div>
                                <div
                                  className={`font-semibold ${theme === "dark"
                                    ? "text-blue-200"
                                    : "text-blue-800"
                                    }`}
                                >
                                  ₹{payrollForm.amount}
                                </div>
                              </div>
                            </div>
                          </div>
                          {!confirmed ? (
                            <button
                              className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold text-base transition ${theme === "dark"
                                ? "bg-green-800 text-white hover:bg-green-900"
                                : "bg-green-600 text-white hover:bg-green-700"
                                }`}
                              onClick={handleFinish}
                            >
                              Finish & Confirm
                            </button>
                          ) : (
                            <div className="mt-6 space-y-3">
                              <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-green-950 border border-green-800" : "bg-green-50 border border-green-200"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <FaCheckCircle className={`w-5 h-5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                                  <span className={`font-semibold ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>
                                    Payroll Created Successfully!
                                  </span>
                                </div>
                                <p className={`text-sm ${theme === "dark" ? "text-green-200" : "text-green-600"}`}>
                                  The payroll record has been created and is now available in the payroll view.
                                </p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                  onClick={handleViewPayroll}
                                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-base transition ${theme === "dark"
                                    ? "bg-blue-800 text-white hover:bg-blue-900"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                                >
                                  <FaEye className="w-5 h-5" />
                                  View Payroll
                                </button>
                                <button
                                  onClick={handleCreateAnother}
                                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-base transition border ${theme === "dark"
                                    ? "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                  <FaPlus className="w-5 h-5" />
                                  Create Another
                                </button>
                              </div>
                              <button
                                onClick={() => router.push(`/Manager/payroll-management/view`)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-base transition ${theme === "dark"
                                  ? "bg-indigo-800 text-white hover:bg-indigo-900"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                                  }`}
                              >
                                <FaFileInvoiceDollar className="w-5 h-5" />
                                View Payslip
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {showCreateDetails && selectedEmployee && (
          <motion.div
            key="create-details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
          >
            <div
              className={`rounded-2xl shadow-2xl max-w-lg w-full p-8 relative transition-colors duration-300 ${theme === "dark"
                ? "bg-gray-900"
                : "bg-white"
                }`}
            >
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark"
                  ? "text-gray-500 hover:text-blue-300"
                  : "text-gray-400 hover:text-blue-600"
                  }`}
                onClick={() => setShowCreateDetails(false)}
              >
                <FaArrowLeft className="w-6 h-6" />
              </button>
              <h2
                className={`text-2xl font-bold mb-4 flex items-center gap-2 ${theme === "dark"
                  ? "text-blue-200"
                  : "text-blue-700"
                  }`}
              >
                <FaMoneyBillWave className="w-5 h-5" /> Create Payroll Details
                for {selectedEmployee.fullName}
              </h2>
              <div
                className={`mb-4 text-sm ${theme === "dark"
                  ? "text-gray-300"
                  : "text-gray-700"
                  }`}
              >
                No payroll/HR details found for this employee. Please create new
                details below.
              </div>
              <form className="space-y-4" onSubmit={handleCreateDetails}>
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${theme === "dark"
                      ? "text-gray-300"
                      : "text-gray-700"
                      }`}
                  >
                    Basic Salary
                  </label>
                  <input
                    type="number"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark"
                      ? "bg-gray-900 border-gray-700 text-gray-100"
                      : "border-gray-200"
                      }`}
                    placeholder="Basic Salary"
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${theme === "dark"
                      ? "text-gray-300"
                      : "text-gray-700"
                      }`}
                  >
                    HR Allowance
                  </label>
                  <input
                    type="number"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark"
                      ? "bg-gray-900 border-gray-700 text-gray-100"
                      : "border-gray-200"
                      }`}
                    placeholder="HR Allowance"
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${theme === "dark"
                      ? "text-gray-300"
                      : "text-gray-700"
                      }`}
                  >
                    Other Details
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark"
                      ? "bg-gray-900 border-gray-700 text-gray-100"
                      : "border-gray-200"
                      }`}
                    placeholder="Other details"
                  />
                </div>
                <button
                  type="submit"
                  className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold text-base transition ${theme === "dark"
                    ? "bg-blue-800 text-white hover:bg-blue-900"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                >
                  Create Details
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}