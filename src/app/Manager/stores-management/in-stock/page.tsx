"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter } from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

const dummyStock = [
  { item: "Uniform Shirt", category: "Uniform", quantity: 120, lastUpdated: "2025-06-10", image: "/v1/employee/logo-exo%20.png" },
  { item: "Safety Shoes", category: "PPE", quantity: 80, lastUpdated: "2025-06-11", image: "/v1/employee/logo-exo%20.png" },
  { item: "Helmet", category: "PPE", quantity: 40, lastUpdated: "2025-06-12", image: "/v1/employee/logo-exo%20.png" },
  { item: "Gloves", category: "Uniform", quantity: 200, lastUpdated: "2025-06-13", image: "/v1/employee/logo-exo%20.png" },
];

const guidelines = [
  "All items are updated in real-time as per store records.",
  "Click 'View' to see more details about each item.",
  "Contact the stores team for any discrepancies.",
];

const categories = Array.from(new Set(dummyStock.map(s => s.category)));

export default function StoreInStockPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filteredStock = dummyStock.filter(stock => {
    const matchesCategory = categoryFilter ? stock.category === categoryFilter : true;
    const matchesSearch = search ? (
      stock.item.toLowerCase().includes(search.toLowerCase()) ||
      stock.category.toLowerCase().includes(search.toLowerCase())
    ) : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <ManagerDashboardLayout>
      <div
        className={`min-h-screen flex flex-col py-8 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950"
            : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
        }`}
      >
        {/* Header */}
        <div
          className={`rounded-2xl mb-8 p-6 flex items-center gap-6 shadow-lg w-full max-w-7xl mx-auto bg-gradient-to-r ${
            theme === "dark"
              ? "from-blue-900 to-blue-700"
              : "from-blue-500 to-blue-800"
          }`}
        >
          <div
            className={`rounded-xl p-4 flex items-center justify-center ${
              theme === "dark"
                ? "bg-blue-900 bg-opacity-40"
                : "bg-blue-600 bg-opacity-30"
            }`}
          >
            <FaStore className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">In Stock</h1>
            <p className="text-white text-base opacity-90">View and manage in-stock items</p>
          </div>
        </div>
        {/* Main Content */}
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 px-4">
          {/* Left Panel - Info/Guidelines */}
          <div className="lg:w-1/3 w-full">
            <div
              className={`rounded-xl p-6 border shadow-sm sticky top-8 transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-gray-900 border-blue-900"
                  : "bg-white border-blue-100"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-50 text-blue-600"}`}>
                  <FaInfoCircle className="w-5 h-5" />
                </div>
                <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>Stock Guidelines</h2>
              </div>
              <ul className="space-y-4">
                {guidelines.map((g, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-600"}`}><FaBoxOpen className="w-4 h-4" /></span>
                    <span className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{g}</span>
                  </li>
                ))}
              </ul>
              <div className={`mt-8 p-4 rounded-xl border text-blue-700 transition-colors duration-300 ${theme === "dark" ? "bg-blue-900 border-blue-800 text-blue-200" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FaStore className="w-4 h-4" />
                  <span className="font-semibold">Need Help?</span>
                </div>
                <p className="text-sm">Contact <span className="font-medium">stores@zenployee.com</span> for support.</p>
              </div>
            </div>
          </div>
          {/* Right Panel - Search, Filter, Stock Cards */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Search and Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-2 items-start md:items-center">
              <div className="relative w-full md:w-1/2">
                <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search by item or category..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900 placeholder-gray-400" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500 placeholder-gray-500"}`}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <FaFilter className={`w-5 h-5 mr-2 ${theme === "dark" ? "text-blue-200" : "text-blue-600"}`} />
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className={`px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"}`}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Stock Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredStock.length === 0 ? (
                <div className={`col-span-full text-center py-12 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>No items found.</div>
              ) : (
                filteredStock.map((stock, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl border shadow-lg flex flex-col overflow-hidden hover:shadow-xl transition-all duration-200 ${theme === "dark" ? "border-blue-900 bg-gray-900" : "border-blue-100 bg-white"}`}
                  >
                    <div className={`relative w-full h-48 flex items-center justify-center ${theme === "dark" ? "bg-blue-950" : "bg-blue-50"}`}>
                      <Image src={stock.image} alt={stock.item} fill style={{objectFit:'contain'}} sizes="(max-width: 768px) 100vw, 50vw" priority onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }} />
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className={`text-xl font-bold mb-1 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{stock.item}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>{stock.category}</span>
                        </div>
                        <div className={`text-sm mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Quantity: <span className={theme === "dark" ? "font-semibold text-blue-200" : "font-semibold text-blue-700"}>{stock.quantity}</span></div>
                        <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Last Updated: {stock.lastUpdated}</div>
                      </div>
                      <div className="mt-6">
                        <button className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition ${theme === "dark" ? "bg-blue-800 text-white hover:bg-blue-900" : "bg-blue-600 text-white hover:bg-blue-700"}`}>View</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}