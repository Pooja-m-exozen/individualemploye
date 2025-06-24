"use client";
import React, { useState, useMemo } from "react";
import { FaSearch, FaIdCard, FaFileExport } from "react-icons/fa";

const dummyKYCRecords = [
  {
    employeeId: "EMP001",
    fullName: "John Doe",
    project: "Project Alpha",
    designation: "Manager",
    status: "Approved",
  },
  {
    employeeId: "EMP002",
    fullName: "Jane Smith",
    project: "Project Beta",
    designation: "Developer",
    status: "Pending",
  },
  {
    employeeId: "EMP003",
    fullName: "Alice Brown",
    project: "Project Gamma",
    designation: "Analyst",
    status: "Rejected",
  },
  {
    employeeId: "EMP004",
    fullName: "Bob Lee",
    project: "Project Alpha",
    designation: "HR",
    status: "Approved",
  },
  // ...more records
];

const projectOptions = ["All Projects", "Project Alpha", "Project Beta", "Project Gamma"];
const designationOptions = ["All Designations", "Manager", "Developer", "Analyst", "HR"];
const statusOptions = ["All Statuses", "Approved", "Pending", "Rejected"];

function downloadExcel() {
  // Dummy export function
  alert("Excel export coming soon!");
}
function downloadPDF() {
  // Dummy export function
  alert("PDF export coming soon!");
}

export default function KYCReportPage() {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const filteredRecords = useMemo(() => {
    return dummyKYCRecords.filter((rec) => {
      const matchesSearch =
        search === "" ||
        rec.fullName.toLowerCase().includes(search.toLowerCase()) ||
        rec.employeeId.toLowerCase().includes(search.toLowerCase());
      const matchesProject =
        projectFilter === "All Projects" || rec.project === projectFilter;
      const matchesDesignation =
        designationFilter === "All Designations" || rec.designation === designationFilter;
      const matchesStatus =
        statusFilter === "All Statuses" || rec.status === statusFilter;
      return matchesSearch && matchesProject && matchesDesignation && matchesStatus;
    });
  }, [search, projectFilter, designationFilter, statusFilter]);

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="p-6">
        {/* Header */}
        <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
          <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
            <FaIdCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">KYC Report</h1>
            <p className="text-white text-base opacity-90">View and export KYC details for employees.</p>
          </div>
        </div>
        {/* Filters, Search, Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            <div className="relative w-40 min-w-[140px]">
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="w-full appearance-none bg-white pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
              >
                {projectOptions.map((project) => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className="w-full appearance-none bg-white pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
              >
                {designationOptions.map((designation) => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>
            </div>
            <div className="relative w-40 min-w-[120px]">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-white pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
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
          <div className="flex gap-2 justify-end">
            <button
              onClick={downloadExcel}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <FaFileExport /> Export Excel
            </button>
            <button
              onClick={downloadPDF}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <FaFileExport /> Export PDF
            </button>
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-xl">
          <table className="min-w-full divide-y divide-blue-100">
            <thead className="bg-blue-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No records found</td>
                </tr>
              ) : filteredRecords.map((rec, idx) => (
                <tr key={idx} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-3 font-bold text-blue-800">{rec.employeeId}</td>
                  <td className="px-4 py-3">{rec.fullName}</td>
                  <td className="px-4 py-3">{rec.project}</td>
                  <td className="px-4 py-3">{rec.designation}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      rec.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : rec.status === "Pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 