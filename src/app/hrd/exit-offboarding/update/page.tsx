"use client";
import React, { useState } from "react";
import HrdDashboardLayout from "@/components/dashboard/HrdDashboardLayout";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";

interface Employee {
  id: string;
  name: string;
  department: string;
  status: "Active" | "Exited";
  exitDate?: string;
  exitReason?: string;
  exitNotes?: string;
}

const initialEmployees: Employee[] = [
  { id: "E001", name: "Alice Johnson", department: "IT", status: "Active" },
  { id: "E002", name: "Bob Smith", department: "HR", status: "Active" },
  { id: "E003", name: "Charlie Lee", department: "Finance", status: "Active" },
  { id: "E004", name: "Diana Patel", department: "IT", status: "Exited", exitDate: "2024-05-01", exitReason: "Resigned", exitNotes: "Left for higher studies." },
];

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Exited: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function ExitOffboardingDataAddition() {
  const { theme } = useTheme();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [exitDate, setExitDate] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [exitNotes, setExitNotes] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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

  // Filter employees
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.id.toLowerCase().includes(search.toLowerCase())
  );

  // Open modal
  const openModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setExitDate("");
    setExitReason("");
    setExitNotes("");
    setShowModal(true);
  };
  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedEmployee(null);
    setExitDate("");
    setExitReason("");
    setExitNotes("");
  };
  // Confirm exit
  const handleExit = () => {
    if (!exitDate || !exitReason) {
      setError("Exit date and reason are required.");
      return;
    }
    setEmployees(emps => emps.map(emp =>
      emp.id === selectedEmployee?.id
        ? { ...emp, status: "Exited", exitDate, exitReason, exitNotes }
        : emp
    ));
    setSuccess("Employee offboarded successfully.");
    closeModal();
  };

  return (
    <>
      {/* Coming Soon Overlay (styled like recruitment-onboarding overlays) */}
      <div className="fixed inset-0 bg-gray-900/70 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-md mx-4 relative">
          {/* Back/Close Button */}
          <button
            onClick={() => router.push('/hrd/dashboard')}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none"
            aria-label="Back to Dashboard"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Coming Soon!</h2>
          <p className="text-gray-600 dark:text-gray-300">
            This feature is currently under development. We&#39;re working hard to bring you a seamless experience.
          </p>
          <div className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">
            Launching Soon
          </div>
        </div>
      </div>
      {/* Masked page content below */}
      <HrdDashboardLayout>
        <div className={`p-4 md:p-8 min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gray-100'}`}>
          {/* Toasts */}
          {(success || error) && (
            <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded shadow-lg font-semibold ${success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{success || error}</div>
          )}
          {/* Modal */}
          {showModal && selectedEmployee && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">Exit/Offboard Employee</h2>
                <div className="mb-2"><span className="font-semibold">Name:</span> {selectedEmployee.name}</div>
                <div className="mb-2"><span className="font-semibold">ID:</span> {selectedEmployee.id}</div>
                <div className="mb-2"><span className="font-semibold">Department:</span> {selectedEmployee.department}</div>
                <div className="mb-2"><span className="font-semibold">Status:</span> <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedEmployee.status]}`}>{selectedEmployee.status}</span></div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Exit Date <span className="text-red-500">*</span></label>
                  <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Reason for Exit <span className="text-red-500">*</span></label>
                  <input type="text" value={exitReason} onChange={e => setExitReason(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. Resigned, Terminated" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1">Notes/Comments</label>
                  <textarea value={exitNotes} onChange={e => setExitNotes(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Optional notes..." />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={closeModal} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
                  <button onClick={handleExit} className="bg-red-600 text-white px-4 py-2 rounded">Confirm Exit</button>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-700 text-blue-100' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white'} rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg`}>
            <div className={`${theme === 'dark' ? 'bg-gray-900 text-blue-400' : 'bg-white text-blue-600'} p-6 rounded-full flex items-center justify-center shadow-md`}>
              <span className="text-3xl font-bold">↩️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Exit & Offboarding</h1>
              <p className="text-lg">Manage employee exit and offboarding process.</p>
            </div>
          </div>
          {/* Search */}
          <div className="max-w-2xl mx-auto mb-4">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-black border-gray-300 focus:ring-blue-600 placeholder-gray-400'}`}
            />
          </div>
          {/* Employee Table */}
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6 max-w-4xl mx-auto`}> 
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-gray-800'}`}>Employees</h2>
            </div>
            <div className="relative">
              <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}> 
                <table className="w-full text-left">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-blue-950' : 'bg-gray-50'}>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>ID</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Name</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Department</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Status</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Exit Date</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Reason</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Notes</th>
                      <th className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider`}></th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}>
                    {filteredEmployees.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400">No employees found.</td></tr>
                    )}
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className={theme === 'dark' ? 'hover:bg-blue-950 transition-colors duration-200' : 'hover:bg-gray-50 transition-colors duration-200'}>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{emp.id}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{emp.name}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{emp.department}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[emp.status]}`}>{emp.status}</span>
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{emp.exitDate || "-"}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{emp.exitReason || "-"}</td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>{emp.exitNotes || "-"}</td>
                        <td className="px-6 py-4">
                          {emp.status === "Active" && (
                            <button onClick={() => openModal(emp)} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Exit/Offboard</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </HrdDashboardLayout>
    </>
  );
} 