"use client";
import React, { useState, useMemo } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaMoneyBillWave, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const dummyPayroll = [
  { employee: "John Doe", month: "June", year: 2025, amount: 50000, status: "Paid", project: "Project Alpha", designation: "Manager" },
  { employee: "Jane Smith", month: "June", year: 2025, amount: 48000, status: "Pending", project: "Project Beta", designation: "Developer" },
  { employee: "Alice Brown", month: "May", year: 2025, amount: 47000, status: "Paid", project: "Project Gamma", designation: "Analyst" },
  { employee: "Bob Lee", month: "May", year: 2025, amount: 46000, status: "Pending", project: "Project Alpha", designation: "HR" },
  { employee: "Charlie Green", month: "April", year: 2025, amount: 45500, status: "Paid", project: "Project Beta", designation: "Manager" },
  { employee: "Diana White", month: "April", year: 2025, amount: 44000, status: "Paid", project: "Project Gamma", designation: "Developer" },
  // ...add more for pagination demo
];

const statusOptions = ["All", "Paid", "Pending"];
const projectOptions = ["All Projects", "Project Alpha", "Project Beta", "Project Gamma"];
const monthOptions = ["All Months", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const designationOptions = ["All Designations", "Manager", "Developer", "Analyst", "HR"];

export default function PayrollViewPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [monthFilter, setMonthFilter] = useState("All Months");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // Filtered and searched payroll records
  const filteredPayroll = useMemo(() => {
    return dummyPayroll.filter((pay) => {
      const matchesSearch =
        search === "" ||
        pay.employee.toLowerCase().includes(search.toLowerCase()) ||
        pay.month.toLowerCase().includes(search.toLowerCase()) ||
        pay.year.toString().includes(search) ||
        pay.amount.toString().includes(search);
      const matchesStatus =
        statusFilter === "All" || pay.status === statusFilter;
      const matchesProject =
        projectFilter === "All Projects" || (pay.project && pay.project === projectFilter);
      const matchesMonth =
        monthFilter === "All Months" || pay.month === monthFilter;
      const matchesDesignation =
        designationFilter === "All Designations" || (pay.designation && pay.designation === designationFilter);
      return matchesSearch && matchesStatus && matchesProject && matchesMonth && matchesDesignation;
    });
  }, [search, statusFilter, projectFilter, monthFilter, designationFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredPayroll.length / recordsPerPage);
  const paginatedPayroll = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredPayroll.slice(start, start + recordsPerPage);
  }, [filteredPayroll, currentPage, recordsPerPage]);

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Modern Blue Gradient Header (like Payroll Update) */}
        <div className="mb-8">
          <div className={`flex items-center gap-6 rounded-2xl px-8 py-8 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-800' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}>
            <div className={`flex items-center justify-center w-16 h-16 rounded-xl ${theme === 'dark' ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-500 bg-opacity-30'}`}>
              <FaMoneyBillWave className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">View Payroll</h1>
              <p className={`text-lg ${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>View payroll records for employees</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <section className={`rounded-2xl p-8 border shadow-xl w-full max-w-4xl mx-auto ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Payroll Records</h2>
            {/* Filters and Search */}
            <div className="flex flex-row flex-wrap gap-2 mb-6 items-center w-full">
              <div className="relative w-40 min-w-[140px]">
                <select
                  value={projectFilter}
                  onChange={e => { setProjectFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-32 min-w-[110px]">
                <select
                  value={monthFilter}
                  onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-44 min-w-[130px]">
                <select
                  value={designationFilter}
                  onChange={e => { setDesignationFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {designationOptions.map((designation) => (
                    <option key={designation} value={designation}>{designation}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-48 min-w-[120px]">
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search employee, month, year, amount..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-black'}`}
                />
              </div>
            </div>
            {/* Table */}
            <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-blue-100'}`}>
              <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-blue-100'}`}>
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
                  {paginatedPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No records found</td>
                    </tr>
                  ) : paginatedPayroll.map((pay, idx) => (
                    <tr key={idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition' : 'hover:bg-blue-50 transition'}>
                      <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{pay.employee}</td>
                      <td className={theme === 'dark' ? 'px-4 py-3 text-gray-100' : 'px-4 py-3 text-black'}>{pay.month}</td>
                      <td className={theme === 'dark' ? 'px-4 py-3 text-gray-100' : 'px-4 py-3 text-black'}>{pay.year}</td>
                      <td className={theme === 'dark' ? 'px-4 py-3 text-gray-100' : 'px-4 py-3 text-black'}>₹{pay.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${pay.status === "Paid" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{pay.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-6 py-4 border-t mt-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredPayroll.length)} of {filteredPayroll.length} records
                </div>
                <div className="flex items-center gap-2">
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