"use client";
import React, { useState } from "react";
import HrdDashboardLayout from "@/components/dashboard/HrdDashboardLayout";
import { useTheme } from "@/context/ThemeContext";

interface Position {
  id: string;
  title: string;
  department: string;
  location: string;
  status: "Open" | "Onboarding" | "Filled" | "Closed";
  notes?: string[];
}

const initialPositions: Position[] = [
  {
    id: "1",
    title: "Software Engineer",
    department: "IT",
    location: "Bangalore",
    status: "Open",
    notes: ["Initial position created."],
  },
  {
    id: "2",
    title: "HR Manager",
    department: "HR",
    location: "Delhi",
    status: "Onboarding",
    notes: ["Candidate shortlisted."],
  },
];

const statusOptions = ["Open", "Onboarding", "Filled", "Closed"];
const PAGE_SIZE = 5;

const statusColors: Record<string, string> = {
  Open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Onboarding: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Filled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Closed: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

type SortKey = keyof Pick<Position, "title" | "department" | "location" | "status">;
type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

export default function RecruitmentOnboardingView() {
  const { theme } = useTheme();
  const [positions] = useState<Position[]>(initialPositions);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortState, setSortState] = useState<SortState>({ key: "title", direction: "asc" });
  const [showDetails, setShowDetails] = useState<Position | null>(null);

  // Filtered, sorted, and paginated positions
  let filteredPositions = positions.filter(pos =>
    (pos.title.toLowerCase().includes(search.toLowerCase()) ||
      pos.department.toLowerCase().includes(search.toLowerCase()) ||
      pos.location.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || pos.status === statusFilter)
  );
  if (sortState.key) {
    filteredPositions = filteredPositions.sort((a, b) => {
      const aVal = a[sortState.key].toLowerCase();
      const bVal = b[sortState.key].toLowerCase();
      if (aVal < bVal) return sortState.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortState.direction === "asc" ? 1 : -1;
      return 0;
    });
  }
  const totalPages = Math.ceil(filteredPositions.length / PAGE_SIZE);
  const paginatedPositions = filteredPositions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Status counts
  const statusCounts = positions.reduce((acc, pos) => {
    acc[pos.status] = (acc[pos.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Pagination
  const goToPage = (p: number) => {
    setPage(p);
  };

  // Sort columns
  const handleSort = (key: SortKey) => {
    setSortState(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Show details modal
  const openDetails = (pos: Position) => setShowDetails(pos);
  const closeDetails = () => setShowDetails(null);

  // Reset search/filters
  const resetFilters = () => {
    setSearch("");
    setPage(1);
    setStatusFilter("");
  };

  // Export to CSV
  const exportCSV = () => {
    const header = ["Title", "Department", "Location", "Status"];
    const rows = filteredPositions.map(pos => [pos.title, pos.department, pos.location, pos.status]);
    const csvContent = [header, ...rows].map(row => row.map(field => `"${field}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "positions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <HrdDashboardLayout>
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Details Modal */}
        {showDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg max-w-lg w-full">
              <h2 className="text-2xl font-bold mb-2">{showDetails.title}</h2>
              <div className="mb-2"><span className="font-semibold">Department:</span> {showDetails.department}</div>
              <div className="mb-2"><span className="font-semibold">Location:</span> {showDetails.location}</div>
              <div className="mb-2"><span className="font-semibold">Status:</span> <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[showDetails.status]}`}>{showDetails.status}</span></div>
              <div className="mb-2">
                <span className="font-semibold">Notes/Comments:</span>
                <ul className="list-disc ml-6 mt-1">
                  {(showDetails.notes || []).map((note, idx) => (
                    <li key={idx} className="text-sm">{note}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={closeDetails} className="bg-gray-400 text-white px-4 py-2 rounded">Close</button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-700 text-blue-100' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white'} rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg`}>
          <div className={`${theme === 'dark' ? 'bg-gray-900 text-blue-400' : 'bg-white text-blue-600'} p-6 rounded-full flex items-center justify-center shadow-md`}>
            <span className="text-3xl font-bold">👁️</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Recruitment & Onboarding</h1>
            <p className="text-lg">View all open positions, onboarding, and status history.</p>
          </div>
        </div>
        {/* Status Color Legend and Counts */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex gap-2 items-center">
            <span className="font-semibold">Legend:</span>
            {statusOptions.map(status => (
              <span key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>{status}</span>
            ))}
          </div>
          <div className="flex gap-2 items-center ml-auto flex-wrap">
            <span className="font-semibold">Total:</span>
            <span className="px-2 py-1 rounded bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{positions.length}</span>
            {statusOptions.map(status => (
              <span key={status} className="text-sm">
                <span className={`px-2 py-1 rounded ${statusColors[status]}`}>{statusCounts[status] || 0}</span> {status}
              </span>
            ))}
          </div>
        </div>
        {/* Search, Filter, and Actions */}
        <div className="max-w-2xl mx-auto mb-4 flex gap-2 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search by title, department, or location..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className={`flex-1 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-black border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
          />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded border"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button onClick={resetFilters} className="px-4 py-2 rounded bg-gray-300 text-gray-800 hover:bg-gray-400 dark:bg-gray-700 dark:text-blue-100 dark:hover:bg-gray-800">Reset</button>
          <button onClick={exportCSV} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Export CSV</button>
        </div>
        {/* Table of open positions (desktop) */}
        <div className="hidden md:block">
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}> 
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>All Positions</h2>
            </div>
            <div className="relative">
              <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}> 
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("title")}>Title {sortState.key === "title" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("department")}>Department {sortState.key === "department" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("location")}>Location {sortState.key === "location" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("status")}>Status {sortState.key === "status" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {paginatedPositions.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400">No positions found.</td></tr>
                    )}
                    {paginatedPositions.map((pos) => (
                      <tr key={pos.id} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'} cursor-pointer underline`} onClick={() => openDetails(pos)}>{pos.title}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{pos.department}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{pos.location}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[pos.status]}`}>{pos.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`px-3 py-1 rounded ${p === page ? (theme === 'dark' ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white') : (theme === 'dark' ? 'bg-gray-800 text-blue-200' : 'bg-gray-200 text-blue-800')}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Card view for mobile */}
        <div className="md:hidden">
          <div className="space-y-4">
            {paginatedPositions.length === 0 && (
              <div className="text-center py-8 text-gray-400">No positions found.</div>
            )}
            {paginatedPositions.map((pos) => (
              <div key={pos.id} className={`rounded-lg shadow p-4 border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-lg cursor-pointer underline" onClick={() => openDetails(pos)}>{pos.title}</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[pos.status]}`}>{pos.status}</span>
                </div>
                <div className="text-sm mb-1"><span className="font-semibold">Department:</span> {pos.department}</div>
                <div className="text-sm mb-1"><span className="font-semibold">Location:</span> {pos.location}</div>
              </div>
            ))}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`px-3 py-1 rounded ${p === page ? (theme === 'dark' ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white') : (theme === 'dark' ? 'bg-gray-800 text-blue-200' : 'bg-gray-200 text-blue-800')}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </HrdDashboardLayout>
  );
} 