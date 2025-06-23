'use client';
import React, { useState } from 'react';
import ManagerDashboardLayout from '@/components/dashboard/ManagerDashboardLayout';
import { FaIdCard, FaInfoCircle } from 'react-icons/fa';

const MOCK_PROJECTS = ['Project Alpha', 'Project Beta', 'Project Gamma'];
const MOCK_DESIGNATIONS = ['Security Guard', 'Supervisor', 'Technician', 'Driver'];
const MOCK_EMPLOYEES = [
  { employeeId: 'EMP001', fullName: 'John Doe', designation: 'Security Guard' },
  { employeeId: 'EMP002', fullName: 'Jane Smith', designation: 'Supervisor' },
  { employeeId: 'EMP003', fullName: 'Alice Johnson', designation: 'Technician' },
  { employeeId: 'EMP004', fullName: 'Bob Williams', designation: 'Driver' },
  { employeeId: 'EMP005', fullName: 'Sam Carter', designation: 'Security Guard' },
];

const UniformProjectWiseApplicablePage = () => {
  const [mappings, setMappings] = useState([
    { id: 1, project: 'Project Alpha', designation: 'Security Guard', employeeId: '', payable: true, type: 'designation' },
    { id: 2, project: 'Project Beta', designation: 'Supervisor', employeeId: '', payable: false, type: 'designation' },
  ]);
  const [form, setForm] = useState({ project: '', designation: '', employeeId: '', payable: true });
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ project: '', designation: '', employeeId: '', payable: true });

  // Tab state
  const [activeTab, setActiveTab] = useState<'designation' | 'uniformType'>('designation');

  // Uniform Types state
  const [uniformTypes, setUniformTypes] = useState<any[]>([]);
  const [uniformTypeForm, setUniformTypeForm] = useState({ project: '', designation: '', name: '', description: '' });
  const [uniformTypeError, setUniformTypeError] = useState('');

  // Filter employees by selected designation
  const filteredEmployees = form.designation
    ? MOCK_EMPLOYEES.filter(emp => emp.designation === form.designation)
    : [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project || !form.designation) {
      setError('Please select all required fields.');
      return;
    }
    setMappings(prev => [
      {
        id: Date.now(),
        project: form.project,
        designation: form.designation,
        employeeId: form.employeeId,
        payable: form.payable,
        type: form.employeeId ? 'designation-employee' : 'designation',
      },
      ...prev,
    ]);
    setForm({ project: '', designation: '', employeeId: '', payable: true });
    setError('');
  };

  // Edit logic
  const startEdit = (m: any) => {
    setEditId(m.id);
    setEditForm({
      project: m.project,
      designation: m.designation,
      employeeId: m.employeeId,
      payable: m.payable,
    });
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ project: '', designation: '', employeeId: '', payable: true });
  };
  const saveEdit = (id: number) => {
    setMappings(prev => prev.map(m => m.id === id ? {
      ...m,
      ...editForm,
      type: editForm.employeeId ? 'designation-employee' : 'designation',
    } : m));
    setEditId(null);
    setEditForm({ project: '', designation: '', employeeId: '', payable: true });
  };
  const editFilteredEmployees = editForm.designation
    ? MOCK_EMPLOYEES.filter(emp => emp.designation === editForm.designation)
    : [];

  const handleUniformTypeAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniformTypeForm.project || !uniformTypeForm.designation || !uniformTypeForm.name) {
      setUniformTypeError('Please fill all required fields.');
      return;
    }
    setUniformTypes(prev => [
      {
        id: Date.now(),
        ...uniformTypeForm,
      },
      ...prev,
    ]);
    setUniformTypeForm({ project: '', designation: '', name: '', description: '' });
    setUniformTypeError('');
  };

  return (
    <ManagerDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center py-8">
        {/* Modern Header */}
        <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800 w-full max-w-5xl mx-auto">
          <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
            <FaIdCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Uniform Project/Designation Mapping</h1>
            <p className="text-white text-base opacity-90">Create, view, and edit uniform mappings and types for each project and designation</p>
          </div>
        </div>
        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="md:w-64 flex-shrink-0 flex flex-col gap-6">
            <div className="rounded-2xl p-4 sticky top-8 bg-white border border-blue-100 shadow">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('designation')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors font-medium text-lg ${activeTab === 'designation' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-blue-50'}`}
                >
                  <FaIdCard className="w-5 h-5" />
                  <span>Designation Wise</span>
                </button>
                <button
                  onClick={() => setActiveTab('uniformType')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors font-medium text-lg ${activeTab === 'uniformType' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-blue-50'}`}
                >
                  <FaIdCard className="w-5 h-5" />
                  <span>Uniform Types</span>
                </button>
              </nav>
            </div>
            {/* Instructions/Info Card */}
            <div className="relative rounded-2xl p-6 border bg-blue-50 border-blue-200 shadow-xl flex flex-col gap-3 items-start transition-all duration-300 hover:shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FaInfoCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-blue-800 tracking-tight">Instructions & Notes</h3>
              </div>
              <ul className="space-y-2 text-blue-800 text-sm pl-2">
                <li>• Use the sidebar to switch between mapping and uniform types.</li>
                <li>• Add, edit, or view mappings and types in the main area.</li>
                <li>• All fields marked with * are mandatory.</li>
              </ul>
            </div>
          </aside>
          {/* Main Content */}
          <main className="flex-1 space-y-8">
            {activeTab === 'designation' && (
              <>
                {/* Add Mapping Form */}
                <section className="bg-white rounded-2xl p-8 border border-blue-100 shadow-xl mb-8">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Add Designation Wise Uniform</h2>
                  <form onSubmit={handleAdd} className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-blue-800 font-semibold mb-1">Project</label>
                        <select
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={form.project}
                          onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                          required
                        >
                          <option value="">Select project...</option>
                          {MOCK_PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-blue-800 font-semibold mb-1">Designation</label>
                        <select
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={form.designation}
                          onChange={e => setForm(f => ({ ...f, designation: e.target.value, employeeId: '' }))}
                          required
                        >
                          <option value="">Select designation...</option>
                          {MOCK_DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      {form.designation && filteredEmployees.length > 0 && (
                        <div className="flex-1">
                          <label className="block text-blue-800 font-semibold mb-1">Employee ID (optional)</label>
                          <select
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={form.employeeId}
                            onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                          >
                            <option value="">All employees in designation</option>
                            {filteredEmployees.map(emp => <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName} ({emp.employeeId})</option>)}
                          </select>
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-end">
                        <label className="block text-blue-800 font-semibold mb-1">Payable</label>
                        <div className="flex items-center gap-3 mt-1">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="payable"
                              checked={form.payable === true}
                              onChange={() => setForm(f => ({ ...f, payable: true }))}
                              className="accent-green-600"
                            />
                            <span className="text-green-700 font-semibold">Payable</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="payable"
                              checked={form.payable === false}
                              onChange={() => setForm(f => ({ ...f, payable: false }))}
                              className="accent-red-600"
                            />
                            <span className="text-red-600 font-semibold">Non-Payable</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
                    <button type="submit" className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Add Mapping</button>
                  </form>
                </section>
                {/* Mappings Table */}
                <section className="bg-white rounded-2xl p-8 border border-blue-100 shadow-xl">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Current Mappings</h2>
                  {mappings.length === 0 ? (
                    <div className="text-blue-500 text-center py-8">No mappings yet. Add a mapping above.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-blue-100">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Project</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation/Employee</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Payable</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {mappings.map(m => (
                          <tr key={m.id} className="hover:bg-blue-50 transition">
                            {editId === m.id ? (
                              <>
                                <td className="px-4 py-3">
                                  <select
                                    className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={editForm.project}
                                    onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
                                    required
                                  >
                                    <option value="">Select project...</option>
                                    {MOCK_PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                                    value={editForm.designation}
                                    onChange={e => setEditForm(f => ({ ...f, designation: e.target.value, employeeId: '' }))}
                                    required
                                  >
                                    <option value="">Select designation...</option>
                                    {MOCK_DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                  {editForm.designation && editFilteredEmployees.length > 0 && (
                                    <select
                                      className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                      value={editForm.employeeId}
                                      onChange={e => setEditForm(f => ({ ...f, employeeId: e.target.value }))}
                                    >
                                      <option value="">All employees in designation</option>
                                      {editFilteredEmployees.map(emp => <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName} ({emp.employeeId})</option>)}
                                    </select>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`edit-payable-${m.id}`}
                                        checked={editForm.payable === true}
                                        onChange={() => setEditForm(f => ({ ...f, payable: true }))}
                                        className="accent-green-600"
                                      />
                                      <span className="text-green-700 font-semibold">Payable</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`edit-payable-${m.id}`}
                                        checked={editForm.payable === false}
                                        onChange={() => setEditForm(f => ({ ...f, payable: false }))}
                                        className="accent-red-600"
                                      />
                                      <span className="text-red-600 font-semibold">Non-Payable</span>
                                    </label>
                                  </div>
                                </td>
                                <td className="px-4 py-3 flex gap-2">
                                  <button type="button" className="px-4 py-1 rounded-lg bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition" onClick={() => saveEdit(m.id)}>Save</button>
                                  <button type="button" className="px-4 py-1 rounded-lg bg-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-400 transition" onClick={cancelEdit}>Cancel</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 font-bold text-blue-800">{m.project}</td>
                                <td className="px-4 py-3 text-black">
                                  {m.employeeId
                                    ? MOCK_EMPLOYEES.find(emp => emp.employeeId === m.employeeId)?.fullName + ` (${m.employeeId}) [${m.designation}]`
                                    : m.designation}
                                </td>
                                <td className="px-4 py-3">
                                  {m.payable ? <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Payable</span> : <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">Non-Payable</span>}
                                </td>
                                <td className="px-4 py-3 flex gap-2">
                                  <button type="button" className="px-4 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition" onClick={() => startEdit(m)}>Edit</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              </>
            )}
            {activeTab === 'uniformType' && (
              <section className="bg-white rounded-2xl p-8 border border-blue-100 shadow-xl">
                <div className="flex items-center gap-6 mb-6">
                  <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
                    <FaIdCard className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-blue-800 mb-1">Create Uniform Type</h1>
                    <p className="text-blue-700 text-base opacity-90">Define types of uniforms for each project and designation</p>
                  </div>
                </div>
                <form onSubmit={handleUniformTypeAdd} className="flex flex-col gap-6 mb-8">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-blue-800 font-semibold mb-1">Project</label>
                      <select
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={uniformTypeForm.project}
                        onChange={e => setUniformTypeForm(f => ({ ...f, project: e.target.value }))}
                        required
                      >
                        <option value="">Select project...</option>
                        {MOCK_PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-blue-800 font-semibold mb-1">Designation</label>
                      <select
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={uniformTypeForm.designation}
                        onChange={e => setUniformTypeForm(f => ({ ...f, designation: e.target.value }))}
                        required
                      >
                        <option value="">Select designation...</option>
                        {MOCK_DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-blue-800 font-semibold mb-1">Uniform Type Name</label>
                      <input
                        type="text"
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={uniformTypeForm.name}
                        onChange={e => setUniformTypeForm(f => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-blue-800 font-semibold mb-1">Description</label>
                      <input
                        type="text"
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={uniformTypeForm.description}
                        onChange={e => setUniformTypeForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  {uniformTypeError && <div className="text-red-500 text-sm mt-2">{uniformTypeError}</div>}
                  <button type="submit" className="self-end px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400">Add Uniform Type</button>
                </form>
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Uniform Types</h2>
                  {uniformTypes.length === 0 ? (
                    <div className="text-blue-500 text-center py-8">No uniform types yet. Add a uniform type above.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-blue-100">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Project</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Designation</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Uniform Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {uniformTypes.map(u => (
                          <tr key={u.id} className="hover:bg-blue-50 transition">
                            <td className="px-4 py-3 font-bold text-blue-800">{u.project}</td>
                            <td className="px-4 py-3">{u.designation}</td>
                            <td className="px-4 py-3">{u.name}</td>
                            <td className="px-4 py-3">{u.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
};

export default UniformProjectWiseApplicablePage; 