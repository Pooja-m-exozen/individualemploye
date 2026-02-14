"use client";
import React, { useState, useEffect } from "react";
import CoordinatorDashboardLayout from "@/components/dashboard/CoordinatorDashboardLayout";
import { FaStore, FaSearch, FaEdit, FaSave, FaTimes } from "react-icons/fa";
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
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [editingQuantities, setEditingQuantities] = useState<{[key: string]: number}>({});
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  // Initialize date filters as empty to show all data by default
  useEffect(() => {
    setFromDate("");
    setToDate("");
  }, []);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleEditStock = (item: StockItem) => {
    setEditingItem(item);
    const initialQuantities: {[key: string]: number} = {};
    item.sizeInventory?.forEach(size => {
      initialQuantities[size._id] = size.quantity;
    });
    setEditingQuantities(initialQuantities);
    setUpdateModalOpen(true);
  };

  const handleQuantityChange = (sizeId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingQuantities(prev => ({
      ...prev,
      [sizeId]: numValue
    }));
  };

  const handleUpdateStock = async () => {
    if (!editingItem) return;
    
    setUpdating(true);
    try {
      const updatedSizeInventory = editingItem.sizeInventory?.map(size => ({
        ...size,
        quantity: editingQuantities[size._id] || 0
      }));

      const response = await fetch(`https://inventory.zenapi.co.in/api/inventory/items/${editingItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editingItem,
          sizeInventory: updatedSizeInventory,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update stock');
      }

      const updatedItem = await response.json();
      
      // Update the stock state
      setStock(prev => prev.map(item => 
        item._id === editingItem._id ? updatedItem : item
      ));

      setToast({ type: "success", message: "Stock updated successfully!" });
      setUpdateModalOpen(false);
      setEditingItem(null);
      setEditingQuantities({});
    } catch (error) {
      setToast({ 
        type: "error", 
        message: error instanceof Error ? error.message : "Failed to update stock" 
      });
    } finally {
      setUpdating(false);
    }
  };

  // Extract unique categories and subcategories from API data
  const categories = Array.from(new Set(stock.map((s) => s.category)));
  const subCategories = Array.from(new Set(stock.map((s) => s.subCategory).filter(Boolean))) as string[];

  // Enhanced filtering with date range
  const filteredStock = stock.filter((item) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower) ||
      item.subCategory?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower);

    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesSubCategory = subCategoryFilter ? item.subCategory === subCategoryFilter : true;
    
    // Date range filtering
    let matchesFromDate = true;
    let matchesToDate = true;
    if (fromDate && item.updatedAt) {
      matchesFromDate = item.updatedAt.slice(0, 10) >= fromDate;
    }
    if (toDate && item.updatedAt) {
      matchesToDate = item.updatedAt.slice(0, 10) <= toDate;
    }
    
    return matchesSearch && matchesCategory && matchesSubCategory && matchesFromDate && matchesToDate;
  });

  return (
    <CoordinatorDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-base flex items-center gap-3 animate-fade-in ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}>
            {toast.type === "success" ? "✓" : "✗"} {toast.message}
          </div>
        )}
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Category Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Categories</option>
                {categories.map((category: string) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            {/* Sub Category Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={subCategoryFilter}
                onChange={e => setSubCategoryFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="">All Sub Categories</option>
                {subCategories.map((subCategory: string) => (
                  <option key={subCategory} value={subCategory}>{subCategory}</option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search items, categories, or descriptions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="From Date"
              />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="To Date"
              />
              <button
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                onClick={() => {
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
                }}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading inventory items...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Item Name</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Category</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Sub Category</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Total Quantity</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Sizes</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Last Updated</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className="px-2 py-1 sticky left-0 z-20"></th>
                    <th className="px-2 py-1">
                      <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Filter Item" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className="px-2 py-1">
                      <select 
                        value={categoryFilter} 
                        onChange={e => setCategoryFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </th>
                    <th className="px-2 py-1">
                      <select 
                        value={subCategoryFilter} 
                        onChange={e => setSubCategoryFilter(e.target.value)} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        <option value="">All</option>
                        {subCategories.map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}
                      </select>
                    </th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`px-4 py-12 text-center border ${theme === "dark" ? "text-gray-400 border-blue-800" : "text-gray-500 border-blue-200"}`}>No inventory items found</td>
                    </tr>
                  ) : filteredStock.map((item, idx) => {
                    const totalQty = item.sizeInventory?.reduce((sum: number, s: SizeInventory) => sum + (s.quantity || 0), 0);
                    return (
                      <tr key={item._id || idx} className={`${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-50"} transition even:bg-gray-50 dark:even:bg-gray-900`}>
                        <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                        <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}><div className="truncate" title={item.name}>{item.name}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={item.category}>{item.category}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}><div className="truncate" title={item.subCategory || "-"}>{item.subCategory || "-"}</div></td>
                        <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                            totalQty && totalQty > 0 
                              ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              : theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                          }`}>
                            {totalQty || 0}
                          </span>
                        </td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
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
                              <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>+{item.sizeInventory.length - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'}</td>
                        <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                          <div className="flex gap-1 justify-center">
                            <button
                              className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                  : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                              }`}
                              onClick={() => { setSelectedItem(item); setModalOpen(true); }}
                              title="View Details"
                            >
                              <FaStore className="w-3 h-3" />
                            </button>
                            <button
                              className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'border-orange-500 text-orange-400 bg-gray-800 hover:bg-gray-700 focus:ring-orange-400' 
                                  : 'border-orange-500 text-orange-600 bg-white hover:bg-orange-50 focus:ring-orange-400'
                              }`}
                              onClick={() => handleEditStock(item)}
                              title="Update Stock"
                            >
                              <FaEdit className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>

        {/* Item Detail Modal */}
        {modalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold" onClick={() => setModalOpen(false)}>✕</button>
              <h2 className="text-2xl font-bold mb-4 text-center">Inventory Item Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <FaStore className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{selectedItem.name}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>{selectedItem.category}</span>
                      {selectedItem.subCategory && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"}`}>{selectedItem.subCategory}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><b>Total Quantity:</b> 
                    <span className={`ml-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                      {selectedItem.sizeInventory?.reduce((sum: number, s: SizeInventory) => sum + (s.quantity || 0), 0)}
                    </span>
                  </div>
                  <div><b>Last Updated:</b> {selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toLocaleDateString() : '-'}</div>
                  <div className="col-span-2">
                    <b>Description:</b> 
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedItem.description || 'No description provided'}</span>
                  </div>
                  <div className="col-span-2">
                    <b>Notes:</b> 
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedItem.notes || 'No notes provided'}</span>
                  </div>
                  <div className="col-span-2">
                    <b>Instructions:</b> 
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedItem.instructions || 'No instructions provided'}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <b>Sizes & Quantities:</b>
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
              </div>
            </div>
          </div>
        )}

        {/* Update Stock Modal */}
        {updateModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`p-6 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${
              theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Update Stock - {editingItem.name}</h3>
                <button
                  onClick={() => {
                    setUpdateModalOpen(false);
                    setEditingItem(null);
                    setEditingQuantities({});
                  }}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}>
                  <h4 className="font-semibold mb-3">Current Stock Quantities</h4>
                  <div className="grid gap-3">
                    {editingItem.sizeInventory?.map((size) => (
                      <div key={size._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded text-sm font-semibold ${
                            theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                          }`}>
                            {size.size}
                          </span>
                          <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Unit: {size.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            Quantity:
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editingQuantities[size._id] || 0}
                            onChange={(e) => handleQuantityChange(size._id, e.target.value)}
                            className={`w-20 px-3 py-1 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              theme === "dark" 
                                ? "bg-gray-600 border-gray-500 text-white" 
                                : "bg-white border-gray-300 text-gray-900"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setUpdateModalOpen(false);
                      setEditingItem(null);
                      setEditingQuantities({});
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold border transition ${
                      theme === "dark" 
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStock}
                    disabled={updating}
                    className="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <FaSave className="w-4 h-4" />
                        Update Stock
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CoordinatorDashboardLayout>
  );
}