"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaCalendarAlt, FaProjectDiagram, FaInfoCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

interface Project {
  _id?: string;
  projectName: string;
  address: string;
  totalManpower: number;
  designationWiseCount: Record<string, number>;
  updatedDate: string;
}

interface Employee {
  _id?: string;
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  weekoff: string;
}

interface Shift {
  _id?: string;
  shiftName: string;
  startTime: string;
  endTime: string;
}

interface ShiftMapping {
  _id?: string;
  project: string;
  designation: string;
  employeeId: string;
  employeeName: string;
  shift: string;
}

interface KYCForm {
  _id: string;
  personalDetails: {
    employeeId?: string;
    empId?: string;
    fullName?: string;
    name?: string;
    designation?: string;
    projectName?: string;
  };
}

export default function CreateShiftsPage() {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState("addShift");

  // State for dynamic data
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [mappings, setMappings] = useState<ShiftMapping[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [shiftForm, setShiftForm] = useState({
    shiftName: "",
    startTime: "",
    endTime: ""
  });

  const [mappingForm, setMappingForm] = useState({
    project: "",
    designation: "",
    employee: "",
    shift: ""
  });

  const [weekoffForm, setWeekoffForm] = useState({
    project: "",
    startDate: "",
    endDate: "",
    employeeId: ""
  });

  // Filtered options based on selections
  const [filteredDesignations, setFilteredDesignations] = useState<string[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  const weekoffDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch projects
        const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }

        // Fetch employees (you'll need to create this API endpoint)
        const employeesRes = await fetch("https://cafm.zenapi.co.in/api/kyc");
        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          const kycForms = Array.isArray(employeesData.kycForms) ? employeesData.kycForms : [];
          const processedEmployees: Employee[] = kycForms
            .filter((form: KYCForm) => form.personalDetails?.projectName && form.personalDetails?.designation)
            .map((form: KYCForm) => ({
              _id: form._id,
              employeeId: form.personalDetails?.employeeId || form.personalDetails?.empId || "",
              fullName: form.personalDetails?.fullName || form.personalDetails?.name || "",
              designation: form.personalDetails?.designation || "",
              projectName: form.personalDetails?.projectName || "",
              weekoff: "Sunday" // Default weekoff
            }))
            .filter((emp: Employee) => emp.employeeId && emp.fullName);
          setEmployees(processedEmployees);
        }

        // Fetch shifts (you'll need to create this API endpoint)
        // For now, using dummy data
        setShifts([
          { _id: "1", shiftName: "Morning Shift", startTime: "09:00", endTime: "17:00" },
          { _id: "2", shiftName: "Evening Shift", startTime: "17:00", endTime: "01:00" },
          { _id: "3", shiftName: "Night Shift", startTime: "21:00", endTime: "05:00" }
        ]);

        // Fetch existing mappings (you'll need to create this API endpoint)
        // For now, using dummy data
        setMappings([
          { _id: "1", project: "Project Alpha", designation: "Security Guard", employeeId: "EMP001", employeeName: "John Doe", shift: "Morning Shift" },
          { _id: "2", project: "Project Beta", designation: "Supervisor", employeeId: "EMP002", employeeName: "Jane Smith", shift: "Evening Shift" }
        ]);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update filtered options when project changes
  useEffect(() => {
    if (mappingForm.project) {
      const selectedProject = projects.find(p => p.projectName === mappingForm.project);
      if (selectedProject) {
        // Get designations for selected project
        const projectDesignations = Object.keys(selectedProject.designationWiseCount || {});
        setFilteredDesignations(projectDesignations);

        // Get employees for selected project
        const projectEmployees = employees.filter(emp => emp.projectName === mappingForm.project);
        setFilteredEmployees(projectEmployees);
      }
    } else {
      setFilteredDesignations([]);
      setFilteredEmployees([]);
    }

    // Reset dependent fields when project changes
    setMappingForm(prev => ({
      ...prev,
      designation: "",
      employee: "",
      shift: ""
    }));
  }, [mappingForm.project, projects, employees]);

  // Update filtered employees when designation changes
  useEffect(() => {
    if (mappingForm.project && mappingForm.designation) {
      const projectEmployees = employees.filter(emp =>
        emp.projectName === mappingForm.project &&
        emp.designation === mappingForm.designation
      );
      setFilteredEmployees(projectEmployees);
      setMappingForm(prev => ({ ...prev, employee: "" }));
    }
  }, [mappingForm.designation, mappingForm.project, employees]);

  // Handle form submissions
  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API call to create shift
      const response = await fetch("https://cafm.zenapi.co.in/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shiftForm)
      });

      if (response.ok) {
        const newShift = await response.json();
        setShifts(prev => [...prev, newShift]);
        setShiftForm({ shiftName: "", startTime: "", endTime: "" });
        alert("Shift created successfully!");
      }
    } catch (error) {
      console.error("Error creating shift:", error);
      alert("Failed to create shift");
    }
  };

  const handleMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedEmployee = employees.find(emp => emp.employeeId === mappingForm.employee);
      if (!selectedEmployee) return;

      // API call to create mapping
      const response = await fetch("https://cafm.zenapi.co.in/api/shift-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: mappingForm.project,
          designation: mappingForm.designation,
          employeeId: mappingForm.employee,
          employeeName: selectedEmployee.fullName,
          shift: mappingForm.shift
        })
      });

      if (response.ok) {
        const newMapping = await response.json();
        setMappings(prev => [...prev, newMapping]);
        setMappingForm({ project: "", designation: "", employee: "", shift: "" });
        alert("Shift mapping created successfully!");
      }
    } catch (error) {
      console.error("Error creating mapping:", error);
      alert("Failed to create shift mapping");
    }
  };

  const handleWeekoffUpdate = async (employeeId: string, newWeekoff: string) => {
    try {
      // API call to update weekoff
      const response = await fetch(`https://cafm.zenapi.co.in/api/employees/${employeeId}/weekoff`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekoff: newWeekoff })
      });

      if (response.ok) {
        setEmployees(prev => prev.map(emp =>
          emp.employeeId === employeeId ? { ...emp, weekoff: newWeekoff } : emp
        ));
        alert("Weekoff updated successfully!");
      }
    } catch (error) {
      console.error("Error updating weekoff:", error);
      alert("Failed to update weekoff");
    }
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        <div className="max-w-7xl mx-auto">
          <table className={`w-full text-sm min-w-[1200px] table-fixed ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}>
              <tr>
                <th className={`px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-blue-700'} w-1/6`}>Section</th>
                <th className={`px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-blue-700'} w-5/6`}>Content</th>
              </tr>
            </thead>
            <tbody>
              {/* Header Section */}
              <tr className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>
                <td className="px-3 py-2 w-1/6" rowSpan={4}>
                  <div className={`p-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="w-5 h-5" />
                      <span className={theme === 'dark' ? 'text-gray-200' : 'text-blue-700'}>Create Shifts</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 w-5/6">
                  <div className={`p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Define and manage shift timings for employees</p>
                  </div>
                </td>
              </tr>

              {/* Navigation Section */}
              <tr className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>
                <td className="px-3 py-2 w-5/6">
                  <div className={`p-4 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} border rounded-lg`}>
                    <button
                      onClick={() => setActiveSection("addShift")}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${activeSection === "addShift" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                    >
                      <FaCalendarAlt className="w-5 h-5" /> Add Shift
                    </button>
                    <button
                      onClick={() => setActiveSection("mapShift")}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${activeSection === "mapShift" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                    >
                      <FaProjectDiagram className="w-5 h-5" /> Map Shift
                    </button>
                    <button
                      onClick={() => setActiveSection("updateWeekoff")}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${activeSection === "updateWeekoff" ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                    >
                      <FaCalendarAlt className="w-5 h-5" /> Update Weekoffs
                    </button>
                  </div>
                </td>
              </tr>

              {/* Instructions Section */}
              <tr className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>
                <td className="px-3 py-2 w-5/6">
                  <div className={`p-4 ${theme === 'dark' ? 'bg-blue-950 border-blue-900' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                    <div className="flex items-center gap-3 mb-2">
                      <FaInfoCircle className="w-6 h-6 text-blue-600" />
                      <h3 className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Instructions & Notes</h3>
                    </div>
                    <ul className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>
                      <li>• Select a project first to see available designations</li>
                      <li>• Designations are filtered based on selected project</li>
                      <li>• Employees are filtered based on project and designation</li>
                      <li>• All fields marked with * are mandatory</li>
                    </ul>
                  </div>
                </td>
              </tr>

              {/* Content Section */}
              <tr className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>
                <td className="px-3 py-2 w-5/6">
                  <div className={`p-4 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} border rounded-lg`}>
                    {activeSection === "addShift" && (
                      <>
                        <h2 className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Add New Shift</h2>
                        <form onSubmit={handleShiftSubmit} className="flex flex-col gap-4 mt-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Shift Name *</label>
                              <input
                                type="text"
                                value={shiftForm.shiftName}
                                onChange={(e) => setShiftForm(prev => ({ ...prev, shiftName: e.target.value }))}
                                required
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              />
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Start Time *</label>
                              <input
                                type="time"
                                value={shiftForm.startTime}
                                onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                                required
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              />
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>End Time *</label>
                              <input
                                type="time"
                                value={shiftForm.endTime}
                                onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                                required
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              />
                            </div>
                          </div>
                          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Add Shift</button>
                        </form>
                        <div className="mt-4">
                          <h3 className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Existing Shifts</h3>
                          <table className={theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}>
                            <thead className={theme === 'dark' ? 'bg-blue-950' : 'bg-blue-50'}>
                              <tr>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Shift Name</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Start Time</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>End Time</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={4}>Loading shifts...</td></tr>
                              ) : shifts.length === 0 ? (
                                <tr><td colSpan={4}>No shifts found</td></tr>
                              ) : (
                                shifts.map((shift, idx) => (
                                  <tr key={shift._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950' : 'hover:bg-blue-50'}>
                                    <td className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>{shift.shiftName}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{shift.startTime}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{shift.endTime}</td>
                                    <td>
                                      <button className={theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}>Edit</button>
                                      <button className={theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-600'}>Delete</button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                    {activeSection === "mapShift" && (
                      <>
                        <h2 className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Map Shift to Project, Designation & Employee</h2>
                        <form onSubmit={handleMappingSubmit} className="flex flex-col gap-4 mt-4">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Project *</label>
                              <select
                                value={mappingForm.project}
                                onChange={(e) => setMappingForm(prev => ({ ...prev, project: e.target.value }))}
                                required
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              >
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p._id || p.projectName} value={p.projectName}>{p.projectName}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Designation *</label>
                              <select
                                value={mappingForm.designation}
                                onChange={(e) => setMappingForm(prev => ({ ...prev, designation: e.target.value }))}
                                required
                                disabled={!mappingForm.project}
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              >
                                <option value="">Select Designation</option>
                                {filteredDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Employee *</label>
                              <select
                                value={mappingForm.employee}
                                onChange={(e) => setMappingForm(prev => ({ ...prev, employee: e.target.value }))}
                                required
                                disabled={!mappingForm.designation}
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              >
                                <option value="">Select Employee</option>
                                {filteredEmployees.map(e => <option key={e._id || e.employeeId} value={e.employeeId}>{e.fullName} ({e.employeeId})</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Shift *</label>
                              <select
                                value={mappingForm.shift}
                                onChange={(e) => setMappingForm(prev => ({ ...prev, shift: e.target.value }))}
                                required
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              >
                                <option value="">Select Shift</option>
                                {shifts.map(s => <option key={s._id || s.shiftName} value={s.shiftName}>{s.shiftName}</option>)}
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Map Shift</button>
                        </form>
                        <div className="mt-4">
                          <h3 className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Existing Mappings</h3>
                          <table className={theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}>
                            <thead className={theme === 'dark' ? 'bg-blue-950' : 'bg-blue-50'}>
                              <tr>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Project</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Designation</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Employee</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Shift</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={5}>Loading mappings...</td></tr>
                              ) : mappings.length === 0 ? (
                                <tr><td colSpan={5}>No mappings found</td></tr>
                              ) : (
                                mappings.map((m, idx) => (
                                  <tr key={m._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950' : 'hover:bg-blue-50'}>
                                    <td className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>{m.project}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{m.designation}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{m.employeeName}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{m.shift}</td>
                                    <td>
                                      <button className={theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}>Edit</button>
                                      <button className={theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-600'}>Delete</button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                    {activeSection === "updateWeekoff" && (
                      <>
                        <h2 className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Update Weekoffs</h2>
                        <form className="flex flex-col gap-4 mt-4">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Project</label>
                              <select
                                value={weekoffForm.project}
                                onChange={(e) => setWeekoffForm(prev => ({ ...prev, project: e.target.value }))}
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              >
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p._id || p.projectName} value={p.projectName}>{p.projectName}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Start Date</label>
                              <input
                                type="date"
                                value={weekoffForm.startDate}
                                onChange={(e) => setWeekoffForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              />
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>End Date</label>
                              <input
                                type="date"
                                value={weekoffForm.endDate}
                                onChange={(e) => setWeekoffForm(prev => ({ ...prev, endDate: e.target.value }))}
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              />
                            </div>
                            <div>
                              <label className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>Employee ID</label>
                              <input
                                type="text"
                                placeholder="Search by Employee ID"
                                value={weekoffForm.employeeId}
                                onChange={(e) => setWeekoffForm(prev => ({ ...prev, employeeId: e.target.value }))}
                                className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                              />
                            </div>
                          </div>
                          <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded">Search</button>
                        </form>
                        <div className="mt-4">
                          <h3 className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Employee Weekoff List</h3>
                          <table className={theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}>
                            <thead className={theme === 'dark' ? 'bg-blue-950' : 'bg-blue-50'}>
                              <tr>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Employee ID</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Name</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Designation</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Project</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Current Weekoff</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>New Weekoff</th>
                                <th className={theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={7}>Loading employees...</td></tr>
                              ) : employees.length === 0 ? (
                                <tr><td colSpan={7}>No employees found</td></tr>
                              ) : (
                                employees.map((emp, idx) => (
                                  <tr key={emp._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950' : 'hover:bg-blue-50'}>
                                    <td className={theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}>{emp.employeeId}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{emp.fullName}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{emp.designation}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{emp.projectName}</td>
                                    <td className={theme === 'dark' ? 'text-blue-100' : ''}>{emp.weekoff}</td>
                                    <td>
                                      <select
                                        className={theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}
                                        onChange={(e) => handleWeekoffUpdate(emp.employeeId, e.target.value)}
                                        value={emp.weekoff}
                                      >
                                        {weekoffDays.map(day => <option key={day} value={day}>{day}</option>)}
                                      </select>
                                    </td>
                                    <td>
                                      <button
                                        className={theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}
                                        onClick={() => handleWeekoffUpdate(emp.employeeId, emp.weekoff)}
                                      >
                                        Update Weekoff
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}