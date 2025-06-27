"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaProjectDiagram, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ProjectReportPage() {
	const [search, setSearch] = useState("");
	const [records, setRecords] = useState<Record<string, unknown>[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 6;
	const { theme } = useTheme();

	// Fetch project data from API
	useEffect(() => {
		setLoading(true);
		setError(null);
		fetch("https://cafm.zenapi.co.in/api/project/projects")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch data");
				return res.json();
			})
			.then((data) => {
				setRecords(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => {
				setError("Error loading data");
				setLoading(false);
			});
	}, []);

	// Filtering logic
	const filteredRecords = useMemo(() => {
		return records.filter((rec) => {
			const projectName = typeof rec.projectName === "string" ? rec.projectName : "";
			const address = typeof rec.address === "string" ? rec.address : "";
			const matchesSearch =
				search === "" ||
				projectName.toLowerCase().includes(search.toLowerCase()) ||
				address.toLowerCase().includes(search.toLowerCase());
			return matchesSearch;
		});
	}, [search, records]);

	// Pagination logic
	const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
	const paginatedRecords = useMemo(() => {
		const startIdx = (currentPage - 1) * rowsPerPage;
		return filteredRecords.slice(startIdx, startIdx + rowsPerPage);
	}, [filteredRecords, currentPage]);

	// Export Excel functionality
	function downloadExcel() {
		const exportData = filteredRecords.map((rec) => ({
			"Project Name": typeof rec.projectName === "string" ? rec.projectName : "",
			"Address": typeof rec.address === "string" ? rec.address : "",
			"Total Manpower": rec.totalManpower,
			"Updated Date": rec.updatedDate && (typeof rec.updatedDate === "string" || typeof rec.updatedDate === "number" || rec.updatedDate instanceof Date)
				? new Date(rec.updatedDate).toLocaleString()
				: "",
		}));
		const worksheet = XLSX.utils.json_to_sheet(exportData);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
		XLSX.writeFile(workbook, "project_report.xlsx");
	}

	// Export PDF functionality
	function downloadPDF() {
		const doc = new jsPDF();
		doc.text("Project Report", 14, 16);
		const tableColumn = [
			"Project Name",
			"Address",
			"Total Manpower",
			"Updated Date",
		];
		const tableRows: (string | number)[][] = filteredRecords.map((rec) => [
			typeof rec.projectName === "string" ? rec.projectName : "",
			typeof rec.address === "string" ? rec.address : "",
			typeof rec.totalManpower === "number" || typeof rec.totalManpower === "string" ? rec.totalManpower : "",
			rec.updatedDate && (typeof rec.updatedDate === "string" || typeof rec.updatedDate === "number" || rec.updatedDate instanceof Date)
				? new Date(rec.updatedDate).toLocaleString()
				: "",
		]);

		autoTable(doc, {
			head: [tableColumn],
			body: tableRows,
			startY: 22,
			styles: { fontSize: 9 },
			headStyles: { fillColor: [41, 128, 185] },
		});
		doc.save("project_report.pdf");
	}

	// Theme-based classes
	const bgMain =
		theme === "dark"
			? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
			: "bg-gradient-to-br from-indigo-50 via-white to-blue-50";
	const headerBg =
		theme === "dark"
			? "bg-gradient-to-r from-blue-900 to-gray-800"
			: "bg-gradient-to-r from-blue-500 to-blue-800";
	const cardBg = theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-blue-100";
	const tableHead = theme === "dark" ? "bg-gray-800" : "bg-blue-50";
	const tableText = theme === "dark" ? "text-white" : "text-black";
	const tableHeaderText = theme === "dark" ? "text-blue-200" : "text-blue-700";
	const inputBg = theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" : "bg-white border-gray-200 text-black placeholder:text-gray-400";
	const noRecordsText = theme === "dark" ? "text-gray-400" : "text-gray-500";
	const rowHover = theme === "dark" ? "hover:bg-gray-800" : "hover:bg-blue-50";

	return (
		<div className={`min-h-screen font-sans ${bgMain}`}>
			<div className="p-6">
				{/* Header */}
				<div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg ${headerBg}`}>
					<div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
						<FaProjectDiagram className="w-10 h-10 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-white mb-1">Project Report</h1>
						<p className="text-white text-base opacity-90">View and export project details.</p>
					</div>
				</div>
				{/* Filters, Search, Export */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
					<div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
						<div className="relative flex-1 min-w-[180px] max-w-xs">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Search project name or address..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${inputBg}`}
							/>
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
									Project Name
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Address
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Total Manpower
								</th>
								<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}>
									Updated Date
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-blue-50">
							{loading ? (
								<tr>
									<td colSpan={4} className={`px-4 py-12 text-center ${noRecordsText}`}>Loading...</td>
								</tr>
							) : error ? (
								<tr>
									<td colSpan={4} className={`px-4 py-12 text-center ${noRecordsText}`}>{error}</td>
								</tr>
							) : paginatedRecords.length === 0 ? (
								<tr>
									<td colSpan={4} className={`px-4 py-12 text-center ${noRecordsText}`}>No records found</td>
								</tr>
							) : (
								paginatedRecords.map((rec, idx) => {
									const projectName = typeof rec.projectName === "string" ? rec.projectName : "";
									const address = typeof rec.address === "string" ? rec.address : "";
									const totalManpower = typeof rec.totalManpower === "number" || typeof rec.totalManpower === "string" ? rec.totalManpower : "";
									const updatedDate = rec.updatedDate && (typeof rec.updatedDate === "string" || typeof rec.updatedDate === "number" || rec.updatedDate instanceof Date)
										? new Date(rec.updatedDate).toLocaleString()
										: "";
									return (
										<tr key={idx} className={`${rowHover} transition`}>
											<td className={`px-4 py-3 font-bold ${tableText}`}>{projectName}</td>
											<td className={`px-4 py-3 ${tableText}`}>{address}</td>
											<td className={`px-4 py-3 ${tableText}`}>{totalManpower}</td>
											<td className={`px-4 py-3 ${tableText}`}>{updatedDate}</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
					{/* Pagination Controls */}
					{totalPages > 1 && (
						<div className="flex justify-center items-center gap-2 py-4">
							<button
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								className="px-3 py-1 rounded bg-blue-500 text-white disabled:opacity-50"
							>
								Prev
							</button>
							<span className="px-2 text-sm">
								Page {currentPage} of {totalPages}
							</span>
							<button
								disabled={currentPage === totalPages}
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								className="px-3 py-1 rounded bg-blue-500 text-white disabled:opacity-50"
							>
								Next
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}