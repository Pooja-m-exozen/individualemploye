"use client";
import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FaTable, FaUsers, FaUserCheck, FaClipboardList, FaIdBadge, FaSearch, FaFilter, FaDownload, FaEye, FaEdit, FaTrash } from "react-icons/fa";

export default function DescriptiveView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const { theme } = useTheme();

  const mockData = [
    { id: 1, name: "John Doe", department: "Engineering", status: "Active", kyc: "Completed", idCard: "Generated", joinDate: "2024-01-15" },
    { id: 2, name: "Jane Smith", department: "Marketing", status: "Active", kyc: "Pending", idCard: "Pending", joinDate: "2024-02-01" },
    { id: 3, name: "Mike Johnson", department: "Sales", status: "Inactive", kyc: "Completed", idCard: "Generated", joinDate: "2023-12-10" },
    { id: 4, name: "Sarah Wilson", department: "HR", status: "Active", kyc: "Completed", idCard: "Generated", joinDate: "2024-01-20" },
    { id: 5, name: "David Brown", department: "Finance", status: "Active", kyc: "In Progress", idCard: "Pending", joinDate: "2024-02-15" },
  ];

  const filteredData = mockData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "all" || item.status.toLowerCase() === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Records</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{mockData.length}</p>
            </div>
            <FaUsers className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Active Employees</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {mockData.filter(item => item.status === "Active").length}
              </p>
            </div>
            <FaUserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>KYC Completed</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {mockData.filter(item => item.kyc === "Completed").length}
              </p>
            </div>
            <FaClipboardList className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>ID Cards Generated</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {mockData.filter(item => item.idCard === "Generated").length}
              </p>
            </div>
            <FaIdBadge className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border`}>
        {/* Table Header */}
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Employee Data</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-800'
                  }`}
                />
              </div>
              
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                <FaDownload className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-white'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>ID</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Name</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Department</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Status</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>KYC</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>ID Card</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Join Date</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-200'}`}>
              {filteredData.map((item) => (
                <tr key={item.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.id}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{item.name}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.status === "Active" 
                        ? theme === 'dark' ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"
                        : theme === 'dark' ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.kyc === "Completed" 
                        ? theme === 'dark' ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"
                        : item.kyc === "In Progress"
                        ? theme === 'dark' ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-800"
                        : theme === 'dark' ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800"
                    }`}>
                      {item.kyc}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.idCard === "Generated" 
                        ? theme === 'dark' ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"
                        : theme === 'dark' ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800"
                    }`}>
                      {item.idCard}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.joinDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-500 hover:text-blue-700 transition-colors">
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button className="text-green-500 hover:text-green-700 transition-colors">
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button className="text-red-500 hover:text-red-700 transition-colors">
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {filteredData.length} of {mockData.length} results
            </div>
            <div className="flex items-center gap-2">
              <button className={`px-3 py-1 text-sm transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:text-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-500 text-white rounded">1</span>
              <button className={`px-3 py-1 text-sm transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:text-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 