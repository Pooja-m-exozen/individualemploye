"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaTshirt, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Add a type for uniform record
interface UniformRecord {
	employeeId: string;
	fullName: string;
	projectName: string;
	designation: string;
	issuedStatus: string;
	_id?: string;
	// ...other fields if needed
}

function downloadExcel(records: UniformRecord[]) {
	const data = records.map((rec) => ({
		"Employee ID": rec.employeeId,
		"Name": rec.fullName,
		"Project": rec.projectName,
		"Designation": rec.designation,
		"Status": rec.issuedStatus,
	}));
	const worksheet = XLSX.utils.json_to_sheet(data);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Uniform Report");
	XLSX.writeFile(workbook, "uniform_report.xlsx");
}

function downloadPDF(records: UniformRecord[]) {
	const doc = new jsPDF();
	doc.text("Uniform Report", 14, 16);
	autoTable(doc, {
		startY: 22,
		head: [["Employee ID", "Name", "Project", "Designation", "Status"]],
		body: records.map((rec) => [
			rec.employeeId,
			rec.fullName,
			rec.projectName,
			rec.designation,
			rec.issuedStatus,
		]),
	});
	doc.save("uniform_report.pdf");
}

export default function UniformReportPage() {
	const { theme } = useTheme();
	const [search, setSearch] = useState("");
	const [projectFilter, setProjectFilter] = useState("All Projects");
	const [designationFilter, setDesignationFilter] = useState("All Designations");
	const [statusFilter, setStatusFilter] = useState("All Statuses");
	const [uniformRecords, setUniformRecords] = useState<UniformRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 20;

	// Sorting states
	const [sortBy, setSortBy] = useState<"projectName" | "designation" | "issuedStatus" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	// Dynamic dropdown options
	const projectOptions = useMemo(() => {
		const projects = new Set(
			uniformRecords.map((rec) => rec.projectName).filter(Boolean)
		);
		return ["All Projects", ...Array.from(projects).sort()];
	}, [uniformRecords]);
	const designationOptions = useMemo(() => {
		const designations = new Set(
			uniformRecords.map((rec) => rec.designation).filter(Boolean)
		);
		return ["All Designations", ...Array.from(designations).sort()];
	}, [uniformRecords]);
	const statusOptions = ["All Statuses", "Issued", "Pending", "Rejected"];

	useEffect(() => {
		async function fetchUniforms() {
			setLoading(true);
			setError("");
			try {
				const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
				const data = await res.json();
				if (data.success && Array.isArray(data.uniforms)) {
					setUniformRecords(data.uniforms);
				} else {
					setError("Failed to load uniform records.");
				}
			} catch {
				setError("Error fetching data.");
			}
			setLoading(false);
		}
		fetchUniforms();
	}, []);

	const filteredRecords = useMemo(() => {
		let records = uniformRecords.filter((rec) => {
			const matchesSearch =
				search === "" ||
				rec.fullName?.toLowerCase().includes(search.toLowerCase()) ||
				rec.employeeId?.toLowerCase().includes(search.toLowerCase());
			const matchesProject =
				projectFilter === "All Projects" || rec.projectName === projectFilter;
			const matchesDesignation =
				designationFilter === "All Designations" ||
				rec.designation === designationFilter;
			const matchesStatus =
				statusFilter === "All Statuses" || rec.issuedStatus === statusFilter;
			return (
				matchesSearch &&
				matchesProject &&
				matchesDesignation &&
				matchesStatus
			);
		});
		if (sortBy) {
			records = [...records].sort((a, b) => {
				const aVal = (a[sortBy] || "").toString().toLowerCase();
				const bVal = (b[sortBy] || "").toString().toLowerCase();
				if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
				if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
				return 0;
			});
		}
		return records;
	}, [search, projectFilter, designationFilter, statusFilter, uniformRecords, sortBy, sortOrder]);

	const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
	const paginatedRecords = useMemo(() => {
		const start = (currentPage - 1) * rowsPerPage;
		return filteredRecords.slice(start, start + rowsPerPage);
	}, [filteredRecords, currentPage]);

	return (
		<div
			className={`min-h-screen font-sans ${
				theme === "dark"
					? "bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950"
					: "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
			}`}
		>
			<div className="p-2 md:p-6">
				{/* Header */}
				<div
					className={`rounded-2xl mb-4 md:mb-8 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 shadow-lg ${
						theme === "dark"
							? "bg-[#323a48]"
							: "bg-gradient-to-r from-blue-500 to-blue-800"
					}`}
				>
					<div
						className={`$${
							theme === "dark" ? "bg-[#232a36]" : "bg-blue-600 bg-opacity-30"
						} rounded-xl p-3 md:p-4 flex items-center justify-center`}
					>
						<FaTshirt className="w-8 h-8 md:w-10 md:h-10 text-white" />
					</div>
					<div>
						<h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
							Uniform Report
						</h1>
						<p className={theme === "dark" ? "text-blue-200 text-base md:text-lg" : "text-white text-base md:text-lg opacity-90"}>
							View and export uniform issuance details for employees.
						</p>
					</div>
				</div>
				{/* Filters, Search, Export */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-4 md:mb-6 w-full">
					<div className="flex flex-col md:flex-row flex-wrap gap-2 items-stretch w-full md:w-auto">
						<div className="relative w-full md:w-40 min-w-[140px]">
							<select
								value={projectFilter}
								onChange={(e) => setProjectFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-xs md:text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-black"}`}
							>
								{projectOptions.map((project) => (
									<option key={project} value={project}>
										{project}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full md:w-44 min-w-[130px]">
							<select
								value={designationFilter}
								onChange={(e) => setDesignationFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-xs md:text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-black"}`}
							>
								{designationOptions.map((designation) => (
									<option key={designation} value={designation}>
										{designation}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full md:w-40 min-w-[120px]">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-xs md:text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-black"}`}
							>
								{statusOptions.map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full md:flex-1 min-w-[180px] max-w-xs">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Search employee name or ID..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 text-xs md:text-base ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-black"}`}
							/>
						</div>
					</div>
					<div className="flex flex-col md:flex-row gap-2 w-full md:w-auto justify-end">
						<button
							onClick={() => downloadExcel(filteredRecords)}
							className={`w-full md:w-auto px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-xs md:text-base ${theme === "dark" ? "bg-green-700 text-white hover:bg-green-800" : "bg-green-500 text-white hover:bg-green-600"}`}
						>
							<FaFileExport /> Export Excel
						</button>
						<button
							onClick={() => downloadPDF(filteredRecords)}
							className={`w-full md:w-auto px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-xs md:text-base ${theme === "dark" ? "bg-red-700 text-white hover:bg-red-800" : "bg-red-500 text-white hover:bg-red-600"}`}
						>
							<FaFileExport /> Export PDF
						</button>
					</div>
				</div>
				{/* Table */}
				<div className={`overflow-x-auto rounded-xl border shadow-xl ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-blue-100 bg-white"}`}>
					{loading ? (
						<div className="p-8 text-center text-blue-500">Loading...</div>
					) : error ? (
						<div className="p-8 text-center text-red-500">{error}</div>
					) : (
						<table className={`min-w-full divide-y text-xs md:text-base ${theme === "dark" ? "divide-gray-700" : "divide-blue-100"}`}>
								<thead
									className={
										theme === "dark"
										? "bg-blue-950 sticky top-0 z-10"
										: "bg-blue-50 sticky top-0 z-10"
									}
								>
									<tr>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Employee ID</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Name</th>
										<th
											onClick={() => {
												if (sortBy === "projectName") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
												else { setSortBy("projectName"); setSortOrder("asc"); }
											}}
											className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer select-none ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
										>
											Project {sortBy === "projectName" && (sortOrder === "asc" ? "▲" : "▼")}
										</th>
										<th
											onClick={() => {
												if (sortBy === "designation") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
												else { setSortBy("designation"); setSortOrder("asc"); }
											}}
											className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer select-none ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
										>
											Designation {sortBy === "designation" && (sortOrder === "asc" ? "▲" : "▼")}
										</th>
										<th
											onClick={() => {
												if (sortBy === "issuedStatus") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
												else { setSortBy("issuedStatus"); setSortOrder("asc"); }
											}}
											className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer select-none ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
										>
											Status {sortBy === "issuedStatus" && (sortOrder === "asc" ? "▲" : "▼")}
										</th>
									</tr>
								</thead>
								<tbody
									className={
										theme === "dark"
										? "divide-y divide-gray-800"
										: "divide-y divide-blue-50"
									}
								>
									{paginatedRecords.length === 0 ? (
										<tr>
											<td colSpan={5} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No records found</td>
										</tr>
									) : (
										paginatedRecords.map((rec, idx) => (
											<tr key={rec._id || idx} className={theme === "dark" ? "hover:bg-blue-950 transition" : "hover:bg-blue-50 transition"}>
											<td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{rec.employeeId}</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.fullName}</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.projectName}</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.designation}</td>
											<td className="px-4 py-3">
												<span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
													rec.issuedStatus === "Issued"
														? theme === "dark"
															? "bg-green-900 text-green-200"
															: "bg-green-100 text-green-800"
														: rec.issuedStatus === "Pending"
															? theme === "dark"
																? "bg-yellow-900 text-yellow-200"
																: "bg-yellow-100 text-yellow-800"
															: theme === "dark"
																? "bg-red-900 text-red-200"
																: "bg-red-100 text-red-800"
													}`}>{rec.issuedStatus}</span>
											</td>
										</tr>
									))
									)}
								</tbody>
							</table>
						)}
					</div>
				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="flex flex-col md:flex-row justify-center items-center gap-2 mt-4">
						<button
							disabled={currentPage === 1}
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							className={`w-full md:w-auto px-3 py-1 rounded text-xs md:text-base ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : theme === 'dark' ? 'bg-blue-900 text-white hover:bg-blue-800' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
						>
							Prev
						</button>
						<span className="px-2 text-xs md:text-sm font-medium">Page {currentPage} of {totalPages}</span>
						<button
							disabled={currentPage === totalPages}
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							className={`w-full md:w-auto px-3 py-1 rounded text-xs md:text-base ${currentPage === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : theme === 'dark' ? 'bg-blue-900 text-white hover:bg-blue-800' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}