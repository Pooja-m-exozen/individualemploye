'use client';
import React, { useState, useEffect } from 'react';
import { FaTshirt, FaSearch, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaDownload, FaEye, FaTimes } from 'react-icons/fa';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { useTheme } from "@/context/ThemeContext";

interface UniformRequest {
	_id: string;
	employeeId: string;
	fullName: string;
	designation: string;
	projectName: string;
	approvalStatus: string;
	uniformType: string[];
}

const statusBadge = (status: string) => {
	switch (status) {
		case 'Approved':
			return <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200"><FaCheckCircle className="w-3 h-3" /> Approved</span>;
		case 'Rejected':
			return <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200"><FaTimesCircle className="w-3 h-3" /> Rejected</span>;
		default:
			return <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200"><FaHourglassHalf className="w-3 h-3" /> Pending</span>;
	}
};

const exportToCSV = (data: UniformRequest[]) => {
	const header = ['Employee ID', 'Name', 'Designation', 'Project', 'Status', 'Requested Items'];
	const rows = data.map(req => [
		req.employeeId,
		req.fullName,
		req.designation,
		req.projectName,
		req.approvalStatus,
		Array.isArray(req.uniformType) ? req.uniformType.join('; ') : ''
	]);
	const csvContent = [header, ...rows].map(e => e.map(x => `"${x}"`).join(",")).join("\n");
	const blob = new Blob([csvContent], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'uniform-requests.csv';
	a.click();
	URL.revokeObjectURL(url);
};

const UniformViewPage = () => {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('All');
	const { theme } = useTheme();
	const [uniformRequests, setUniformRequests] = useState<UniformRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewModal, setViewModal] = useState<{ open: boolean, request: UniformRequest | null }>({ open: false, request: null });
	const [projectFilter, setProjectFilter] = useState('All Projects');
	const [designationFilter, setDesignationFilter] = useState('All Designations');


	useEffect(() => {
		const fetchUniforms = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch('https://cafm.zenapi.co.in/api/uniforms/all');
				const data = await res.json();
				if (data.success && Array.isArray(data.uniforms)) {
					setUniformRequests(data.uniforms);
				} else {
					setError('Failed to fetch uniform requests.');
				}
			} catch  {
				setError('Error fetching uniform requests.');
			}
			setLoading(false);
		};
		fetchUniforms();
	}, []);

	const projectOptions = Array.from(new Set(uniformRequests.map(r => r.projectName))).filter(Boolean);
	const designationOptions = Array.from(new Set(uniformRequests.map(r => r.designation))).filter(Boolean);

	const filteredRequests = uniformRequests.filter(req =>
		(projectFilter === 'All Projects' || req.projectName === projectFilter) &&
		(designationFilter === 'All Designations' || req.designation === designationFilter) &&
		(statusFilter === 'All' || req.approvalStatus === statusFilter) &&
		(req.fullName?.toLowerCase().includes(search.toLowerCase()) ||
			req.employeeId?.toLowerCase().includes(search.toLowerCase()))
	);

	// Sort filteredRequests by approval status and name
	const sortedRequests = [...filteredRequests].sort((a, b) => {
		// First sort by status (Pending first, then Approved, then Rejected)
		const statusOrder = { 'Pending': 0, 'Approved': 1, 'Rejected': 2 };
		const statusA = statusOrder[a.approvalStatus as keyof typeof statusOrder] ?? 3;
		const statusB = statusOrder[b.approvalStatus as keyof typeof statusOrder] ?? 3;
		
		if (statusA !== statusB) {
			return statusA - statusB;
		}
		
		// Then sort by name alphabetically
		return a.fullName.localeCompare(b.fullName);
	});

	useEffect(() => {
		if (viewModal.open && viewModal.request) {
			console.log('Modal should render', viewModal);
		}
	}, [viewModal]);

	return (
		<AdminDashboardLayout>
			<div className={`flex flex-col gap-4 p-2 lg:p-4 w-full font-sans h-screen overflow-y-auto ${
				theme === 'dark'
					? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white'
					: 'bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'
			}`}>
				{/* Filters */}
				<div className="flex flex-col lg:flex-row gap-4 mb-4">
					{/* Search and Filters */}
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center flex-1">
						{/* Search Bar */}
						<div className="relative w-full sm:w-64">
							<FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
								theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
							}`} />
							<input
								type="text"
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder="Search by name or ID..."
								className={`pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full ${theme === 'dark' ? 'bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-blue-300' : 'bg-white text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
							/>
						</div>
						{/* Project Filter */}
						<select 
							value={projectFilter} 
							onChange={e => setProjectFilter(e.target.value)} 
							className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
						>
							<option value="All Projects">All Projects</option>
							{projectOptions.map(project => (
								<option key={project} value={project}>{project}</option>
							))}
						</select>
						{/* Designation Filter */}
						<select 
							value={designationFilter} 
							onChange={e => setDesignationFilter(e.target.value)} 
							className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
						>
							<option value="All Designations">All Designations</option>
							{designationOptions.map(designation => (
								<option key={designation} value={designation}>{designation}</option>
							))}
						</select>
						{/* Status Filter */}
						<select 
							value={statusFilter} 
							onChange={e => setStatusFilter(e.target.value)} 
							className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
						>
							<option value="All">All Statuses</option>
							<option value="Approved">Approved</option>
							<option value="Pending">Pending</option>
							<option value="Rejected">Rejected</option>
						</select>
						{/* Export Button */}
						<button 
							onClick={() => exportToCSV(filteredRequests)} 
							className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
						>
							<FaDownload /> Export CSV
						</button>
					</div>
				</div>

				{/* Excel-style Table */}
				<div className="w-full">
					<div className="overflow-x-auto w-full custom-scrollbar">
						<div className="min-w-full inline-block align-middle">
							<div className="overflow-hidden">
								<table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
									<thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
										<tr>
											<th className={`px-2 py-3 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border w-12 ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
											<th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee</th>
											<th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Designation</th>
											<th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-32 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Project</th>
											<th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-40 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Requested Items</th>
											<th className={`px-2 py-3 text-left font-bold uppercase whitespace-nowrap border w-24 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Status</th>
											<th className={`px-2 py-3 text-center font-bold uppercase whitespace-nowrap border w-20 ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Actions</th>
										</tr>
									</thead>
									<tbody>
				{loading ? (
											<tr>
												<td colSpan={7} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
													<div className="flex justify-center items-center">
														<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
														<span className="ml-2">Loading...</span>
						</div>
												</td>
											</tr>
				) : error ? (
											<tr>
												<td colSpan={7} className={`text-center py-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
													{error}
												</td>
											</tr>
										) : sortedRequests.length === 0 ? (
											<tr>
												<td colSpan={7} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
													No records found.
												</td>
											</tr>
										) : (
											sortedRequests.map((req, index) => (
												<tr key={req._id} className={`${
													index % 2 === 0 
														? (theme === 'dark' ? 'bg-gray-800' : 'bg-white') 
														: (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50')
												} hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-blue-50'} transition-colors`}>
													<td className={`px-2 py-2 text-center font-medium border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
														{index + 1}
													</td>
													<td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
										<div className="flex items-center gap-2">
															<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
																<span className="text-xs font-bold text-blue-600">
																	{req.fullName?.charAt(0) || 'U'}
											</span>
										</div>
										<div>
																<div className="font-semibold">{req.fullName}</div>
																<div className="text-xs text-gray-500">{req.employeeId}</div>
										</div>
									</div>
													</td>
													<td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
														{req.designation}
											</td>
													<td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
													{req.projectName}
											</td>
													<td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
													{Array.isArray(req.uniformType) ? req.uniformType.join(", ") : ''}
											</td>
													<td className={`px-2 py-2 border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
												{statusBadge(req.approvalStatus)}
											</td>
													<td className={`px-2 py-2 text-center border ${theme === "dark" ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-200"}`}>
												<button
															onClick={() => setViewModal({ open: true, request: req })}
															className={`p-1 rounded transition-colors ${
														theme === 'dark' 
																	? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
																	: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
													}`}
															title="View Details"
												>
															<FaEye className="h-3 w-3" />
												</button>
											</td>
										</tr>
											))
										)}
								</tbody>
							</table>
						</div>
						</div>
					</div>
			</div>

			{/* Enhanced Modal */}
			{viewModal.open && viewModal.request && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className={`relative max-w-md w-full mx-4 rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
						<button
							onClick={() => setViewModal({ open: false, request: null })}
							className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
								theme === 'dark' 
									? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' 
									: 'text-slate-500 hover:text-red-600 hover:bg-slate-100'
							}`}
						>
							<FaTimes className="w-5 h-5" />
						</button>
						
						<div className="p-6">
							<div className="text-center mb-6">
								<div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
									theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
								}`}>
									<FaTshirt className="w-8 h-8 text-blue-600" />
								</div>
								<h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
									Uniform Request Details
								</h2>
							</div>
							
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Name</label>
										<p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
											{viewModal.request?.fullName}
										</p>
									</div>
									<div>
										<label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Employee ID</label>
										<p className={`font-mono text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
											{viewModal.request?.employeeId}
										</p>
									</div>
								</div>
								
								<div>
									<label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Designation</label>
									<p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
										{viewModal.request?.designation}
									</p>
								</div>
								
								<div>
									<label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Project</label>
									<p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
										{viewModal.request?.projectName}
									</p>
								</div>
								
								<div>
									<label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
									<div className="mt-1">
										{statusBadge(viewModal.request?.approvalStatus ?? '')}
									</div>
								</div>
								
								<div>
									<label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Requested Items</label>
									<div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-50'}`}>
										<p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
											{Array.isArray(viewModal.request?.uniformType) ? viewModal.request?.uniformType.join(', ') : ''}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			</div>
		</AdminDashboardLayout>
	);
};

export default UniformViewPage;