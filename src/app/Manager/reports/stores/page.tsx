"use client";
import React, { useState, useMemo } from "react";
import { FaSearch, FaStore, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

const dummyStoresRecords = [
	{
		storeId: "STR001",
		storeName: "Central Store",
		manager: "John Doe",
		status: "In Stock",
	},
	{
		storeId: "STR002",
		storeName: "West Store",
		manager: "Jane Smith",
		status: "Out of Stock",
	},
	{
		storeId: "STR003",
		storeName: "East Store",
		manager: "Alice Brown",
		status: "In Stock",
	},
	{
		storeId: "STR004",
		storeName: "North Store",
		manager: "Bob Lee",
		status: "In Stock",
	},
	// ...more records
];

const statusOptions = ["All Statuses", "In Stock", "Out of Stock"];

function downloadExcel() {
	alert("Excel export coming soon!");
}
function downloadPDF() {
	alert("PDF export coming soon!");
}

export default function StoresReportPage() {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("All Statuses");
	const { theme } = useTheme();

	const filteredRecords = useMemo(() => {
		return dummyStoresRecords.filter((rec) => {
			const matchesSearch =
				search === "" ||
				rec.storeName.toLowerCase().includes(search.toLowerCase()) ||
				rec.storeId.toLowerCase().includes(search.toLowerCase()) ||
				rec.manager.toLowerCase().includes(search.toLowerCase());
			const matchesStatus =
				statusFilter === "All Statuses" || rec.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [search, statusFilter]);

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

	return (
		<div className={`min-h-screen font-sans ${bgMain}`}>
			<div className="p-6">
				{/* Header */}
				<div
					className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${headerBg}`}
				>
					<div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
						<FaStore className="w-10 h-10 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-white mb-1">
							Stores Report
						</h1>
						<p className="text-white text-base opacity-90">
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
								{statusOptions.map((status) => (
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
									Store ID
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Store Name
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Manager
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Status
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-blue-50">
							{filteredRecords.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className={`px-4 py-12 text-center ${noRecordsText}`}
									>
										No records found
									</td>
								</tr>
							) : (
								filteredRecords.map((rec, idx) => (
									<tr
										key={idx}
										className={`${rowHover} transition`}
									>
										<td className={`px-4 py-3 font-bold ${tableText}`}>
											{rec.storeId}
										</td>
										<td className={`px-4 py-3 ${tableText}`}>
											{rec.storeName}
										</td>
										<td className={`px-4 py-3 ${tableText}`}>
											{rec.manager}
										</td>
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