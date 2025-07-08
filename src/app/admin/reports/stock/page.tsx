"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaStore, FaFileExport, FaChevronDown } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // updated import

// Define a type for inventory item
interface InventoryItem {
	itemCode: string;
	name: string;
	category: string;
	status: string;
	totalQty: number;
	sizeInventory?: { quantity?: number }[];
}

export default function StoresReportPage() {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("All Statuses");
	const { theme } = useTheme();

	const [records, setRecords] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 10;

	useEffect(() => {
		setLoading(true);
		setError(null);
		fetch("https://inventory.zenapi.co.in/api/inventory/items")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch data");
				return res.json();
			})
			.then((data: InventoryItem[]) => {
				// Map API data to table format
				const mapped = data.map((item) => {
					const totalQty = Array.isArray(item.sizeInventory)
						? item.sizeInventory.reduce(
								(sum: number, s) => sum + (s.quantity || 0),
								0
						  )
						: 0;
					return {
						itemCode: item.itemCode,
						name: item.name,
						category: item.category,
						status: totalQty > 0 ? "In Stock" : "Out of Stock",
						totalQty,
					};
				});
				setRecords(mapped);
				setLoading(false);
			})
			.catch(() => {
				setError("Error loading data");
				setLoading(false);
			});
	}, []);

	const filteredRecords = useMemo(() => {
		return records.filter((rec) => {
			const matchesSearch =
				search === "" ||
				rec.name.toLowerCase().includes(search.toLowerCase()) ||
				rec.itemCode.toLowerCase().includes(search.toLowerCase()) ||
				rec.category.toLowerCase().includes(search.toLowerCase());
			const matchesStatus =
				statusFilter === "All Statuses" || rec.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [search, statusFilter, records]);

	const paginatedRecords = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
	const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

	// Theme-based classes
	const bgMain =
		theme === "dark"
			? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
			: "bg-gradient-to-br from-indigo-50 via-white to-blue-50";
	const headerBg =
		theme === "dark"
			? "bg-gradient-to-r from-blue-900 to-gray-800"
			: "bg-gradient-to-r from-blue-500 to-blue-800";
	const cardBg =
		theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-blue-100";
	const tableHead = theme === "dark" ? "bg-gray-800" : "bg-blue-50";
	const tableText = theme === "dark" ? "text-white" : "text-black";
	const tableHeaderText = theme === "dark" ? "text-blue-200" : "text-blue-700";
	const inputBg =
		theme === "dark"
			? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
			: "bg-white border-gray-200 text-black placeholder:text-gray-400";
	const selectBg =
		theme === "dark"
			? "bg-gray-800 border-gray-700 text-white"
			: "bg-white border-gray-200 text-black";
	const noRecordsText = theme === "dark" ? "text-gray-400" : "text-gray-500";
	const statusInStock =
		theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800";
	const statusOutStock =
		theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800";
	const rowHover = theme === "dark" ? "hover:bg-gray-800" : "hover:bg-blue-50";

	// Export Excel functionality
	function downloadExcel() {
		const exportData = filteredRecords.map((rec) => ({
			"Item Code": rec.itemCode,
			Name: rec.name,
			Category: rec.category,
			Status: rec.status,
			"Total Qty": rec.totalQty,
		}));
		const worksheet = XLSX.utils.json_to_sheet(exportData);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
		XLSX.writeFile(workbook, "inventory_report.xlsx");
	}

	// Export PDF functionality
	function downloadPDF() {
		const doc = new jsPDF();
		doc.text("Inventory Report", 14, 16);
		const tableColumn = ["Item Code", "Name", "Category", "Status", "Total Qty"];
		const tableRows = filteredRecords.map((rec) => [
			rec.itemCode,
			rec.name,
			rec.category,
			rec.status,
			rec.totalQty,
		]);
		autoTable(doc, {
			head: [tableColumn],
			body: tableRows,
			startY: 22,
			styles: { fontSize: 9 },
			headStyles: { fillColor: [41, 128, 185] },
		});
		doc.save("inventory_report.pdf");
	}

	return (
		<div className={`min-h-screen font-sans ${bgMain}`}>
			<div className="p-6">
				{/* Header */}
				<div className={`rounded-2xl mb-0 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : headerBg}`}>
					<div className="flex items-center gap-6">
						<div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
							<FaStore className="w-10 h-10 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-white mb-1">Stores Report</h1>
						</div>
					</div>
					{/* Filter Row: Search, Status, Export Dropdown */}
					<div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto">
						<div className="relative w-full md:w-auto">
							<input
								type="text"
								placeholder="Search store name, ID, or category..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className={`pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${inputBg}`}
							/>
							<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
								<FaSearch className="w-4 h-4" />
							</span>
						</div>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-auto ${selectBg}`}
						>
							{["All Statuses", "In Stock", "Out of Stock"].map((status) => (
								<option key={status} value={status}>{status}</option>
							))}
						</select>
						{/* Export Dropdown */}
						<div className="relative">
							<button
								className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' : 'bg-white text-blue-900 border-gray-300 hover:bg-blue-50'}`}
								onClick={() => setDownloadDropdownOpen((open) => !open)}
							>
								<span>Export</span>
								<FaChevronDown className="w-4 h-4" />
							</button>
							{downloadDropdownOpen && (
								<div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-black'}`}>
									<button
										onClick={() => { setDownloadDropdownOpen(false); downloadExcel(); }}
										className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-100 dark:hover:bg-gray-700 text-left"
									>
										<FaFileExport className="text-green-600" /> Excel
									</button>
									<button
										onClick={() => { setDownloadDropdownOpen(false); downloadPDF(); }}
										className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-100 dark:hover:bg-gray-700 text-left"
									>
										<FaFileExport className="text-red-600" /> PDF
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
				{/* Table */}
				<div className={`overflow-x-auto rounded-lg border shadow-lg mt-6 ${cardBg}`}>
					<table className="min-w-full divide-y divide-blue-100 text-sm">
						<thead className={`${tableHead} sticky top-0 z-10`}>
							<tr>
								<th className={`px-4 py-3 text-left font-bold uppercase w-16 ${tableHeaderText}`}>Sl No</th>
								<th className={`px-4 py-3 text-left font-bold uppercase w-32 ${tableHeaderText}`}>Item Code</th>
								<th className={`px-4 py-3 text-left font-bold uppercase w-48 ${tableHeaderText}`}>Name</th>
								<th className={`px-4 py-3 text-left font-bold uppercase w-40 ${tableHeaderText}`}>Category</th>
								<th className={`px-4 py-3 text-left font-bold uppercase w-32 ${tableHeaderText}`}>Status</th>
								<th className={`px-4 py-3 text-left font-bold uppercase w-32 ${tableHeaderText}`}>Total Qty</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-blue-50">
							{loading ? (
								<tr>
									<td colSpan={6} className={`px-4 py-12 text-center ${noRecordsText}`}>Loading...</td>
								</tr>
							) : error ? (
								<tr>
									<td colSpan={6} className={`px-4 py-12 text-center ${noRecordsText}`}>{error}</td>
								</tr>
							) : paginatedRecords.length === 0 ? (
								<tr>
									<td colSpan={6} className={`px-4 py-12 text-center ${noRecordsText}`}>No records found</td>
								</tr>
							) : (
								paginatedRecords.map((rec, idx) => (
									<tr key={idx} className={`${rowHover} transition`}>
										<td className={`px-4 py-3 font-bold w-16 ${tableText}`}>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
										<td className={`px-4 py-3 font-bold w-32 ${tableText}`}>{rec.itemCode}</td>
										<td className={`px-4 py-3 w-48 ${tableText}`}>{rec.name}</td>
										<td className={`px-4 py-3 w-40 ${tableText}`}>{rec.category}</td>
										<td className="px-4 py-3 w-32">
											<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${rec.status === "In Stock" ? statusInStock : statusOutStock}`}>{rec.status}</span>
										</td>
										<td className={`px-4 py-3 w-32 ${tableText}`}>{rec.totalQty}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="flex justify-center items-center mt-6 gap-1 flex-wrap">
						<button
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className={`px-2 py-1 rounded font-medium text-xs transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								currentPage === 1
									? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
									: theme === 'dark'
										? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
										: 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
							}`}
						>
							Prev
						</button>
						{/* Page numbers with ellipsis */}
						{(() => {
							const pageButtons = [];
							let start = Math.max(1, currentPage - 1);
							let end = Math.min(totalPages, currentPage + 1);
							if (currentPage === 1) end = Math.min(totalPages, 3);
							if (currentPage === totalPages) start = Math.max(1, totalPages - 2);
							if (start > 1) {
								pageButtons.push(
									<button key={1} onClick={() => setCurrentPage(1)} className={`px-2 py-1 rounded font-semibold text-xs border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentPage === 1 ? (theme === 'dark' ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-blue-600 text-white border-blue-600 shadow-lg') : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100')}`}>1</button>
								);
								if (start > 2) pageButtons.push(<span key="start-ellipsis" className="px-1 text-xs">…</span>);
							}
							for (let i = start; i <= end; i++) {
								if (i === 1 || i === totalPages) continue;
								pageButtons.push(
									<button key={i} onClick={() => setCurrentPage(i)} className={`px-2 py-1 rounded font-semibold text-xs border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentPage === i ? (theme === 'dark' ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-blue-600 text-white border-blue-600 shadow-lg') : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100')}`}>{i}</button>
								);
							}
							if (end < totalPages) {
								if (end < totalPages - 1) pageButtons.push(<span key="end-ellipsis" className="px-1 text-xs">…</span>);
								pageButtons.push(
									<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={`px-2 py-1 rounded font-semibold text-xs border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentPage === totalPages ? (theme === 'dark' ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-blue-600 text-white border-blue-600 shadow-lg') : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-blue-800 hover:text-white' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100')}`}>{totalPages}</button>
								);
							}
							return pageButtons;
						})()}
						<button
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className={`px-2 py-1 rounded font-medium text-xs transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								currentPage === totalPages
									? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
									: theme === 'dark'
										? 'bg-gray-800 text-white border-gray-700 hover:bg-blue-800'
										: 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
							}`}
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}