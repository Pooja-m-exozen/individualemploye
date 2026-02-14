'use client';
import React, { useState, useEffect } from 'react';
import ManagerDashboardLayout from '@/components/dashboard/ManagerDashboardLayout';
import { FaIdCard, FaInfoCircle, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useTheme } from "@/context/ThemeContext";

// API Configuration
const API_BASE_URL = 'https://cafm.zenapi.co.in/api/uniforms';

interface Project {
  _id: string;
  projectName: string;
}

interface ProjectEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
}

interface UniformApiEmployee {
  projectName: string;
  employeeId: string;
  fullName: string;
  designation: string;
}

interface UniformOptionItem {
  type: string;
  sizes?: string[];
  set?: string[];
}

interface UniformOptions {
  employeeDetails: {
    fullName: string;
    employeeId: string;
    designation: string;
    projectName: string;
  };
  uniformOptions: UniformOptionItem[];
  maxQuantity: number;
}

interface Mapping {
  _id: string;
  project: string;
  designations: string[];
  employeeId?: string;
  payable: 'payable' | 'non-payable';
  uniformTypes: string[];
  mappingName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}



interface AvailableOptions {
  projects: string[];
  categories: string[];
  uniformTypes: Array<{
    name: string;
    category: string;
    subCategory: string;
    description: string;
    availableSizes: string[];
  }>;
  existingDesignations: string[];
}

interface MappingData {
  project: string;
  designations: string[];
  employeeId?: string;
  payable: 'payable' | 'non-payable';
  uniformTypes: string[];
  mappingName?: string;
  description?: string;
}



const UniformProjectWiseApplicablePage = () => {
  const { theme } = useTheme();
  
  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState('');
  
  // Project list for uniform type form (from KYC pattern)
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string, designationWiseCount?: Record<string, number> }[]>([]);
  

  
  // Designation options for designation-wise section
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  
  // Employees for selected project
  const [projectEmployees, setProjectEmployees] = useState<ProjectEmployee[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  
  // Uniform options for selected employee
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [uniformOptions, setUniformOptions] = useState<UniformOptions | null>(null);
  const [uniformOptionsLoading, setUniformOptionsLoading] = useState(false);
  const [uniformOptionsError, setUniformOptionsError] = useState('');

  // Available options from API
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions | null>(null);
  const [availableOptionsLoading, setAvailableOptionsLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'designation'>('designation');



  // Mappings and form state
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [form, setForm] = useState({ 
    project: '', 
    designations: [] as string[], 
    employeeId: '', 
    payable: 'non-payable' as 'payable' | 'non-payable',
    uniformTypes: [] as string[],
    mappingName: '',
    description: ''
  });
  const [error, setError] = useState('');

  
  // Toast state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [editModalForm, setEditModalForm] = useState({
    project: '',
    designations: [] as string[],
    employeeId: '',
    payable: 'non-payable' as 'payable' | 'non-payable',
    uniformTypes: [] as string[],
    mappingName: '',
    description: ''
  });
  


  // API Functions
  const fetchProjects = async () => {
    try {
      setProjectLoading(true);
      const response = await fetch('https://cafm.zenapi.co.in/api/project/projects');
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
      setProjectError('');
    } catch (error) {
      setProjectError('Failed to load projects');
      console.error('Error fetching projects:', error);
    } finally {
      setProjectLoading(false);
    }
  };

  const fetchAvailableOptions = async () => {
    try {
      setAvailableOptionsLoading(true);
      const response = await fetch(`${API_BASE_URL}/available-options`);
      const data = await response.json();
      if (data.success) {
        setAvailableOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching available options:', error);
    } finally {
      setAvailableOptionsLoading(false);
    }
  };



  const fetchMappings = async () => {
    try {
      setMappingsLoading(true);
      const response = await fetch('https://cafm.zenapi.co.in/api/uniforms/uniform-mappings');
      const data = await response.json();
      if (data.success) {
        // Filter out any mappings that might have isActive: false or are soft deleted
        const activeMappings = data.data.filter((mapping: Mapping) => mapping.isActive !== false);
        setMappings(activeMappings);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setMappingsLoading(false);
    }
  };



  const createMapping = async (mappingData: MappingData) => {
    try {
      const response = await fetch('https://cafm.zenapi.co.in/api/uniforms/uniform-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappingData),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create mapping');
      }
    } catch (error) {
      throw error;
    }
  };

  const updateMapping = async (id: string, mappingData: MappingData) => {
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/uniforms/uniform-mappings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappingData),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update mapping');
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/uniforms/uniform-mappings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to delete mapping');
      }
    } catch (error) {
      throw error;
    }
  };



  // Fetch all projects on mount
  useEffect(() => {
    fetchProjects();
    fetchAvailableOptions();
    fetchMappings();
  }, []);

  // Fetch project list for uniform type form (from KYC pattern)
  useEffect(() => {
    fetch("https://cafm.zenapi.co.in/api/project/projects")
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        console.error("Failed to load projects");
      });
  }, []);

  // Update designation options when designation-wise project changes
  useEffect(() => {
    const selectedProject = projectList.find(p => p.projectName === form.project);
    if (selectedProject && selectedProject.designationWiseCount) {
      setDesignationOptions(Object.keys(selectedProject.designationWiseCount));
      // Reset selected designations when project changes
      setForm(prev => ({ ...prev, designations: [] }));
    } else {
      setDesignationOptions([]);
      setForm(prev => ({ ...prev, designations: [] }));
    }
  }, [form.project, projectList]);

  // Update designation options when edit modal project changes
  useEffect(() => {
    if (showEditModal) {
      const selectedProject = projectList.find(p => p.projectName === editModalForm.project);
      if (selectedProject && selectedProject.designationWiseCount) {
        setDesignationOptions(Object.keys(selectedProject.designationWiseCount));
      } else {
        setDesignationOptions([]);
      }
    }
  }, [editModalForm.project, projectList, showEditModal]);

  // Fetch employees for selected project
  useEffect(() => {
    if (!form.project) {
      setProjectEmployees([]);
      return;
    }
    setEmployeeLoading(true);
    setEmployeeError('');
    fetch('https://cafm.zenapi.co.in/api/uniforms/all')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.uniforms)) {
          const emps = data.uniforms.filter((u: UniformApiEmployee) => u.projectName === form.project)
            .map((u: UniformApiEmployee) => ({ employeeId: u.employeeId, fullName: u.fullName, designation: u.designation }));
          setProjectEmployees(emps);
        } else {
          setProjectEmployees([]);
        }
        setEmployeeLoading(false);
      })
      .catch(() => {
        setEmployeeError('Failed to load employees');
        setEmployeeLoading(false);
      });
  }, [form.project]);

  // Fetch uniform options for selected employee
  useEffect(() => {
    if (!selectedEmployeeId) {
      setUniformOptions(null);
      return;
    }
    setUniformOptionsLoading(true);
    setUniformOptionsError('');
    fetch(`${API_BASE_URL}/${selectedEmployeeId}/options`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUniformOptions(data);
        } else {
          setUniformOptions(null);
          setUniformOptionsError('No uniform options found');
        }
        setUniformOptionsLoading(false);
      })
      .catch(() => {
        setUniformOptions(null);
        setUniformOptionsError('Failed to load uniform options');
        setUniformOptionsLoading(false);
      });
  }, [selectedEmployeeId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project || form.designations.length === 0 || form.uniformTypes.length === 0) {
      setError('Please select project, at least one designation, and at least one uniform type.');
      return;
    }

    try {
      const mappingData = {
        project: form.project,
        designations: form.designations,
        employeeId: form.employeeId || undefined,
        payable: form.payable,
        uniformTypes: form.uniformTypes,
        mappingName: form.mappingName || `${form.project} - ${form.designations.join(', ')}`,
        description: form.description
      };

      const newMapping = await createMapping(mappingData);
      setMappings(prev => [newMapping, ...prev]);
      setForm({ 
        project: '', 
        designations: [], 
        employeeId: '', 
        payable: 'non-payable',
        uniformTypes: [],
        mappingName: '',
        description: ''
      });
      setError('');
      setToast({ type: 'success', message: 'Mapping created successfully.' });
      setTimeout(() => setToast(null), 3500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create mapping';
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Edit logic for mappings
  const startEdit = (m: Mapping) => {
    setEditingMapping(m);
    setEditModalForm({
      project: m.project,
      designations: m.designations,
      employeeId: m.employeeId || '',
      payable: m.payable,
      uniformTypes: m.uniformTypes,
      mappingName: m.mappingName || '',
      description: m.description || ''
    });
    
    // Update designation options based on the project of the mapping being edited
    const selectedProject = projectList.find(p => p.projectName === m.project);
    if (selectedProject && selectedProject.designationWiseCount) {
      setDesignationOptions(Object.keys(selectedProject.designationWiseCount));
    } else {
      setDesignationOptions([]);
    }
    
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingMapping(null);
    setEditModalForm({ 
      project: '', 
      designations: [], 
      employeeId: '', 
      payable: 'non-payable',
      uniformTypes: [],
      mappingName: '',
      description: ''
    });
  };

  const saveEdit = async () => {
    if (!editingMapping) return;
    
    try {
      const updatedMapping = await updateMapping(editingMapping._id, editModalForm);
      setMappings(prev => prev.map(m => m._id === editingMapping._id ? updatedMapping : m));
      setShowEditModal(false);
      setEditingMapping(null);
      setEditModalForm({ 
        project: '', 
        designations: [], 
        employeeId: '', 
        payable: 'non-payable',
        uniformTypes: [],
        mappingName: '',
        description: ''
      });
      setToast({ type: 'success', message: 'Mapping updated successfully.' });
      setTimeout(() => setToast(null), 3500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update mapping';
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      try {
        await deleteMapping(id);
        // Refresh the mappings list to ensure UI is in sync with server
        await fetchMappings();
        setToast({ type: 'success', message: 'Mapping deleted successfully.' });
        setTimeout(() => setToast(null), 3500);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete mapping';
        setError(errorMessage);
        setToast({ type: 'error', message: errorMessage });
        setTimeout(() => setToast(null), 3500);
      }
    }
  };

  const handleDesignationChange = (designation: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      designations: checked 
        ? [...prev.designations, designation]
        : prev.designations.filter(d => d !== designation)
    }));
  };

  const handleUniformTypeChange = (uniformType: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      uniformTypes: checked 
        ? [...prev.uniformTypes, uniformType]
        : prev.uniformTypes.filter(t => t !== uniformType)
    }));
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col items-center py-8 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Modern Header */}
        <div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg w-full max-w-6xl mx-auto ${theme === 'dark' 
          ? 'bg-[#2d3748]' 
          : 'bg-gradient-to-r from-[#2563eb] to-[#1d3bb8]'} `}>
          <div className={`${theme === 'dark' ? 'bg-gray-800 bg-opacity-30' : 'bg-blue-600 bg-opacity-30'} rounded-xl p-4 flex items-center justify-center`}>
            <FaIdCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Uniform Project/Designation Mapping</h1>
            <p className="text-white text-base opacity-90">Create, view, and edit uniform mappings for each project and designation</p>
          </div>
        </div>

        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8 h-[calc(100vh-200px)]">
          {/* Sidebar Navigation */}
          <aside className={`md:w-64 flex-shrink-0 flex flex-col gap-6`}>
            <div className={`rounded-2xl p-4 sticky top-8 border shadow ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('designation')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors font-medium text-lg ${activeTab === 'designation' ? (theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') : (theme === 'dark' ? 'text-blue-200 hover:bg-blue-900' : 'text-gray-600 hover:bg-blue-50')}`}
                >
                  <FaIdCard className="w-5 h-5" />
                  <span>Designation Wise</span>
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
                <li>• Use the sidebar to switch between mapping and uniform types.</li>
                <li>• Select multiple designations and uniform types per mapping.</li>
                <li>• All fields marked with * are mandatory.</li>
                <li>• Mappings control which uniforms are available to each designation.</li>
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8 overflow-y-auto">
            {activeTab === 'designation' && (
              <>
                {/* Add Mapping Form */}
                <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-8 border shadow-xl mb-8`}>
                  <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Add Designation Wise Uniform Mapping</h2>
                  <form onSubmit={handleAdd} className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Project *</label>
                        <select
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                          value={form.project}
                          onChange={e => {
                            setForm(f => ({ ...f, project: e.target.value, designations: [], employeeId: '' }));
                            setSelectedEmployeeId('');
                          }}
                          required
                        >
                          <option value="">{projectLoading ? 'Loading projects...' : 'Select project...'}</option>
                          {projects.map((p: Project) => <option key={p._id} value={p.projectName}>{p.projectName}</option>)}
                        </select>
                        {projectError && <div className="text-red-500 text-xs mt-1">{projectError}</div>}
                      </div>

                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Payable Status</label>
                        <div className="flex items-center gap-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="payable"
                              checked={form.payable === 'payable'}
                              onChange={() => setForm(f => ({ ...f, payable: 'payable' }))}
                              className="accent-green-600"
                            />
                            <span className="text-green-700 font-semibold">Payable</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="payable"
                              checked={form.payable === 'non-payable'}
                              onChange={() => setForm(f => ({ ...f, payable: 'non-payable' }))}
                              className="accent-red-600"
                            />
                            <span className="text-red-600 font-semibold">Non-Payable</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Designations *</label>
                        {!form.project ? (
                          <div className={`border rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                            Select project first...
                          </div>
                        ) : designationOptions.length === 0 ? (
                          <div className={`border rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                            No designations available for this project
                          </div>
                        ) : (
                          <div className={`border rounded-lg p-3 max-h-48 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-200'}`}>
                            {designationOptions.map(designation => (
                              <label key={designation} className="flex items-center gap-2 py-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={form.designations.includes(designation)}
                                  onChange={(e) => handleDesignationChange(designation, e.target.checked)}
                                  className="accent-blue-600 w-4 h-4"
                                />
                                <span className={theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}>{designation}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {form.designations.length > 0 && (
                          <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                            Selected: {form.designations.join(', ')}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Uniform Types *</label>
                        <div className={`border rounded-lg p-3 max-h-48 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-200'}`}>
                          {availableOptionsLoading ? (
                            <div className="text-center py-4">Loading uniform types...</div>
                          ) : availableOptions?.uniformTypes && availableOptions.uniformTypes.length > 0 ? (
                            availableOptions.uniformTypes.map(uniformType => (
                              <label key={uniformType.name} className="flex items-center gap-2 py-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={form.uniformTypes.includes(uniformType.name)}
                                  onChange={(e) => handleUniformTypeChange(uniformType.name, e.target.checked)}
                                  className="accent-blue-600 w-4 h-4"
                                />
                                <div className="flex flex-col flex-1">
                                  <span className={theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}>{uniformType.name}</span>
                                  {uniformType.category && (
                                    <span className="text-xs text-gray-500">{uniformType.category}</span>
                                  )}
                                </div>
                              </label>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No uniform types available</div>
                          )}
                        </div>
                        {form.uniformTypes.length > 0 && (
                          <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                            Selected: {form.uniformTypes.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Employee dropdown after project selection */}
                    {form.project && (
                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Specific Employee (Optional)</label>
                        <select
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                          value={form.employeeId}
                          onChange={e => {
                            setForm(f => ({ ...f, employeeId: e.target.value }));
                            setSelectedEmployeeId(e.target.value);
                          }}
                        >
                          <option value="">All employees in selected designations</option>
                          {employeeLoading ? <option>Loading...</option> : projectEmployees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName} ({emp.employeeId}) [{emp.designation}]</option>
                          ))}
                        </select>
                        {employeeError && <div className="text-red-500 text-xs mt-1">{employeeError}</div>}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Mapping Name</label>
                        <input
                          type="text"
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                          value={form.mappingName}
                          onChange={e => setForm(f => ({ ...f, mappingName: e.target.value }))}
                          placeholder="Auto-generated if empty"
                        />
                      </div>

                      <div>
                        <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Description</label>
                        <input
                          type="text"
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Optional description"
                        />
                      </div>
                    </div>

                    {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
                    
                    <button 
                      type="submit" 
                      className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Add Mapping
                    </button>
                  </form>

                  {/* Uniform options for selected employee */}
                  {selectedEmployeeId && (
                    <div className={`mt-8 p-6 rounded-2xl border shadow-xl ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                      {uniformOptionsLoading ? (
                        <div className="text-blue-500">Loading uniform options...</div>
                      ) : uniformOptionsError ? (
                        <div className="text-red-500">{uniformOptionsError}</div>
                      ) : uniformOptions ? (
                        <>
                          <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                            Uniform Options for {uniformOptions.employeeDetails.fullName} ({uniformOptions.employeeDetails.employeeId})
                          </h3>
                          <div className="mb-2 text-sm font-semibold">
                            Designation: {uniformOptions.employeeDetails.designation} | Project: {uniformOptions.employeeDetails.projectName}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {uniformOptions.uniformOptions.map((opt: UniformOptionItem) => (
                              <div key={opt.type} className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-800 border-blue-900' : 'bg-white border-blue-200'} shadow`}>
                                <div className="font-bold mb-1">{opt.type}</div>
                                {opt.sizes && (
                                  <div className="text-xs">Sizes: {opt.sizes.join(', ')}</div>
                                )}
                                {opt.set && (
                                  <div className="text-xs">Set: {opt.set.join(', ')}</div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-blue-500">Max Quantity: {uniformOptions.maxQuantity}</div>
                        </>
                      ) : null}
                    </div>
                  )}
                </section>

                {/* Mappings Table */}
                <section className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'} rounded-2xl p-8 border shadow-xl`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Current Mappings</h2>
                  {mappingsLoading ? (
                    <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} text-center py-8`}>Loading mappings...</div>
                  ) : mappings.length === 0 ? (
                    <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} text-center py-8`}>No mappings yet. Add a mapping above.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-blue-100'}`}>
                        <thead className={theme === 'dark' ? 'bg-blue-950' : 'bg-blue-50'}>
                          <tr>
                            <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Project</th>
                            <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Designations</th>
                            <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Uniform Types</th>
                            <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Payable</th>
                            <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className={theme === 'dark' ? 'divide-gray-800' : 'divide-blue-50'}>
                          {mappings.map(m => (
                            <tr key={m._id} className={theme === 'dark' ? 'hover:bg-blue-950 transition' : 'hover:bg-blue-50 transition'}>
                              <td className={`px-4 py-3 font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{m.project}</td>
                              <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>
                                <div className="flex flex-wrap gap-1">
                                  {m.designations.map(designation => (
                                    <span key={designation} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                      {designation}
                                    </span>
                                  ))}
                                </div>
                                {m.employeeId && (
                                  <div className="text-xs text-gray-500 mt-1">Employee: {m.employeeId}</div>
                                )}
                              </td>
                              <td className={`px-4 py-3 ${theme === 'dark' ? 'text-blue-100' : 'text-black'}`}>
                                <div className="flex flex-wrap gap-1">
                                  {m.uniformTypes.map(type => (
                                    <span key={type} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {m.payable === 'payable' ? (
                                  <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Payable</span>
                                ) : (
                                  <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">Non-Payable</span>
                                )}
                              </td>
                              <td className="px-4 py-3 flex gap-2">
                                <button 
                                  type="button" 
                                  className={`p-2 rounded-lg font-semibold text-sm transition ${theme === 'dark' ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`} 
                                  onClick={() => startEdit(m)}
                                  title="Edit mapping"
                                >
                                  <FaEdit className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button" 
                                  className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold text-sm transition" 
                                  onClick={() => handleDelete(m._id)}
                                  title="Delete mapping"
                                >
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Edit Mapping Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Edit Mapping</h2>
              <button
                onClick={cancelEdit}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Project *</label>
                  <select
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                    value={editModalForm.project}
                    onChange={e => setEditModalForm(f => ({ ...f, project: e.target.value, designations: [] }))}
                    required
                  >
                    <option value="">Select project...</option>
                    {projects.map((p: Project) => <option key={p._id} value={p.projectName}>{p.projectName}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Payable Status</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editPayable"
                        checked={editModalForm.payable === 'payable'}
                        onChange={() => setEditModalForm(f => ({ ...f, payable: 'payable' }))}
                        className="accent-green-600"
                      />
                      <span className="text-green-700 font-semibold">Payable</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editPayable"
                        checked={editModalForm.payable === 'non-payable'}
                        onChange={() => setEditModalForm(f => ({ ...f, payable: 'non-payable' }))}
                        className="accent-red-600"
                      />
                      <span className="text-red-600 font-semibold">Non-Payable</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Designations *</label>
                  {!editModalForm.project ? (
                    <div className={`border rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                      Select project first...
                    </div>
                  ) : designationOptions.length === 0 ? (
                    <div className={`border rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                      No designations available for this project
                    </div>
                  ) : (
                    <div className={`border rounded-lg p-3 max-h-48 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-200'}`}>
                      {designationOptions.map(designation => (
                        <label key={designation} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editModalForm.designations.includes(designation)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditModalForm(prev => ({ ...prev, designations: [...prev.designations, designation] }));
                              } else {
                                setEditModalForm(prev => ({ ...prev, designations: prev.designations.filter(d => d !== designation) }));
                              }
                            }}
                            className="accent-blue-600 w-4 h-4"
                          />
                          <span className={theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}>{designation}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {editModalForm.designations.length > 0 && (
                    <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                      Selected: {editModalForm.designations.join(', ')}
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Uniform Types *</label>
                  <div className={`border rounded-lg p-3 max-h-48 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-200'}`}>
                    {availableOptions?.uniformTypes && availableOptions.uniformTypes.length > 0 ? (
                      availableOptions.uniformTypes.map(uniformType => (
                        <label key={uniformType.name} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editModalForm.uniformTypes.includes(uniformType.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditModalForm(prev => ({ ...prev, uniformTypes: [...prev.uniformTypes, uniformType.name] }));
                              } else {
                                setEditModalForm(prev => ({ ...prev, uniformTypes: prev.uniformTypes.filter(t => t !== uniformType.name) }));
                              }
                            }}
                            className="accent-blue-600 w-4 h-4"
                          />
                          <span className={theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}>{uniformType.name}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">No uniform types available</div>
                    )}
                  </div>
                  {editModalForm.uniformTypes.length > 0 && (
                    <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                      Selected: {editModalForm.uniformTypes.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Mapping Name</label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                    value={editModalForm.mappingName}
                    onChange={e => setEditModalForm(f => ({ ...f, mappingName: e.target.value }))}
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Description</label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-900 text-blue-200 border-gray-700 focus:ring-blue-800' : 'bg-white text-blue-900 border-blue-200 focus:ring-blue-400'}`}
                    value={editModalForm.description}
                    onChange={e => setEditModalForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={`px-6 py-3 rounded-xl font-semibold transition ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg text-white font-semibold transition-all duration-300 opacity-100 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <FaCheckCircle className="w-5 h-5" /> : <FaTimesCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto">
            <FaTimesCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </ManagerDashboardLayout>
  );
};

export default UniformProjectWiseApplicablePage;