"use client";
import React, { useState } from "react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import AnalyticsView from "@/components/dashboard/AnalyticsView";
import DescriptiveView from "@/components/dashboard/DescriptiveView";
import MapView from "@/components/dashboard/MapView";
import { useTheme } from "@/context/ThemeContext";
import { FaChartBar, FaTable, FaMapMarkerAlt } from "react-icons/fa";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("analytics");
  const { theme } = useTheme();

  return (
    <AdminDashboardLayout>
      <div className={`flex flex-col gap-6 p-4 lg:p-6 max-w-7xl mx-auto w-full font-sans ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'
      }`}>
        {/* Clean Tab Navigation */}
        <div className={`flex border-b rounded-t-xl ${theme === 'dark' ? 'bg-[#23272f]' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 rounded-t-xl ${
              activeTab === "analytics"
                ? theme === 'dark'
                  ? 'text-white bg-[#384152] border-b-4 border-white shadow-md'
                  : 'text-white bg-[#1769ff] border-b-4 border-white shadow-md'
                : theme === 'dark'
                  ? 'text-blue-100 hover:text-white hover:bg-[#384152]'
                  : 'text-blue-100 hover:text-white hover:bg-blue-600/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaChartBar className="w-4 h-4" />
              Analytics View
            </div>
          </button>
          <button
            onClick={() => setActiveTab("descriptive")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 rounded-t-xl ${
              activeTab === "descriptive"
                ? theme === 'dark'
                  ? 'text-white bg-[#384152] border-b-4 border-white shadow-md'
                  : 'text-white bg-[#1769ff] border-b-4 border-white shadow-md'
                : theme === 'dark'
                  ? 'text-blue-100 hover:text-white hover:bg-[#384152]'
                  : 'text-blue-100 hover:text-white hover:bg-blue-600/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaTable className="w-4 h-4" />
              Descriptive View
            </div>
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 rounded-t-xl ${
              activeTab === "map"
                ? theme === 'dark'
                  ? 'text-white bg-[#384152] border-b-4 border-white shadow-md'
                  : 'text-white bg-[#1769ff] border-b-4 border-white shadow-md'
                : theme === 'dark'
                  ? 'text-blue-100 hover:text-white hover:bg-[#384152]'
                  : 'text-blue-100 hover:text-white hover:bg-blue-600/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaMapMarkerAlt className="w-4 h-4" />
              Map View
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'} rounded-b-xl shadow-md border border-t-0`}>
          <div className="p-6">
            {activeTab === "analytics" ? (
              // Analytics Content - Using the imported component
              <AnalyticsView />
            ) : activeTab === "descriptive" ? (
              // Descriptive Content - Using the imported component
              <DescriptiveView />
            ) : (
              // Map Content - Using the imported component
              <MapView />
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
} 