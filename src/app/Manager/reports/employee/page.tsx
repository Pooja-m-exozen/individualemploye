"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaUsers, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const statusOptions = ["All Statuses", "Active", "Inactive"];

interface EmployeeRecord {
	employeeId: string;
	fullName: string;
	project: string;
	designation: string;
	status: string;
}

// Define the type for the API response item
interface KycForm {
	personalDetails: {
		employeeId: string;
		fullName: string;
		projectName: string;
		designation: string;
	};
}

export default function EmployeeReportPage() {
	const [search, setSearch] = useState("");
	const [projectFilter, setProjectFilter] = useState("All Projects");
	const [designationFilter, setDesignationFilter] = useState("All Designations");
	const [statusFilter, setStatusFilter] = useState("All Statuses");
	const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>([]);
	const [loading, setLoading] = useState(true);

	// Sorting
	const [sortBy, setSortBy] = useState<null | keyof EmployeeRecord>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	// Pagination
	const [page, setPage] = useState(1);
	const pageSize = 10;

	const { theme } = useTheme();

	// Fetch employee data from API
	useEffect(() => {
		const fetchEmployees = async () => {
			setLoading(true);
			try {
				const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
				const data = await res.json();
				const records: EmployeeRecord[] = (data.kycForms || []).map((form: KycForm) => ({
					employeeId: form.personalDetails.employeeId,
					fullName: form.personalDetails.fullName,
					project: form.personalDetails.projectName,
					designation: form.personalDetails.designation,
					status: "Active", // No status in API, default to Active
				}));
				setEmployeeRecords(records);
			} catch {
				setEmployeeRecords([]);
			}
			setLoading(false);
		};
		fetchEmployees();
	}, []);

	// Dynamically generate project/designation options
	const dynamicProjectOptions = useMemo(() => {
		const set = new Set(employeeRecords.map(e => e.project));
		return ["All Projects", ...Array.from(set).filter(Boolean)];
	}, [employeeRecords]);
	const dynamicDesignationOptions = useMemo(() => {
		const set = new Set(employeeRecords.map(e => e.designation));
		return ["All Designations", ...Array.from(set).filter(Boolean)];
	}, [employeeRecords]);

	// Filtering
	const filteredRecords = useMemo(() => {
		return employeeRecords.filter((rec) => {
			const matchesSearch =
				search === "" ||
				rec.fullName?.toLowerCase().includes(search.toLowerCase()) ||
				rec.employeeId?.toLowerCase().includes(search.toLowerCase());
			const matchesProject =
				projectFilter === "All Projects" || rec.project === projectFilter;
			const matchesDesignation =
				designationFilter === "All Designations" ||
				rec.designation === designationFilter;
			const matchesStatus =
				statusFilter === "All Statuses" || rec.status === statusFilter;
			return (
				matchesSearch &&
				matchesProject &&
				matchesDesignation &&
				matchesStatus
			);
		});
	}, [search, projectFilter, designationFilter, statusFilter, employeeRecords]);

	// Sorting
	const sortedRecords = useMemo(() => {
		if (!sortBy) return filteredRecords;
		const sorted = [...filteredRecords].sort((a, b) => {
			const aVal = a[sortBy] || "";
			const bVal = b[sortBy] || "";
			if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
			if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
			return 0;
		});
		return sorted;
	}, [filteredRecords, sortBy, sortOrder]);

	// Pagination
	const totalPages = Math.ceil(sortedRecords.length / pageSize);
	const paginatedRecords = useMemo(() => {
		const start = (page - 1) * pageSize;
		return sortedRecords.slice(start, start + pageSize);
	}, [sortedRecords, page, pageSize]);

	// Theme-based classes
	const bgMain =
		theme === "dark"
			? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
			: "bg-gradient-to-br from-indigo-50 via-white to-blue-50";
	const cardBg = theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-blue-100";
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
	const statusActive =
		theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800";
	const statusInactive =
		theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800";
	const rowHover = theme === "dark" ? "hover:bg-gray-800" : "hover:bg-blue-50";

	// Excel export
	function downloadExcel() {
		const ws = XLSX.utils.json_to_sheet(
			sortedRecords.map((rec) => ({
				"Employee ID": rec.employeeId,
				"Name": rec.fullName,
				"Project": rec.project,
				"Designation": rec.designation,
				"Status": rec.status,
			}))
		);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Employees");
		XLSX.writeFile(wb, "employee_report.xlsx");
	}

	// PDF export
	function downloadPDF() {
		const doc = new jsPDF();
		doc.text("Employee Report", 14, 16);
		autoTable(doc, {
			startY: 22,
			head: [["Employee ID", "Name", "Project", "Designation", "Status"]],
			body: sortedRecords.map((rec) => [
				rec.employeeId,
				rec.fullName,
				rec.project,
				rec.designation,
				rec.status,
			]),
		});
		doc.save("employee_report.pdf");
	}

	// Table header click handler for sorting
	const handleSort = (field: keyof EmployeeRecord) => {
		if (sortBy === field) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(field);
			setSortOrder("asc");
		}
	};

	// Reset page on filter/sort change
	useEffect(() => {
		setPage(1);
	}, [search, projectFilter, designationFilter, statusFilter, sortBy, sortOrder]);

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
						className={`${
							theme === "dark" ? "bg-[#232a36]" : "bg-blue-600 bg-opacity-30"
						} rounded-xl p-4 flex items-center justify-center`}
					>
						<FaUsers className="w-10 h-10 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-white mb-1">
							Employee Report
						</h1>
						<p className={theme === "dark" ? "text-blue-200 text-base" : "text-white text-base opacity-90"}>
							View and export employee details.
						</p>
					</div>
				</div>
				{/* Filters, Search, Export */}
				<div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-2 w-full md:flex-row md:items-center md:w-auto md:flex-wrap md:gap-2">
						<div className="relative w-full min-w-[140px] md:w-40">
							<select
								value={projectFilter}
								onChange={(e) => setProjectFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${selectBg}`}
							>
								{dynamicProjectOptions.map((project) => (
									<option key={project} value={project}>
										{project}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full min-w-[130px] md:w-44">
							<select
								value={designationFilter}
								onChange={(e) => setDesignationFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${selectBg}`}
							>
								{dynamicDesignationOptions.map((designation) => (
									<option key={designation} value={designation}>
										{designation}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-full min-w-[120px] md:w-40">
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
						<div className="relative w-full min-w-[180px] max-w-full md:flex-1 md:max-w-xs">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Search employee name or ID..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${inputBg}`}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end sm:items-center sm:w-auto">
						<button
							onClick={downloadExcel}
							className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 justify-center"
							disabled={filteredRecords.length === 0}
						>
							<FaFileExport /> Export Excel
						</button>
						<button
							onClick={downloadPDF}
							className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 justify-center"
							disabled={filteredRecords.length === 0}
						>
							<FaFileExport /> Export PDF
						</button>
					</div>
				</div>
				{/* Table */}
				<div className={`overflow-x-auto rounded-xl border shadow-xl ${cardBg}`}>
					<table className="min-w-[600px] sm:min-w-full divide-y divide-blue-100">
						<thead className={`${tableHead} sticky top-0 z-10`}>
							<tr>
								<th
									className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer ${tableHeaderText}`}
									onClick={() => handleSort("employeeId")}
								>
									Employee ID {sortBy === "employeeId" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
								</th>
								<th
									className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer ${tableHeaderText}`}
									onClick={() => handleSort("fullName")}
								>
									Name {sortBy === "fullName" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
								</th>
								<th
									className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer ${tableHeaderText}`}
									onClick={() => handleSort("project")}
								>
									Project {sortBy === "project" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
								</th>
								<th
									className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer ${tableHeaderText}`}
									onClick={() => handleSort("designation")}
								>
									Designation {sortBy === "designation" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
								</th>
								<th
									className={`px-4 py-3 text-left text-xs font-bold uppercase ${tableHeaderText}`}
								>
									Status
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
							) : paginatedRecords.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className={`px-4 py-12 text-center ${noRecordsText}`}
									>
										No records found
									</td>
								</tr>
							) : (
								paginatedRecords.map((rec, idx) => (
									<tr
										key={idx}
										className={`${rowHover} transition`}
									>
										<td
											className={`px-4 py-3 font-bold ${tableText}`}
										>
											{rec.employeeId}
										</td>
										<td className={`px-4 py-3 ${tableText}`}>
											{rec.fullName}
										</td>
										<td className={`px-4 py-3 ${tableText}`}>
											{rec.project}
										</td>
										<td className={`px-4 py-3 ${tableText}`}>
											{rec.designation}
										</td>
										<td className="px-4 py-3">
											<span
												className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
													rec.status === "Active"
														? statusActive
														: statusInactive
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
					{/* Pagination Controls */}
					{!loading && totalPages > 1 && (
						<div className="flex justify-end items-center gap-2 px-4 py-3">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
							>
								Prev
							</button>
							<span>
								Page {page} of {totalPages}
							</span>
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
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