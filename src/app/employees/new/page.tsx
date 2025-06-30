'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/services/api';
import { getAuthToken } from '@/services/auth';

// interface ApiError extends Error {
//   message: string;
// }

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Male',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    employeeId: '',
    department: '',
    designation: '',
    joiningDate: '',
    status: 'Active',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        router.push('/employees');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create employee');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = "mt-1 block w-full px-4 py-3 text-black bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-indigo-300 transition-colors";
  const labelClassName = "block text-sm font-semibold text-gray-800 mb-1";
  const selectClassName = "mt-1 block w-full px-4 py-3 text-black bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-indigo-300 transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
              <p className="text-gray-600 mt-1">Fill in the information below to create a new employee record</p>
            </div>
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClassName}>First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    className={selectClassName}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClassName}>Street Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address.street}
                    onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>City</label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>State</label>
                  <input
                    type="text"
                    required
                    value={formData.address.state}
                    onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>ZIP Code</label>
                  <input
                    type="text"
                    required
                    value={formData.address.zipCode}
                    onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Country</label>
                  <input
                    type="text"
                    required
                    value={formData.address.country}
                    onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Employment Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClassName}>Employee ID</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={e => setFormData({...formData, employeeId: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={e => setFormData({...formData, designation: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Joining Date</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={e => setFormData({...formData, joiningDate: e.target.value})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className={selectClassName}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClassName}>Name</label>
                  <input
                    type="text"
                    required
                    value={formData.emergencyContact.name}
                    onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact, name: e.target.value}})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Relationship</label>
                  <input
                    type="text"
                    required
                    value={formData.emergencyContact.relationship}
                    onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact, relationship: e.target.value}})}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.emergencyContact.phone}
                    onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact, phone: e.target.value}})}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Employee'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
