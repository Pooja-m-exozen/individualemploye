"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaPlaneDeparture, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { getAllEmployeesLeaveHistory,} from "@/services/leave";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const statusOptions = ["All Statuses", "Approved", "Pending", "Rejected"];

interface LeaveRecord {
	employeeId: string;
	fullName: string;
	project: string;
	designation: string;
	status: string;
	leaveType: string;
	startDate: string;
	endDate: string;
	numberOfDays: number;
	appliedOn: string;
}

export default function LeaveReportPage() {
	const { theme } = useTheme();
	const [search, setSearch] = useState("");
	const [projectFilter, setProjectFilter] = useState("All Projects");
	const [designationFilter, setDesignationFilter] = useState("All Designations");
	const [statusFilter, setStatusFilter] = useState("All Statuses");

	const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Dynamic dropdowns from ID card API
	const [projectOptions, setProjectOptions] = useState<string[]>(["All Projects"]);
	const [designationOptions, setDesignationOptions] = useState<string[]>(["All Designations"]);

	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 15;

	// Fetch project and designation options from ID card API
	useEffect(() => {
		fetch("https://cafm.zenapi.co.in/api/id-cards/all")
			.then((res) => res.json() as Promise<{ allIdCards?: { projectName?: string; designation?: string }[] }>)
			.then((data) => {
				if (data.allIdCards) {
					const projects = Array.from(new Set((data.allIdCards.map((f) => f.projectName).filter(Boolean) as string[])));
					const designations = Array.from(new Set((data.allIdCards.map((f) => f.designation).filter(Boolean) as string[])));
					setProjectOptions(["All Projects", ...projects.sort()]);
					setDesignationOptions(["All Designations", ...designations.sort()]);
				}
			});
	}, []);

	useEffect(() => {
		setLoading(true);
		getAllEmployeesLeaveHistory()
			.then((data) => {
				const records: LeaveRecord[] = [];
				data.forEach((emp) => {
					if (emp.leaveHistory && emp.leaveHistory.leaveHistory) {
						emp.leaveHistory.leaveHistory.forEach((leave) => {
						const project = emp.kyc.personalDetails.projectName;
						const designation = emp.kyc.personalDetails.designation;
						records.push({
							employeeId: emp.kyc.personalDetails.employeeId,
							fullName: emp.kyc.personalDetails.fullName,
							project,
							designation,
							status: leave.status,
							leaveType: leave.leaveType,
							startDate: leave.startDate,
							endDate: leave.endDate,
							numberOfDays: leave.numberOfDays,
							appliedOn: leave.appliedOn,
						});
					});
				}
				});
				setLeaveRecords(records);
				setLoading(false);
				setError(null);
			})
			.catch(() => {
				setError("Failed to load leave records");
				setLoading(false);
			});
	}, []);

	const filteredRecords = useMemo(() => {
		return leaveRecords.filter((rec) => {
			const matchesSearch =
				search === "" ||
				rec.fullName.toLowerCase().includes(search.toLowerCase()) ||
				rec.employeeId.toLowerCase().includes(search.toLowerCase());
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
	}, [search, projectFilter, designationFilter, statusFilter, leaveRecords]);

	// Pagination logic
	const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
	const paginatedRecords = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

	// Reset to first page if filters/search change
	useEffect(() => {
		setCurrentPage(1);
	}, [search, projectFilter, designationFilter, statusFilter]);

	function formatDate(dateStr?: string) {
		if (!dateStr) return "-";
		return dateStr.split("T")[0];
	}

	function downloadExcel() {
		const data = filteredRecords.map((rec) => ({
			"Employee ID": rec.employeeId || "-",
			"Name": rec.fullName || "-",
			"Project": rec.project || "-",
			"Designation": rec.designation || "-",
			"Status": rec.status || "-",
			"Leave Type": rec.leaveType || "-",
			"Start Date": formatDate(rec.startDate),
			"End Date": formatDate(rec.endDate),
			"Days": rec.numberOfDays || "-",
			"Applied On": formatDate(rec.appliedOn),
		}));
		const worksheet = XLSX.utils.json_to_sheet(data);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Report");
		XLSX.writeFile(workbook, "leave_report.xlsx");
	}

	function downloadPDF() {
		const doc = new jsPDF();
		const tableData = filteredRecords.map((rec) => [
			rec.employeeId || "-",
			rec.fullName || "-",
			rec.project || "-",
			rec.designation || "-",
			rec.status || "-",
			rec.leaveType || "-",
			formatDate(rec.startDate),
			formatDate(rec.endDate),
			rec.numberOfDays || "-",
			formatDate(rec.appliedOn),
		]);
		autoTable(doc, {
			head: [["Employee ID", "Name", "Project", "Designation", "Status", "Leave Type", "Start Date", "End Date", "Days", "Applied On"]],
			body: tableData,
			startY: 20,
			styles: { fontSize: 9 },
			headStyles: { fillColor: [41, 128, 185] },
		});
		doc.save("leave_report.pdf");
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
						<FaPlaneDeparture className="w-10 h-10 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-white mb-1">
							Leave Report
						</h1>
						<p className={theme === "dark" ? "text-blue-200 text-base" : "text-white text-base opacity-90"}>
							View and export leave details for employees.
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
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
							>
								{projectOptions.map((project) => (
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
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
							>
								{designationOptions.map((designation) => (
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
								className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
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
								className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
									theme === "dark"
									? "bg-gray-800 border-gray-700 text-gray-100"
									: "bg-white border-gray-200 text-black"
								}`}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end sm:items-center sm:w-auto">
						<button
							onClick={downloadExcel}
							className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center gap-2 justify-center transition-colors ${
								theme === "dark"
									? "bg-green-700 text-white hover:bg-green-800"
									: "bg-green-500 text-white hover:bg-green-600"
							}`}
						>
							<FaFileExport /> Export Excel
						</button>
						<button
							onClick={downloadPDF}
							className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center gap-2 justify-center transition-colors ${
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
				<div className={`overflow-x-auto rounded-xl border shadow-xl ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-blue-100 bg-white"}`}>
					{loading ? (
						<div className="p-8 text-center text-gray-400">Loading leave records...</div>
					) : error ? (
						<div className="p-8 text-center text-red-500">{error}</div>
					) : (
						<>
							<table className={`min-w-[800px] sm:min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-blue-100"}`}>
								<thead className={theme === "dark" ? "bg-blue-950 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
									<tr>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Employee ID</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Name</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Project</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Designation</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Status</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Leave Type</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Start Date</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>End Date</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Days</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Applied On</th>
									</tr>
								</thead>
								<tbody className={theme === "dark" ? "divide-y divide-gray-800" : "divide-y divide-blue-50"}>
									{paginatedRecords.length === 0 ? (
										<tr>
											<td colSpan={10} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No records found</td>
										</tr>
									) : (
										paginatedRecords.map((rec, idx) => (
											<tr key={idx} className={theme === "dark" ? "hover:bg-blue-950 transition" : "hover:bg-blue-50 transition"}>
												<td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{rec.employeeId}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.fullName}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.project}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.designation}</td>
												<td className="px-4 py-3">
													<span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${rec.status === "Approved"
														? theme === "dark"
															? "bg-green-900 text-green-200"
															: "bg-green-100 text-green-800"
														: rec.status === "Pending"
															? theme === "dark"
																? "bg-yellow-900 text-yellow-200"
																: "bg-yellow-100 text-yellow-800"
															: theme === "dark"
																? "bg-red-900 text-red-200"
																: "bg-red-100 text-red-800"}`}>{rec.status}</span>
												</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.leaveType}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100 whitespace-nowrap" : "px-4 py-3 text-black whitespace-nowrap"}>{formatDate(rec.startDate)}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100 whitespace-nowrap" : "px-4 py-3 text-black whitespace-nowrap"}>{formatDate(rec.endDate)}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100" : "px-4 py-3 text-black"}>{rec.numberOfDays}</td>
												<td className={theme === "dark" ? "px-4 py-3 text-gray-100 whitespace-nowrap" : "px-4 py-3 text-black whitespace-nowrap"}>{formatDate(rec.appliedOn)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
							{/* Pagination Controls */}
							{totalPages > 1 && (
								<div className="flex justify-center items-center gap-2 mt-4">
									<button
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										className={`px-3 py-1 rounded ${currentPage === 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : theme === "dark" ? "bg-blue-900 text-white hover:bg-blue-800" : "bg-blue-500 text-white hover:bg-blue-600"}`}
									>
										Prev
									</button>
									<span className="px-2 text-sm font-medium">
										Page {currentPage} of {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={currentPage === totalPages}
										className={`px-3 py-1 rounded ${currentPage === totalPages ? "bg-gray-300 text-gray-500 cursor-not-allowed" : theme === "dark" ? "bg-blue-900 text-white hover:bg-blue-800" : "bg-blue-500 text-white hover:bg-blue-600"}`}
									>
										Next
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}