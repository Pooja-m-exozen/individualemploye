"use client";
import React, { useState, useMemo, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaMoneyBillWave, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const statusOptions = ["All", "Paid", "Pending"];
const monthOptions = [
  "All Months", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Define a type for payroll records
interface PayrollRecord {
  _id?: string;
  employeeName?: string;
  month?: string;
  year?: string;
  amount?: number;
  status?: string;
  project?: string;
  designation?: string;
  // Add other fields as needed
}

export default function PayrollViewPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [monthFilter, setMonthFilter] = useState("All Months");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // API state
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // For dynamic filter options
  const [projectOptions, setProjectOptions] = useState<string[]>(["All Projects"]);
  const [designationOptions, setDesignationOptions] = useState<string[]>(["All Designations"]);

  // Fetch payroll data from API
  useEffect(() => {
    setLoading(true);
    setError(null);
    // Build query params for pagination
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: recordsPerPage.toString(),
    });
    fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/payrolls?${params}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch payroll records");
        return res.json();
      })
      .then(res => {
        const data = res.data || [];
        setPayrollData(data as PayrollRecord[]);
        setTotalRecords(res.pagination?.totalRecords || data.length);
        setTotalPages(res.pagination?.totalPages || 1);

        // Populate project and designation dropdowns from all fetched records
        setProjectOptions([
          "All Projects",
          ...Array.from(new Set((data as PayrollRecord[]).map((p) => typeof p.project === "string" ? p.project : "").filter(Boolean))) as string[],
        ]);
        setDesignationOptions([
          "All Designations",
          ...Array.from(new Set((data as PayrollRecord[]).map((p) => typeof p.designation === "string" ? p.designation : "").filter(Boolean))) as string[],
        ]);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load payroll records.");
        setLoading(false);
      });
  }, [currentPage, recordsPerPage]);

  // Filtered and searched payroll records (client-side)
  const filteredPayroll = useMemo(() => {
    return payrollData.filter((pay) => {
      // Parse month index safely
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
      const matchesStatus =
        statusFilter === "All" || pay.status === statusFilter;
      const matchesProject =
        projectFilter === "All Projects" || (typeof pay.project === "string" && pay.project === projectFilter);
      const matchesMonth =
        monthFilter === "All Months" ||
        monthStr === monthFilter;
      const matchesDesignation =
        designationFilter === "All Designations" || (typeof pay.designation === "string" && pay.designation === designationFilter);
      return matchesSearch && matchesStatus && matchesProject && matchesMonth && matchesDesignation;
    });
  }, [payrollData, search, statusFilter, projectFilter, monthFilter, designationFilter]);

  // Pagination (client-side, since API returns only current page)
  const paginatedPayroll = useMemo(() => {
    // If API supports server-side pagination, just use filteredPayroll (should be <= recordsPerPage)
    return filteredPayroll;
  }, [filteredPayroll]);

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Modern Blue Gradient Header (like Payroll Update) */}
        <div className="mb-4 md:mb-8">
          <div className={`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 rounded-2xl px-4 md:px-8 py-4 md:py-8 ${theme === 'dark' ? 'bg-[#323a48]' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}>
            <div className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl ${theme === 'dark' ? 'bg-[#232a36]' : 'bg-blue-500 bg-opacity-30'}`}>
              <FaMoneyBillWave className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">View Payroll</h1>
              <p className={`text-base md:text-lg ${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>View payroll records for employees</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <section className={`rounded-2xl p-4 md:p-8 border shadow-xl w-full max-w-4xl mx-auto ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-lg md:text-xl font-bold mb-4 md:mb-6 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Payroll Records</h2>
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-4 mb-4 md:mb-6 items-stretch md:items-center w-full">
              {/* Project Dropdown */}
              <div className="relative w-full md:w-40 min-w-[140px]">
                <select
                  value={projectFilter}
                  onChange={e => { setProjectFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-xs md:text-base ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              {/* Month Dropdown */}
              <div className="relative w-full md:w-32 min-w-[110px]">
                <select
                  value={monthFilter}
                  onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-xs md:text-base ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              {/* Designation Dropdown */}
              <div className="relative w-full md:w-44 min-w-[130px]">
                <select
                  value={designationFilter}
                  onChange={e => { setDesignationFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-xs md:text-base ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {designationOptions.map((designation) => (
                    <option key={designation} value={designation}>{designation}</option>
                  ))}
                </select>
              </div>
              {/* Status Dropdown */}
              <div className="relative w-full md:w-48 min-w-[120px]">
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-xs md:text-base ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              {/* Search Input */}
              <div className="relative w-full md:flex-1 min-w-[180px] max-w-xs">
                <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search employee, month, year, amount..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 text-xs md:text-base ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                />
              </div>
            </div>
            {/* Table */}
            <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-blue-100'}`}>
              <table className={`min-w-full divide-y text-xs md:text-base ${theme === 'dark' ? 'divide-gray-700' : 'divide-blue-100'}`}>
                <thead className={theme === 'dark' ? 'bg-blue-950 sticky top-0 z-10' : 'bg-blue-50 sticky top-0 z-10'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Employee</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Month</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Year</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Amount</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Status</th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-y divide-gray-800' : 'divide-y divide-blue-50'}>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-red-500">{error}</td>
                    </tr>
                  ) : paginatedPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No records found</td>
                    </tr>
                  ) : paginatedPayroll.map((pay, idx) => {
                      let monthIdx = 0;
                      if (typeof pay.month === "string" && pay.month.includes("-")) {
                        const idxVal = parseInt(pay.month.split("-")[1], 10);
                        if (!isNaN(idxVal) && idxVal >= 1 && idxVal <= 12) monthIdx = idxVal;
                      }
                      const monthStr = monthOptions[monthIdx] || "";
                      return (
                        <tr key={pay._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition' : 'hover:bg-blue-50 transition'}>
                          <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{pay.employeeName || ""}</td>
                          <td className={theme === 'dark' ? 'px-4 py-3 text-gray-100' : 'px-4 py-3 text-black'}>
                            {monthStr}
                          </td>
                          <td className={theme === 'dark' ? 'px-4 py-3 text-gray-100' : 'px-4 py-3 text-black'}>{pay.year || ""}</td>
                          <td className={theme === 'dark' ? 'px-4 py-3 text-gray-100' : 'px-4 py-3 text-black'}>₹{typeof pay.amount === "number" ? pay.amount.toLocaleString() : ""}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${pay.status === "Paid" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{pay.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex flex-col md:flex-row items-center justify-between px-2 md:px-6 py-2 md:py-4 border-t mt-2 gap-2 md:gap-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} records
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-300 disabled:text-gray-700' : 'text-gray-600 hover:text-blue-600 disabled:text-gray-300'} disabled:cursor-not-allowed`}
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? theme === 'dark' ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-300 disabled:text-gray-700' : 'text-gray-600 hover:text-blue-600 disabled:text-gray-300'} disabled:cursor-not-allowed`}
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}