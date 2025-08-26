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
                <li>• Select a project first to see available designations</li>
                <li>• Designations are filtered based on selected project</li>
                <li>• Employees are filtered based on project and designation</li>
                <li>• All fields marked with * are mandatory</li>
              </ul>
            </div>
          </aside>
          {/* Main Content */}
          <main className="flex-1 space-y-8">
            {activeSection === "addShift" && (
              <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-8 border shadow-xl`}>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Add New Shift</h2>
                <form onSubmit={handleShiftSubmit} className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Shift Name *</label>
                      <input 
                        type="text" 
                        value={shiftForm.shiftName}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, shiftName: e.target.value }))}
                        required
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} 
                        placeholder="Morning Shift" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Start Time *</label>
                      <input 
                        type="time" 
                        value={shiftForm.startTime}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                        required
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} 
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>End Time *</label>
                      <input 
                        type="time" 
                        value={shiftForm.endTime}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                        required
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800 placeholder-blue-400' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} 
                      />
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
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center">Loading shifts...</td>
                        </tr>
                      ) : shifts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center">No shifts found</td>
                        </tr>
                      ) : (
                        shifts.map((shift, idx) => (
                          <tr key={shift._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition' : 'hover:bg-blue-50 transition'}>
                            <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{shift.shiftName}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{shift.startTime}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{shift.endTime}</td>
                            <td className="px-4 py-3 flex gap-2">
                              <button className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>Edit</button>
                              <button className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {activeSection === "mapShift" && (
              <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-8 border shadow-xl`}>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Map Shift to Project, Designation & Employee</h2>
                <form onSubmit={handleMappingSubmit} className="flex flex-col gap-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Project *</label>
                      <select 
                        value={mappingForm.project}
                        onChange={(e) => setMappingForm(prev => ({ ...prev, project: e.target.value }))}
                        required
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                      >
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p._id || p.projectName} value={p.projectName}>{p.projectName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Designation *</label>
                      <select 
                        value={mappingForm.designation}
                        onChange={(e) => setMappingForm(prev => ({ ...prev, designation: e.target.value }))}
                        required
                        disabled={!mappingForm.project}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'} ${!mappingForm.project ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Select Designation</option>
                        {filteredDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Employee *</label>
                      <select 
                        value={mappingForm.employee}
                        onChange={(e) => setMappingForm(prev => ({ ...prev, employee: e.target.value }))}
                        required
                        disabled={!mappingForm.designation}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'} ${!mappingForm.designation ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Select Employee</option>
                        {filteredEmployees.map(e => <option key={e._id || e.employeeId} value={e.employeeId}>{e.fullName} ({e.employeeId})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Shift *</label>
                      <select 
                        value={mappingForm.shift}
                        onChange={(e) => setMappingForm(prev => ({ ...prev, shift: e.target.value }))}
                        required
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                      >
                        <option value="">Select Shift</option>
                        {shifts.map(s => <option key={s._id || s.shiftName} value={s.shiftName}>{s.shiftName}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Map Shift</button>
                </form>
                <div>
                  <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Existing Mappings</h3>
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}`}>
                    <thead className={theme === 'dark' ? 'bg-blue-950' : 'bg-blue-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Project</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Designation</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Employee</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Shift</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-blue-50'}>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-center">Loading mappings...</td>
                        </tr>
                      ) : mappings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-center">No mappings found</td>
                        </tr>
                      ) : (
                        mappings.map((m, idx) => (
                          <tr key={m._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition' : 'hover:bg-blue-50 transition'}>
                            <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{m.project}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{m.designation}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{m.employeeName}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{m.shift}</td>
                            <td className="px-4 py-3 flex gap-2">
                              <button className={`px-3 py-1 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>Edit</button>
                              <button className={`px-3 py-1 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {activeSection === "updateWeekoff" && (
              <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-8 border shadow-xl`}>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Update Weekoffs</h2>
                <form className="flex flex-col gap-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Project</label>
                      <select 
                        value={weekoffForm.project}
                        onChange={(e) => setWeekoffForm(prev => ({ ...prev, project: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                      >
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p._id || p.projectName} value={p.projectName}>{p.projectName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Start Date</label>
                      <input 
                        type="date" 
                        value={weekoffForm.startDate}
                        onChange={(e) => setWeekoffForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} 
                      />
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>End Date</label>
                      <input 
                        type="date" 
                        value={weekoffForm.endDate}
                        onChange={(e) => setWeekoffForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} 
                      />
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Employee ID</label>
                      <input 
                        type="text" 
                        placeholder="Search by Employee ID" 
                        value={weekoffForm.employeeId}
                        onChange={(e) => setWeekoffForm(prev => ({ ...prev, employeeId: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`} 
                      />
                    </div>
                  </div>
                  <button type="button" className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Search</button>
                </form>
                <div>
                  <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Employee Weekoff List</h3>
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}`}>
                    <thead className={theme === 'dark' ? 'bg-blue-950' : 'bg-blue-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Employee ID</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Name</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Designation</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Project</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Current Weekoff</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>New Weekoff</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Action</th>
                      </tr>
                    </thead>
                    <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-blue-50'}>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 text-center">Loading employees...</td>
                        </tr>
                      ) : employees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 text-center">No employees found</td>
                        </tr>
                      ) : (
                        employees.map((emp, idx) => (
                          <tr key={emp._id || idx} className={theme === 'dark' ? 'hover:bg-blue-950 transition' : 'hover:bg-blue-50 transition'}>
                            <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{emp.employeeId}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{emp.fullName}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{emp.designation}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{emp.projectName}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : ''}`}>{emp.weekoff}</td>
                            <td className={`px-4 py-3`}>
                              <select 
                                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-100 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                                onChange={(e) => handleWeekoffUpdate(emp.employeeId, e.target.value)}
                                value={emp.weekoff}
                              >
                                {weekoffDays.map(day => <option key={day} value={day}>{day}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                className={`px-4 py-1 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
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
              </section>
            )}
          </main>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}