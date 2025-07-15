"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter, FaCheckCircle,  FaPlus, FaTimes } from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [selectedDC, setSelectedDC] = useState<DC | null>(null);

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
    ...dc,
    dcNumber: dc.dcNumber,
    date: dc.dcDate.split("T")[0],
    issuedTo: dc.customer,
    status: "Issued", // API does not provide status, default to Issued
  }));

  const statusOptions = Array.from(new Set(mappedDC.map(dc => dc.status)));

  const filteredDC = mappedDC.filter(dc => {
    const matchesStatus = statusFilter ? dc.status === statusFilter : true;
    const matchesSearch = search ? (
      dc.dcNumber.toLowerCase().includes(search.toLowerCase()) ||
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
          className={`rounded-2xl mb-8 p-6 flex items-center gap-6 shadow-lg w-full max-w-7xl mx-auto ${
            theme === "dark"
              ? "bg-gray-900"
              : "bg-gradient-to-r from-blue-500 to-blue-800"
          }`}
        >
          <div
            className={`rounded-xl p-4 flex items-center justify-center ${
              theme === "dark" ? "bg-[#232e3e]" : "bg-blue-600 bg-opacity-30"
            }`}
          >
            <FaStore className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">Delivery Challans (DC)</h1>
            <p className="text-white text-base opacity-90">View and manage DC records</p>
          </div>
          <button
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-base font-semibold shadow transition border-2 ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
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
              <div className={`mt-8 p-4 rounded-xl border text-blue-700 transition-colors duration-300 ${theme === "dark" ? "bg-gray-900 border-blue-800 text-blue-200" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
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
            <div className="w-full rounded-2xl shadow-xl transition-colors duration-300">
              <div className="w-full overflow-x-auto">
                <table className={`min-w-max table-fixed divide-y ${theme === "dark" ? "divide-blue-900" : "divide-blue-100"}`}>
                  <thead className={theme === "dark" ? "bg-blue-950" : "bg-blue-50"}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>DC Number</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Date</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Issued To</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={theme === "dark" ? "divide-y divide-blue-950" : "divide-y divide-blue-50"}>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-blue-600 font-semibold">Loading DC records...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-red-600 font-semibold">{error}</td>
                      </tr>
                    ) : filteredDC.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500">No DC records found.</td>
                      </tr>
                    ) : (
                      filteredDC.map((dc, idx) => (
                        <tr key={idx} className={`transition ${theme === "dark" ? "hover:bg-blue-950" : "hover:bg-blue-100"}`}>
                          <td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-900"}`}>{dc.dcNumber}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>{dc.dcDate ? dc.dcDate.split('T')[0] : ''}</td>
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>{dc.customer}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor('Issued', theme)} ${theme === "dark" ? "text-emerald-200" : "text-emerald-800"}`}>
                              <FaCheckCircle className="w-3 h-3 mr-1" />
                              Issued
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              className={`px-4 py-1 rounded-lg font-semibold text-sm transition shadow ${theme === "dark" ? "bg-blue-900 text-blue-200 hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                              onClick={() => setSelectedDC(dc)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* DC Details Modal */}
            {selectedDC && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                <div className={`rounded-2xl shadow-2xl max-w-lg w-full p-8 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
                  <button
                    className={`absolute top-4 right-4 transition-colors duration-200 ${theme === "dark" ? "text-gray-500 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
                    onClick={() => setSelectedDC(null)}
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                  <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Delivery Challan Details</h2>
                  <div className={`space-y-3 max-h-[60vh] overflow-y-auto pr-2 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>
                    <div><span className={`font-semibold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>DC Number:</span> {selectedDC.dcNumber}</div>
                    <div><span className={`font-semibold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>Date:</span> {selectedDC.dcDate ? selectedDC.dcDate.split('T')[0] : ''}</div>
                    <div><span className={`font-semibold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>Issued To:</span> {selectedDC.customer}</div>
                    <div><span className={`font-semibold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>Status:</span> Issued</div>
                    <div><span className={`font-semibold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>Remarks:</span> {selectedDC.remarks}</div>
                    <div>
                      <span className={`font-semibold ${theme === "dark" ? "text-gray-100" : "text-black"}`}>Items:</span>
                      <ul className="list-disc ml-6 mt-1">
                        {selectedDC.items.map((item, i) => (
                          <li key={i} className={theme === "dark" ? "text-gray-100" : "text-black"}>
                            ID: {item.itemId} (Qty: {item.quantity}, Size: {item.size})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Create DC Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <CreateDCModal
              onClose={() => setShowCreate(false)}
              theme={theme}
              setDcData={setDcData}
            />
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}

interface Item {
  _id: string;
  itemCode: string;
  category: string;
  subCategory: string;
  name: string;
  sizes: string[];
  sizeInventory: {
    size: string;
    quantity: number;
    unit: string;
    price: string;
    openingBalance: number;
    _id: string;
  }[];
  description: string;
}

interface SelectedItem {
  id: string;
  name: string;
  itemCode: string;
  size: string;
  quantity: number;
  employeeId: string;
  unit: string;
  stock: number;
}

type DisplayItem = SelectedItem & { price?: string; remarks?: string };

function CreateDCModal({ onClose, theme, setDcData }: { onClose: () => void; theme: string; setDcData: React.Dispatch<React.SetStateAction<DC[]>> }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [errorItems, setErrorItems] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [qtyInputs, setQtyInputs] = useState<{ [key: string]: string }>({});
  const [issueTo, setIssueTo] = useState("");
  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [address, setAddress] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [perRow, setPerRow] = useState(2);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showGenerateDCModal, setShowGenerateDCModal] = useState(false);
  const [issuedDCs, setIssuedDCs] = useState<{
    issueTo: string;
    department: string;
    purpose: string;
    address: string;
    items: SelectedItem[];
    date: string;
  }[]>([]); // Store issued DCs for table
  const [lastIssuedItems, setLastIssuedItems] = useState<{
    issueTo: string;
    department: string;
    purpose: string;
    address: string;
    items: SelectedItem[];
    date: string;
  } | null>(null);
  const [showOutwardDCModal, setShowOutwardDCModal] = useState(false);
  const [dcForm, setDcForm] = useState({
    customer: '',
    dcNumber: '',
    dcDate: '',
    remarks: '',
    address: '',
  });
  const [savingDC, setSavingDC] = useState(false);
  const [saveDCError, setSaveDCError] = useState('');

  const [showDCPreviewModal, setShowDCPreviewModal] = useState(false);
  const [dcPreviewData, setDcPreviewData] = useState<{
    customer: string;
    dcNumber: string;
    dcDate?: string;
    remarks: string;
    address: string;
    items: SelectedItem[];
    date?: string;
  } | null>(null);
  const [showOutwardSuccessModal, setShowOutwardSuccessModal] = useState(false);


  useEffect(() => {
    setLoadingItems(true);
    setErrorItems(null);
    fetch("https://inventory.zenapi.co.in/api/inventory/items")
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoadingItems(false);
      })
      .catch(() => {
        setErrorItems("Failed to fetch items");
        setLoadingItems(false);
      });
  }, []);

  // Filtered items by search and category
  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Unique categories for filter dropdown
  const categories = Array.from(new Set(items.map(i => i.category)));

  // Add item to selectedItems
  const handleAddItem = (item: Item, size: string, unit: string, stock: number) => {
    const qty = parseInt(qtyInputs[`${item._id}_${size}`] || "");
    if (!qty || qty < 1 || qty > stock) return;
    if (!employeeId) {
      setIssueError("Please enter Employee ID before adding items.");
      return;
    }
    setSelectedItems(prev => [
      ...prev,
      {
        id: item._id,
        name: item.name,
        itemCode: item.itemCode,
        size,
        quantity: qty,
        employeeId,
        unit,
        stock,
      },
    ]);
    setQtyInputs(prev => ({ ...prev, [`${item._id}_${size}`]: "" }));
    setIssueError(null);
  };

  // Remove item from selectedItems
  const handleRemoveItem = (idx: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Issue Items API call
  const handleIssue = async () => {
    setIssuing(true);
    setIssueError(null);
    setIssueSuccess(null);
    if (!issueTo || !department || !purpose || !address || selectedItems.length === 0) {
      setIssueError("Please fill all details and select at least one item.");
      setIssuing(false);
      return;
    }
    try {
      const res = await fetch("https://inventory.zenapi.co.in/api/inventory/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueTo,
          department,
          purpose,
          address,
          items: selectedItems.map(i => ({
            id: i.id,
            quantity: i.quantity,
            size: i.size,
            employeeId: i.employeeId,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to issue items");
      setIssueSuccess(data.message || "Items issued successfully");
      setSelectedItems([]);
      setIssueTo("");
      setDepartment("");
      setPurpose("");
      setAddress("");
      setEmployeeId("");
      setShowSuccessModal(true);
      setLastIssuedItems({
        issueTo,
        department,
        purpose,
        address,
        items: selectedItems,
        date: new Date().toISOString(),
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setIssueError(err.message || "Failed to issue items");
      } else {
        setIssueError("Unknown error");
      }
    } finally {
      setIssuing(false);
    }
  };

  // Pagination for items
  const [page, setPage] = useState(1);
  const itemsPerPage = perRow * 2;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const pagedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // PDF Download Handler (now inside the component)
  async function handleDownloadPDF() {
    if (!dcPreviewData) return;
    const doc = new jsPDF();

    // Add logo from public folder
    const yPosition = 10; // or whatever value you want
    doc.addImage("/v1/employee/exozen_logo1.png", 'PNG', 15, yPosition, 25, 8);


    doc.setFontSize(16);
    doc.text('Exozen Facility Management Services Pvt Ltd', 10, 35);
    doc.setFontSize(10);
    doc.text('25/1, 4th floor, Skip House, Museum road, Near Brigade Tower, Bangalore- 560073 Karnataka', 10, 42);
    doc.setFontSize(12);
    doc.text(`DC No: ${dcPreviewData.dcNumber}`, 10, 52);
    doc.text(`Date: ${dcPreviewData.dcDate}`, 150, 52);
    doc.setFontSize(10);
    doc.text('From:', 10, 60);
    doc.text('Exozen Facility Management Services Pvt Ltd', 10, 65);
    doc.text('25/1, 4th floor, Skip House, Museum road, Near Brigade Tower, Bangalore- 560073 Karnataka', 10, 70);
    doc.text('To:', 120, 60);
    doc.text(dcPreviewData.customer, 120, 65);
    doc.text(`Address: ${dcPreviewData.address}`, 120, 70);
    doc.setFontSize(10);
    doc.text('Remarks:', 10, 80);
    doc.text(dcPreviewData.remarks, 10, 85);
    autoTable(doc, {
      head: [[
        'Sl.No', 'Employee ID', 'Item Code', 'Item Name', 'Size', 'Qty', 'Price', 'Remarks'
      ]],
      body: dcPreviewData.items.map((item: SelectedItem, idx: number) => [
        idx + 1, item.employeeId, item.itemCode, item.name, item.size, item.quantity, (item as DisplayItem).price ?? '', (item as DisplayItem).remarks ?? ''
      ]),
      startY: 90,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
      bodyStyles: { textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
    });
    doc.setFontSize(10);
    // If your table always starts at Y=70, and is not too long, you can use a static value like 150 or 180
    doc.text('Terms & Conditions', 10, 180);
    doc.text('1. Complaints will be entertained if the goods are received within 24hrs of delivery.', 10, 185);
    doc.text('2. Goods are delivered after careful checking.', 10, 190);
    doc.text('Initiated by', 10, 205);
    doc.text('Received by', 80, 205);
    doc.text('Issued by', 150, 205);
    doc.save(`DC-${dcPreviewData.dcNumber}.pdf`);
  }

  return (
    <div className={`rounded-2xl shadow-2xl max-w-7xl w-full p-0 relative transition-colors duration-300 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Header */}
      <div className={`sticky top-0 z-10 flex items-center justify-between px-8 py-6 border-b ${theme === "dark" ? "bg-gray-900 border-blue-900" : "bg-white border-blue-100"}`}>
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
          <FaPlus className="w-5 h-5" /> Issue Items
        </h2>
        <button
          className={`transition-colors duration-200 rounded-full p-2 ${theme === "dark" ? "text-gray-400 hover:text-blue-300" : "text-gray-400 hover:text-blue-600"}`}
          onClick={onClose}
        >
          <FaTimes className="w-6 h-6" />
        </button>
      </div>
      {/* Scrollable Content */}
      <div className="overflow-y-auto px-8 py-6" style={{ flex: 1, minHeight: 0 }}>
        {/* Issue Details Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Issue To</label>
            <input type="text" className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`} placeholder="Name of recipient" value={issueTo} onChange={e => setIssueTo(e.target.value)} />
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Department</label>
            <select className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-black" : "border-gray-300 text-black"}`} value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="" className="text-black">Select department</option>
              <option value="IT" className="text-black">IT</option>
              <option value="HR" className="text-black">HR</option>
              <option value="Admin" className="text-black">Admin</option>
              <option value="Operations" className="text-black">Operations</option>
              <option value="Stores" className="text-black">Stores</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Purpose</label>
            <textarea className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`} placeholder="Briefly describe the purpose of issuance" value={purpose} onChange={e => setPurpose(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Address</label>
            <input type="text" className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`} placeholder="Enter address" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Employee ID (for all items)</label>
            <input type="text" className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`} placeholder="Enter Employee ID" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
          </div>
        </div>
        {/* Item Selection */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FaSearch className="w-5 h-5 text-blue-500" />
            <span className={`font-bold text-xl ${theme === "dark" ? "text-blue-100" : "text-blue-800"}`}>Select Items for Issuance</span>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <button className={`px-4 py-1.5 rounded-lg font-semibold transition ${perRow === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'} shadow`} onClick={() => setPerRow(2)}>2 per row</button>
            <button className={`px-4 py-1.5 rounded-lg font-semibold transition ${perRow === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'} shadow`} onClick={() => setPerRow(3)}>3 per row</button>
            <select className={`px-3 py-1.5 rounded-lg border shadow ${theme === "dark" ? "text-black" : "text-black"}`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All" className="text-black">All</option>
              {categories.map(cat => <option key={cat} value={cat} className="text-black">{cat}</option>)}
            </select>
          </div>
          <input
            type="text"
            className={`w-full px-4 py-2 rounded-lg border mb-6 text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
            placeholder="Search items by name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {loadingItems ? (
            <div className="text-blue-600 font-semibold py-8 text-center">Loading items...</div>
          ) : errorItems ? (
            <div className="text-red-600 font-semibold py-8 text-center">{errorItems}</div>
          ) : (
            <div className={`grid gap-6 mb-6`} style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
              {pagedItems.map(item => (
                <div key={item._id} className={`rounded-2xl border p-6 shadow-lg transition-all duration-200 hover:shadow-2xl ${theme === "dark" ? "bg-gray-800 border-blue-900" : "bg-white border-blue-200"}`}>
                  <div className="font-bold text-lg mb-2 text-blue-700 flex items-center gap-2">
                    {item.name}
                    <span className="text-xs font-normal text-gray-400">({item.category} / {item.subCategory})</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">Code: {item.itemCode}</div>
                  <table className="w-full text-xs mb-2">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left">Size</th>
                        <th className="text-left">Unit</th>
                        <th className="text-left">Stock</th>
                        <th className="text-left">Qty</th>
                        <th className="text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.sizeInventory.map(sizeInv => {
                        const key = `${item._id}_${sizeInv.size}`;
                        const alreadyAdded = selectedItems.some(sel => sel.id === item._id && sel.size === sizeInv.size);
                        return (
                          <tr key={sizeInv.size}>
                            <td className={theme === "dark" ? "text-blue-100" : "text-blue-900"}>{sizeInv.size}</td>
                            <td className={theme === "dark" ? "text-blue-100" : "text-blue-900"}>{sizeInv.unit}</td>
                            <td className={theme === "dark" ? "text-blue-200" : "text-blue-700"}>{sizeInv.quantity}</td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                max={sizeInv.quantity}
                                value={qtyInputs[key] || ""}
                                onChange={e => setQtyInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                className={`w-16 px-2 py-1 rounded border text-base ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
                                disabled={sizeInv.quantity === 0 || alreadyAdded}
                                placeholder="Qty"
                              />
                            </td>
                            <td>
                              {sizeInv.quantity === 0 ? (
                                <button className="px-4 py-1.5 rounded-lg bg-gray-300 text-gray-500 font-semibold cursor-not-allowed" disabled>Out</button>
                              ) : alreadyAdded ? (
                                <button className="px-4 py-1.5 rounded-lg bg-green-600 text-white font-semibold cursor-not-allowed" disabled>Added</button>
                              ) : (
                                <button
                                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                                  onClick={() => handleAddItem(item, sizeInv.size, sizeInv.unit, sizeInv.quantity)}
                                  disabled={
                                    !qtyInputs[key] ||
                                    isNaN(Number(qtyInputs[key])) ||
                                    Number(qtyInputs[key]) < 1 ||
                                    Number(qtyInputs[key]) > sizeInv.quantity
                                  }
                                >
                                  Add
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className={`text-xs mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{item.description}</div>
                </div>
              ))}
            </div>
          )}
          {/* Pagination */}
          <div className="flex justify-between items-center mt-2 mb-4">
            <button
              className="px-4 py-1.5 rounded-lg bg-gray-200 text-gray-500 font-semibold disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >Previous</button>
            <span className={`text-base font-semibold ${theme === "dark" ? "text-blue-100" : "text-blue-800"}`}>Page {page} of {totalPages}</span>
            <button
              className="px-4 py-1.5 rounded-lg bg-gray-200 text-gray-500 font-semibold disabled:opacity-50"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >Next</button>
          </div>
        </div>
        {/* Selected Items Summary */}
        <div className="mb-8">
          <h3 className={`font-bold mb-3 text-lg ${theme === "dark" ? "text-blue-100" : "text-blue-800"}`}>Selected Items for Issuance</h3>
          {selectedItems.length === 0 ? (
            <div className="text-gray-400 text-base">No items selected yet.</div>
          ) : (
            <table className="w-full text-sm border rounded-xl overflow-hidden shadow">
              <thead>
                <tr className={theme === "dark" ? "bg-blue-950" : "bg-blue-100"}>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Employee ID</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item, idx) => (
                  <tr key={idx} className={theme === "dark" ? "hover:bg-blue-950" : "hover:bg-blue-50"}>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.itemCode}</td>
                    <td className="px-3 py-2">{item.size}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2">{item.employeeId}</td>
                    <td className="px-3 py-2">
                      <button className="text-red-600 hover:underline font-semibold" onClick={() => handleRemoveItem(idx)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Error/Success */}
        {issueError && <div className="text-red-600 mb-4 font-semibold text-base">{issueError}</div>}
        {issueSuccess && <div className="text-green-600 mb-4 font-semibold text-base">{issueSuccess}</div>}
      </div>
      {/* Sticky Footer */}
      <div className={`sticky bottom-0 z-10 px-8 py-4 border-t flex justify-end bg-opacity-95 ${theme === "dark" ? "bg-gray-900 border-blue-900" : "bg-white border-blue-100"}`}>
        <button
          className={`px-8 py-3 rounded-xl font-bold text-lg shadow transition ${theme === "dark" ? "bg-blue-800 text-white hover:bg-blue-900" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          onClick={handleIssue}
          disabled={issuing}
        >
          {issuing ? "Issuing..." : "Issue Items"}
        </button>
      </div>
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center">
            <div className="mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Success!</h2>
            <p className="text-gray-600 mb-6">Items issued successfully!</p>
            <div className="flex gap-4 w-full justify-center">
              <button
                className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-100 transition"
                onClick={() => { setShowSuccessModal(false); onClose(); }}
              >
                Close
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                onClick={() => { setShowSuccessModal(false); setShowGenerateDCModal(true); }}
              >
                Generate Outward DC
              </button>
            </div>
          </div>
        </div>
      )}
      {showGenerateDCModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 text-center">Generate Outward DC?</h2>
            <p className="text-gray-600 mb-6 text-center">Do you want to generate an Outward Delivery Challan for these issued items?</p>
            <div className="flex gap-4 w-full justify-center">
              <button
                className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-100 transition"
                onClick={() => { setShowGenerateDCModal(false); onClose(); }}
              >
                No, Finish
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                onClick={() => {
                  if (lastIssuedItems) {
                    setDcForm({
                      customer: lastIssuedItems.issueTo || '',
                      dcNumber: '',
                      dcDate: new Date().toISOString().slice(0, 10),
                      remarks: `Issued to ${lastIssuedItems.issueTo} in ${lastIssuedItems.department} for the purpose of: ${lastIssuedItems.purpose}`,
                      address: lastIssuedItems.address || '',
                    });
                  }
                  setShowGenerateDCModal(false);
                  setShowOutwardDCModal(true);
                }}
              >
                Yes, Generate DC
              </button>
            </div>
          </div>
        </div>
      )}
      {issuedDCs.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Generated Outward DCs</h3>
          <table className="w-full text-sm border rounded-xl overflow-hidden shadow">
            <thead>
              <tr className="bg-blue-100">
                <th className="px-3 py-2">Issue To</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Items</th>
              </tr>
            </thead>
            <tbody>
              {issuedDCs.map((dc, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">{dc.issueTo}</td>
                  <td className="px-3 py-2">{dc.department}</td>
                  <td className="px-3 py-2">{dc.purpose}</td>
                  <td className="px-3 py-2">{dc.address}</td>
                  <td className="px-3 py-2">{new Date(dc.date).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {dc.items.map((item, i) => (
                      <div key={i}>{item.name} ({item.size}) x {item.quantity}</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showOutwardDCModal && lastIssuedItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Delivery Challan Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Customer/Recipient</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 text-base" value={dcForm.customer} onChange={e => setDcForm(f => ({ ...f, customer: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">DC Number</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-blue-100 bg-blue-50 text-base" value={dcForm.dcNumber} onChange={e => setDcForm(f => ({ ...f, dcNumber: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">DC Date</label>
                <input type="date" className="w-full px-4 py-2 rounded-lg border border-gray-200 text-base" value={dcForm.dcDate} onChange={e => setDcForm(f => ({ ...f, dcDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Address</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 text-base" value={dcForm.address} onChange={e => setDcForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Remarks</label>
                <textarea className="w-full px-4 py-2 rounded-lg border border-gray-200 text-base" value={dcForm.remarks} onChange={e => setDcForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-800">Items in Challan</h3>
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center mb-2 text-green-600 font-semibold"><svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>{lastIssuedItems.items.length} item{lastIssuedItems.items.length > 1 ? 's' : ''} in this Challan</div>
              <input type="text" className="w-full px-4 py-2 rounded-lg border border-blue-100 mb-2" placeholder="Search items..." disabled />
              <table className="w-full text-sm rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-blue-200 text-blue-900">
                    <th className="px-3 py-2">Sl.No</th>
                    <th className="px-3 py-2">Employee ID</th>
                    <th className="px-3 py-2">Item Code</th>
                    <th className="px-3 py-2">Item Name</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Price Applicable</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {lastIssuedItems.items.map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{item.employeeId}</td>
                      <td className="px-3 py-2">{item.itemCode}</td>
                      <td className="px-3 py-2 text-blue-800 font-semibold">{item.name}</td>
                      <td className="px-3 py-2"><span className="bg-blue-100 text-blue-700 rounded px-2 py-1 text-xs font-bold">{item.size}</span></td>
                      <td className="px-3 py-2"><span className="bg-green-100 text-green-700 rounded px-2 py-1 text-xs font-bold">{item.quantity}</span></td>
                      <td className="px-3 py-2 text-center"><input type="checkbox" checked readOnly /></td>
                      <td className="px-3 py-2">{(item as DisplayItem).price ?? '—'}</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {saveDCError && <div className="text-red-600 mb-2 font-semibold">{saveDCError}</div>}
            <div className="flex justify-end mt-4">
              <button
                className="px-8 py-3 rounded-xl font-bold text-lg shadow transition bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={savingDC}
                onClick={async () => {
                  setSavingDC(true);
                  setSaveDCError('');
                  try {
                    const res = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        customer: dcForm.customer,
                        dcNumber: dcForm.dcNumber,
                        dcDate: dcForm.dcDate,
                        remarks: dcForm.remarks,
                        address: dcForm.address,
                        items: lastIssuedItems.items.map((item: SelectedItem) => ({
                          id: item.id,
                          quantity: item.quantity,
                          size: item.size,
                          employeeId: item.employeeId,
                        })),
                      }),
                    });
                    if (!res.ok) throw new Error('Failed to save Outward DC');
                    const data = await res.json();
                    setShowOutwardDCModal(false);
                    setDcData((prev: DC[]) => [data, ...prev]);
                    setDcPreviewData({
                      ...dcForm,
                      items: lastIssuedItems.items,
                      date: dcForm.dcDate,
                    });
                    setShowDCPreviewModal(true);
                    if (lastIssuedItems) {
                      setIssuedDCs(prev => [
                        ...prev,
                        {
                          issueTo: lastIssuedItems.issueTo,
                          department: lastIssuedItems.department,
                          purpose: lastIssuedItems.purpose,
                          address: lastIssuedItems.address,
                          items: lastIssuedItems.items,
                          date: dcForm.dcDate,
                        },
                      ]);
                    }
                    setShowOutwardSuccessModal(true);
                  } catch (err: unknown) {
                    if (err instanceof Error) {
                      setSaveDCError(err.message || 'Failed to save Outward DC');
                    } else {
                      setSaveDCError('Unknown error');
                    }
                  } finally {
                    setSavingDC(false);
                  }
                }}
              >
                {savingDC ? 'Saving...' : 'Save Outward DC'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDCPreviewModal && dcPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative print:p-0 print:shadow-none print:bg-white">
            {/* Action buttons */}
            <div className="flex justify-end gap-2 mb-4 print:hidden">
              <button onClick={handleDownloadPDF} className="bg-blue-600 text-white px-4 py-2 rounded">Download as PDF</button>
              <button onClick={() => window.print()} className="bg-green-500 text-white px-4 py-2 rounded">Print</button>
              <button onClick={() => setShowDCPreviewModal(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Close</button>
            </div>
            {/* DC Content */}
            <div id="dc-content" className="bg-white p-6 rounded-xl border print:border-0">
              <div className="flex items-center mb-2">
                <Image src="/v1/employee/exozen_logo1.png" alt="Exozen Logo" width={120} height={40} />
                <div>
                  <div className="text-2xl font-bold text-black dark:text-white">Exozen Facility Management Services Pvt Ltd</div>
                  <div className="text-sm text-black dark:text-white">25/1, 4th floor, Skip House, Museum road, Near Brigade Tower, Bangalore- 560073 Karnataka</div>
                </div>
              </div>
              <div className="flex justify-between items-center border-b pb-2 mb-2">
                <div className="font-bold text-lg text-black dark:text-white">DC No: {dcPreviewData.dcNumber}</div>
                <div className="font-bold text-lg text-black dark:text-white">Date: {dcPreviewData.dcDate}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 border p-2 mb-2">
                <div>
                  <div className="font-bold text-black dark:text-white">From:</div>
                  <div className="text-black dark:text-white">Exozen Facility Management Services Pvt Ltd</div>
                  <div className="text-sm text-black dark:text-white">25/1, 4th floor, Skip House, Museum road, Near Brigade Tower, Bangalore- 560073 Karnataka</div>
                </div>
                <div>
                  <div className="font-bold text-black dark:text-white">To:</div>
                  <div className="text-black dark:text-white">{dcPreviewData.customer}</div>
                  <div className="text-sm text-black dark:text-white">Address: {dcPreviewData.address}</div>
                </div>
              </div>
              <div className="border p-2 mb-2">
                <div className="font-bold mb-1 text-black dark:text-white">Remarks:</div>
                <div className="text-black dark:text-white">{dcPreviewData.remarks}</div>
              </div>
              <table className="w-full text-sm border mb-2">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-2 py-1 border text-black dark:text-white">Sl.No</th>
                    <th className="px-2 py-1 border text-black dark:text-white">Employee ID</th>
                    <th className="px-2 py-1 border text-black dark:text-white">Item Code</th>
                    <th className="px-2 py-1 border text-black dark:text-white">Item Name</th>
                    <th className="px-2 py-1 border text-black dark:text-white">Size</th>
                    <th className="px-2 py-1 border text-black dark:text-white">Qty</th>
                    <th className="px-2 py-1 border text-black dark:text-white">Price</th>
                    <th className="px-2 py-1 border text-black dark:text-white">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {dcPreviewData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1 border text-black dark:text-white">{idx + 1}</td>
                      <td className="px-2 py-1 border text-black dark:text-white">{item.employeeId}</td>
                      <td className="px-2 py-1 border text-black dark:text-white">{item.itemCode}</td>
                      <td className="px-2 py-1 border text-blue-800 font-semibold">{item.name}</td>
                      <td className="px-2 py-1 border text-black dark:text-white">{item.size}</td>
                      <td className="px-2 py-1 border text-black dark:text-white">{item.quantity}</td>
                      <td className="px-2 py-1 border text-black dark:text-white">{(item as DisplayItem).price ?? ''}</td>
                      <td className="px-2 py-1 border text-black dark:text-white">{(item as DisplayItem).remarks ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-2">
                <div className="font-bold underline text-black dark:text-white">Terms & Conditions</div>
                <div className="text-sm text-black dark:text-white">1. Complaints will be entertained if the goods are received within 24hrs of delivery.</div>
                <div className="text-sm text-black dark:text-white">2. Goods are delivered after careful checking.</div>
              </div>
              <div className="flex justify-between mt-8">
                <div>Initiated by<br /><br />_____________</div>
                <div>Received by<br /><br />_____________</div>
                <div>Issued by<br /><br />_____________</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOutwardSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center">
            <div className="mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Saved successfully!</h2>
            <button
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition mt-4"
              onClick={() => setShowOutwardSuccessModal(false)}
            >Close</button>
          </div>
        </div>
      )}
    </div>
  );
}