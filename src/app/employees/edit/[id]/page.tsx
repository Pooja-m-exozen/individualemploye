'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/services/api';
import { getAuthToken } from '@/services/auth';

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  employeeId: string;
}

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [employee, setEmployee] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    designation: '',
    status: '',
    employeeId: ''
  });

  useEffect(() => {
    fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/employees/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
      } else {
        throw new Error('Failed to fetch employee');
      }
    } catch (error) {
      setError('Error fetching employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const token = getAuthToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/employees/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          department: employee.department,
          designation: employee.designation,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/employees'), 1500);
      } else {
        throw new Error('Failed to update employee');
      }
    } catch (error) {
      setError('Failed to update employee');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/employees/${employee.employeeId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setEmployee({ ...employee, status });
        setSuccess(true);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      setError('Failed to update status');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-red-50 text-red-700 p-4 rounded-lg shadow-sm">
        {error}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Edit Employee</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Changes saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
              <input
                type="text"
                value={employee.firstName}
                onChange={(e) => setEmployee({ ...employee, firstName: e.target.value })}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
              <input
                type="text"
                value={employee.lastName}
                onChange={(e) => setEmployee({ ...employee, lastName: e.target.value })}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={employee.email}
              onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Department</label>
              <input
                type="text"
                value={employee.department}
                onChange={(e) => setEmployee({ ...employee, department: e.target.value })}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Designation</label>
              <input
                type="text"
                value={employee.designation}
                onChange={(e) => setEmployee({ ...employee, designation: e.target.value })}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
            <select
              value={employee.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
