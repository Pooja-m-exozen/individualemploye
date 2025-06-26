'use client';
import React, { useState, useEffect } from 'react';
import { FaTshirt, FaSearch, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaUser, FaTable, FaThLarge, FaDownload } from 'react-icons/fa';
import ManagerDashboardLayout from '@/components/dashboard/ManagerDashboardLayout';
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
			return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold"><FaCheckCircle /> Approved</span>;
		case 'Rejected':
			return <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold"><FaTimesCircle /> Rejected</span>;
		default:
			return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold"><FaHourglassHalf /> Pending</span>;
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
	const rowsPerPage = 10;

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

	const filteredRequests = uniformRequests.filter(req =>
		(statusFilter === 'All' || req.approvalStatus === statusFilter) &&
		(req.fullName?.toLowerCase().includes(search.toLowerCase()) ||
			req.employeeId?.toLowerCase().includes(search.toLowerCase()))
	);

	const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
	const paginatedRequests = filteredRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) setCurrentPage(page);
	};

	return (
		<ManagerDashboardLayout>
			<div className={`min-h-screen flex flex-col items-center py-8 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
				{/* Header */}
				<div className="mb-8 w-full max-w-7xl mx-auto">
					<div className={`flex items-center gap-6 rounded-2xl px-8 py-8 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}>
						<div className={`flex items-center justify-center w-16 h-16 rounded-xl ${theme === 'dark' ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-500 bg-opacity-30'}`}>
							<FaTshirt className="w-8 h-8 text-white" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-white">Uniform Requests - View</h1>
							<p className="text-lg text-blue-100">Browse all uniform requests and their statuses</p>
						</div>
					</div>
				</div>
				{/* Controls: View Toggle, Status Filter, Export, Search */}
				<div className={`w-full max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-center gap-3 justify-between sticky top-0 z-30 py-2 px-2 rounded-2xl shadow ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
					<div className="flex gap-2 mb-2 md:mb-0">
						<button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-l-xl font-semibold border ${viewMode === 'card'
							? theme === 'dark'
								? 'bg-blue-800 text-white border-blue-800'
								: 'bg-blue-600 text-white border-blue-600'
							: theme === 'dark'
								? 'bg-gray-900 text-blue-200 border-gray-700'
								: 'bg-white text-blue-700 border-blue-200'} transition flex items-center gap-2`}><FaThLarge /> Card View</button>
						<button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-r-xl font-semibold border-l-0 border ${viewMode === 'table'
							? theme === 'dark'
								? 'bg-blue-800 text-white border-blue-800'
								: 'bg-blue-600 text-white border-blue-600'
							: theme === 'dark'
								? 'bg-gray-900 text-blue-200 border-gray-700'
								: 'bg-white text-blue-700 border-blue-200'} transition flex items-center gap-2`}><FaTable /> Table View</button>
					</div>
					<div className="flex gap-2 items-center">
						<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`border rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-700 border-blue-200 focus:ring-blue-400'}`}>
							<option value="All">All Statuses</option>
							<option value="Approved">Approved</option>
							<option value="Pending">Pending</option>
							<option value="Rejected">Rejected</option>
						</select>
						<button onClick={() => exportToCSV(filteredRequests)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow transition focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gradient-to-r from-green-700 to-green-800 text-white hover:from-green-800 hover:to-green-900 focus:ring-green-900' : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-400'}`}><FaDownload /> Export CSV</button>
					</div>
					<div className={`flex items-center rounded-xl px-4 py-2 shadow w-full md:w-80 border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}>
						<FaSearch className={theme === 'dark' ? 'text-blue-300 mr-2' : 'text-blue-400 mr-2'} />
						<input
							type="text"
							placeholder="Search by name or ID..."
							value={search}
							onChange={e => setSearch(e.target.value)}
							className={`flex-1 bg-transparent outline-none ${theme === 'dark' ? 'text-blue-100 placeholder-blue-400' : 'text-blue-900 placeholder-blue-300'}`}
						/>
					</div>
				</div>
				{/* Requests List: Card or Table View */}
				<div className="w-full max-w-4xl mx-auto">
					{loading ? (
						<div className="text-center py-12 text-blue-600 font-bold">Loading uniform requests...</div>
					) : error ? (
						<div className="bg-red-50 text-red-600 p-8 rounded-2xl flex flex-col items-center gap-4 max-w-lg mx-auto shadow-lg">
							<FaTimesCircle className="w-12 h-12 flex-shrink-0" />
							<p className="text-xl font-semibold">{error}</p>
						</div>
					) : filteredRequests.length === 0 ? (
						<div className="bg-yellow-50 text-yellow-600 p-8 rounded-2xl flex flex-col items-center gap-4 max-w-lg mx-auto shadow-lg">
							<FaUser className="w-12 h-12 flex-shrink-0" />
							<p className="text-xl font-semibold">No uniform requests found.</p>
							<p className="text-sm text-yellow-700">Try adjusting your filters or search criteria.</p>
						</div>
					) : viewMode === 'card' ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto" style={{ maxHeight: '520px', minHeight: '200px' }}>
							{filteredRequests.map((req) => (
								<div
									key={req._id}
									className={`rounded-2xl shadow-xl p-7 flex flex-col gap-5 border-l-8 hover:shadow-2xl transition group relative 
          ${theme === 'dark' ? 'bg-gray-900 border-blue-900' : 'bg-white border-blue-400'}`}
								>
									<div className="flex flex-col gap-2">
										<h2 className={`text-xl font-bold mb-1 truncate ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{req.fullName}</h2>
										<div className="flex flex-wrap items-center gap-2 mb-1">
											<span className={`text-base font ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>{req.designation}</span>
											<span className={`text-sm font-bold px-2 py-0.5 rounded ${theme === 'dark' ? 'text-blue-100 bg-gray-800' : 'text-black bg-gray-100'}`}>{req.employeeId}</span>
										</div>
										<p className={`text-xs mb-1 truncate ${theme === 'dark' ? 'text-blue-400' : 'text-blue-400'}`}>{req.projectName}</p>
										{statusBadge(req.approvalStatus)}
										<div className={`mt-2 text-xs ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
											<span className="font-semibold">Requested Items:</span> {Array.isArray(req.uniformType) ? req.uniformType.join(", ") : ''}
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className={`overflow-x-auto rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} mx-auto`} style={{ maxWidth: '900px', maxHeight: '520px', minHeight: '200px', overflowY: 'auto' }}>
							<table className={`min-w-full table-fixed ${theme === 'dark' ? 'divide-y divide-gray-800' : 'divide-y divide-blue-100'}`}>
								<thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}>
									<tr>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`} style={{width: '18%'}}>Name</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`} style={{width: '16%'}}>Designation</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`} style={{width: '14%'}}>Employee ID</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`} style={{width: '18%'}}>Project</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`} style={{width: '22%'}}>Requested Items</th>
										<th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`} style={{width: '12%'}}>Status</th>
									</tr>
								</thead>
								<tbody className={theme === 'dark' ? 'divide-y divide-gray-800' : 'divide-y divide-blue-50'}>
									{paginatedRequests.map((req) => (
										<tr key={req._id} className={theme === 'dark' ? 'hover:bg-gray-800 transition' : 'hover:bg-blue-50 transition'}>
											<td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-blue-800'}`}>{req.fullName}</td>
											<td className={`px-4 py-3 font ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>{req.designation}</td>
											<td className={`px-4 py-3 font ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>{req.employeeId}</td>
											<td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>{req.projectName}</td>
											<td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>{Array.isArray(req.uniformType) ? req.uniformType.join(", ") : ''}</td>
											<td className={`px-4 py-3`}>{statusBadge(req.approvalStatus)}</td>
										</tr>
									))}
								</tbody>
							</table>
							{/* Pagination Controls */}
							{totalPages > 1 && (
								<div className="flex justify-center items-center gap-2 py-4">
									<button
										disabled={currentPage === 1}
										onClick={() => handlePageChange(currentPage - 1)}
										className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-gray-800 text-blue-200' : 'bg-blue-100 text-blue-700'} font-semibold disabled:opacity-50`}
									>
										Prev
									</button>
									{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
										<button
											key={page}
											onClick={() => handlePageChange(page)}
											className={`px-3 py-1 rounded font-semibold border ${currentPage === page
												? theme === 'dark'
													? 'bg-blue-800 text-white border-blue-800'
													: 'bg-blue-600 text-white border-blue-600'
												: theme === 'dark'
													? 'bg-gray-900 text-blue-200 border-gray-700'
													: 'bg-white text-blue-700 border-blue-200'}`}
										>
											{page}
										</button>
									))}
									<button
										disabled={currentPage === totalPages}
										onClick={() => handlePageChange(currentPage + 1)}
										className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-gray-800 text-blue-200' : 'bg-blue-100 text-blue-700'} font-semibold disabled:opacity-50`}
									>
										Next
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</ManagerDashboardLayout>
	);
};

export default UniformViewPage;
