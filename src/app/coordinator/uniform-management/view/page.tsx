'use client';
import React, { useState, useEffect } from 'react';
import { FaTshirt, FaSearch, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaUser, FaTable, FaThLarge, FaDownload, FaEye, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import  CoordinatorDashboardLayout from '@/components/dashboard/CoordinatorDashboardLayout';
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
	const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
	const [statusFilter, setStatusFilter] = useState('All');
	const { theme } = useTheme();
	const [uniformRequests, setUniformRequests] = useState<UniformRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 12;
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

	const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
	const paginatedRequests = filteredRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) setCurrentPage(page);
	};

	useEffect(() => {
		if (viewModal.open && viewModal.request) {
			console.log('Modal should render', viewModal);
		}
	}, [viewModal]);

	return (
		< CoordinatorDashboardLayout>
			<div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900'}`}>
				<div className="max-w-7xl mx-auto w-full px-4">
					{/* Header */}
					<div className={`mb-6 rounded-2xl p-6 flex items-center gap-6 shadow-lg bg-gradient-to-r ${
						theme === "dark"
							? "from-gray-900 to-gray-800"
							: "from-blue-600 to-blue-500"
					}`}>
						<div className={`flex items-center justify-center w-16 h-16 rounded-xl ${
							theme === "dark" ? "bg-gray-800 bg-opacity-60" : "bg-blue-500 bg-opacity-30"
						}`}>
							<FaTshirt className="w-8 h-8 text-white" />
						</div>
						<div className="flex-1">
							<h1 className="text-3xl font-bold text-white">Uniform Requests - View</h1>
							<p className="text-lg text-blue-100">Browse all uniform requests and their statuses</p>
						</div>
					</div>
				</div>

				{/* Content Area */}
				<div className="max-w-7xl mx-auto pb-8 px-4">
					{/* Controls: View Toggle, Status Filter, Export, Search */}
					<div className={`w-full flex flex-wrap items-center gap-3 justify-between px-4 py-4 rounded-2xl shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
						<div className="flex flex-wrap gap-2 items-center">
							<button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-l-xl font-semibold border ${viewMode === 'card'
								? theme === 'dark'
									? 'bg-blue-800 text-white border-blue-800'
									: 'bg-blue-600 text-white border-blue-600'
								: theme === 'dark'
									? 'bg-gray-900 text-blue-200 border-gray-700'
									: 'bg-white text-blue-700 border-blue-200'} transition flex items-center gap-2`}> <FaThLarge /> Card View</button>
							<button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-r-xl font-semibold border-l-0 border ${viewMode === 'table'
								? theme === 'dark'
									? 'bg-blue-800 text-white border-blue-800'
									: 'bg-blue-600 text-white border-blue-600'
								: theme === 'dark'
									? 'bg-gray-900 text-blue-200 border-gray-700'
									: 'bg-white text-blue-700 border-blue-200'} transition flex items-center gap-2`}> <FaTable /> Table View</button>
							<select value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setCurrentPage(1); }} className={`ml-2 w-40 appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-200 text-black"}`}> <option value="All Projects">All Projects</option> {projectOptions.map(project => (<option key={project} value={project}>{project}</option>))} </select>
							<select value={designationFilter} onChange={e => { setDesignationFilter(e.target.value); setCurrentPage(1); }} className={`w-40 appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-200 text-black"}`}> <option value="All Designations">All Designations</option> {designationOptions.map(designation => (<option key={designation} value={designation}>{designation}</option>))} </select>
							<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`w-36 border rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-700 border-blue-200 focus:ring-blue-400'}`}> <option value="All">All Statuses</option> <option value="Approved">Approved</option> <option value="Pending">Pending</option> <option value="Rejected">Rejected</option> </select>
							<button onClick={() => exportToCSV(filteredRequests)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow transition focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gradient-to-r from-green-700 to-green-800 text-white hover:from-green-800 hover:to-green-900 focus:ring-green-900' : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-400'}`}> <FaDownload /> Export CSV</button>
						</div>
						<div className="flex items-center rounded-xl px-4 py-2 shadow w-full md:w-80 mt-2 md:mt-0">
							<FaSearch className={theme === 'dark' ? 'text-blue-300 mr-2' : 'text-blue-400 mr-2'} />
							<input type="text" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} className={`flex-1 bg-transparent outline-none ${theme === 'dark' ? 'text-blue-100 placeholder-blue-400' : 'text-blue-900 placeholder-blue-300'}`} />
						</div>
					</div>
				</div>
			</div>

			{/* Content Area */}
			<div className="max-w-7xl mx-auto pb-8">
				{loading ? (
					<div className={`text-center py-16 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
						<div className="inline-flex items-center gap-3">
							<div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
							<span className="text-lg font-medium">Loading uniform requests...</span>
						</div>
					</div>
				) : error ? (
					<div className={`rounded-2xl p-8 text-center max-w-lg mx-auto ${theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
						<FaTimesCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">{error}</h3>
						<p className="text-red-600 dark:text-red-300">Please try refreshing the page.</p>
					</div>
				) : filteredRequests.length === 0 ? (
					<div className={`rounded-2xl p-8 text-center max-w-lg mx-auto ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200'}`}>
						<FaUser className="w-16 h-16 text-slate-400 mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">No uniform requests found</h3>
						<p className="text-slate-500 dark:text-slate-500">Try adjusting your filters or search criteria.</p>
					</div>
				) : viewMode === 'card' ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{paginatedRequests.map((req) => (
							<div
								key={req._id}
								className={`group relative rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
									theme === 'dark' 
										? 'bg-slate-800/80 border border-slate-700 hover:border-slate-600' 
										: 'bg-white border border-slate-200 hover:border-slate-300'
								}`}
							>
								{/* Status Indicator */}
								<div className={`absolute top-0 right-0 w-0 h-0 border-l-[60px] border-l-transparent border-t-[60px] ${
									req.approvalStatus === 'Approved' ? 'border-t-emerald-500' :
									req.approvalStatus === 'Rejected' ? 'border-t-red-500' : 'border-t-amber-500'
								}`}></div>
								
								<div className="p-5">
									{/* Header */}
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1">
											<h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
												{req.fullName}
											</h3>
											<p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
												{req.designation}
											</p>
										</div>
										<button
											onClick={() => {
												console.log('Eye icon clicked', req);
												setViewModal({ open: true, request: req });
											}}
											className={`relative z-10 p-2 rounded-lg transition-colors ${
												theme === 'dark' 
													? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' 
													: 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
											}`}
										>
											<FaEye className="w-4 h-4" />
										</button>
									</div>

									{/* Details */}
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<span className={`text-xs font-medium px-2 py-1 rounded-full ${
												theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
											}`}>
												{req.employeeId}
											</span>
										</div>
										
										<div>
											<p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
												<span className="font-medium">Project:</span> {req.projectName}
											</p>
										</div>

										<div>
											<p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
												<span className="font-medium">Items:</span> {Array.isArray(req.uniformType) ? req.uniformType.join(", ") : ''}
											</p>
										</div>

										{/* Status Badge */}
										<div className="pt-2">
											{statusBadge(req.approvalStatus)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className={`rounded-2xl shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-slate-200'}`}>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className={`${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
									<tr>
										<th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Employee</th>
										<th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Project</th>
										<th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Requested Items</th>
										<th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Status</th>
										<th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Actions</th>
									</tr>
								</thead>
								<tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
									{paginatedRequests.map((req) => (
										<tr
											key={req._id}
											className={`transition-colors duration-200 ${
												theme === 'dark' 
													? 'hover:bg-slate-700/50' 
													: 'hover:bg-slate-50'
											}`}
										>
											<td className="px-6 py-4">
												<div>
													<div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
														{req.fullName}
													</div>
													<div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
														{req.designation}
													</div>
													<div className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
														{req.employeeId}
													</div>
												</div>
											</td>
											<td className="px-6 py-4">
												<span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
													{req.projectName}
												</span>
											</td>
											<td className="px-6 py-4">
												<div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
													{Array.isArray(req.uniformType) ? req.uniformType.join(", ") : ''}
												</div>
											</td>
											<td className="px-6 py-4">
												{statusBadge(req.approvalStatus)}
											</td>
											<td className="px-6 py-4 text-center">
												<button
													onClick={() => {
														console.log('Eye icon clicked', req);
														setViewModal({ open: true, request: req });
													}}
													className={`p-2 rounded-lg transition-colors ${
														theme === 'dark' 
															? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' 
															: 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
													}`}
												>
													<FaEye className="w-4 h-4" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Enhanced Pagination */}
				{totalPages > 1 && (
					<div className="mt-6 flex items-center justify-between">
						<div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
							Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredRequests.length)} of {filteredRequests.length} results
						</div>
						<div className="flex items-center gap-2">
							<button
								disabled={currentPage === 1}
								onClick={() => handlePageChange(currentPage - 1)}
								className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
									theme === 'dark' 
										? 'text-slate-400 hover:text-white hover:bg-slate-700' 
										: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
								}`}
							>
								<FaChevronLeft className="w-4 h-4" />
							</button>
							
							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const page = i + 1;
								return (
									<button
										key={page}
										onClick={() => handlePageChange(page)}
										className={`px-3 py-2 rounded-lg font-medium transition-colors ${
											currentPage === page
												? 'bg-blue-600 text-white'
												: theme === 'dark'
													? 'text-slate-400 hover:text-white hover:bg-slate-700'
													: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
										}`}
									>
										{page}
									</button>
								);
							})}
							
							<button
								disabled={currentPage === totalPages}
								onClick={() => handlePageChange(currentPage + 1)}
								className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
									theme === 'dark' 
										? 'text-slate-400 hover:text-white hover:bg-slate-700' 
										: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
								}`}
							>
								<FaChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}
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
		</ CoordinatorDashboardLayout>
	);
};

export default UniformViewPage;