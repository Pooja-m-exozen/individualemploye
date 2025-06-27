"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter, FaCheckCircle, FaClock, FaPlus, FaTimes } from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

const guidelines = [
  "All DC records are updated in real-time as per store records.",
  "Click 'View' to see more details about each DC.",
  "Contact the stores team for any discrepancies.",
];

// TypeScript types for API response
interface DCItem {
  itemId: string;
  quantity: number;
  size: string;
  _id: string;
}

interface DC {
  _id: string;
  customer: string;
  dcNumber: string;
  dcDate: string;
  remarks: string;
  items: DCItem[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ApiResponse {
  dcs: DC[];
}

function getStatusColor(status: string, theme: string) {
  switch (status.toLowerCase()) {
    case "issued":
      return theme === "dark"
        ? "bg-emerald-900 text-emerald-200 border-emerald-700"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending":
      return theme === "dark"
        ? "bg-amber-900 text-amber-200 border-amber-700"
        : "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return theme === "dark"
        ? "bg-gray-700 text-gray-200 border-gray-600"
        : "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default function StoreDCPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [dcData, setDcData] = useState<DC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDCs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("https://inventory.zenapi.co.in/api/inventory/outward-dc");
        if (!res.ok) throw new Error("Failed to fetch DCs");
        const data: ApiResponse = await res.json();
        setDcData(data.dcs);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDCs();
  }, []);

  // Map API data to table structure
  const mappedDC = dcData.map(dc => ({
    dcNumber: dc.dcNumber,
    date: dc.dcDate.split("T")[0],
    item: dc.items.map(i => `ID:${i.itemId} (Qty:${i.quantity}, Size:${i.size})`).join(", "),
    quantity: dc.items.reduce((sum, i) => sum + i.quantity, 0),
    issuedTo: dc.customer,
    status: "Issued", // API does not provide status, default to Issued
    image: "/v1/employee/logo-exo%20.png", // Placeholder image
    remarks: dc.remarks,
  }));

  const statusOptions = Array.from(new Set(mappedDC.map(dc => dc.status)));

  const filteredDC = mappedDC.filter(dc => {
    const matchesStatus = statusFilter ? dc.status === statusFilter : true;
    const matchesSearch = search ? (
      dc.dcNumber.toLowerCase().includes(search.toLowerCase()) ||
      dc.item.toLowerCase().includes(search.toLowerCase()) ||
      dc.issuedTo.toLowerCase().includes(search.toLowerCase())
    ) : true;
    return matchesStatus && matchesSearch;
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">Delivery Challans (DC)</h1>
            <p className="text-white text-base opacity-90">View and manage DC records</p>
          </div>
          <button
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-base font-semibold shadow transition ${
              theme === "dark"
                ? "bg-gray-900 text-blue-200 hover:bg-blue-900"
                : "bg-white text-blue-700 hover:bg-blue-50"
            }`}
            onClick={() => setShowCreate(true)}
          >
            <FaPlus className="w-4 h-4" />
            Create DC
          </button>
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
                <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>DC Guidelines</h2>
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
          {/* Right Panel - Search, Filter, DC Table */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Search and Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-2 items-start md:items-center">
              <div className="relative w-full md:w-1/2">
                <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search by DC number, item, or issued to..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900 placeholder-gray-400" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500 placeholder-gray-500"}`}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <FaFilter className={`w-5 h-5 mr-2 ${theme === "dark" ? "text-blue-200" : "text-blue-600"}`} />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className={`px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"}`}
                >
                  <option value="">All Status</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* DC Table */}
            <div className={`w-full overflow-x-auto rounded-2xl border shadow-xl transition-colors duration-300 ${theme === "dark" ? "bg-gray-900 border-blue-900" : "bg-white border-blue-100"} max-h-[60vh] overflow-y-auto`}>
              {loading ? (
                <div className="py-12 text-center text-blue-600 font-semibold">Loading DC records...</div>
              ) : error ? (
                <div className="py-12 text-center text-red-600 font-semibold">{error}</div>
              ) : (
                <table className={`w-full min-w-[900px] divide-y ${theme === "dark" ? "divide-blue-900" : "divide-blue-100"}`}>
                  <thead className={theme === "dark" ? "bg-blue-950" : "bg-blue-50"}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Image</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>DC Number</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Date</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Item</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Quantity</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Issued To</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={theme === "dark" ? "divide-y divide-blue-950" : "divide-y divide-blue-50"}>
                    {filteredDC.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={`text-center py-12 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>No DC records found.</td>
                      </tr>
                    ) : (
                      filteredDC.map((dc, idx) => (
                        <tr key={idx} className={`transition ${theme === "dark" ? "hover:bg-blue-950" : "hover:bg-blue-50"}`}>
                          <td className="px-4 py-3">
                            <div className={`relative w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center ${theme === "dark" ? "bg-blue-950" : "bg-blue-50"}`}>
                              <Image src={dc.image} alt={dc.item} fill style={{objectFit:'contain'}} sizes="64px" priority onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }} />
                            </div>
                          </td>
                          <td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{dc.dcNumber}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : ""}`}>{dc.date}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : ""}`}>{dc.item}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : ""}`}>{dc.quantity}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : ""}`}>{dc.issuedTo}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(dc.status, theme)}`}>
                              {dc.status === "Issued" && <FaCheckCircle className="w-3 h-3 mr-1" />}
                              {dc.status === "Pending" && <FaClock className="w-3 h-3 mr-1" />}
                              {dc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === "dark" ? "bg-blue-900 text-blue-200 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>View</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        {/* Create DC Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-lg w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
              <button
                className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                onClick={() => setShowCreate(false)}
              >
                <FaTimes className="w-6 h-6" />
              </button>
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                <FaPlus className="w-5 h-5" /> Create Delivery Challan
              </h2>
              {/* Dummy Form */}
              <form className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Item</label>
                  <input type="text" className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100" : "border-gray-200"}`} placeholder="Item name" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Quantity</label>
                  <input type="number" className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100" : "border-gray-200"}`} placeholder="Quantity" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Issued To</label>
                  <input type="text" className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100" : "border-gray-200"}`} placeholder="Employee name" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Date</label>
                  <input type="date" className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100" : "border-gray-200"}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Status</label>
                  <select className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100" : "border-gray-200"}`}>
                    <option value="Issued">Issued</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <button type="button" className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold text-base transition ${theme === "dark" ? "bg-blue-800 text-white hover:bg-blue-900" : "bg-blue-600 text-white hover:bg-blue-700"}`}>Create DC</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}