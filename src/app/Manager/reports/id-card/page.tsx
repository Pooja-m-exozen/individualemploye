"use client";
import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaSearch, FaIdCard, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

// API response type
interface IdCard {
	_id: string;
	employeeId: string;
	fullName: string;
	designation: string;
	gender?: string;
	projectName: string;
	bloodGroup?: string;
	employeeImage?: string;
	status: string;
	validUntil?: string;
	createdAt?: string;
	updatedAt?: string;
	issuedDate?: string;
	requestDate?: string;
	approvalDate?: string;
	approvedBy?: string;
}

export default function IDCardReportPage() {
	const { theme } = useTheme();
	const [search, setSearch] = useState("");
	const [projectFilter, setProjectFilter] = useState("All Projects");
	const [designationFilter, setDesignationFilter] = useState("All Designations");
	const [statusFilter, setStatusFilter] = useState("All Statuses");
	const [idCardRecords, setIdCardRecords] = useState<IdCard[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [projectOptions, setProjectOptions] = useState<string[]>(["All Projects"]);
	const [designationOptions, setDesignationOptions] = useState<string[]>(["All Designations"]);
	const [statusOptions, setStatusOptions] = useState<string[]>(["All Statuses"]);
	const [sortBy, setSortBy] = useState<"projectName" | "designation" | "status" | "">("");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 15;

	useEffect(() => {
		setLoading(true);
		fetch("https://cafm.zenapi.co.in/api/id-cards/report")
			.then((res) => res.json())
			.then((data) => {
				if (data.idCards) {
					setIdCardRecords(data.idCards);
					// Populate filter options dynamically
					const projects = Array.from(
						new Set<string>(
							data.idCards.map((f: IdCard) => f.projectName).filter(Boolean)
						)
					);
					const designations = Array.from(
						new Set<string>(
							data.idCards.map((f: IdCard) => f.designation).filter(Boolean)
						)
					);
					const statuses = Array.from(
						new Set<string>(
							data.idCards.map((f: IdCard) => f.status).filter(Boolean)
						)
					);
					setProjectOptions(["All Projects", ...projects]);
					setDesignationOptions(["All Designations", ...designations]);
					setStatusOptions(["All Statuses", ...statuses]);
				} else {
					setIdCardRecords([]);
				}
				setLoading(false);
			})
			.catch(() => {
				setError("Failed to fetch ID Card data.");
				setLoading(false);
			});
	}, []);

	// Filtering
	const filteredRecords = useMemo(() => {
		return idCardRecords.filter((rec) => {
			const matchesSearch =
				search === "" ||
				(rec.fullName && rec.fullName.toLowerCase().includes(search.toLowerCase())) ||
				(rec.employeeId && rec.employeeId.toLowerCase().includes(search.toLowerCase()));
			const matchesProject =
				projectFilter === "All Projects" || rec.projectName === projectFilter;
			const matchesDesignation =
				designationFilter === "All Designations" || rec.designation === designationFilter;
			const matchesStatus =
				statusFilter === "All Statuses" || rec.status === statusFilter;
			return matchesSearch && matchesProject && matchesDesignation && matchesStatus;
		});
	}, [search, projectFilter, designationFilter, statusFilter, idCardRecords]);

	// Sorting
	const sortedRecords = useMemo(() => {
		if (!sortBy) return filteredRecords;
		return [...filteredRecords].sort((a, b) => {
			const aVal = (a[sortBy] || "").toString().toLowerCase();
			const bVal = (b[sortBy] || "").toString().toLowerCase();
			if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
			if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
			return 0;
		});
	}, [filteredRecords, sortBy, sortDir]);

	// Pagination
	const totalPages = Math.ceil(sortedRecords.length / rowsPerPage);
	const paginatedRecords = sortedRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

	// Reset to first page if filters/search/sort change
	useEffect(() => {
		setCurrentPage(1);
	}, [search, projectFilter, designationFilter, statusFilter, sortBy, sortDir]);

	function handleSort(col: "projectName" | "designation" | "status") {
		if (sortBy === col) {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(col);
			setSortDir("asc");
		}
	}

	function downloadExcel(records: IdCard[]) {
		const data = records.map((rec) => ({
			"Employee ID": rec.employeeId || "-",
			"Name": rec.fullName || "-",
			"Project": rec.projectName || "-",
			"Designation": rec.designation || "-",
			"Status": rec.status || "-",
		}));
		const worksheet = XLSX.utils.json_to_sheet(data);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "ID Card Report");
		XLSX.writeFile(workbook, "id_card_report.xlsx");
	}

	function downloadPDF(records: IdCard[]) {
		const doc = new jsPDF();
		const tableData = records.map((rec) => [
			rec.employeeId || "-",
			rec.fullName || "-",
			rec.projectName || "-",
			rec.designation || "-",
			rec.status || "-",
		]);
		autoTable(doc, {
			head: [["Employee ID", "Name", "Project", "Designation", "Status"]],
			body: tableData,
			startY: 20,
			styles: { fontSize: 10 },
			headStyles: { fillColor: [41, 128, 185] },
		});
		doc.save("id_card_report.pdf");
	}

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
						<FaIdCard className="w-8 h-8 md:w-10 md:h-10 text-white" />
					</div>
					<div>
						<h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
							ID Card Report
						</h1>
						<p className={theme === "dark" ? "text-blue-200 text-base md:text-lg" : "text-white text-base md:text-lg opacity-90"}>
							View and export ID card generation details for employees.
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
				<div
					className={`overflow-x-auto rounded-xl border shadow-xl ${
						theme === "dark" ? "border-gray-700 bg-gray-900" : "border-blue-100 bg-white"
					}`}
				>
					{loading ? (
						<div className="p-8 text-center text-lg text-blue-600">Loading...</div>
					) : error ? (
						<div className="p-8 text-center text-lg text-red-600">{error}</div>
					) : (
						<table
							className={`min-w-full divide-y text-xs md:text-base ${
								theme === "dark" ? "divide-gray-700" : "divide-blue-100"
							}`}
						>
							<thead
								className={
									theme === "dark"
										? "bg-blue-950 sticky top-0 z-10"
										: "bg-blue-50 sticky top-0 z-10"
								}
							>
								<tr>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
										Image
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
										Employee ID
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
										Name
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer select-none ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
										onClick={() => handleSort("projectName")}
									>
										Project {sortBy === "projectName" && (sortDir === "asc" ? "▲" : "▼")}
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer select-none ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
										onClick={() => handleSort("designation")}
									>
										Designation {sortBy === "designation" && (sortDir === "asc" ? "▲" : "▼")}
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
										Gender
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
										Blood Group
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer select-none ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
										onClick={() => handleSort("status")}
									>
										Status {sortBy === "status" && (sortDir === "asc" ? "▲" : "▼")}
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
										Request Date
									</th>
									<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
										Valid Until
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
										<td
											colSpan={10}
											className={`px-4 py-12 text-center ${
												theme === "dark" ? "text-gray-400" : "text-gray-500"
											}`}
										>
											No records found
										</td>
									</tr>
								) : (
									paginatedRecords.map((rec, idx) => (
										<tr
											key={idx}
											className={
												theme === "dark"
													? "hover:bg-blue-950 transition"
													: "hover:bg-blue-50 transition"
											}
										>
											<td className="px-4 py-3">
												{rec.employeeImage ? (
													<Image
														src={rec.employeeImage}
														alt={rec.fullName}
														width={48}
														height={48}
														className="w-12 h-12 rounded-full object-cover border"
														style={{ background: "#fff" }}
														unoptimized
													/>
												) : (
													<span className="text-gray-400">No Image</span>
												)}
											</td>
											<td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
												{rec.employeeId}
											</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>
												{rec.fullName}
											</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>
												{rec.projectName}
											</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>
												{rec.designation}
											</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>
												{rec.gender || "-"}
											</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>
												{rec.bloodGroup || "-"}
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
														rec.status === "Issued"
															? theme === "dark"
																? "bg-green-900 text-green-200"
																: "bg-green-100 text-green-800"
															: rec.status === "Approved"
															? theme === "dark"
																? "bg-yellow-900 text-yellow-200"
																: "bg-yellow-100 text-yellow-800"
															: theme === "dark"
															? "bg-red-900 text-red-200"
															: "bg-red-100 text-red-800"
													}`}
												>
													{rec.status}
												</span>
											</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>
												{rec.requestDate ? new Date(rec.requestDate).toLocaleDateString() : "-"}
											</td>
											<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>
												{rec.validUntil ? new Date(rec.validUntil).toLocaleDateString() : "-"}
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
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className={`w-full md:w-auto px-3 py-1 rounded text-xs md:text-base ${
								currentPage === 1
									? "bg-gray-300 text-gray-500 cursor-not-allowed"
									: theme === "dark"
									? "bg-blue-900 text-white hover:bg-blue-800"
									: "bg-blue-500 text-white hover:bg-blue-600"
							}`}
						>
							Prev
						</button>
						<span className="px-2 text-xs md:text-sm font-medium">
							Page {currentPage} of {totalPages}
						</span>
						<button
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className={`w-full md:w-auto px-3 py-1 rounded text-xs md:text-base ${
								currentPage === totalPages
									? "bg-gray-300 text-gray-500 cursor-not-allowed"
									: theme === "dark"
									? "bg-blue-900 text-white hover:bg-blue-800"
									: "bg-blue-500 text-white hover:bg-blue-600"
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