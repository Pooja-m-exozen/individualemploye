"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter } from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
// import type { MouseEvent } from "react";

interface SizeInventory {
  _id: string;
  size: string;
  quantity: number;
  unit: string;
}

interface StockItem {
  _id: string;
  name: string;
  category: string;
  subCategory?: string;
  description?: string;
  notes?: string;
  instructions?: string;
  updatedAt?: string;
  sizeInventory?: SizeInventory[];
}

const guidelines = [
  "All items are updated in real-time as per store records.",
  "Click 'View' to see more details about each item.",
  "Contact the stores team for any discrepancies.",
];

export default function StoreInStockPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  // Fetch inventory data
  useEffect(() => {
    setLoading(true);
    fetch("https://inventory.zenapi.co.in/api/inventory/items")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch inventory");
        return res.json();
      })
      .then((data: StockItem[]) => {
        setStock(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load inventory.");
        setLoading(false);
      });
  }, []);

  // Extract unique categories from API data
  const categories = Array.from(new Set(stock.map((s) => s.category)));

  // Filter logic
  const filteredStock = stock.filter((item) => {
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesSearch = search
      ? (
          item.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.category?.toLowerCase().includes(search.toLowerCase()) ||
          item.subCategory?.toLowerCase().includes(search.toLowerCase())
        )
      : true;
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
          className={`rounded-2xl mb-12 p-6 flex items-center gap-6 shadow-lg w-full max-w-7xl mx-auto transition-colors duration-300 ${
            theme === "dark"
              ? "bg-[#2d3748]"
              : "bg-gradient-to-r from-blue-500 to-blue-800"
          }`}
        >
          <div
            className={`rounded-xl p-4 flex items-center justify-center ${
              theme === "dark"
                ? "bg-[#232b38]"
                : "bg-blue-600 bg-opacity-30"
            }`}
          >
            <FaStore className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">In Stock</h1>
            <p className="text-white text-base opacity-90 mt-3">View and manage in-stock items</p>
          </div>
        </div>
        {/* Main Content */}
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 px-4 pt-4">
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
              <div className={`mt-8 p-4 rounded-xl border text-blue-700 transition-colors duration-300 ${theme === "dark" ? "bg-gray-900 border-blue-800 text-blue-200" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className={`col-span-full text-center py-12 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Loading...</div>
              ) : error ? (
                <div className={`col-span-full text-center py-12 text-red-500`}>{error}</div>
              ) : filteredStock.length === 0 ? (
                <div className={`col-span-full text-center py-12 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>No items found.</div>
              ) : (
                filteredStock.map((item, idx) => {
                  // Calculate total quantity
                  const totalQty = item.sizeInventory?.reduce((sum: number, s: SizeInventory) => sum + (s.quantity || 0), 0);
                  return (
                    <div
                      key={item._id || idx}
                      className={`rounded-2xl border shadow-lg flex flex-col overflow-hidden hover:shadow-xl transition-all duration-200 ${theme === "dark" ? "border-blue-900 bg-gray-900" : "border-blue-100 bg-white"}`}
                    >
                      <div className={`relative w-full h-48 flex items-center justify-center ${theme === "dark" ? "bg-blue-950" : "bg-blue-50"}`}>
                        <Image
                          src={"/v1/employee/logo-exo%20.png"}
                          alt={item.name}
                          fill
                          style={{ objectFit: "contain" }}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority
                          onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                        />
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className={`text-xl font-bold mb-1 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{item.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>{item.category}</span>
                            {item.subCategory && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-700"}`}>{item.subCategory}</span>
                            )}
                          </div>
                          <div className={`text-sm mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Total Quantity: <span className={theme === "dark" ? "font-semibold text-blue-200" : "font-semibold text-blue-700"}>{totalQty}</span>
                          </div>
                          {/* Per-size inventory */}
                          {item.sizeInventory && item.sizeInventory.length > 0 && (
                            <div className="mb-2">
                              <div className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Sizes:</div>
                              <div className="flex flex-wrap gap-2">
                                {item.sizeInventory.map((sz: SizeInventory) => (
                                  <span
                                    key={sz._id}
                                    className={`px-2 py-1 rounded text-xs font-semibold border ${theme === "dark" ? "bg-blue-900 border-blue-400 text-white" : "bg-white border-blue-700 text-blue-700"}`}
                                  >
                                    {sz.size}: {sz.quantity} {sz.unit}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Last Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-"}</div>
                        </div>
                        <div className="mt-6">
                          <button
                            className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme === "dark" ? "bg-blue-800 text-white hover:bg-blue-900 focus:ring-blue-900" : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300"}`}
                            onClick={() => { setSelectedItem(item); setModalOpen(true); }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Modal for item details */}
            {modalOpen && selectedItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6 relative">
                  <div className="text-gray-900 dark:text-white">
                    <button
                      className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => setModalOpen(false)}
                      aria-label="Close"
                    >
                      &times;
                    </button>
                    <div className="flex items-center gap-4 mb-4">
                      <Image
                        src={"/v1/employee/logo-exo%20.png"}
                        alt={selectedItem.name}
                        width={60}
                        height={60}
                        className="rounded-lg bg-blue-50 dark:bg-blue-950"
                      />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 dark:text-blue-200">{selectedItem.name}</h2>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-200">{selectedItem.category}</span>
                          {selectedItem.subCategory && (
                            <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold dark:bg-green-900 dark:text-green-200">{selectedItem.subCategory}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Description:</span>{" "}
                      <span>{selectedItem.description || "No description"}</span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Notes:</span>{" "}
                      <span>{selectedItem.notes || "None"}</span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Instructions:</span>{" "}
                      <span>{selectedItem.instructions || "None"}</span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Total Quantity:</span>{" "}
                      <span>
                        {selectedItem.sizeInventory?.reduce((sum: number, s: SizeInventory) => sum + (s.quantity || 0), 0)}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Sizes:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedItem.sizeInventory?.map((sz: SizeInventory) => (
                          <span
                            key={sz._id}
                            className={`px-2 py-1 rounded text-xs font-semibold border ${theme === "dark" ? "bg-blue-900 border-blue-400 text-white" : "bg-white border-blue-700 text-blue-700"}`}
                          >
                            {sz.size}: {sz.quantity} {sz.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      Last Updated: {selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toLocaleString() : "-"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}