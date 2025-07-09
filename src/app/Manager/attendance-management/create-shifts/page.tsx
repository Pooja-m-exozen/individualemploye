"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaCalendarAlt, FaProjectDiagram,  FaInfoCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

export default function CreateShiftsPage() {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState("addShift");

  const shifts = ["Morning Shift", "Evening Shift", "Night Shift"];
  const weekoffDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Shift form state
  const [shiftName, setShiftName] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [maxEmployees, setMaxEmployees] = useState("");
  const [breakTime, setBreakTime] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);

  // KYC-based dropdown state
  const [kycProjects, setKycProjects] = useState<string[]>([]);
  const [kycDesignations, setKycDesignations] = useState<string[]>([]);
  const [kycEmployees, setKycEmployees] = useState<{ id: string; name: string; designation: string; project: string }[]>([]);

  // For filtering dropdowns
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("");

  // Fetch KYC data for dropdowns
  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/kyc")
      .then(res => res.json())
      .then(data => {
        if (data.kycForms && Array.isArray(data.kycForms)) {
          const projectsSet = new Set<string>();
          const designationsSet = new Set<string>();
          const employeesArr: { id: string; name: string; designation: string; project: string }[] = [];
          data.kycForms.forEach((form: { personalDetails?: {
            workType?: string;
            weekoffDay?: string | null;
            employeeId?: string;
            projectName?: string;
            fullName?: string;
            designation?: string;
          } }) => {
            const pd = form.personalDetails;
            if (pd) {
              if (pd.projectName) projectsSet.add(pd.projectName);
              if (pd.designation) designationsSet.add(pd.designation);
              if (pd.employeeId && pd.fullName) {
                employeesArr.push({
                  id: pd.employeeId,
                  name: pd.fullName,
                  designation: pd.designation || "",
                  project: pd.projectName || "",
                });
              }
            }
          });
          setKycProjects(Array.from(projectsSet));
          setKycDesignations(Array.from(designationsSet));
          setKycEmployees(employeesArr);
        }
      });
  }, []);

  // Derived projects and employees for Update Weekoffs section
  const projects = kycProjects;
  const employees = kycEmployees.map(e => ({
    id: e.id,
    name: e.name,
    designation: e.designation,
    project: e.project,
    weekoff: "", // Default to empty, or set from KYC if available
  }));

  // Filter designations and employees based on selected project/designation
  const filteredDesignations = selectedProject
    ? Array.from(new Set(kycEmployees.filter(e => e.project === selectedProject).map(e => e.designation)))
    : kycDesignations;

  const filteredEmployees = kycEmployees.filter(e =>
    (!selectedProject || e.project === selectedProject) &&
    (!selectedDesignation || e.designation === selectedDesignation)
  );

  // Handle working days checkbox
  const handleWorkingDaysChange = (day: string) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Add Shift API handler
  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    setApiSuccess(null);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/shift/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftName,
          shiftCode,
          startTime,
          endTime,
          department,
          location,
          maxEmployees,
          breakTime,
          workingDays,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create shift");
      }
      setApiSuccess("Shift created successfully!");
      // Optionally: clear form or update local shift list
      setShiftName("");
      setShiftCode("");
      setStartTime("");
      setEndTime("");
      setDepartment("");
      setLocation("");
      setMaxEmployees("");
      setBreakTime("");
      setWorkingDays([]);
      setDescription("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message || "Error creating shift");
      } else {
        setApiError("Error creating shift");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col items-center py-4 md:py-8 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Modern Header */}
        <div className={`rounded-2xl mb-4 md:mb-8 p-4 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shadow-lg w-full max-w-5xl mx-auto ${theme === 'dark' ? 'bg-[#2d3748]' : 'bg-gradient-to-r from-blue-500 to-blue-800'}`}>
          <div className={`${theme === 'dark' ? 'bg-gray-800 bg-opacity-60' : 'bg-blue-600 bg-opacity-30'} rounded-xl p-3 md:p-4 flex items-center justify-center`}>
            <FaCalendarAlt className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Create Shifts</h1>
            <p className="text-base md:text-lg text-white opacity-90">Define and manage shift timings for employees</p>
          </div>
        </div>
        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Sidebar Navigation */}
          <aside className="md:w-64 flex-shrink-0 flex flex-col gap-4 md:gap-6 mb-4 md:mb-0 w-full">
            {/* Navigation */}
            <div className={`rounded-2xl p-3 md:p-4 sticky top-8 border shadow w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}> 
              <nav className="space-y-1 flex flex-row md:flex-col gap-2 md:gap-0 w-full">
                <button
                  onClick={() => setActiveSection("addShift")}
                  className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl text-left transition-colors font-medium text-base md:text-lg ${activeSection === "addShift" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                >
                  <FaCalendarAlt className="w-5 h-5" />
                  <span>Add Shift</span>
                </button>
                <button
                  onClick={() => setActiveSection("mapShift")}
                  className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl text-left transition-colors font-medium text-base md:text-lg ${activeSection === "mapShift" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                >
                  <FaProjectDiagram className="w-5 h-5" />
                  <span>Map Shift</span>
                </button>
                <button
                  onClick={() => setActiveSection("updateWeekoff")}
                  className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl text-left transition-colors font-medium text-base md:text-lg ${activeSection === "updateWeekoff" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                >
                  <FaCalendarAlt className="w-5 h-5" />
                  <span>Update Weekoffs</span>
                </button>
              </nav>
            </div>
            {/* Instructions/Info Card */}
            <div className={`relative rounded-2xl p-4 md:p-6 border shadow-xl flex flex-col gap-2 md:gap-3 items-start transition-all duration-300 hover:shadow-2xl w-full ${theme === 'dark' ? 'bg-gray-700 bg-opacity-80 border-blue-900' : 'bg-blue-50 border-blue-200'}`}> 
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} p-1 md:p-2 rounded-xl flex items-center justify-center`}>
                  <FaInfoCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <h3 className={`text-base md:text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Instructions & Notes</h3>
              </div>
              <ul className={`space-y-1 md:space-y-2 text-xs md:text-sm pl-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}> 
                <li>• Use the sidebar to switch between adding shifts, mapping shifts, and updating weekoffs.</li>
                <li>• Fill all required fields before submitting.</li>
                <li>• All fields marked with * are mandatory.</li>
              </ul>
              <div className={`mt-4 md:mt-8 p-2 md:p-4 rounded-xl border text-blue-700 transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-700 bg-opacity-80 border-blue-900 text-blue-200' : 'bg-blue-50 border-blue-100 text-blue-700'}`}> 
                <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                  <FaInfoCircle className="w-4 h-4" />
                  <span className="font-semibold">Need Help?</span>
                </div>
                <p className="text-xs md:text-sm">Contact <span className="font-medium">support@yourdomain.com</span> for support.</p>
              </div>
            </div>
          </aside>
          {/* Main Content */}
          <main className="flex-1 space-y-6 md:space-y-8">
            {activeSection === "addShift" && (
              <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-4 md:p-8 border shadow-xl`}>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Add New Shift</h2>
                {/* API feedback */}
                {apiError && <div className="mb-4 text-red-600 font-semibold">{apiError}</div>}
                {apiSuccess && <div className="mb-4 text-green-600 font-semibold">{apiSuccess}</div>}
                <form className="flex flex-col gap-4 md:gap-6" onSubmit={handleAddShift}>
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Shift Name*</label>
                      <input
                        type="text"
                        value={shiftName}
                        onChange={e => setShiftName(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        placeholder="Morning Shift"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Shift Code*</label>
                      <input
                        type="text"
                        value={shiftCode}
                        onChange={e => setShiftCode(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        placeholder="MS-001"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        placeholder="IT"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        placeholder="Bangalore"
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Max Employees</label>
                      <input
                        type="number"
                        value={maxEmployees}
                        onChange={e => setMaxEmployees(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        placeholder="20"
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Break Time (minutes)</label>
                      <input
                        type="number"
                        value={breakTime}
                        onChange={e => setBreakTime(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        placeholder="60"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Start Time*</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>End Time*</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Description</label>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                        placeholder="Standard day shift"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Working Days</label>
                    <div className="flex flex-wrap gap-3">
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                        <label
                          key={day}
                          className={`flex items-center gap-1
                            ${theme === 'dark'
                              ? 'text-blue-200'
                              : 'text-black'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={workingDays.includes(day)}
                            onChange={() => handleWorkingDaysChange(day)}
                            className={`accent-blue-600 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white text-black'}`}
                          />
                          <span>{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="self-end w-full md:w-auto px-6 md:px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add Shift"}
                  </button>
                </form>
                <div className="mt-6 md:mt-8 overflow-x-auto">
                  <h3 className={`text-base md:text-lg font-bold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Existing Shifts</h3>
                  <table className={`min-w-full divide-y text-xs md:text-base ${theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}`}> 
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
              <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-4 md:p-8 border shadow-xl`}>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Map Shift to Project, Designation & Employee</h2>
                <form className="flex flex-col gap-4 md:gap-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Project</label>
                      <select
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2
                          ${theme === 'dark'
                            ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800'
                            : 'bg-white text-black border-blue-200 focus:ring-blue-400'
                          }`}
                        value={selectedProject}
                        onChange={e => {
                          setSelectedProject(e.target.value);
                          setSelectedDesignation(""); // reset designation on project change
                        }}
                      >
                        <option value="">Select Project</option>
                        {kycProjects.map((p: string) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Designation</label>
                      <select
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2
                          ${theme === 'dark'
                            ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800'
                            : 'bg-white text-black border-blue-200 focus:ring-blue-400'
                          }`}
                        value={selectedDesignation}
                        onChange={e => setSelectedDesignation(e.target.value)}
                        disabled={!selectedProject}
                      >
                        <option value="">Select Designation</option>
                        {filteredDesignations.map((d: string) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Employee</label>
                      <select
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2
                          ${theme === 'dark'
                            ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800'
                            : 'bg-white text-black border-blue-200 focus:ring-blue-400'
                          }`}
                        disabled={!selectedProject || !selectedDesignation}
                      >
                        <option value="">Select Employee</option>
                        {filteredEmployees.map((e: { id: string; name: string }) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Shift</label>
                      <select
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2
                          ${theme === 'dark'
                            ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800'
                            : 'bg-white text-black border-blue-200 focus:ring-blue-400'
                          }`}
                      >
                        <option value="">Select Shift</option>
                        {shifts.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="self-end w-full md:w-auto px-6 md:px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Map Shift</button>
                </form>
                <div className="overflow-x-auto">
                  <h3 className={`text-base md:text-lg font-bold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-black'}`}>Existing Mappings</h3>
                  {/* ...existing code for mappings table (if any, or leave empty) ... */}
                </div>
              </section>
            )}
            {activeSection === "updateWeekoff" && (
              <section className="bg-white rounded-2xl p-4 md:p-8 border border-blue-100 shadow-xl">
                <h2 className="text-xl font-bold text-blue-700 mb-4">Update Weekoffs</h2>
                <form className="flex flex-col gap-4 md:gap-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                    <div>
                      <label className="block text-blue-800 font-semibold mb-1">Project</label>
                      <select className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select Project</option>
                        {projects.map((p: string) => <option key={p} value={p}>{p}</option>)}
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
                  <button type="button" className="self-end w-full md:w-auto px-6 md:px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Search</button>
                </form>
                <div className="overflow-x-auto">
                  <h3 className="text-base md:text-lg font-bold text-blue-700 mb-2">Employee Weekoff List</h3>
                  <table className="min-w-full divide-y divide-blue-100 text-xs md:text-base">
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
                      {employees.map((emp: { id: string; name: string; designation: string; project: string; weekoff: string }, idx: number) => (
                        <tr key={idx} className="hover:bg-blue-50 transition">
                          <td className="px-4 py-3 font-bold text-blue-800">{emp.id}</td>
                          <td className="px-4 py-3">{emp.name}</td>
                          <td className="px-4 py-3">{emp.designation}</td>
                          <td className="px-4 py-3">{emp.project}</td>
                          <td className="px-4 py-3">{emp.weekoff}</td>
                          <td className="px-4 py-3">
                            <select className="border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                              <option value="">Select Day</option>
                              {weekoffDays.map((day: string) => <option key={day} value={day}>{day}</option>)}
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