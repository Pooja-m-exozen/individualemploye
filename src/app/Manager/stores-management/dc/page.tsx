"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter, FaCheckCircle, FaClock, FaPlus, FaTimes } from "react-icons/fa";
import Image from "next/image";

const dummyDC = [
  { dcNumber: "DC001", date: "2025-06-10", item: "Uniform Shirt", quantity: 20, issuedTo: "John Doe", status: "Issued", image: "/v1/employee/logo-exo%20.png" },
  { dcNumber: "DC002", date: "2025-06-11", item: "Safety Shoes", quantity: 10, issuedTo: "Jane Smith", status: "Pending", image: "/v1/employee/logo-exo%20.png" },
  { dcNumber: "DC003", date: "2025-06-12", item: "Helmet", quantity: 5, issuedTo: "Alice Brown", status: "Issued", image: "/v1/employee/logo-exo%20.png" },
];

const guidelines = [
  "All DC records are updated in real-time as per store records.",
  "Click 'View' to see more details about each DC.",
  "Contact the stores team for any discrepancies.",
];

const statusOptions = Array.from(new Set(dummyDC.map(dc => dc.status)));

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "issued":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default function StoreDCPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filteredDC = dummyDC.filter(dc => {
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col py-8">
        {/* Header */}
        <div className="rounded-2xl mb-8 p-6 flex items-center gap-6 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800 w-full max-w-7xl mx-auto">
          <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
            <FaStore className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">Delivery Challans (DC)</h1>
            <p className="text-white text-base opacity-90">View and manage DC records</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 rounded-lg text-base font-semibold shadow hover:bg-blue-50 transition"
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
            <div className="rounded-xl p-6 border bg-white border-blue-100 shadow-sm sticky top-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <FaInfoCircle className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">DC Guidelines</h2>
              </div>
              <ul className="space-y-4">
                {guidelines.map((g, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="p-2 rounded-lg bg-green-50 text-green-600"><FaBoxOpen className="w-4 h-4" /></span>
                    <span className="text-sm text-gray-700 leading-relaxed">{g}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
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
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by DC number, item, or issued to..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <FaFilter className="text-blue-600 w-5 h-5 mr-2" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                >
                  <option value="">All Status</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* DC Table */}
            <div className="overflow-x-auto bg-white rounded-2xl border border-blue-100 shadow-xl">
              <table className="min-w-full divide-y divide-blue-100">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">DC Number</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Issued To</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {filteredDC.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 py-12">No DC records found.</td>
                    </tr>
                  ) : (
                    filteredDC.map((dc, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-3">
                          <div className="relative w-16 h-16 bg-blue-50 rounded-xl overflow-hidden flex items-center justify-center">
                            <Image src={dc.image} alt={dc.item} fill style={{objectFit:'contain'}} sizes="64px" priority onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-blue-800">{dc.dcNumber}</td>
                        <td className="px-4 py-3">{dc.date}</td>
                        <td className="px-4 py-3">{dc.item}</td>
                        <td className="px-4 py-3">{dc.quantity}</td>
                        <td className="px-4 py-3">{dc.issuedTo}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(dc.status)}`}>
                            {dc.status === "Issued" && <FaCheckCircle className="w-3 h-3 mr-1" />}
                            {dc.status === "Pending" && <FaClock className="w-3 h-3 mr-1" />}
                            {dc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button className="px-4 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition">View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Create DC Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-blue-600"
                onClick={() => setShowCreate(false)}
              >
                <FaTimes className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                <FaPlus className="w-5 h-5" /> Create Delivery Challan
              </h2>
              {/* Dummy Form */}
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="Item name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="Quantity" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issued To</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="Employee name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-gray-200">
                    <option value="Issued">Issued</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <button type="button" className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition">Create DC</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
} 