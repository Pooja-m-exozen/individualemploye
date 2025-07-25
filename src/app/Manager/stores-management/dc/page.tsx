"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaStore, FaInfoCircle, FaBoxOpen, FaSearch, FaFilter, FaCheckCircle,  FaPlus, FaTimes } from "react-icons/fa";
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
  employeeId: string;
  itemCode: string;
  name: string;
  price: string;
  remarks: string;
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

// Add new interface for preview data
// interface DCPreviewData {
//   dcNumber: string;
//   dcDate: string;
//   customer: string;
//   address: string;
//   remarks: string;
//   items: Array<{
//     itemCode: string;
//     name: string;
//     size: string;
//     quantity: number;
//     employeeId: string;
//   }>;
// }

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
    date: dc.dcDate ? dc.dcDate.split("T")[0] : "",
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

  // Download DC as PDF (only required fields)
  const handleDownloadDC = (dc: DC) => {
    const doc = new jsPDF();
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable = undefined;

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 12;

    // Logo
    try {
      doc.addImage("/v1/employee/exozen_logo1.png", 'PNG', 10, y, 25, 12);
    } catch {
      // Ignore logo error
    }

    // Company Name & Address
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Exozen Facility Management Services Pvt Ltd", pageWidth / 2, y + 7, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("25/1, 4th floor, Skip House, Museum road, Near Brigade Tower, Bangalore- 560073 Karnataka", pageWidth / 2, y + 13, { align: "center" });

    // Outer border
    doc.setDrawColor(180);
    doc.rect(5, 6, pageWidth - 10, 170, 'S');

    y += 20;

    // DC No and Date row
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`DC No: ${dc.dcNumber}`, 12, y);
    doc.text(`Date: ${dc.dcDate ? dc.dcDate.split("T")[0] : ""}`, pageWidth - 60, y);

    y += 6;

    // From/To boxes
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("From:", 12, y + 5);
    doc.text("To:", pageWidth / 2 + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.rect(12, y + 7, pageWidth / 2 - 18, 18);
    doc.text("Exozen Facility Management Services Pvt Ltd\n25/1, 4th floor, Skip House, Museum road, Near Brigade Tower, Bangalore - 560073 Karnataka", 14, y + 12, { maxWidth: pageWidth / 2 - 22 });
    doc.rect(pageWidth / 2 + 2, y + 7, pageWidth / 2 - 18, 18);
    doc.text(dc.customer || "", pageWidth / 2 + 4, y + 12, { maxWidth: pageWidth / 2 - 22 });

    y += 28;

    // Remarks box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Remarks:", 12, y + 5);
    doc.setFont("helvetica", "normal");
    doc.rect(12, y + 7, pageWidth - 28, 12);
    doc.text(dc.remarks || "", 14, y + 13, { maxWidth: pageWidth - 32 });

    y += 22;

    // Table - Only required columns: Sl.No, Customer, DC Number, Quantity, Size
    autoTable(doc, {
      startY: y,
      head: [["Sl.No", "Customer", "DC Number", "Quantity", "Size"]],
      body: dc.items.map((item, idx) => [
        idx + 1,
        dc.customer,
        dc.dcNumber,
        item.quantity,
        item.size
      ]),
      theme: "grid",
      headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 12, right: 12 },
      tableWidth: pageWidth - 24,
    });

    // Get Y after table
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;

    // Terms & Conditions
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions", 12, finalY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery.", 12, finalY + 13);
    doc.text("2. Goods are delivered after careful checking.", 12, finalY + 18);

    // Signature lines
    const sigY = finalY + 32;
    doc.setDrawColor(120);
    doc.line(20, sigY, 60, sigY);
    doc.text("Initiated by", 28, sigY + 5);
    doc.line(pageWidth / 2 - 20, sigY, pageWidth / 2 + 20, sigY);
    doc.text("Received by", pageWidth / 2 - 8, sigY + 5);
    doc.line(pageWidth - 60, sigY, pageWidth - 20, sigY);
    doc.text("Issued by", pageWidth - 50, sigY + 5);

    doc.save(`DC_${dc.dcNumber}.pdf`);
  };

  // Download all DCs as summary PDF (styled, with logo and table)
  const handleDownloadAllDCs = () => {
    const doc = new jsPDF();
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable = undefined;

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 12;

    // Logo (optional, handle error if not found)
    try {
      doc.addImage("/v1/employee/exozen_logo1.png", 'PNG', 10, y, 25, 12);
    } catch {
      // Ignore logo error
    }

    // Company Name & Address
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Exozen Facility Management Services Pvt Ltd", pageWidth / 2, y + 7, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("25/1, 4th floor, Skip House, Museum road, Near Brigade Tower, Bangalore- 560073 Karnataka", pageWidth / 2, y + 13, { align: "center" });

    y += 22;

    // Table Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Delivery Challan Summary", pageWidth / 2, y, { align: "center" });

    y += 8;

    // Table - Only required columns: Sl.No, Customer, DC Number, Quantity, Size
    autoTable(doc, {
      startY: y,
      head: [["Sl.No", "Customer", "DC Number", "Quantity", "Size"]],
      body: dcData.map((dc, idx) => [
        idx + 1,
        dc.customer,
        dc.dcNumber,
        dc.items.map(item => item.quantity).join(", "),
        dc.items.map(item => item.size).join(", ")
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 12, right: 12 },
      tableWidth: pageWidth - 24,
    });

    // Get Y after table
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;

    // Terms & Conditions
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions", 14, finalY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("1. Complaints will be entertained if the goods are received within 24hrs of delivery.", 14, finalY + 13);
    doc.text("2. Goods are delivered after careful checking.", 14, finalY + 18);

    // Footer
    doc.setFontSize(10);
    doc.text("Initiated by", 14, finalY + 32);
    doc.text("Received by", 80, finalY + 32);
    doc.text("Issued by", 150, finalY + 32);

    doc.save("All_DCs_Summary.pdf");
  };

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
            {/* Download All DCs PDF Button */}
            <div className="flex justify-end mb-2">
              <button
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-base font-semibold shadow transition border-2 ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
                onClick={handleDownloadAllDCs}
              >
                <FaBoxOpen className="w-4 h-4" />
                Download All DCs PDF
              </button>
            </div>
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
                          <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>{dc.status}</td>
                          <td className={`px-4 py-3`}>
                            <div className="flex gap-2">
                              <button
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
                                onClick={() => setSelectedDC(dc)}
                              >
                                View
                              </button>
                              <button
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${theme === "dark" ? "bg-green-900 text-green-200 border-green-700 hover:bg-green-800" : "bg-green-600 text-white border-green-700 hover:bg-green-700"}`}
                                onClick={() => handleDownloadDC(dc)}
                              >
                                Download DC
                              </button>
                            </div>
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
                  <div className={`space-y-4 max-h-[60vh] overflow-y-auto pr-2 ${theme === "dark" ? "text-gray-100" : "text-black"}`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold">DC Number:</span>
                        <span className="ml-2">{selectedDC.dcNumber}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Date:</span>
                        <span className="ml-2">{selectedDC.dcDate ? selectedDC.dcDate.split('T')[0] : ''}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Customer:</span>
                        <span className="ml-2">{selectedDC.customer}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold block mb-2">Items:</span>
                      <div className="space-y-3">
                        {selectedDC.items.map((item, i) => (
                          <div key={i} className={`rounded-lg p-4 border flex flex-col md:flex-row md:items-center gap-2 ${theme === "dark" ? "bg-blue-950 border-blue-900" : "bg-blue-50 border-blue-100"}`}>
                            <div className="flex-1 flex flex-wrap gap-4">
                              <div><span className="font-semibold">Sl.No:</span> {i + 1}</div>
                              <div><span className="font-semibold">DC Number:</span> {selectedDC.dcNumber}</div>
                              <div><span className="font-semibold">Customer:</span> {selectedDC.customer}</div>
                              <div><span className="font-semibold">Quantity:</span> {item.quantity}</div>
                              <div><span className="font-semibold">Size:</span> {item.size}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`mt-4 p-3 rounded-lg border ${theme === "dark" ? "bg-yellow-900 border-yellow-700 text-yellow-200" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
                      <span className="font-semibold">Remarks:</span> {selectedDC.remarks}
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

// interface SelectedItem {
//   id: string;
//   name: string;
//   itemCode: string;
//   size: string;
//   quantity: number;
//   employeeId: string;
//   unit: string;
//   stock: number;
// }

// type DisplayItem = SelectedItem & { price?: string; remarks?: string };

// Add these new interfaces
interface UniformApiResponse {
  success: boolean;
  message: string;
  uniforms: Array<{
    items: unknown;
    _id: string;
    employeeId: string;
    fullName: string;
    designation: string;
    gender: string;
    projectName: string;
    uniformType: string[];
    size: Record<string, string>;
    qty: number;
    uniformRequested: boolean;
    approvalStatus: string;
    issuedStatus: string;
    remarks: string;
    requestDate: string;
    type: string[];
  }>;
}

// Step-by-step CreateDCModal
function CreateDCModal({ onClose, theme, setDcData }: { onClose: () => void; theme: string; setDcData: React.Dispatch<React.SetStateAction<DC[]>> }) {
  // Prefilled for quick testing
  const [customer, setCustomer] = useState('');
  const [dcNumber, setDcNumber] = useState('');
  const [dcDate, setDcDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [address, setAddress] = useState('');
  const [projectList, setProjectList] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [uniformRequests, setUniformRequests] = useState<UniformApiResponse['uniforms']>([]);
  const [selectedRequest, setSelectedRequest] = useState<UniformApiResponse['uniforms'][0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveDCError, setSaveDCError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Fetch all uniform requests and extract unique project names
  useEffect(() => {
    const fetchUniformData = async () => {
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        const data: UniformApiResponse = await res.json();
        if (data.success) {
          const uniqueProjects = Array.from(new Set(data.uniforms.map(u => u.projectName)));
          setProjectList(uniqueProjects);
        }
      } catch {
        setError("Failed to fetch projects");
      }
    };
    fetchUniformData();
  }, []);

  // Filter uniform requests when project is selected
  useEffect(() => {
    const fetchUniformRequests = async () => {
      setLoading(true);
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        const data: UniformApiResponse = await res.json();
        if (data.success) {
          const filteredRequests = data.uniforms.filter(
            req => req.projectName === selectedProject && req.approvalStatus === 'Approved'
          );
          setUniformRequests(filteredRequests);
        }
      } catch {
        setError("Failed to fetch uniform requests");
      } finally {
        setLoading(false);
      }
    };

    if (selectedProject) {
      fetchUniformRequests();
    }
  }, [selectedProject]);

  // Set customer to employee name when uniform request is selected
  useEffect(() => {
    if (selectedRequest) {
      setCustomer(selectedRequest.fullName);
    }
  }, [selectedRequest]);

  // Always enabled, always sends the required payload
  const handleCreateDC = async () => {
    if (!selectedRequest) {
      setSaveDCError("Please select a uniform request.");
      return;
    }
    try {
      // Fill all item fields for DC and for PDF/view
      const items = [
        {
          id: selectedRequest._id,
          employeeId: selectedRequest.employeeId,
          itemCode: Array.isArray(selectedRequest.items) && selectedRequest.items[0] && typeof selectedRequest.items[0] === 'object' && 'type' in selectedRequest.items[0] ? (selectedRequest.items[0] as { type?: string }).type || "" : "",
          name: Array.isArray(selectedRequest.items) && selectedRequest.items[0] && typeof selectedRequest.items[0] === 'object' && 'type' in selectedRequest.items[0] ? (selectedRequest.items[0] as { type?: string }).type || "" : "",
          size: typeof selectedRequest.size === 'object' && selectedRequest.uniformType && selectedRequest.uniformType[0] && selectedRequest.size[selectedRequest.uniformType[0]] ? selectedRequest.size[selectedRequest.uniformType[0]] : '',
          quantity: selectedRequest.qty || 1,
          price: "", // Add price if available
          remarks: selectedRequest.remarks || ""
        }
      ];

      const payload = {
        customer: selectedRequest.fullName,
        dcNumber,
        dcDate,
        remarks,
        address,
        items
      };

      const res = await fetch('https://inventory.zenapi.co.in/api/inventory/outward-dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setDcData(prev => [
          {
            _id: data.dcId,
            customer: payload.customer,
            dcNumber: payload.dcNumber,
            dcDate: payload.dcDate,
            remarks: payload.remarks,
            items: items.map(item => ({
              itemId: item.id,
              employeeId: item.employeeId,
              itemCode: item.itemCode,
              name: item.name,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              remarks: item.remarks,
              _id: item.id,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0,
          },
          ...prev,
        ]);
        setSaveDCError(null);
        onClose();
      } else {
        setSaveDCError(data.message || 'Failed to save Outward DC');
      }
    } catch (err: unknown) {
      setSaveDCError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Step navigation
  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // Stepper labels
  const stepLabels = ["Project", "Uniform Request", "DC Details"];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col relative overflow-y-auto max-h-[90vh] transition-colors duration-300 ${theme === "dark" ? "bg-[#181f2a]" : "bg-white"}`}>
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${theme === "dark" ? "bg-[#181f2a] border-blue-900" : "bg-white border-blue-100"}`}>
          <div className="flex items-center gap-3">
            <FaBoxOpen className={`w-7 h-7 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`} />
            <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Generate Delivery Challan</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition ${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-100"}`}>
            <FaTimes className={`w-5 h-5 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`} />
          </button>
        </div>
        {/* Horizontal Stepper */}
        <div className="flex justify-center items-center gap-0 py-6 px-4">
          {stepLabels.map((label, idx) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 flex items-center justify-center rounded-full font-bold border-2 transition-all duration-200
                  ${step === idx + 1
                    ? theme === "dark"
                      ? "bg-blue-700 text-white border-blue-400 shadow-lg"
                      : "bg-blue-600 text-white border-blue-400 shadow-lg"
                    : theme === "dark"
                      ? "bg-gray-800 text-gray-400 border-gray-700"
                      : "bg-gray-200 text-gray-500 border-gray-300"
                  }`}>
                  {idx + 1}
                </div>
                <span className={`text-xs mt-2 font-medium transition-colors duration-200 ${step === idx + 1
                  ? theme === "dark" ? "text-blue-300" : "text-blue-700"
                  : theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  {label}
                </span>
              </div>
              {idx < stepLabels.length - 1 && (
                <div className={`w-12 h-1 mx-2 rounded transition-all duration-200
                  ${step > idx + 1
                    ? theme === "dark" ? "bg-blue-700" : "bg-blue-600"
                    : theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                  }`} />
              )}
            </React.Fragment>
          ))}
        </div>
        {/* Modal Content */}
        <div className="p-6 flex flex-col gap-8">
          {/* Step 1: Project Selection */}
          {step === 1 && (
            <div className={`rounded-xl border shadow-sm p-6 transition-colors duration-300
              ${theme === "dark" ? "bg-[#232e3e] border-blue-900" : "bg-blue-50 border-blue-100"}`}>
              <div className="flex items-center gap-2 mb-4">
                <FaStore className={`w-5 h-5 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`} />
                <span className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-blue-900"}`}>Project Selection</span>
              </div>
              <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Select Project</label>
              <select
                value={selectedProject}
                onChange={e => {
                  setSelectedProject(e.target.value);
                  setSelectedRequest(null);
                }}
                className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
                  ${theme === "dark"
                    ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-900"
                    : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"
                  }`}
              >
                <option value="">Select a project</option>
                {projectList.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
              {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  disabled={!selectedProject}
                  onClick={nextStep}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${selectedProject
                      ? theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {/* Step 2: Uniform Request Selection */}
          {step === 2 && (
            <div className={`rounded-xl border shadow-sm p-6 transition-colors duration-300
              ${theme === "dark" ? "bg-[#233e2e] border-green-900" : "bg-green-50 border-green-100"}`}>
              <div className="flex items-center gap-2 mb-4">
                <FaCheckCircle className={`w-5 h-5 ${theme === "dark" ? "text-green-200" : "text-green-700"}`} />
                <span className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-green-900"}`}>Uniform Request</span>
              </div>
              <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Uniform Requests</label>
              {loading ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                  Loading...
                </div>
              ) : (
                <select
                  value={selectedRequest?._id || ""}
                  onChange={e => {
                    const req = uniformRequests.find(r => r._id === e.target.value) || null;
                    setSelectedRequest(req);
                  }}
                  className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
                    ${theme === "dark"
                      ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-green-900"
                      : "bg-white border-gray-200 text-gray-900 focus:ring-green-500"
                    }`}
                >
                  <option value="">Select a request</option>
                  {uniformRequests.map(request => (
                    <option key={request._id} value={request._id}>
                      {request.fullName} ({request.employeeId})
                    </option>
                  ))}
                </select>
              )}
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={prevStep}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${theme === "dark" ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!selectedRequest}
                  onClick={nextStep}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${selectedRequest
                      ? theme === "dark" ? "bg-green-700 text-white hover:bg-green-800" : "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {/* Step 3: DC Details & Preview */}
          {step === 3 && (
            <>
              <div className={`rounded-xl border shadow-sm p-6 transition-colors duration-300
                ${theme === "dark" ? "bg-[#232e3e] border-indigo-900" : "bg-indigo-50 border-indigo-100"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <FaInfoCircle className={`w-5 h-5 ${theme === "dark" ? "text-indigo-200" : "text-indigo-700"}`} />
                  <span className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-indigo-900"}`}>DC Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Customer</label>
                    <input type="text" value={customer} onChange={e => setCustomer(e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
                        ${theme === "dark"
                          ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                          : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                       }`} />
                  </div>
                  <div>
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>DC Number</label>
                    <input type="text" value={dcNumber} onChange={e => setDcNumber(e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
                        ${theme === "dark"
                          ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                          : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                       }`} />
                  </div>
                  <div>
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>DC Date</label>
                    <input type="date" value={dcDate} onChange={e => setDcDate(e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
                        ${theme === "dark"
                          ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                          : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                       }`} />
                  </div>
                  <div>
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Remarks</label>
                    <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
                        ${theme === "dark"
                          ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                          : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                       }`} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block mb-2 font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-all duration-200
                        ${theme === "dark"
                          ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-indigo-900"
                          : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                       }`} />
                  </div>
                </div>
              </div>
              {/* Error Message */}
              {saveDCError && (
                <div className={`p-3 rounded-lg border flex items-center gap-2 mt-4
                  ${theme === "dark" ? "bg-red-900 border-red-700 text-red-200" : "bg-red-100 border-red-200 text-red-700"}`}>
                  <FaTimes className="w-4 h-4" />
                  {saveDCError}
                </div>
              )}
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={prevStep}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${theme === "dark" ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateDC}
                  className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all duration-200
                    ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  <FaPlus className="w-4 h-4" />
                  Generate DC
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}