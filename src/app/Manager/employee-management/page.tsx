"use client";
import React, { useState, useMemo } from "react";
import { FaSearch, FaUsers, FaChevronRight, FaCheckCircle, FaIdCard, FaTshirt, FaCalendarAlt, FaPlaneDeparture, FaMoneyBillWave, FaFileAlt } from "react-icons/fa";

type WorkflowKey = 'kyc' | 'idCard' | 'uniform' | 'attendance' | 'leave' | 'payslip';

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  workflow: Record<WorkflowKey, boolean>;
}

const dummyEmployees: Employee[] = [
  {
    employeeId: "EMP001",
    fullName: "John Doe",
    designation: "Manager",
    workflow: {
      kyc: true,
      idCard: true,
      uniform: false,
      attendance: true,
      leave: true,
      payslip: true,
    },
  },
  {
    employeeId: "EMP002",
    fullName: "Jane Smith",
    designation: "Developer",
    workflow: {
      kyc: true,
      idCard: true,
      uniform: true,
      attendance: true,
      leave: false,
      payslip: false,
    },
  },
  {
    employeeId: "EMP003",
    fullName: "Alice Brown",
    designation: "Analyst",
    workflow: {
      kyc: true,
      idCard: false,
      uniform: false,
      attendance: false,
      leave: false,
      payslip: false,
    },
  },
];

const workflowSteps: { key: WorkflowKey; label: string; icon: React.ReactNode }[] = [
  { key: "kyc", label: "KYC", icon: <FaFileAlt className="w-5 h-5" /> },
  { key: "idCard", label: "ID Card", icon: <FaIdCard className="w-5 h-5" /> },
  { key: "uniform", label: "Uniform", icon: <FaTshirt className="w-5 h-5" /> },
  { key: "attendance", label: "Attendance", icon: <FaCalendarAlt className="w-5 h-5" /> },
  { key: "leave", label: "Leave", icon: <FaPlaneDeparture className="w-5 h-5" /> },
  { key: "payslip", label: "Payslip", icon: <FaMoneyBillWave className="w-5 h-5" /> },
];

export default function EmployeeManagementPage() {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowKey | null>(null);
  const filteredEmployees = useMemo(() => {
    return dummyEmployees.filter((emp) =>
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // Dummy data for each step
  const getStepDetails = (step: WorkflowKey, emp: Employee) => {
    switch (step) {
      case "kyc":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">KYC Details</h3>
            <p className="text-gray-700">KYC status: {emp.workflow.kyc ? "Completed" : "Pending"}</p>
            <p className="text-gray-500 text-sm mt-2">(Show KYC info here...)</p>
          </div>
        );
      case "idCard":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">ID Card</h3>
            <p className="text-gray-700">ID Card status: {emp.workflow.idCard ? "Generated" : "Pending"}</p>
            <p className="text-gray-500 text-sm mt-2">(Show ID Card info here...)</p>
          </div>
        );
      case "uniform":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Uniform</h3>
            <p className="text-gray-700">Uniform status: {emp.workflow.uniform ? "Issued" : "Not Issued"}</p>
            <p className="text-gray-500 text-sm mt-2">(Show uniform info here...)</p>
          </div>
        );
      case "attendance":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Attendance</h3>
            <p className="text-gray-700">Attendance status: {emp.workflow.attendance ? "Active" : "Inactive"}</p>
            <p className="text-gray-500 text-sm mt-2">(Show attendance info here...)</p>
          </div>
        );
      case "leave":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Leave</h3>
            <p className="text-gray-700">Leave status: {emp.workflow.leave ? "Available" : "Not Available"}</p>
            <p className="text-gray-500 text-sm mt-2">(Show leave info here...)</p>
          </div>
        );
      case "payslip":
        return (
          <div>
            <h3 className="text-xl font-bold mb-2 text-blue-700">Payslip</h3>
            <p className="text-gray-700">Payslip status: {emp.workflow.payslip ? "Available" : "Not Available"}</p>
            <p className="text-gray-500 text-sm mt-2">(Show payslip info here...)</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="p-6">
        {/* Header */}
        <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
          <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
            <FaUsers className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Employee Management</h1>
            <p className="text-white text-base opacity-90">Search and manage individual employee workflows.</p>
          </div>
        </div>
        {/* Search Bar */}
        <div className="flex flex-row flex-wrap gap-2 mb-6 items-center w-full">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black placeholder:text-gray-400"
            />
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-xl">
          <table className="min-w-full divide-y divide-blue-100">
            <thead className="bg-blue-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Workflow</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No employees found</td>
                </tr>
              ) : filteredEmployees.map((emp, idx) => (
                <tr key={idx} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-3 font-bold text-blue-800">{emp.employeeId}</td>
                  <td className="px-4 py-3">{emp.fullName}</td>
                  <td className="px-4 py-3">{emp.designation}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      {workflowSteps.map((step, i) => (
                        <span key={step.key} className="flex items-center">
                          <button
                            type="button"
                            className={`rounded-full p-2 focus:outline-none cursor-pointer transition ring-0 ${emp.workflow[step.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'} hover:ring-2 hover:ring-blue-400 hover:bg-blue-100`}
                            onClick={() => setSelectedStep(step.key)}
                            title={`View ${step.label} details`}
                            tabIndex={0}
                          >
                            {step.icon}
                          </button>
                          {i < workflowSteps.length - 1 && <FaChevronRight className="mx-1 text-gray-300" />}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow"
                    >
                      View Workflow
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Workflow Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-xl relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold text-blue-700 mb-6">Employee Workflow</h2>
              <div className="mb-4">
                <div className="font-semibold text-lg text-gray-800">{selectedEmployee.fullName} <span className="text-gray-500 text-base">({selectedEmployee.employeeId})</span></div>
                <div className="text-gray-600 text-sm">{selectedEmployee.designation}</div>
              </div>
              <div className="flex flex-col gap-6">
                {workflowSteps.map((step, idx) => (
                  <div key={step.key} className="flex items-center gap-4">
                    <button
                      type="button"
                      className={`rounded-full p-2 focus:outline-none cursor-pointer transition ring-0 ${selectedEmployee.workflow[step.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'} hover:ring-2 hover:ring-blue-400 hover:bg-blue-100`}
                      onClick={() => setSelectedStep(step.key)}
                      title={`View ${step.label} details`}
                      tabIndex={0}
                    >
                      {step.icon}
                    </button>
                    <span className="font-medium text-lg w-32 select-none">{step.label}</span>
                    {selectedEmployee.workflow[step.key] ? (
                      <FaCheckCircle className="text-green-500 w-5 h-5" />
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow"
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
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setSelectedStep(null)}
                aria-label="Close"
              >
                &times;
              </button>
              {selectedEmployee ? (
                <>
                  {getStepDetails(selectedStep, selectedEmployee)}
                  <div className="flex justify-end mt-8">
                    <button
                      onClick={() => setSelectedStep(null)}
                      className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 