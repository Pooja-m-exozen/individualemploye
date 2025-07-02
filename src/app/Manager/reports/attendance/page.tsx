"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaCalendarAlt, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Define the type for attendance record
interface AttendanceRecord {
	employeeId: string;
	projectName: string;
	date: string;
	punchInTime?: string;
	punchOutTime?: string;
	status: string;
	_id?: string;
}

interface IdCard {
	employeeId: string;
	designation: string;
}

export default function AttendanceReportPage() {
	const { theme } = useTheme();
	const [search, setSearch] = useState("");
	const [projectFilter, setProjectFilter] = useState("All Projects");
	const [designationFilter, setDesignationFilter] = useState("All Designations");
	const [statusFilter, setStatusFilter] = useState("All Statuses");
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
	const [designationOptions, setDesignationOptions] = useState<string[]>(["All Designations"]);
	const [designationMap, setDesignationMap] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 15;

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			setError("");
			try {
				const [attendanceRes, idCardRes] = await Promise.all([
					fetch("https://cafm.zenapi.co.in/api/attendance/all"),
					fetch("https://cafm.zenapi.co.in/api/id-cards/all"),
				]);
				const attendanceData = await attendanceRes.json();
				const idCardData = await idCardRes.json();
				// Fix: Only check for attendanceData.attendance array
				if (Array.isArray(attendanceData.attendance)) {
					setAttendanceRecords(attendanceData.attendance);
				} else {
					setError("Failed to load attendance records.");
				}
				if (idCardData.allIdCards) {
					const designations = Array.from(
						new Set(
							idCardData.allIdCards
								.map((f: IdCard) => (f.designation ? String(f.designation) : ""))
								.filter((d: string) => Boolean(d))
						)
					) as string[];
					setDesignationOptions(["All Designations", ...designations]);
					const map: Record<string, string> = {};
					idCardData.allIdCards.forEach((f: IdCard) => {
						if (f.employeeId && f.designation) map[f.employeeId] = String(f.designation);
					});
					setDesignationMap(map);
				}
			} catch {
				setError("Error fetching data.");
			}
			setLoading(false);
		}
		fetchData();
	}, []);

	const filteredRecords = useMemo(() => {
		return attendanceRecords.filter((rec) => {
			const matchesSearch =
				search === "" ||
				rec.employeeId?.toLowerCase().includes(search.toLowerCase());
			const matchesProject =
				projectFilter === "All Projects" || rec.projectName === projectFilter;
			const recDesignation = designationMap[rec.employeeId] || "";
			const matchesDesignation =
				designationFilter === "All Designations" || recDesignation === designationFilter;
			const matchesStatus =
				statusFilter === "All Statuses" || rec.status === statusFilter;
			return (
				matchesSearch &&
				matchesProject &&
				matchesDesignation &&
				matchesStatus
			);
		});
	}, [search, projectFilter, designationFilter, statusFilter, attendanceRecords, designationMap]);

	const paginatedRecords = useMemo(() => {
		const start = (currentPage - 1) * rowsPerPage;
		return filteredRecords.slice(start, start + rowsPerPage);
	}, [filteredRecords, currentPage]);
	const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

	const projectOptions = useMemo(() => {
		const projects = new Set(attendanceRecords.map((rec) => rec.projectName).filter(Boolean));
		return ["All Projects", ...Array.from(projects).sort()];
	}, [attendanceRecords]);
	const statusOptions = useMemo(() => {
		const statuses = new Set(attendanceRecords.map((rec) => String(rec.status)).filter((s: string) => Boolean(s)));
		return ["All Statuses", ...Array.from(statuses)];
	}, [attendanceRecords]);

	function downloadExcel() {
		const data = filteredRecords.map((rec) => ({
			"Employee ID": rec.employeeId,
			"Project": rec.projectName,
			"Designation": designationMap[rec.employeeId] || "-",
			"Date": rec.date ? new Date(rec.date).toLocaleDateString() : "-",
			"Status": rec.status,
		}));
		const worksheet = XLSX.utils.json_to_sheet(data);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
		XLSX.writeFile(workbook, "attendance_report.xlsx");
	}
	function downloadPDF() {
		const doc = new jsPDF();
		autoTable(doc, {
			head: [["Employee ID", "Project", "Designation", "Date", "Status"]],
			body: filteredRecords.map((rec) => [
				rec.employeeId,
				rec.projectName,
				designationMap[rec.employeeId] || "-",
				rec.date ? new Date(rec.date).toLocaleDateString() : "-",
				rec.status,
			]),
			startY: 20,
			styles: { fontSize: 10 },
			headStyles: { fillColor: [41, 128, 185] },
		});
		doc.save("attendance_report.pdf");
	}

	return (
		<div className={`min-h-screen font-sans ${theme === "dark" ? "bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950" : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"}`}>
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
						<FaCalendarAlt className="w-10 h-10 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-white mb-1">
							Attendance Report
						</h1>
						<p className={theme === "dark" ? "text-blue-200 text-base" : "text-white text-base opacity-90"}>
							View and export attendance details for employees.
						</p>
					</div>
				</div>
				{/* Filters, Search, Export */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
					<div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
						<div className="relative w-40 min-w-[140px]">
							<select
								value={projectFilter}
								onChange={(e) => setProjectFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
										? "bg-gray-800 border-gray-700 text-gray-100"
										: "bg-white border-gray-200 text-black"
								}`}
							>
								<option value="All Projects">All Projects</option>
								{projectOptions.map((project) => (
									<option key={project} value={project}>
										{project}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-44 min-w-[130px]">
							<select
								value={designationFilter}
								onChange={(e) => setDesignationFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
										? "bg-gray-800 border-gray-700 text-gray-100"
										: "bg-white border-gray-200 text-black"
								}`}
							>
								<option value="All Designations">All Designations</option>
								{designationOptions.map((designation) => (
									<option key={designation} value={designation}>
										{designation}
									</option>
								))}
							</select>
						</div>
						<div className="relative w-40 min-w-[120px]">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
										? "bg-gray-800 border-gray-700 text-gray-100"
										: "bg-white border-gray-200 text-black"
								}`}
							>
								<option value="All Statuses">All Statuses</option>
								{statusOptions.map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
						</div>
						<div className="relative flex-1 min-w-[180px] max-w-xs">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Search employee name or ID..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
									theme === "dark"
										? "bg-gray-800 border-gray-700 text-gray-100"
										: "bg-white border-gray-200 text-black"
								}`}
							/>
						</div>
					</div>
					<div className="flex gap-2 justify-end">
						<button
							onClick={downloadExcel}
							className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
								theme === "dark"
									? "bg-green-700 text-white hover:bg-green-800"
									: "bg-green-500 text-white hover:bg-green-600"
							}`}
						>
							<FaFileExport /> Export Excel
						</button>
						<button
							onClick={downloadPDF}
							className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
								theme === "dark"
									? "bg-red-700 text-white hover:bg-red-800"
									: "bg-red-500 text-white hover:bg-red-600"
							}`}
						>
							<FaFileExport /> Export PDF
						</button>
					</div>
				</div>
				{/* Table */}
				<div
					className={`rounded-xl border shadow-xl ${
						theme === "dark" ? "border-gray-700 bg-gray-900" : "border-blue-100 bg-white"
					}`}
				>
					{loading ? (
						<div className="p-8 text-center text-blue-500">Loading...</div>
					) : error ? (
						<div className="p-8 text-center text-red-500">{error}</div>
					) : (
						<div className="overflow-x-auto max-h-[500px] overflow-y-auto">
							<table
								className={`min-w-full divide-y ${
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
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Employee ID</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Project</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Designation</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Date</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Status</th>
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
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.projectName}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{designationMap[rec.employeeId] || "-"}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.date ? new Date(rec.date).toLocaleDateString() : "-"}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.status}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					)}
					{/* Pagination Controls */}
					{totalPages > 1 && (
						<div className="flex justify-end items-center gap-2 mt-4">
							<button
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								className="px-3 py-1 rounded bg-blue-500 text-white disabled:opacity-50"
							>
								Prev
							</button>
							<span className="px-2">Page {currentPage} of {totalPages}</span>
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