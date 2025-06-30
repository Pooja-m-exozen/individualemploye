'use client';

import { useEffect, useState, useCallback } from 'react';
import { BASE_URL } from '@/services/api';
import { Employee } from '@/types/employee';
import { useRouter } from 'next/navigation';
import { getAuthToken, isAuthenticated } from '@/services/auth';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage] = useState(1);
  // const [setTotalPages] = useState(1);
  // const [itemsPerPage, setItemsPerPage] = useState(10);
  // const [ setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Employee | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        router.replace('/login');
        return;
      }

      console.log('Making API request to:', `${BASE_URL}/api/employees`);
      
      const response = await fetch(`${BASE_URL}/api/employees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Access-Control-Request-Headers': 'authorization,content-type',
          'Access-Control-Request-Method': 'GET',
          'Origin': window.location.origin,
        },
        credentials: 'include',
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Handle different status codes
      switch (response.status) {
        case 200:
          const data = await response.json();
          console.log('Success - Data received:', data);
          setEmployees(data.data || []);
          // setTotalPages(data.pagination?.pages || 1);
          // setTotalItems(data.pagination?.total || 0);
          break;
          
        case 401:
          console.error('Unauthorized access - redirecting to login');
          router.replace('/login');
          setError('Session expired. Please login again.');
          break;
          
        case 403:
          console.error('Forbidden access');
          setError('You do not have permission to access this resource.');
          break;
          
        case 500:
          console.error('Server error');
          setError('Internal server error. Please try again later.');
          break;
          
        default:
          const errorText = await response.text();
          console.error('Unexpected response:', response.status, errorText);
          setError(`Request failed with status: ${response.status}`);
      }
    } catch  {
      console.error('API Request failed:', error);
      // setError(error.message || 'Failed to load employees. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [router, error]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login?redirect=/employees');
      return;
    }
    fetchData();
  }, [currentPage, router, fetchData]);

  useEffect(() => {
    if (error) {
      router.replace('/login?redirect=/employees');
    }
  }, [router, error]);

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString();
  // };

  const filteredEmployees = employees.filter(employee => 
    employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }
  
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        router.replace('/login');
        return;
      }
  
      const response = await fetch(`${BASE_URL}/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (response.ok) {
        // Remove the employee from the local state
        setEmployees(employees.filter(emp => emp._id !== employeeId));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete employee');
      }
    } 
    catch  {
      console.error('Delete failed:', error);
      // alert(error.message || 'Failed to delete employee');
    }
  };

  const handleEdit = async (employeeId: string) => {
    const employee = employees.find(emp => emp._id === employeeId);
    if (!employee) return;
    
    setEditingEmployee(employeeId);
    setEditForm(employee);
  };

  const handleSaveEdit = async (updatedEmployee: Employee) => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.replace('/login');
        return;
      }
  
      const response = await fetch(`${BASE_URL}/api/employees/${updatedEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEmployee),
      });
  
      if (response.ok) {
        setEmployees(employees.map(emp => 
          emp._id === updatedEmployee._id ? updatedEmployee : emp
        ));
        setEditingEmployee(null);
        setEditForm(null);
      } else {
        throw new Error('Failed to update employee');
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update employee');
    }
  };

  const EmployeeModal = ({ employee, onClose }: { employee: Employee; onClose: () => void }) => {
    if (!employee) return null;
    
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center overflow-y-auto">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 my-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Employee Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Name</p>
              <p className="text-gray-900 text-lg">{`${employee.firstName} ${employee.lastName}`}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Employee ID</p>
              <p className="text-gray-900 text-lg">{employee.employeeId}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Email</p>
              <p className="text-gray-900">{employee.email}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Phone</p>
              <p className="text-gray-900">{employee.phone}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Date of Birth</p>
              <p className="text-gray-900">{new Date(employee.dateOfBirth).toLocaleDateString()}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Gender</p>
              <p className="text-gray-900">{employee.gender}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Joining Date</p>
              <p className="text-gray-900">{new Date(employee.joiningDate).toLocaleDateString()}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-700">Status</p>
              <p className="text-gray-900">{employee.status}</p>
            </div>
            <div className="col-span-2 space-y-2">
              <p className="font-semibold text-gray-700">Address</p>
              <div className="text-gray-900">
                <p>{employee.address.street}</p>
                <p>{`${employee.address.city}, ${employee.address.state} ${employee.address.zipCode}`}</p>
                <p>{employee.address.country}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditModal = ({ employee, onClose, onSave }: { 
    employee: Employee; 
    onClose: () => void;
    onSave: (updatedEmployee: Employee) => void;
  }) => {
    const [form, setForm] = useState(employee);
  
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center overflow-y-auto">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 my-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Employee</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
  
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
          </div>
  
          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded"></div>
        ))}
      </div>
    </div>
  );

  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <button
            onClick={() => router.push('/employees/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Employee
          </button>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-gray-900 placeholder-gray-500 text-sm"
            />
            <svg className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md">
          <div className="overflow-hidden">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">ID</th>
                  <th scope="col" className="w-1/4 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Phone</th>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">KYC</th>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate">
                      {editingEmployee === employee._id ? (
                        <input
                          type="text"
                          value={editForm?.employeeId || ''}
                          onChange={(e) => setEditForm({ ...editForm!, employeeId: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-gray-900"
                        />
                      ) : (
                        employee.employeeId
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 truncate">
                      {editingEmployee === employee._id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editForm?.firstName || ''}
                            onChange={(e) => setEditForm({ ...editForm!, firstName: e.target.value })}
                            className="w-1/2 px-2 py-1 border rounded text-gray-900"
                          />
                          <input
                            type="text"
                            value={editForm?.lastName || ''}
                            onChange={(e) => setEditForm({ ...editForm!, lastName: e.target.value })}
                            className="w-1/2 px-2 py-1 border rounded text-gray-900"
                          />
                        </div>
                      ) : (
                        `${employee.firstName} ${employee.lastName}`
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 truncate">
                      {editingEmployee === employee._id ? (
                        <input
                          type="text"
                          value={editForm?.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm!, phone: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-gray-900"
                        />
                      ) : (
                        employee.phone
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        employee.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.kycVerified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.kycVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(employee._id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(employee._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {isModalOpen && selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEmployee(null);
          }}
        />
      )}
      {editingEmployee && editForm && (
        <EditModal
          employee={editForm}
          onClose={() => {
            setEditingEmployee(null);
            setEditForm(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}