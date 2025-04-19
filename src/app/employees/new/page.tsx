'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreateEmployeeDto } from '@/types/employee';
import { BASE_URL } from '@/services/api';
import { getAuthToken } from '@/services/auth';
import { ChevronRightIcon, UserPlusIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function NewEmployeePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateEmployeeDto>();

  const onSubmit = async (data: CreateEmployeeDto) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          router.push('/employees');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create employee');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');


    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-down">
          Employee created successfully! Redirecting...
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/employees" className="text-gray-700 hover:text-indigo-600">
                Employees
              </Link>
            </li>
            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            <li className="text-gray-500">New Employee</li>
          </ol>
        </nav>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-8 py-4">
            <h1 className="text-xl font-semibold text-gray-900">Create New Employee</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-8">
              <div>
                <h2 className="flex items-center text-lg font-medium text-gray-900 mb-6">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                    1
                  </span>
                  <UserPlusIcon className="w-5 h-5 mr-2" />
                  Personal Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
                    <input
                      type="text"
                      {...register('firstName', { required: 'First name is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter first name"
                    />
                    {errors.firstName && <p className="mt-2 text-sm text-red-600 font-medium">{errors.firstName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
                    <input
                      type="text"
                      {...register('lastName', { required: 'Last name is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter last name"
                    />
                    {errors.lastName && <p className="mt-2 text-sm text-red-600 font-medium">{errors.lastName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      {...register('email', { required: 'Email is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="mt-2 text-sm text-red-600 font-medium">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                    <input
                      type="tel"
                      {...register('phone', { required: 'Phone is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      {...register('dateOfBirth', { required: 'Date of birth is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Gender</label>
                    <select
                      {...register('gender', { required: 'Gender is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="flex items-center text-lg font-medium text-gray-900 mb-6">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                    2
                  </span>
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  Address Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Street</label>
                    <input
                      type="text"
                      {...register('address.street', { required: 'Street is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">City</label>
                    <input
                      type="text"
                      {...register('address.city', { required: 'City is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">State</label>
                    <input
                      type="text"
                      {...register('address.state', { required: 'State is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter state"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      {...register('address.zipCode', { required: 'ZIP code is required' })}
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600"
                      placeholder="Enter ZIP code"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Employee...
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
