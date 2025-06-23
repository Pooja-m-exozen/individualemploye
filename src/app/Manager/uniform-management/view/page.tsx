'use client';
import React, { useState } from 'react';
import { FaTshirt, FaSearch, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaUser, FaTable, FaThLarge, FaDownload } from 'react-icons/fa';
import ManagerDashboardLayout from '@/components/dashboard/ManagerDashboardLayout';

const MOCK_UNIFORM_REQUESTS = [
  {
    _id: '1',
    employee: {
      employeeId: 'EMP001',
      fullName: 'John Doe',
      designation: 'Security Guard',
      employeeImage: '/placeholder-user.jpg',
      projectName: 'Project Alpha',
    },
    status: 'Approved',
    requestedItems: ['Shirt', 'Trousers', 'Cap'],
  },
  {
    _id: '2',
    employee: {
      employeeId: 'EMP002',
      fullName: 'Jane Smith',
      designation: 'Supervisor',
      employeeImage: '/placeholder-user.jpg',
      projectName: 'Project Beta',
    },
    status: 'Rejected',
    requestedItems: ['Jacket', 'Shoes'],
  },
  {
    _id: '3',
    employee: {
      employeeId: 'EMP003',
      fullName: 'Alice Johnson',
      designation: 'Technician',
      employeeImage: '/placeholder-user.jpg',
      projectName: 'Project Gamma',
    },
    status: 'Pending',
    requestedItems: ['Belt', 'Cap'],
  },
];

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

const exportToCSV = (data: typeof MOCK_UNIFORM_REQUESTS) => {
  const header = ['Employee ID', 'Name', 'Designation', 'Project', 'Status', 'Requested Items'];
  const rows = data.map(req => [
    req.employee.employeeId,
    req.employee.fullName,
    req.employee.designation,
    req.employee.projectName,
    req.status,
    req.requestedItems.join('; ')
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

  const filteredRequests = MOCK_UNIFORM_REQUESTS.filter(req =>
    (statusFilter === 'All' || req.status === statusFilter) &&
    (req.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
      req.employee.employeeId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <ManagerDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center py-8">
        {/* Header */}
        <div className="mb-8 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-6 rounded-2xl px-8 py-8 bg-gradient-to-r from-blue-600 to-blue-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500 bg-opacity-30">
              <FaTshirt className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Uniform Requests - View</h1>
              <p className="text-lg text-blue-100">Browse all uniform requests and their statuses</p>
            </div>
          </div>
        </div>
        {/* Controls: View Toggle, Status Filter, Export, Search */}
        <div className="w-full max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-center gap-3 justify-between sticky top-0 z-30 bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-2 px-2 rounded-2xl shadow">
          <div className="flex gap-2 mb-2 md:mb-0">
            <button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-l-xl font-semibold border ${viewMode === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200'} transition flex items-center gap-2`}><FaThLarge /> Card View</button>
            <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-r-xl font-semibold border-l-0 border ${viewMode === 'table' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200'} transition flex items-center gap-2`}><FaTable /> Table View</button>
          </div>
          <div className="flex gap-2 items-center">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-blue-200 rounded-xl px-3 py-2 bg-white text-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button onClick={() => exportToCSV(filteredRequests)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow hover:from-green-600 hover:to-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-400"><FaDownload /> Export CSV</button>
          </div>
          <div className="flex items-center bg-white border border-blue-100 rounded-xl px-4 py-2 shadow w-full md:w-80">
            <FaSearch className="text-blue-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-blue-900 placeholder-blue-300"
            />
          </div>
        </div>
        {/* Requests List: Card or Table View */}
        <div className="w-full max-w-4xl mx-auto">
          {filteredRequests.length === 0 ? (
            <div className="bg-yellow-50 text-yellow-600 p-8 rounded-2xl flex flex-col items-center gap-4 max-w-lg mx-auto shadow-lg">
              <FaUser className="w-12 h-12 flex-shrink-0" />
              <p className="text-xl font-semibold">No uniform requests found.</p>
              <p className="text-sm text-yellow-700">Try adjusting your filters or search criteria.</p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredRequests.map((req) => (
                <div key={req._id} className="bg-white rounded-2xl shadow-xl p-7 flex flex-col gap-5 border-l-8 border-blue-400 hover:shadow-2xl transition group relative">
                  <div className="flex items-center gap-6">
                    <img
                      src={req.employee.employeeImage || "/placeholder-user.jpg"}
                      alt={req.employee.fullName}
                      className="w-20 h-20 rounded-full object-cover border-2 border-blue-200 shadow group-hover:scale-105 transition"
                    />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-black-800 mb-1 truncate">{req.employee.fullName}</h2>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-base font text-black">{req.employee.designation}</span>
                        <span className="text-sm font-bold text-black bg-gray-100 px-2 py-0.5 rounded">{req.employee.employeeId}</span>
                      </div>
                      <p className="text-xs text-blue-400 mb-1 truncate">{req.employee.projectName}</p>
                      {statusBadge(req.status)}
                      <div className="mt-2 text-xs text-gray-700">
                        <span className="font-semibold">Requested Items:</span> {req.requestedItems.join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl shadow-lg bg-white">
              <table className="min-w-full divide-y divide-blue-100">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Photo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Employee ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Requested Items</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {filteredRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-blue-50 transition">
                      <td className="px-4 py-3">
                        <img src={req.employee.employeeImage || "/placeholder-user.jpg"} alt={req.employee.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow" />
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-800">{req.employee.fullName}</td>
                      <td className="px-4 py-3 font text-black">{req.employee.designation}</td>
                      <td className="px-4 py-3 font text-black">{req.employee.employeeId}</td>
                      <td className="px-4 py-3 text-blue-500">{req.employee.projectName}</td>
                      <td className="px-4 py-3 text-gray-700">{req.requestedItems.join(", ")}</td>
                      <td className="px-4 py-3">{statusBadge(req.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ManagerDashboardLayout>
  );
};

export default UniformViewPage; 