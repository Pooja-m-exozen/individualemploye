"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaMoneyBillWave, FaUser, FaBuilding, FaBriefcase, FaCheckCircle, FaArrowLeft, FaInfoCircle, FaPlus, FaExclamationCircle } from "react-icons/fa";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const dummyEmployees = [
  { employeeId: "EMP001", fullName: "John Doe", projectName: "Project Alpha", designation: "Security Guard", employeeImage: "", hasPayroll: true },
  { employeeId: "EMP002", fullName: "Jane Smith", projectName: "Project Beta", designation: "Supervisor", employeeImage: "", hasPayroll: false },
  { employeeId: "EMP003", fullName: "Alice Johnson", projectName: "Project Gamma", designation: "Technician", employeeImage: "", hasPayroll: true },
  { employeeId: "EMP004", fullName: "Bob Williams", projectName: "Project Alpha", designation: "Driver", employeeImage: "", hasPayroll: false },
];

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

const dummyProjects = ["Project Alpha", "Project Beta", "Project Gamma"];
const dummyDesignations = ["Security Guard", "Supervisor", "Technician", "Driver"];
const dummyMonths = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];

export default function PayrollCreatePage() {
  const [activeStep, setActiveStep] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [showCreateDetails, setShowCreateDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payrollForm, setPayrollForm] = useState({ month: "", year: "", amount: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const filteredEmployees = dummyEmployees.filter(emp =>
    (projectFilter ? emp.projectName === projectFilter : true) &&
    (designationFilter ? emp.designation === designationFilter : true) &&
    (employeeFilter ? emp.employeeId === employeeFilter : true) &&
    (emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.projectName.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredEmployeeOptions = dummyEmployees.filter(emp =>
    (projectFilter ? emp.projectName === projectFilter : true) &&
    (designationFilter ? emp.designation === designationFilter : true)
  );

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    if (emp.hasPayroll) {
      setPayrollForm(f => ({ ...f, month: monthFilter || f.month }));
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

  const handlePayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveStep(3);
    setError(null);
    setSuccess(null);
    setConfirmed(false);
  };

  const handleFinish = () => {
    setSuccess("Payroll created and confirmed successfully!");
    setConfirmed(true);
    setTimeout(() => {
      setActiveStep(1);
      setSelectedEmployee(null);
      setPayrollForm({ month: "", year: "", amount: "" });
      setSuccess(null);
      setConfirmed(false);
    }, 2000);
  };

  return (
    <ManagerDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col">
        {/* Header */}
        <div className="rounded-b-2xl shadow p-6 bg-gradient-to-r from-blue-600 to-blue-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FaMoneyBillWave className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Payroll Creation</h1>
              <p className="text-blue-100">Create and manage employee payrolls</p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl shadow-sm overflow-hidden mb-6 border bg-white border-gray-200"
          >
            {/* Stepper */}
            <div className="flex justify-between items-center w-full px-6 pt-6">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activeStep > step.id
                        ? "bg-green-500"
                        : activeStep === step.id
                        ? "bg-blue-600"
                        : "bg-gray-200"
                    } text-white font-semibold transition-colors duration-300`}>
                      {activeStep > step.id ? <FaCheckCircle className="w-5 h-5" /> : step.id}
                    </div>
                    <p className={`text-sm font-medium mt-3 ${
                      activeStep > step.id
                        ? "text-green-500"
                        : activeStep === step.id
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {idx !== steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-4 ${
                      activeStep > step.id ? "bg-green-500" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar/Guidelines */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-4"
            >
              <div className="rounded-xl p-6 sticky top-8 border bg-white border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <FaInfoCircle className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Guidelines</h2>
                </div>
                <ul className="space-y-4">
                  {guidelines.map((g, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="p-2 rounded-lg bg-green-50 text-green-600"><FaCheckCircle className="w-4 h-4" /></span>
                      <span className="text-sm text-gray-700 leading-relaxed">{g}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 p-4 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FaMoneyBillWave className="w-4 h-4" />
                    <span className="font-semibold">Need Help?</span>
                  </div>
                  <p className="text-sm">Contact <span className="font-medium">payroll@zenployee.com</span> for support.</p>
                </div>
              </div>
            </motion.div>
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-4 text-red-600 bg-red-50 p-6 rounded-xl border border-red-100"
                  >
                    <div className="p-3 bg-red-100 rounded-xl">
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
                    className="flex items-center gap-4 text-green-600 bg-green-50 p-6 rounded-xl border border-green-100"
                  >
                    <div className="p-3 bg-green-100 rounded-xl">
                      <FaCheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Success</h3>
                      <p className="text-sm">{success}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Step 1: Select Employee */}
              <AnimatePresence mode="wait">
                {activeStep === 1 && (
                  <motion.div
                    key="select-employee"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="rounded-2xl p-6 border bg-white border-gray-200"
                  >
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                      <div className="relative">
                        <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search by name, project, designation, or ID..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                        />
                      </div>
                      <div>
                        <select
                          value={projectFilter}
                          onChange={e => { setProjectFilter(e.target.value); setEmployeeFilter(""); }}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                        >
                          <option value="">All Projects</option>
                          {dummyProjects.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <select
                          value={designationFilter}
                          onChange={e => { setDesignationFilter(e.target.value); setEmployeeFilter(""); }}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                        >
                          <option value="">All Designations</option>
                          {dummyDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <select
                          value={employeeFilter}
                          onChange={e => setEmployeeFilter(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                        >
                          <option value="">All Employees</option>
                          {filteredEmployeeOptions.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName} ({emp.employeeId})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          value={monthFilter}
                          onChange={e => setMonthFilter(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                        >
                          <option value="">All Months</option>
                          {dummyMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div></div>
                    </div>
                    {/* Employee List */}
                    <div className="grid grid-cols-1 gap-6">
                      {filteredEmployees.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">No employees found.</div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <div key={emp.employeeId} className="flex items-center gap-6 bg-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                              {emp.employeeImage ? (
                                <Image src={emp.employeeImage} alt={emp.fullName} width={64} height={64} className="object-cover w-full h-full" />
                              ) : (
                                <FaUser className="w-8 h-8 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-2 items-center mb-1">
                                <span className="font-bold text-lg text-blue-900">{emp.fullName}</span>
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold">{emp.employeeId}</span>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                                <span className="flex items-center gap-1"><FaBuilding className="w-4 h-4 text-blue-400" /> {emp.projectName}</span>
                                <span className="flex items-center gap-1"><FaBriefcase className="w-4 h-4 text-blue-400" /> {emp.designation}</span>
                              </div>
                            </div>
                            <button
                              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition flex items-center gap-2"
                              onClick={() => handleSelectEmployee(emp)}
                            >
                              <FaPlus className="w-4 h-4" /> Create Payroll
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
                {/* Step 2: Payroll Details */}
                {activeStep === 2 && selectedEmployee && (
                  <motion.div
                    key="payroll-details"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="rounded-2xl p-6 border bg-white border-gray-200"
                  >
                    <button
                      className="mb-4 flex items-center gap-2 text-blue-600 hover:underline"
                      onClick={() => { setActiveStep(1); setSelectedEmployee(null); }}
                    >
                      <FaArrowLeft className="w-4 h-4" /> Back to Employee List
                    </button>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                        {selectedEmployee.employeeImage ? (
                          <Image src={selectedEmployee.employeeImage} alt={selectedEmployee.fullName} width={64} height={64} className="object-cover w-full h-full" />
                        ) : (
                          <FaUser className="w-8 h-8 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-lg text-blue-900">{selectedEmployee.fullName}</div>
                        <div className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold inline-block">{selectedEmployee.employeeId}</div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-700 mt-1">
                          <span className="flex items-center gap-1"><FaBuilding className="w-4 h-4 text-blue-400" /> {selectedEmployee.projectName}</span>
                          <span className="flex items-center gap-1"><FaBriefcase className="w-4 h-4 text-blue-400" /> {selectedEmployee.designation}</span>
                        </div>
                      </div>
                    </div>
                    <form className="space-y-6" onSubmit={e => { setPayrollForm({ ...payrollForm }); handlePayrollSubmit(e); }}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select className="w-full px-4 py-2 rounded-lg border border-gray-200" value={payrollForm.month} onChange={e => setPayrollForm(f => ({ ...f, month: e.target.value }))} required>
                          <option value="">Select Month</option>
                          {dummyMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <input type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="2025" value={payrollForm.year} onChange={e => setPayrollForm(f => ({ ...f, year: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="Amount" value={payrollForm.amount} onChange={e => setPayrollForm(f => ({ ...f, amount: e.target.value }))} required />
                      </div>
                      <button type="submit" className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition">Continue</button>
                    </form>
                  </motion.div>
                )}
                {/* Step 3: Confirmation */}
                {activeStep === 3 && selectedEmployee && (
                  <motion.div
                    key="confirmation"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="rounded-2xl p-6 border bg-white border-gray-200"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <FaCheckCircle className="w-10 h-10 text-green-500" />
                      <div>
                        <div className="font-bold text-lg text-blue-900">Payroll Confirmation</div>
                        <div className="text-gray-600 text-sm">Please review the payroll details before finishing.</div>
                      </div>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                          {selectedEmployee.employeeImage ? (
                            <Image src={selectedEmployee.employeeImage} alt={selectedEmployee.fullName} width={64} height={64} className="object-cover w-full h-full" />
                          ) : (
                            <FaUser className="w-8 h-8 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-lg text-blue-900">{selectedEmployee.fullName}</div>
                          <div className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold inline-block">{selectedEmployee.employeeId}</div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-700 mt-1">
                            <span className="flex items-center gap-1"><FaBuilding className="w-4 h-4 text-blue-400" /> {selectedEmployee.projectName}</span>
                            <span className="flex items-center gap-1"><FaBriefcase className="w-4 h-4 text-blue-400" /> {selectedEmployee.designation}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4">
                          <div className="text-xs text-gray-500 mb-1">Month</div>
                          <div className="font-semibold text-blue-800">{payrollForm.month}</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4">
                          <div className="text-xs text-gray-500 mb-1">Year</div>
                          <div className="font-semibold text-blue-800">{payrollForm.year}</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4">
                          <div className="text-xs text-gray-500 mb-1">Amount</div>
                          <div className="font-semibold text-blue-800">₹{payrollForm.amount}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="w-full mt-4 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition"
                      onClick={handleFinish}
                      disabled={confirmed}
                    >
                      {confirmed ? "Finished" : "Finish & Confirm"}
                    </button>
                  </motion.div>
                )}
                {/* Create Details Modal */}
                {showCreateDetails && selectedEmployee && (
                  <motion.div
                    key="create-details"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
                  >
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
                      <button
                        className="absolute top-4 right-4 text-gray-400 hover:text-blue-600"
                        onClick={() => setShowCreateDetails(false)}
                      >
                        <FaArrowLeft className="w-6 h-6" />
                      </button>
                      <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                        <FaMoneyBillWave className="w-5 h-5" /> Create Payroll Details for {selectedEmployee.fullName}
                      </h2>
                      <div className="mb-4 text-gray-700 text-sm">No payroll/HR details found for this employee. Please create new details below.</div>
                      <form className="space-y-4" onSubmit={handleCreateDetails}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                          <input type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="Basic Salary" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">HR Allowance</label>
                          <input type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="HR Allowance" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Other Details</label>
                          <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="Other details" />
                        </div>
                        <button type="submit" className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition">Create Details</button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
} 