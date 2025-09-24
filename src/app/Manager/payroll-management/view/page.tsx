"use client";

import React, { useState, useMemo, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const statusOptions = ["All", "Paid", "Pending"];
const monthOptions = [
  "All Months", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface PayrollRecord {
  _id?: string;
  employeeName?: string;
  month?: string;
  year?: string;
  amount?: number;
  status?: string;
  project?: string;
  designation?: string;
}

export default function PayrollViewPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [monthFilter, setMonthFilter] = useState("All Months");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [projectOptions, setProjectOptions] = useState<string[]>(["All Projects"]);
  const [designationOptions, setDesignationOptions] = useState<string[]>(["All Designations"]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: recordsPerPage.toString(),
    });
    fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/payrolls?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch payroll records");
        return res.json();
      })
      .then((res) => {
        const data = res.data || [];
        setPayrollData(data as PayrollRecord[]);
        setTotalRecords(res.pagination?.totalRecords || data.length);
        setTotalPages(res.pagination?.totalPages || 1);

        setProjectOptions([
          "All Projects",
          ...Array.from(new Set((data as PayrollRecord[]).map((p) => (typeof p.project === "string" ? p.project : "")).filter(Boolean))) as string[],
        ]);
        setDesignationOptions([
          "All Designations",
          ...Array.from(new Set((data as PayrollRecord[]).map((p) => (typeof p.designation === "string" ? p.designation : "")).filter(Boolean))) as string[],
        ]);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load payroll records.");
        setLoading(false);
      });
  }, [currentPage, recordsPerPage]);

  const filteredPayroll = useMemo(() => {
    return payrollData.filter((pay) => {
      let monthIdx = 0;
      if (typeof pay.month === "string" && pay.month.includes("-")) {
        const idx = parseInt(pay.month.split("-")[1], 10);
        if (!isNaN(idx) && idx >= 1 && idx <= 12) monthIdx = idx;
      }
      const monthStr = monthOptions[monthIdx] || "";

      const matchesSearch =
        search === "" ||
        (typeof pay.employeeName === "string" && pay.employeeName.toLowerCase().includes(search.toLowerCase())) ||
        monthStr.toLowerCase().includes(search.toLowerCase()) ||
        (typeof pay.year === "string" && pay.year.includes(search)) ||
        (typeof pay.amount === "number" && pay.amount.toString().includes(search));
      const matchesStatus = statusFilter === "All" || pay.status === statusFilter;
      const matchesProject = projectFilter === "All Projects" || (typeof pay.project === "string" && pay.project === projectFilter);
      const matchesMonth = monthFilter === "All Months" || monthStr === monthFilter;
      const matchesDesignation = designationFilter === "All Designations" || (typeof pay.designation === "string" && pay.designation === designationFilter);
      return matchesSearch && matchesStatus && matchesProject && matchesMonth && matchesDesignation;
    });
  }, [payrollData, search, statusFilter, projectFilter, monthFilter, designationFilter]);

  const paginatedPayroll = useMemo(() => {
    return filteredPayroll;
  }, [filteredPayroll]);

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {projectOptions.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>
            {/* Month Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            {/* Designation Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={(e) => {
                  setDesignationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {designationOptions.map((designation) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
              </select>
            </div>
            {/* Status Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee, month, year, amount..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="From Date"
              />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="To Date"
              />
              <button
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: recordsPerPage.toString(),
                  });
                  fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/payrolls?${params}`)
                    .then((res) => {
                      if (!res.ok) throw new Error("Failed to fetch payroll records");
                      return res.json();
                    })
                    .then((res) => {
                      const data = res.data || [];
                      setPayrollData(data as PayrollRecord[]);
                      setTotalRecords(res.pagination?.totalRecords || data.length);
                      setTotalPages(res.pagination?.totalPages || 1);
                      setLoading(false);
                    })
                    .catch(() => {
                      setError("Could not load payroll records.");
                      setLoading(false);
                    });
                }}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading payroll records...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Month</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Year</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Amount</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className="px-2 py-1 sticky left-0 z-20"></th>
                    <th className="px-2 py-1">
                      <input 
                        value={search} 
                        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
                        placeholder="Filter Employee" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className="px-2 py-1">
                      <select 
                        value={monthFilter} 
                        onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        {monthOptions.map(month => <option key={month} value={month}>{month}</option>)}
                      </select>
                    </th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1">
                      <select 
                        value={statusFilter} 
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {paginatedPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`px-4 py-12 text-center border ${theme === "dark" ? "text-gray-400 border-blue-800" : "text-gray-500 border-blue-200"}`}>No payroll records found</td>
                    </tr>
                  ) : paginatedPayroll.map((pay, idx) => {
                    let monthIdx = 0;
                    if (typeof pay.month === "string" && pay.month.includes("-")) {
                      const idxVal = parseInt(pay.month.split("-")[1], 10);
                      if (!isNaN(idxVal) && idxVal >= 1 && idxVal <= 12) monthIdx = idxVal;
                    }
                    const monthStr = monthOptions[monthIdx] || "";
                    return (
                      <tr key={pay._id || idx} className={`${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-50"} transition even:bg-gray-50 dark:even:bg-gray-900`}>
                        <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                        <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}><div className="truncate" title={pay.employeeName || "-"}>{pay.employeeName || "-"}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={monthStr}>{monthStr}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{pay.year || "-"}</td>
                        <td className={`px-2 py-1 font-semibold border ${theme === 'dark' ? 'text-green-300 border-blue-800' : 'text-green-700 border-blue-200'}`}>₹{typeof pay.amount === "number" ? pay.amount.toLocaleString() : "0"}</td>
                        <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                            pay.status === 'Paid' 
                              ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              : theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {pay.status || "N/A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-6 py-4 border-t ${theme === "dark" ? "border-blue-900" : "border-blue-100"}`}>
            <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 transition-colors ${theme === "dark"
                  ? "text-gray-400 hover:text-blue-300 disabled:text-gray-700"
                  : "text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                  } disabled:cursor-not-allowed`}
              >
                <FaChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                      ? theme === "dark"
                        ? "bg-blue-700 text-white"
                        : "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "text-gray-400 hover:bg-gray-800"
                        : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 transition-colors ${theme === "dark"
                  ? "text-gray-400 hover:text-blue-300 disabled:text-gray-700"
                  : "text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                  } disabled:cursor-not-allowed`}
              >
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}