"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FaCalendarAlt, FaFileExport, FaEye, FaCheck, FaTimes } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { fetchAllRegularizations} from "@/services/regularization";
import type { RegularizationRecord } from "@/types/regularization";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Image from "next/image";

export default function AttendanceRegularizationPage() {
    const { theme } = useTheme();
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [records, setRecords] = useState<RegularizationRecord[]>([]);
    const [employeeMap, setEmployeeMap] = useState<Record<string, { fullName: string; employeeImage: string }>>({});
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

    // Fetch KYC data for all unique employeeIds
    useEffect(() => {
        const uniqueIds = Array.from(new Set(records.map(r => r.employeeId)));
        if (uniqueIds.length === 0) return;
        Promise.all(uniqueIds.map(id =>
            fetch(`https://cafm.zenapi.co.in/api/kyc/${id}`)
                .then(res => res.json())
                .then(data => ({
                    id,
                    fullName: data.kycData?.personalDetails?.fullName || id,
                    employeeImage: data.kycData?.personalDetails?.employeeImage || "/placeholder-user.jpg"
                }))
                .catch(() => ({ id, fullName: id, employeeImage: "/placeholder-user.jpg" }))
        )).then(results => {
            const map: Record<string, { fullName: string; employeeImage: string }> = {};
            results.forEach(r => { map[r.id] = { fullName: r.fullName, employeeImage: r.employeeImage }; });
            setEmployeeMap(map);
        });
    }, [records]);

    const handleAction = async (id: string, action: string) => {
        setLoading(true);
        setError("");
        try {
            if (action === "approve") {
                const res = await fetch(`https://cafm.zenapi.co.in/api/attendance/regularize/${id}/approve`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        // "Authorization": "Bearer YOUR_TOKEN_HERE" // Uncomment and set if needed
                    },
                    body: JSON.stringify({ status: "Approved", approvedBy: "Manager" })
                });
                const data = await res.json();
                console.log('Approve response:', data);
                if (!data.success) throw new Error(data.message || "Approval failed");
                setRecords((prev) => prev.map((rec) =>
                    rec._id === id ? { ...rec, regularizationStatus: "Approved" } : rec
                ));
            } else {
                // fallback for other actions if needed
            }
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
            const res = await fetch(`https://cafm.zenapi.co.in/api/attendance/regularize/${rejectId}/approve`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": "Bearer YOUR_TOKEN_HERE" // Uncomment and set if needed
                },
                body: JSON.stringify({ status: "Rejected", rejectionReason: rejectReason })
            });
            const data = await res.json();
            console.log('Reject response:', data);
            if (!data.success) throw new Error(data.message || "Rejection failed");
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
                    'Employee',
                    'Date',
                    'Status',
                    'Reason',
                    'Regularization Status',
                    'Original Status',
                ],
                ...filteredRecords.map(rec => [
                    employeeMap[rec.employeeId]?.fullName || rec.employeeId,
                    formatDate(rec.date),
                    rec.status,
                    rec.regularizationReason || '-',
                    rec.regularizationStatus,
                    rec.originalStatus || '-',
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
            'Employee',
            'Date',
            'Status',
            'Reason',
            'Regularization Status',
            'Original Status',
        ];
        const tableRows = filteredRecords.map(rec => [
            employeeMap[rec.employeeId]?.fullName || rec.employeeId,
            formatDate(rec.date),
            rec.status,
            rec.regularizationReason || '-',
            rec.regularizationStatus,
            rec.originalStatus || '-',
        ]);
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            styles: { cellWidth: 'wrap' },
            columnStyles: {
                0: { halign: 'center' },
            },
        });
        doc.save('attendance-regularizations.pdf');
    }

    return (
        <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
            {/* Header */}
            <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-0 shadow-lg ${theme === 'dark' ? 'bg-[#2d3748] text-blue-100' : ''}`} style={theme === 'dark' ? {} : { background: '#1769ff' }}>
                <div className="flex items-center gap-6">
                    <div className={`${theme === 'dark' ? 'bg-[#384152]' : 'bg-white/20'} rounded-full p-4 flex items-center justify-center`}>
                        <FaCalendarAlt className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">Attendance Regularization</h1>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto">
                    {/* Search Bar */}
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by Employee ID"
                        className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full md:w-64 ${theme === 'dark' ? 'bg-[#273356] text-blue-100 placeholder-blue-200 focus:ring-blue-300' : 'bg-white/80 text-gray-900 placeholder-gray-500 focus:ring-white'}`}
                    />
                    {/* Export Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={downloadExcel}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-semibold text-base transition-colors ${theme === 'dark' ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-green-500 text-white hover:bg-green-600'}`}
                        >
                            <FaFileExport className="w-4 h-4" /> Excel
                        </button>
                        <button
                            onClick={downloadPDF}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-semibold text-base transition-colors ${theme === 'dark' ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-red-500 text-white hover:bg-red-600'}`}
                        >
                            <FaFileExport className="w-4 h-4" /> PDF
                        </button>
                    </div>
                </div>
            </div>
            {/* Table Card */}
            <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 mt-6`}>
                <div className="relative">
                    <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`
                                    ${theme === 'dark' ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-900'}
                                    rounded-t-xl
                                    text-sm font-bold tracking-tight
                                    border-b border-blue-200 dark:border-blue-900
                                    shadow-sm
                                `}>
                                    <th className="px-3 py-3 whitespace-nowrap rounded-tl-xl tracking-tight">Employee</th>
                                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Date</th>
                                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Status</th>
                                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Reason</th>
                                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Regularization Status</th>
                                    <th className="px-3 py-3 whitespace-nowrap tracking-tight">Original Status</th>
                                    <th className="px-3 py-3 whitespace-nowrap rounded-tr-xl tracking-tight text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                                {loading ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-xs">Loading...</td></tr>
                                ) : error ? (
                                    <tr><td colSpan={8} className="text-center text-red-500 py-8 text-xs">{error}</td></tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-xs">No records found.</td></tr>
                                ) : (
                                    filteredRecords.map((rec, idx) => (
                                        <tr key={rec._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                                            <td className="px-3 py-2 text-xs whitespace-nowrap flex items-center gap-2">
                                                <Image src={employeeMap[rec.employeeId]?.employeeImage || "/placeholder-user.jpg"} alt={employeeMap[rec.employeeId]?.fullName || rec.employeeId} width={32} height={32} className="rounded-full border border-blue-200 dark:border-blue-800" />
                                                <span className={theme === 'dark' ? 'text-blue-100' : 'text-black'}>{employeeMap[rec.employeeId]?.fullName || rec.employeeId}</span>
                                            </td>
                                            <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{formatDate(rec.date)}</td>
                                            <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{rec.status}</td>
                                            <td className={`px-3 py-2 text-xs whitespace-nowrap max-w-[120px] truncate ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{rec.regularizationReason || '-'}</td>
                                            <td className="px-3 py-2 text-xs whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${rec.regularizationStatus === "Approved" ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') : rec.regularizationStatus === "Rejected" ? (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') : (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')}`}>{rec.regularizationStatus}</span>
                                            </td>
                                            <td className={`px-3 py-2 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{rec.originalStatus || '-'}</td>
                                            <td className="px-3 py-2 text-xs whitespace-nowrap text-center">
                                                <div className="flex flex-row gap-2 justify-center items-center">
                                                    <button
                                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition shadow-md"
                                                        title="View Details"
                                                        onClick={() => setViewRecord(rec)}
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    {rec.regularizationStatus === "Pending" && (
                                                        <>
                                                            <button
                                                                className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition shadow-md"
                                                                title="Approve"
                                                                onClick={() => handleAction(rec._id, "approve")}
                                                                disabled={loading}
                                                            >
                                                                <FaCheck />
                                                            </button>
                                                            <button
                                                                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition shadow-md"
                                                                title="Reject"
                                                                onClick={() => handleReject(rec._id)}
                                                                disabled={loading}
                                                            >
                                                                <FaTimes />
                                                            </button>
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
            </div>
            {/* Modal for View */}
            {viewRecord && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
                        <button
                            onClick={() => setViewRecord(null)}
                            className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                            Regularization Details
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <Image src={employeeMap[viewRecord.employeeId]?.employeeImage || "/placeholder-user.jpg"} alt={employeeMap[viewRecord.employeeId]?.fullName || viewRecord.employeeId} width={40} height={40} className="rounded-full border border-blue-200 dark:border-blue-800" />
                                <span className={`font-medium text-lg ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{employeeMap[viewRecord.employeeId]?.fullName || viewRecord.employeeId}</span>
                            </div>
                            <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Date:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{formatDate(viewRecord.date)}</span>
                            </div>
                            <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch In:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.punchInTime || '-'}</span>
                            </div>
                            <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch Out:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.punchOutTime || '-'}</span>
                            </div>
                            <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Status:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.status}</span>
                            </div>
                            <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Reason:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.regularizationReason || '-'}</span>
                            </div>
                            <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Regularization Status:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.regularizationStatus}</span>
                            </div>
                            <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Original Status:</span>
                                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{viewRecord.originalStatus || '-'}</span>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setViewRecord(null)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
                        <button
                            onClick={() => setShowRejectModal(false)}
                            className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                            Reject Regularization
                        </h2>
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