"use client";
import React, { useState, useEffect } from "react";
import HrdDashboardLayout from "@/components/dashboard/HrdDashboardLayout";
import { useTheme } from "@/context/ThemeContext";
import { api } from '@/services/api';
import type { AxiosError } from 'axios';

interface Note {
  text: string;
  author?: string;
  date?: string;
}

interface Position {
  _id: string;
  title: string;
  department: string;
  location: string;
  status: "Open" | "Onboarding" | "Filled" | "Closed";
  notes?: Note[];
  isDeleted?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

export default function RecruitmentOnboardingDataAddition() {
  const { theme } = useTheme();
  const [positions, setPositions] = useState<Position[]>([]);
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    status: "Open" as Position["status"],
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    department: "",
    location: "",
    status: "Open" as Position["status"],
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkStatusConfirm, setShowBulkStatusConfirm] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Position["status"]>("Open");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortState, setSortState] = useState<SortState>({ key: "title", direction: "asc" });
  const [showDetails, setShowDetails] = useState<Position | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Toast auto-hide
  React.useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Fetch positions from API
  const fetchPositions = async () => {
    setLoading(true);
    try {
      const params: any = {
        search,
        status: statusFilter,
        sort: `${sortState.key}:${sortState.direction}`,
        page,
        pageSize: PAGE_SIZE,
      };
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const res = await api.get('/positions', { params });
      setPositions(res.data.positions);
      setTotal(res.data.total);
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error fetching positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    // eslint-disable-next-line
  }, [search, statusFilter, sortState, page]);

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

  // Add new position
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.department || !form.location) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/positions', form);
      setForm({ title: '', department: '', location: '', status: 'Open' });
      setSuccess('Position added successfully.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error adding position');
    } finally {
      setLoading(false);
    }
  };

  // Edit position
  const startEdit = (pos: Position) => {
    setEditingId(pos._id);
    setEditForm({
      title: pos.title,
      department: pos.department,
      location: pos.location,
      status: pos.status,
    });
  };
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  const saveEdit = async (id: string) => {
    if (!editForm.title || !editForm.department || !editForm.location) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/positions/${id}`, editForm);
      setEditingId(null);
      setSuccess('Position updated successfully.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error updating position');
    } finally {
      setLoading(false);
    }
  };
  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  // Delete position
  const deletePosition = (id: string) => {
    setSelectedIds([id]);
    setShowDeleteConfirm(true);
  };
  const confirmDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/positions/${selectedIds[0]}`);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      setSuccess('Position deleted.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error deleting position');
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete
  const bulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };
  const confirmBulkDelete = async () => {
    setLoading(true);
    try {
      await api.post('/positions/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      setSuccess('Selected positions deleted.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error bulk deleting positions');
    } finally {
      setLoading(false);
    }
  };

  // Onboarding action
  const startOnboarding = async (id: string) => {
    setLoading(true);
    try {
      await api.put(`/positions/${id}`, { status: 'Onboarding' });
      setSuccess('Onboarding started.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error starting onboarding');
    } finally {
      setLoading(false);
    }
  };

  // Bulk status update
  const bulkStatusUpdate = () => {
    setShowBulkStatusConfirm(true);
  };
  const confirmBulkStatusUpdate = async () => {
    setLoading(true);
    try {
      await api.post('/positions/bulk-status', { ids: selectedIds, status: bulkStatus });
      setSelectedIds([]);
      setShowBulkStatusConfirm(false);
      setSuccess('Status updated for selected positions.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error updating status');
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const goToPage = (p: number) => {
    setPage(p);
  };

  // Select all on page
  const toggleSelectAll = () => {
    const idsOnPage = paginatedPositions.map(pos => pos._id);
    if (idsOnPage.every(id => selectedIds.includes(id))) {
      setSelectedIds(selectedIds.filter(id => !idsOnPage.includes(id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...idsOnPage])]);
    }
  };
  // Select one
  const toggleSelect = (id: string) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(sid => sid !== id) : [...selectedIds, id]);
  };

  // Export to CSV
  const exportCSV = async () => {
    setLoading(true);
    try {
      const params: any = {
        search,
        status: statusFilter,
        sort: `${sortState.key}:${sortState.direction}`,
      };
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const res = await api.get('/positions/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'positions.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setSuccess('Exported CSV.');
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error exporting CSV');
    } finally {
      setLoading(false);
    }
  };

  // Reset search/filters
  const resetFilters = () => {
    setSearch("");
    setPage(1);
    setSelectedIds([]);
    setStatusFilter("");
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

  // Add note to position
  const addNote = async (id: string) => {
    if (!noteInput.trim()) return;
    setLoading(true);
    try {
      await api.post(`/positions/${id}/notes`, { text: noteInput });
      setNoteInput('');
      setSuccess('Note added.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error adding note');
    } finally {
      setLoading(false);
    }
  };

  // Duplicate position
  const duplicatePosition = async (pos: Position) => {
    setLoading(true);
    try {
      await api.post(`/positions/${pos._id}/duplicate`);
      setSuccess('Position duplicated.');
      fetchPositions();
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || 'Error duplicating position');
    } finally {
      setLoading(false);
    }
  };

  return (
    <HrdDashboardLayout>
      <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
        {/* Toasts */}
        {(success || error) && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded shadow-lg font-semibold ${success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{success || error}</div>
        )}
        {/* Confirmation Dialogs */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg">
              <p className="mb-4">Are you sure you want to delete this position?</p>
              <div className="flex gap-4 justify-end">
                <button onClick={confirmDelete} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg">
              <p className="mb-4">Are you sure you want to delete the selected positions?</p>
              <div className="flex gap-4 justify-end">
                <button onClick={confirmBulkDelete} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
                <button onClick={() => setShowBulkDeleteConfirm(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {showBulkStatusConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg">
              <p className="mb-4">Change status for selected positions to:</p>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as Position["status"])} className="mb-4 px-3 py-2 rounded border">
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <div className="flex gap-4 justify-end">
                <button onClick={confirmBulkStatusUpdate} className="bg-blue-600 text-white px-4 py-2 rounded">Update</button>
                <button onClick={() => setShowBulkStatusConfirm(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}
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
                    <li key={idx} className="text-sm">{note.text}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-2 py-1 border rounded"
                />
                <button onClick={() => { addNote(showDetails._id); }} className="bg-blue-600 text-white px-3 py-1 rounded">Add Note</button>
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
            <span className="text-3xl font-bold">+</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Recruitment & Onboarding</h1>
            <p className="text-lg">Create and manage open positions, onboard candidates, and update vacancy status.</p>
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
          {selectedIds.length > 0 && (
            <>
              <button onClick={bulkDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Delete Selected</button>
              <button onClick={bulkStatusUpdate} className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600">Change Status</button>
            </>
          )}
        </div>
        {/* Form to add new position */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-6 rounded-lg shadow mb-8 max-w-2xl mx-auto`}>
          <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Add Open Position</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAddPosition}>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-black border-gray-300 focus:ring-blue-600'}`}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Department</label>
              <input
                type="text"
                name="department"
                value={form.department}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-black border-gray-300 focus:ring-blue-600'}`}
                placeholder="e.g. IT, HR"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-black border-gray-300 focus:ring-blue-600'}`}
                placeholder="e.g. Bangalore"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-black border-gray-300 focus:ring-blue-600'}`}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button
                type="submit"
                className={`${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'} px-6 py-2 rounded-lg font-semibold transition-colors`}
              >
                Add Position
              </button>
            </div>
          </form>
        </div>
        {/* Table of open positions */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}> 
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Open Positions</h2>
          </div>
          <div className="relative">
            <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}> 
              <table className="w-full text-left">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                    <th className="px-4 py-4">
                      <input type="checkbox" checked={paginatedPositions.length > 0 && paginatedPositions.every(pos => selectedIds.includes(pos._id))} onChange={toggleSelectAll} />
                    </th>
                    <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("title")}>Title {sortState.key === "title" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                    <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("department")}>Department {sortState.key === "department" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                    <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("location")}>Location {sortState.key === "location" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                    <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`} onClick={() => handleSort("status")}>Status {sortState.key === "status" && (sortState.direction === "asc" ? "▲" : "▼")}</th>
                    <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                  {paginatedPositions.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No open positions.</td></tr>
                  )}
                  {paginatedPositions.map((pos) => (
                    <tr key={pos._id} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.includes(pos._id)} onChange={() => toggleSelect(pos._id)} />
                      </td>
                      {editingId === pos._id ? (
                        <>
                          <td className={`px-6 py-4`}>
                            <input
                              type="text"
                              name="title"
                              value={editForm.title}
                              onChange={handleEditInputChange}
                              className={`w-full px-2 py-1 border rounded ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700' : 'bg-white text-black border-gray-300'}`}
                            />
                          </td>
                          <td className={`px-6 py-4`}>
                            <input
                              type="text"
                              name="department"
                              value={editForm.department}
                              onChange={handleEditInputChange}
                              className={`w-full px-2 py-1 border rounded ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700' : 'bg-white text-black border-gray-300'}`}
                            />
                          </td>
                          <td className={`px-6 py-4`}>
                            <input
                              type="text"
                              name="location"
                              value={editForm.location}
                              onChange={handleEditInputChange}
                              className={`w-full px-2 py-1 border rounded ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700' : 'bg-white text-black border-gray-300'}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <select
                              name="status"
                              value={editForm.status}
                              onChange={handleEditInputChange}
                              className={`px-3 py-1 rounded-full text-sm font-medium border ${theme === 'dark' ? 'bg-blue-950 text-blue-200 border-blue-900' : 'bg-blue-100 text-blue-800 border-blue-200'}`}
                            >
                              {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 flex gap-2">
                            <button onClick={() => saveEdit(pos._id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Save</button>
                            <button onClick={cancelEdit} className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500">Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'} cursor-pointer underline`} onClick={() => openDetails(pos)}>{pos.title}</td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{pos.department}</td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{pos.location}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[pos.status]}`}>{pos.status}</span>
                          </td>
                          <td className="px-6 py-4 flex gap-2 flex-wrap">
                            <button onClick={() => startEdit(pos)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Edit</button>
                            <button onClick={() => deletePosition(pos._id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
                            <button onClick={() => duplicatePosition(pos)} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">Duplicate</button>
                            {pos.status === "Open" && (
                              <button onClick={() => startOnboarding(pos._id)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Start Onboarding</button>
                            )}
                          </td>
                        </>
                      )}
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
    </HrdDashboardLayout>
  );
} 