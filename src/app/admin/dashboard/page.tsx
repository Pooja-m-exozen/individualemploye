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
      <div className={`min-h-screen w-full font-sans ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'
      }`}>
        {/* Radio Button Navigation */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-4 items-center w-full">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="viewType"
                  value="analytics"
                  checked={activeTab === "analytics"}
                  onChange={() => setActiveTab("analytics")}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaChartBar className="inline mr-2" />
                  Analytics View
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="viewType"
                  value="descriptive"
                  checked={activeTab === "descriptive"}
                  onChange={() => setActiveTab("descriptive")}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaTable className="inline mr-2" />
                  Descriptive View
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="viewType"
                  value="map"
                  checked={activeTab === "map"}
                  onChange={() => setActiveTab("map")}
                  className="accent-blue-600"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <FaMapMarkerAlt className="inline mr-2" />
                  Map View
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Tab Content - Full Screen */}
        <div className="min-h-[calc(100vh-120px)]">
          <div className="h-full">
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