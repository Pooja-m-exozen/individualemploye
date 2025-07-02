"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaStore, FaFileExport } from "react-icons/fa";
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

	// Theme-based classes
	const bgMain =
		theme === "dark"
			? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
			: "bg-gradient-to-br from-indigo-50 via-white to-blue-50";

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
				<div
					className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${
						theme === "dark"
							? "bg-[#323a48]"
							: "bg-gradient-to-r from-blue-500 to-blue-800"
					}`}
				>
					<div
						className={`$${
							theme === "dark" ? "bg-[#232a36]" : "bg-blue-600 bg-opacity-30"
						} rounded-xl p-4 flex items-center justify-center`}
					>
						<FaStore className="w-10 h-10 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-white mb-1">
							Stores Report
						</h1>
						<p className={theme === "dark" ? "text-blue-200 text-base" : "text-white text-base opacity-90"}>
							View and export store details.
						</p>
					</div>
				</div>
				{/* Filters, Search, Export */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
					<div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
						<div className="relative flex-1 min-w-[180px] max-w-xs">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Search store name, ID, or manager..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${inputBg}`}
							/>
						</div>
						<div className="relative w-40 min-w-[120px]">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${selectBg}`}
							>
								{["All Statuses", "In Stock", "Out of Stock"].map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="flex gap-2 justify-end">
						<button
							onClick={downloadExcel}
							className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
						>
							<FaFileExport /> Export Excel
						</button>
						<button
							onClick={downloadPDF}
							className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
						>
							<FaFileExport /> Export PDF
						</button>
					</div>
				</div>
				{/* Table */}
				<div className={`overflow-x-auto rounded-xl border shadow-xl ${cardBg}`}>
					<table className="min-w-full divide-y divide-blue-100">
						<thead className={`${tableHead} sticky top-0 z-10`}>
							<tr>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Item Code
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Name
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Category
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Status
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Total Qty
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-blue-50">
							{loading ? (
								<tr>
									<td colSpan={5} className={`px-4 py-12 text-center ${noRecordsText}`}>
										Loading...
									</td>
								</tr>
							) : error ? (
								<tr>
									<td colSpan={5} className={`px-4 py-12 text-center ${noRecordsText}`}>
										{error}
									</td>
								</tr>
							) : filteredRecords.length === 0 ? (
								<tr>
									<td colSpan={5} className={`px-4 py-12 text-center ${noRecordsText}`}>
										No records found
									</td>
								</tr>
							) : (
								filteredRecords.map((rec, idx) => (
									<tr key={idx} className={`${rowHover} transition`}>
										<td className={`px-4 py-3 font-bold ${tableText}`}>{rec.itemCode}</td>
										<td className={`px-4 py-3 ${tableText}`}>{rec.name}</td>
										<td className={`px-4 py-3 ${tableText}`}>{rec.category}</td>
										<td className="px-4 py-3">
											<span
												className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
													rec.status === "In Stock"
														? statusInStock
														: statusOutStock
												}`}
											>
												{rec.status}
											</span>
										</td>
										<td className={`px-4 py-3 ${tableText}`}>{rec.totalQty}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}