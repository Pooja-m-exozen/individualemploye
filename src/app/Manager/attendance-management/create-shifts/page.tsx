"use client";
import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaCalendarAlt, FaProjectDiagram,  FaInfoCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

export default function CreateShiftsPage() {
  const { theme } = useTheme();
  // Dummy data for mapping
  const [activeSection, setActiveSection] = useState("addShift");
  const projects = ["Project Alpha", "Project Beta", "Project Gamma"];
  const designations = ["Security Guard", "Supervisor", "Technician", "Driver"];
  const employees = [
    { id: "EMP001", name: "John Doe", designation: "Security Guard", project: "Project Alpha", weekoff: "Sunday" },
    { id: "EMP002", name: "Jane Smith", designation: "Supervisor", project: "Project Beta", weekoff: "Saturday" },
    { id: "EMP003", name: "Alice Johnson", designation: "Technician", project: "Project Gamma", weekoff: "Monday" },
  ];
  const shifts = ["Morning Shift", "Evening Shift", "Night Shift"];
  const mappings = [
    { project: "Project Alpha", designation: "Security Guard", employee: "John Doe", shift: "Morning Shift" },
    { project: "Project Beta", designation: "Supervisor", employee: "Jane Smith", shift: "Evening Shift" },
  ];
  const weekoffDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col items-center py-8 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Modern Header */}
        <div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg w-full max-w-5xl mx-auto ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-800'}`}>
          <div className={`${theme === 'dark' ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-600 bg-opacity-30'} rounded-xl p-4 flex items-center justify-center`}>
            <FaCalendarAlt className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Create Shifts</h1>
            <p className="text-white text-base opacity-90">Define and manage shift timings for employees</p>
          </div>
        </div>
        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="md:w-64 flex-shrink-0 flex flex-col gap-6">
            <div className={`rounded-2xl p-4 sticky top-8 border shadow ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection("addShift")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors font-medium text-lg ${activeSection === "addShift" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                >
                  <FaCalendarAlt className="w-5 h-5" />
                  <span>Add Shift</span>
                </button>
                <button
                  onClick={() => setActiveSection("mapShift")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors font-medium text-lg ${activeSection === "mapShift" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                >
                  <FaProjectDiagram className="w-5 h-5" />
                  <span>Map Shift</span>
                </button>
                <button
                  onClick={() => setActiveSection("updateWeekoff")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors font-medium text-lg ${activeSection === "updateWeekoff" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                >
                  <FaCalendarAlt className="w-5 h-5" />
                  <span>Update Weekoffs</span>
                </button>
              </nav>
            </div>
            {/* Instructions/Info Card */}
            <div className={`relative rounded-2xl p-6 border shadow-xl flex flex-col gap-3 items-start transition-all duration-300 hover:shadow-2xl ${theme === 'dark' ? 'bg-blue-950 border-blue-900' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} p-2 rounded-xl flex items-center justify-center`}>
                  <FaInfoCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className={`text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Instructions & Notes</h3>
              </div>
              <ul className={`space-y-2 text-sm pl-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                <li>• Use the sidebar to switch between adding shifts, mapping shifts, and updating weekoffs.</li>
                <li>• Fill all required fields before submitting.</li>
                <li>• All fields marked with * are mandatory.</li>
              </ul>
            </div>
          </aside>
          {/* Main Content */}
          <main className="flex-1 space-y-8">
            {activeSection === "addShift" && (
              <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-8 border shadow-xl`}>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Add New Shift</h2>
                <form className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Shift Name</label>
                      <input type="text" className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} placeholder="Morning Shift" />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Start Time</label>
                      <input type="time" className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>End Time</label>
                      <input type="time" className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} />
                    </div>
                  </div>
                  <button type="submit" className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Add Shift</button>
                </form>
                <div className="mt-8">
                  <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Existing Shifts</h3>
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}`}> 
                    <thead className={theme === 'dark' ? 'bg-blue-950' : 'bg-blue-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Shift Name</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Start Time</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>End Time</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-blue-50'}>
                      {/* Example row */}
                      <tr className={theme === 'dark' ? 'hover:bg-blue-950 transition' : 'hover:bg-blue-50 transition'}>
                        <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Morning Shift</td>
                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>09:00 AM</td>
                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>05:00 PM</td>
                        <td className="px-4 py-3 flex gap-2">
                          <button className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>Edit</button>
                          <button className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>Delete</button>
                        </td>
                      </tr>
                      {/* Add more rows as needed */}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {activeSection === "mapShift" && (
              <section className="bg-white rounded-2xl p-8 border border-blue-100 shadow-xl">
                <h2 className="text-xl font-bold text-blue-700 mb-4">Map Shift to Project, Designation & Employee</h2>
                <form className="flex flex-col gap-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Project</label>
                      <select className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Designation</label>
                      <select className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select Designation</option>
                        {designations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Employee</label>
                      <select className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select Employee</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Shift</label>
                      <select className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select Shift</option>
                        {shifts.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Map Shift</button>
                </form>
                <div>
                  <h3 className="text-lg font-bold text-blue-700 mb-2">Existing Mappings</h3>
                  <table className="min-w-full divide-y divide-blue-100">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Project</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                      {mappings.map((m, idx) => (
                        <tr key={idx} className="hover:bg-blue-50 transition">
                          <td className="px-4 py-3 font-bold text-blue-800">{m.project}</td>
                          <td className="px-4 py-3">{m.designation}</td>
                          <td className="px-4 py-3">{m.employee}</td>
                          <td className="px-4 py-3">{m.shift}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {activeSection === "updateWeekoff" && (
              <section className="bg-white rounded-2xl p-8 border border-blue-100 shadow-xl">
                <h2 className="text-xl font-bold text-blue-700 mb-4">Update Weekoffs</h2>
                <form className="flex flex-col gap-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Project</label>
                      <select className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Start Date</label>
                      <input type="date" className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">End Date</label>
                      <input type="date" className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Employee ID</label>
                      <input type="text" placeholder="Search by Employee ID" className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <button type="button" className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Search</button>
                </form>
                <div>
                  <h3 className="text-lg font-bold text-blue-700 mb-2">Employee Weekoff List</h3>
                  <table className="min-w-full divide-y divide-blue-100">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Employee ID</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Project</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Current Weekoff</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">New Weekoff</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                      {employees.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-blue-50 transition">
                          <td className="px-4 py-3 font-bold text-blue-800">{emp.id}</td>
                          <td className="px-4 py-3">{emp.name}</td>
                          <td className="px-4 py-3">{emp.designation}</td>
                          <td className="px-4 py-3">{emp.project}</td>
                          <td className="px-4 py-3">{emp.weekoff}</td>
                          <td className="px-4 py-3">
                            <select className="border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                              <option value="">Select Day</option>
                              {weekoffDays.map(day => <option key={day} value={day}>{day}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button className="px-4 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition">Update Weekoff</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}