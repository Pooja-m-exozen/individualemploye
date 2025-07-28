"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaSearch, FaFilter, FaEye, FaTimes } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

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
          className={`rounded-2xl mb-8 p-6 flex items-center gap-6 shadow-lg w-full max-w-7xl mx-auto transition-colors duration-300 ${
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
        <div className="max-w-7xl mx-auto w-full px-4">
          {/* Search and Filter Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
            <div className="relative w-full md:w-1/3">
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

          {/* Table Section */}
          <div className={`rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
            theme === "dark" ? "bg-gray-900 border-blue-900" : "bg-white border-blue-100"
          }`}>
            {loading ? (
              <div className={`p-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Loading...</div>
            ) : error ? (
              <div className="p-12 text-center text-red-500">{error}</div>
            ) : filteredStock.length === 0 ? (
              <div className={`p-12 text-center ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>No items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${theme === "dark" ? "bg-gray-800" : "bg-blue-50"}`}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Item
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Category
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Sub Category
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Total Quantity
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Sizes
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Last Updated
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                    {filteredStock.map((item, idx) => {
                      const totalQty = item.sizeInventory?.reduce((sum: number, s: SizeInventory) => sum + (s.quantity || 0), 0);
                      return (
                        <tr key={item._id || idx} className={`hover:${theme === "dark" ? "bg-gray-800" : "bg-blue-50"} transition-colors duration-200`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div>
                                <div className={`text-sm font-medium ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                                  {item.name}
                                </div>
                                {item.description && (
                                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                    {item.description.length > 50 ? `${item.description.substring(0, 50)}...` : item.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {item.subCategory ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-700"}`}>
                                {item.subCategory}
                              </span>
                            ) : (
                              <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                              {totalQty}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {item.sizeInventory && item.sizeInventory.length > 0 ? (
                                item.sizeInventory.slice(0, 3).map((sz: SizeInventory) => (
                                  <span
                                    key={sz._id}
                                    className={`px-2 py-1 rounded text-xs font-semibold border ${theme === "dark" ? "bg-blue-900 border-blue-400 text-white" : "bg-white border-blue-700 text-blue-700"}`}
                                  >
                                    {sz.size}: {sz.quantity}
                                  </span>
                                ))
                              ) : (
                                <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                              )}
                              {item.sizeInventory && item.sizeInventory.length > 3 && (
                                <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                  +{item.sizeInventory.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                              {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme === "dark" ? "bg-blue-800 text-white hover:bg-blue-900 focus:ring-blue-900" : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300"}`}
                              onClick={() => { setSelectedItem(item); setModalOpen(true); }}
                            >
                              <FaEye className="w-3 h-3" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal for item details */}
        {modalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`rounded-xl shadow-xl max-w-lg w-full p-6 relative ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <div className={`${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                <button
                  className={`absolute top-4 right-4 text-2xl hover:opacity-70 transition-opacity ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  onClick={() => setModalOpen(false)}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <div>
                    <h2 className={`text-xl font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{selectedItem.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>{selectedItem.category}</span>
                      {selectedItem.subCategory && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-50 text-green-700"}`}>{selectedItem.subCategory}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold">Description:</span>
                    <p className={`mt-1 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>{selectedItem.description || "No description"}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Notes:</span>
                    <p className={`mt-1 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>{selectedItem.notes || "None"}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Instructions:</span>
                    <p className={`mt-1 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>{selectedItem.instructions || "None"}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Total Quantity:</span>
                    <span className={`ml-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                      {selectedItem.sizeInventory?.reduce((sum: number, s: SizeInventory) => sum + (s.quantity || 0), 0)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Sizes:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedItem.sizeInventory?.map((sz: SizeInventory) => (
                        <span
                          key={sz._id}
                          className={`px-3 py-1 rounded text-xs font-semibold border ${theme === "dark" ? "bg-blue-900 border-blue-400 text-white" : "bg-white border-blue-700 text-blue-700"}`}
                        >
                          {sz.size}: {sz.quantity} {sz.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Last Updated: {selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toLocaleString() : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}