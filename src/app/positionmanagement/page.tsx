'use client';

import { useState, useEffect } from 'react';
import { FaBuilding, FaBriefcase, FaPlus, FaEdit, FaTrash, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import { BASE_URL } from '@/services/api';
import { getAuthToken } from '@/services/auth';
import DepartmentModals from '@/components/department/DepartmentModals';
import DepartmentSection from '@/components/department/DepartmentSection';
import { getDepartments, Department } from '@/services/departments';
import { getDesignations, getDesignationsByDepartment, Designation, updateDesignation, deleteDesignation } from '@/services/designations';

export default function PositionManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(''); // Changed from 'all' to empty string
  const [isAddDepartmentModalOpen, setAddDepartmentModalOpen] = useState(false);
  const [isAddDesignationModalOpen, setAddDesignationModalOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [newDesignation, setNewDesignation] = useState({ title: '', departmentId: '', description: '' });
  const [isEditDepartmentModalOpen, setEditDepartmentModalOpen] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
  const [isDepartmentSectionVisible, setDepartmentSectionVisible] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [isEditDesignationModalOpen, setEditDesignationModalOpen] = useState(false);
  const [isDeleteDesignationModalOpen, setDeleteDesignationModalOpen] = useState(false);
  const [designationToDelete, setDesignationToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []); // Removed fetchDesignations from initial load

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await getDepartments();
      setDepartments(data);
      // Set the first department as selected and fetch its designations
      if (data.length > 0) {
        setSelectedDepartment(data[0]._id);
        fetchDesignationsByDepartment(data[0]._id);
      }
      setError(null);
    } catch (error) {
      setError('Error fetching departments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      const data = await getDesignations();
      setDesignations(data);
      setError(null);
    } catch (error) {
      setError('Error fetching designations');
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignationsByDepartment = async (departmentId: string) => {
    try {
      setLoading(true);
      const data = await getDesignationsByDepartment(departmentId);
      setDesignations(data);
      setError(null);
    } catch (error) {
      setError('Error fetching designations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDepartment) {
      fetchDesignationsByDepartment(selectedDepartment);
    }
  }, [selectedDepartment]);

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/departments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDepartment),
      });
      if (response.ok) {
        fetchDepartments();
        setAddDepartmentModalOpen(false);
        setNewDepartment({ name: '', description: '' });
      } else {
        throw new Error('Failed to add department');
      }
    } catch (error) {
      setError('Error adding department');
    }
  };

  const handleAddDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/designations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDesignation),
      });
      if (response.ok) {
        fetchDesignations();
        setAddDesignationModalOpen(false);
        setNewDesignation({ title: '', departmentId: '', description: '' });
      } else {
        throw new Error('Failed to add designation');
      }
    } catch (error) {
      setError('Error adding designation');
    }
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDepartment) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/departments/${editDepartment._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editDepartment.name,
          description: editDepartment.description,
        }),
      });
      if (response.ok) {
        fetchDepartments();
        setEditDepartmentModalOpen(false);
        setEditDepartment(null);
      } else {
        throw new Error('Failed to update department');
      }
    } catch (error) {
      setError('Error updating department');
    }
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/departments/${departmentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchDepartments();
        setDeleteModalOpen(false);
        setDepartmentToDelete(null);
      } else {
        throw new Error('Failed to delete department');
      }
    } catch (error) {
      setError('Error deleting department');
    }
  };

  const handleEditDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesignation) return;

    try {
      await updateDesignation(editingDesignation._id, {
        title: editingDesignation.title,
        description: editingDesignation.description,
        departmentId: editingDesignation.department._id,
      });
      
      if (selectedDepartment === 'all') {
        fetchDesignations();
      } else {
        fetchDesignationsByDepartment(selectedDepartment);
      }
      
      setEditDesignationModalOpen(false);
      setEditingDesignation(null);
    } catch (error) {
      setError('Error updating designation');
    }
  };

  const handleDeleteDesignation = async () => {
    if (!designationToDelete) return;

    try {
      await deleteDesignation(designationToDelete);
      
      if (selectedDepartment === 'all') {
        fetchDesignations();
      } else {
        fetchDesignationsByDepartment(selectedDepartment);
      }
      
      setDeleteDesignationModalOpen(false);
      setDesignationToDelete(null);
    } catch (error) {
      setError('Error deleting designation');
    }
  };

  const handleNewDepartmentChange = (field: string, value: string) => {
    setNewDepartment(prev => ({ ...prev, [field]: value }));
  };

  const handleEditDepartmentChange = (field: string, value: string) => {
    if (editDepartment) {
      setEditDepartment({ ...editDepartment, [field]: value });
    }
  };

  const filteredDesignations = selectedDepartment === 'all'
    ? designations
    : designations.filter(d => d.department._id === selectedDepartment);

  // Enhanced loading state
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-60 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-200 rounded-full animate-ping"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  );

  // Enhanced error state
  const ErrorState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-60 gap-4 bg-red-50 rounded-2xl p-8">
      <div className="p-4 bg-red-100 rounded-full">
        <FaExclamationCircle className="w-8 h-8 text-red-600" />
      </div>
      <div className="text-center">
        <h3 className="text-red-800 font-semibold mb-2">Error Occurred</h3>
        <p className="text-red-600">{message}</p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  const renderDesignationCard = (designation: Designation) => (
    <div
      key={designation._id}
      className="group bg-white rounded-2xl border-2 border-gray-100 hover:border-purple-500 
      shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out p-6"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
              <FaBriefcase className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{designation.title}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{designation.description}</p>
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl w-fit">
            <FaBuilding className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              {designation.department.name}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <button 
            onClick={() => {
              setEditingDesignation(designation);
              setEditDesignationModalOpen(true);
            }}
            className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg 
            transition-all duration-200 flex items-center gap-2 hover:shadow-md"
            title="Edit Designation"
          >
            <FaEdit className="w-4 h-4" />
            <span className="text-sm font-medium hidden lg:block">Edit</span>
          </button>
          <button 
            onClick={() => {
              setDesignationToDelete(designation._id);
              setDeleteDesignationModalOpen(true);
            }}
            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg 
            transition-all duration-200 flex items-center gap-2 hover:shadow-md"
            title="Delete Designation"
          >
            <FaTrash className="w-4 h-4" />
            <span className="text-sm font-medium hidden lg:block">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Position Management
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setDepartmentSectionVisible(true)}
              className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-xl 
              flex items-center gap-3 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
            >
              <div className="p-2 bg-blue-500 bg-opacity-30 rounded-lg group-hover:bg-opacity-40 transition-all">
                <FaBuilding className="w-4 h-4" />
              </div>
              <span className="font-medium">Manage Departments</span>
            </button>
            <button
              onClick={() => setAddDesignationModalOpen(true)}
              className="group bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2.5 rounded-xl 
              flex items-center gap-3 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
            >
              <div className="p-2 bg-purple-500 bg-opacity-30 rounded-lg group-hover:bg-opacity-40 transition-all">
                <FaPlus className="w-4 h-4" />
              </div>
              <span className="font-medium">Add Designation</span>
            </button>
          </div>
        </div>

        {/* Designations Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 hover:shadow-md transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <FaBriefcase className="text-purple-600 w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Designations</h2>
            </div>
            <div className="relative w-full sm:w-80">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 text-gray-900 font-medium
                  focus:ring-2 focus:ring-purple-500 focus:border-transparent
                  pl-4 pr-12 py-3 appearance-none bg-white
                  shadow-sm hover:border-purple-400 cursor-pointer
                  transition-all duration-200"
              >
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                <FaBuilding className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorState message={error} />
          ) : designations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-4 bg-gray-50 rounded-2xl">
              <div className="p-4 bg-gray-100 rounded-full">
                <FaInfoCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">
                {selectedDepartment === 'all' 
                  ? 'No designations found' 
                  : 'No designations found for this department'}
              </p>
              <button
                onClick={() => setAddDesignationModalOpen(true)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                transition-colors flex items-center gap-2"
              >
                <FaPlus className="w-4 h-4" />
                Add Designation
              </button>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {designations.map(renderDesignationCard)}
            </div>
          )}
        </div>

        {/* Department Management Modal */}
        {isDepartmentSectionVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <FaBuilding className="text-blue-600 w-5 h-5" />
                  <h2 className="text-xl font-semibold text-gray-900">Department Management</h2>
                </div>
                <button
                  onClick={() => setAddDepartmentModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Department
                </button>
              </div>
              
              <DepartmentSection
                departments={departments}
                onEdit={(department) => {
                  setEditDepartment(department);
                  setEditDepartmentModalOpen(true);
                }}
                onDelete={(id) => {
                  setDepartmentToDelete(id);
                  setDeleteModalOpen(true);
                }}
              />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setDepartmentSectionVisible(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <DepartmentModals
          isAddModalOpen={isAddDepartmentModalOpen}
          isEditModalOpen={isEditDepartmentModalOpen}
          isDeleteModalOpen={isDeleteModalOpen}
          department={editDepartment}
          newDepartment={newDepartment}
          onAdd={handleAddDepartment}
          onEdit={handleEditDepartment}
          onDelete={handleDeleteDepartment}
          onCloseAdd={() => setAddDepartmentModalOpen(false)}
          onCloseEdit={() => {
            setEditDepartmentModalOpen(false);
            setEditDepartment(null);
          }}
          onCloseDelete={() => {
            setDeleteModalOpen(false);
            setDepartmentToDelete(null);
          }}
          onNewDepartmentChange={handleNewDepartmentChange}
          onEditDepartmentChange={handleEditDepartmentChange}
        />

        {/* Keep the Add Designation Modal here */}
        {isAddDesignationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-xl transform transition-all duration-200 ease-in-out scale-100 opacity-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FaBriefcase className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Add New Designation</h2>
              </div>
              <form onSubmit={handleAddDesignation} className="space-y-6">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newDesignation.title}
                      onChange={(e) => setNewDesignation({ ...newDesignation, title: e.target.value })}
                      className="w-full rounded-lg border-2 border-gray-200 text-black 
                        focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        py-2.5 px-4 shadow-sm hover:border-purple-400 
                        transition-all duration-200 placeholder-gray-400"
                      placeholder="Enter designation title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Department
                    </label>
                    <div className="relative">
                      <select
                        value={newDesignation.departmentId}
                        onChange={(e) => setNewDesignation({ ...newDesignation, departmentId: e.target.value })}
                        className="w-full rounded-lg border-2 border-gray-200 text-black 
                          focus:ring-2 focus:ring-purple-500 focus:border-transparent
                          py-2.5 px-4 shadow-sm hover:border-purple-400 
                          transition-all duration-200 appearance-none"
                        required
                      >
                        <option value="" className="text-gray-400">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id} className="text-black">
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FaBuilding className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newDesignation.description}
                      onChange={(e) => setNewDesignation({ ...newDesignation, description: e.target.value })}
                      className="w-full rounded-lg border-2 border-gray-200 text-black 
                        focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        py-2.5 px-4 shadow-sm hover:border-purple-400 
                        transition-all duration-200 resize-none placeholder-gray-400"
                      rows={4}
                      placeholder="Enter designation description"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setAddDesignationModalOpen(false)}
                    className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 
                      rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg 
                      hover:bg-purple-700 transition-all duration-200 ease-in-out 
                      transform hover:scale-[1.02] focus:outline-none focus:ring-2 
                      focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Add Designation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Designation Modal */}
        {isEditDesignationModalOpen && editingDesignation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl 
              transform transition-all duration-300 ease-out scale-100 opacity-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FaBriefcase className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Edit Designation</h2>
              </div>
              <form onSubmit={handleEditDesignation} className="space-y-6">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={editingDesignation.title}
                      onChange={(e) => setEditingDesignation({
                        ...editingDesignation,
                        title: e.target.value
                      })}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3
                        text-black focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editingDesignation.description}
                      onChange={(e) => setEditingDesignation({
                        ...editingDesignation,
                        description: e.target.value
                      })}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3
                        text-black focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        transition-all duration-200 resize-none"
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditDesignationModalOpen(false);
                      setEditingDesignation(null);
                    }}
                    className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100
                      rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl
                      hover:bg-purple-700 transition-all duration-200 ease-in-out
                      transform hover:scale-[1.02] focus:outline-none focus:ring-2
                      focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Update Designation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Designation Modal */}
        {isDeleteDesignationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-red-600 mb-4">Delete Designation</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this designation? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteDesignationModalOpen(false);
                    setDesignationToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDesignation}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}