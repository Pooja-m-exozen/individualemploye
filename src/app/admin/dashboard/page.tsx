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
      <div className="flex flex-col gap-6 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        {/* Clean Tab Navigation */}
        <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} rounded-t-xl`}>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === "analytics"
                ? theme === 'dark' 
                  ? "text-blue-400 border-b-2 border-blue-400 bg-blue-900/20"
                  : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : theme === 'dark'
                  ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaChartBar className="w-4 h-4" />
              Analytics View
            </div>
          </button>
          <button
            onClick={() => setActiveTab("descriptive")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === "descriptive"
                ? theme === 'dark'
                  ? "text-green-400 border-b-2 border-green-400 bg-green-900/20"
                  : "text-green-600 border-b-2 border-green-600 bg-green-50"
                : theme === 'dark'
                  ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaTable className="w-4 h-4" />
              Descriptive View
            </div>
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === "map"
                ? theme === 'dark'
                  ? "text-red-400 border-b-2 border-red-400 bg-red-900/20"
                  : "text-red-600 border-b-2 border-red-600 bg-red-50"
                : theme === 'dark'
                  ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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