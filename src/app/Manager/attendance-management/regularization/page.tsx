"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaCalendarAlt, FaFileExport } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { fetchAllRegularizations, updateRegularizationStatus } from "@/services/regularization";
import type { RegularizationRecord } from "@/types/regularization";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AttendanceReportPage() {
    const { theme } = useTheme();
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [records, setRecords] = useState<RegularizationRecord[]>([]);
    const [viewRecord, setViewRecord] = useState<RegularizationRecord | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectId, setRejectId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetchAllRegularizations()
            .then((res) => {
                setRecords(res.data.regularizations || []);
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to fetch data");
                setLoading(false);
            });
    }, []);

    const handleAction = async (id: string, action: string) => {
        setLoading(true);
        setError("");
        try {
            await updateRegularizationStatus(id, action);
            setRecords((prev) => prev.map((rec) =>
                rec._id === id ? { ...rec, regularizationStatus: action === "approve" ? "Approved" : "Rejected" } : rec
            ));
        } catch {
            setError("Action failed");
        }
        setLoading(false);
    };

    const handleReject = (id: string) => {
        setRejectId(id);
        setShowRejectModal(true);
    };

    const submitReject = async () => {
        if (!rejectId) return;
        setLoading(true);
        setError("");
        try {
            await updateRegularizationStatus(rejectId, "reject", rejectReason);
            setRecords((prev) => prev.map((rec) =>
                rec._id === rejectId ? { ...rec, regularizationStatus: "Rejected" } : rec
            ));
            setShowRejectModal(false);
            setRejectReason("");
            setRejectId(null);
        } catch {
            setError("Action failed");
        }
        setLoading(false);
    };

    const filteredRecords = useMemo(() => {
        return records.filter((rec) => {
            const matchesSearch =
                search === "" ||
                rec.employeeId?.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [search, records]);

    // Helper to format date only (YYYY-MM-DD)
    function formatDate(dt?: string) {
        if (!dt) return "-";
        const dateObj = new Date(dt);
        if (isNaN(dateObj.getTime())) return dt.split(' ')[0] || dt;
        // Format as YYYY-MM-DD
        return dateObj.toISOString().split('T')[0];
    }

    // Excel export using xlsx
    function downloadExcel() {
        import('xlsx').then(XLSX => {
            const wsData = [
                [
                    'Date',
                    'Status',
                    'Reason',
                    'Regularized By',
                    'Regularization Status',
                    'Original Status',
                    'Remarks',
                ],
                ...filteredRecords.map(rec => [
                    formatDate(rec.date),
                    rec.status,
                    rec.regularizationReason || '-',
                    rec.regularizedBy || '-',
                    rec.regularizationStatus,
                    rec.originalStatus || '-',
                    rec.remarks || '-',
                ])
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Regularizations');
            XLSX.writeFile(wb, 'attendance-regularizations.xlsx');
        });
    }

    // PDF export using jsPDF
    function downloadPDF() {
        const doc = new jsPDF();
        const tableColumn = [
            'Date',
            'Status',
            'Reason',
            'Regularized By',
            'Regularization Status',
            'Original Status',
            'Remarks',
        ];
        const tableRows = filteredRecords.map(rec => [
            formatDate(rec.date),
            rec.status,
            rec.regularizationReason || '-',
            rec.regularizedBy || '-',
            rec.regularizationStatus,
            rec.originalStatus || '-',
            rec.remarks || '-',
        ]);
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            styles: { cellWidth: 'wrap' },
            columnStyles: {
                0: { halign: 'center' }, // Center align the Date column
            },
        });
        doc.save('attendance-regularizations.pdf');
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
                    className={`rounded-2xl mb-4 md:mb-8 p-4 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shadow-lg ${
                        theme === "dark"
                            ? "bg-[#2d3748]"
                            : "bg-gradient-to-r from-blue-500 to-blue-800"
                    }`}
                >
                    <div
                        className={`${
                            theme === "dark" ? "bg-gray-800" : "bg-blue-600 bg-opacity-30"
                        } rounded-xl p-3 md:p-4 flex items-center justify-center`}
                    >
                        <FaCalendarAlt className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-1 text-white">Attendance Regulization</h1>
                        <p className="text-base md:text-lg opacity-90 text-white">Manage and regularize employee attendance records, including correction of missed punches and shift adjustments.</p>
                    </div>
                </div>
                {/* Filters, Search, Export */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-4 md:mb-6">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-2 md:mb-0 items-stretch w-full">
                        <div className="relative flex-1 min-w-[140px] max-w-xs">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search employee name or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 text-xs md:text-base ${
                                    theme === "dark"
                                        ? "bg-gray-800 border-gray-700 text-gray-100"
                                        : "bg-white border-gray-200 text-black"
                                }`}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={downloadExcel}
                            className={`px-4 py-2 min-w-[120px] md:min-w-[140px] rounded-lg flex items-center justify-center gap-2 transition-colors text-xs md:text-base ${theme === "dark" ? "bg-green-700 text-white hover:bg-green-800" : "bg-green-500 text-white hover:bg-green-600"}`}
                        >
                            <FaFileExport /> Export Excel
                        </button>
                        <button
                            onClick={downloadPDF}
                            className={`px-4 py-2 min-w-[120px] md:min-w-[140px] rounded-lg flex items-center justify-center gap-2 transition-colors text-xs md:text-base ${theme === "dark" ? "bg-red-700 text-white hover:bg-red-800" : "bg-red-500 text-white hover:bg-red-600"}`}
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
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Date</th>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Status</th>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Reason</th>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Regularized By</th>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Regularization Status</th>
                                <th className={`px-4 py-3 text-center text-xs font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody
                            className={
                                theme === "dark"
                                    ? "divide-y divide-gray-800"
                                    : "divide-y divide-blue-50"
                            }
                        >
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={6} className="text-center text-red-500 py-8">{error}</td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className={`px-4 py-12 text-center ${
                                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                                        }`}
                                    >
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((rec, idx) => (
                                    <tr key={rec._id || idx}>
                                        <td className={`px-4 py-3 font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{formatDate(rec.date)}</td>
                                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{rec.status}</td>
                                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{rec.regularizationReason || "-"}</td>
                                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{rec.regularizedBy || "-"}</td>
                                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{rec.regularizationStatus}</td>
                                        <td className={`px-4 py-3 text-center ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                            <div className="flex flex-col md:flex-row gap-2 justify-center items-center">
                                                <button
                                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                                                    onClick={() => setViewRecord(rec)}
                                                >View</button>
                                                {rec.regularizationStatus === "Pending" && (
                                                    <>
                                                        <button
                                                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                                                            onClick={() => handleAction(rec._id, "approve")}
                                                            disabled={loading}
                                                        >Approve</button>
                                                        <button
                                                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                                                            onClick={() => handleReject(rec._id)}
                                                            disabled={loading}
                                                        >Reject</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Modal for View */}
            {viewRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className={`rounded-xl shadow-2xl p-4 md:p-6 w-full max-w-xs sm:max-w-md ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Regularization Details</h2>
                            <button onClick={() => setViewRecord(null)} className="text-2xl font-bold hover:text-red-500">&times;</button>
                        </div>
                        <div className="space-y-2">
                            <div><span className="font-semibold">Employee ID:</span> {viewRecord.employeeId}</div>
                            <div><span className="font-semibold">Date:</span> {formatDate(viewRecord.date)}</div>
                            <div><span className="font-semibold">Punch In:</span> {viewRecord.punchInTime || '-'}</div>
                            <div><span className="font-semibold">Punch Out:</span> {viewRecord.punchOutTime || '-'}</div>
                            <div><span className="font-semibold">Status:</span> {viewRecord.status}</div>
                            <div><span className="font-semibold">Reason:</span> {viewRecord.regularizationReason || '-'}</div>
                            <div><span className="font-semibold">Regularized By:</span> {viewRecord.regularizedBy || '-'}</div>
                            <div><span className="font-semibold">Regularization Status:</span> {viewRecord.regularizationStatus}</div>
                            <div><span className="font-semibold">Original Status:</span> {viewRecord.originalStatus || '-'}</div>
                            <div><span className="font-semibold">Remarks:</span> {viewRecord.remarks || '-'}</div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setViewRecord(null)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className={`rounded-xl shadow-2xl p-4 md:p-6 w-full max-w-xs sm:max-w-md ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Reject Regularization</h2>
                            <button onClick={() => setShowRejectModal(false)} className="text-2xl font-bold hover:text-red-500">&times;</button>
                        </div>
                        <div className="mb-4">
                            <label className="block mb-2 font-semibold">Reason for rejection:</label>
                            <textarea
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Cancel</button>
                            <button onClick={submitReject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" disabled={!rejectReason.trim()}>Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}