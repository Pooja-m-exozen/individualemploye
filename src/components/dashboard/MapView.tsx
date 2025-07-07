"use client";
import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FaMapMarkerAlt, FaUsers, FaUserCheck, FaClipboardList, FaIdBadge, FaSearch, FaFilter, FaDownload, FaEye, FaLocationArrow, FaGlobe } from "react-icons/fa";

export default function MapView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const { theme } = useTheme();

  const mockLocationData = [
    { id: 1, name: "John Doe", department: "Engineering", status: "Active", location: "New York", coordinates: { lat: 40.7128, lng: -74.0060 }, employees: 45 },
    { id: 2, name: "Jane Smith", department: "Marketing", status: "Active", location: "Los Angeles", coordinates: { lat: 34.0522, lng: -118.2437 }, employees: 32 },
    { id: 3, name: "Mike Johnson", department: "Sales", status: "Active", location: "Chicago", coordinates: { lat: 41.8781, lng: -87.6298 }, employees: 28 },
    { id: 4, name: "Sarah Wilson", department: "HR", status: "Active", location: "Houston", coordinates: { lat: 29.7604, lng: -95.3698 }, employees: 23 },
    { id: 5, name: "David Brown", department: "Finance", status: "Active", location: "Phoenix", coordinates: { lat: 33.4484, lng: -112.0740 }, employees: 19 },
    { id: 6, name: "Emily Davis", department: "Engineering", status: "Active", location: "Philadelphia", coordinates: { lat: 39.9526, lng: -75.1652 }, employees: 37 },
  ];

  const filteredData = mockLocationData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "all" || item.status.toLowerCase() === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const totalEmployees = mockLocationData.reduce((sum, item) => sum + item.employees, 0);
  const activeLocations = mockLocationData.length;
  const averageEmployees = Math.round(totalEmployees / activeLocations);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Locations</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{activeLocations}</p>
            </div>
            <FaMapMarkerAlt className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Employees</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{totalEmployees}</p>
            </div>
            <FaUsers className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg per Location</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{averageEmployees}</p>
            </div>
            <FaUserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Coverage</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>6 States</p>
            </div>
            <FaGlobe className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Map and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className={`lg:col-span-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Employee Distribution Map</h3>
              <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors">
                <FaDownload className="w-4 h-4" />
                Export
              </button>
            </div>
            
            {/* Map Placeholder */}
            <div className={`h-96 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg flex items-center justify-center relative overflow-hidden`}>
              <div className="text-center z-10">
                <FaMapMarkerAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Interactive Map</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Google Maps or Mapbox integration</p>
              </div>
              
              {/* Mock Map Markers */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {mockLocationData.map((location, index) => (
                    <div
                      key={location.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${20 + (index * 15)}%`,
                        top: `${30 + (index * 10)}%`
                      }}
                    >
                      <div className="relative">
                        <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs shadow-lg whitespace-nowrap">
                          {location.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location List */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Locations</h3>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-800'
                  }`}
                />
              </div>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredData.map((location) => (
                <div key={location.id} className={`p-3 rounded-lg border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FaMapMarkerAlt className="w-3 h-3 text-red-500" />
                        <h4 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                          {location.location}
                        </h4>
                      </div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {location.employees} employees
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {location.department} department
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="text-blue-500 hover:text-blue-700 transition-colors">
                        <FaEye className="w-3 h-3" />
                      </button>
                      <button className="text-green-500 hover:text-green-700 transition-colors">
                        <FaLocationArrow className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Location Details Table */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border`}>
        <div className="p-6">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4`}>Location Details</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-white'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Location</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Employees</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Department</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Status</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-200'}`}>
                {filteredData.map((location) => (
                  <tr key={location.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="w-3 h-3 text-red-500" />
                        {location.location}
                      </div>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {location.employees}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {location.department}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        location.status === "Active" 
                          ? theme === 'dark' ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"
                          : theme === 'dark' ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800"
                      }`}>
                        {location.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-500 hover:text-blue-700 transition-colors">
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button className="text-green-500 hover:text-green-700 transition-colors">
                          <FaLocationArrow className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 