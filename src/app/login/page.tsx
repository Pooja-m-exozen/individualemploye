'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated } from '@/services/auth';
import { FaUser, FaLock } from 'react-icons/fa';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    password: ''
  });

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  const validateFields = () => {
    const errors = {
      username: '',
      password: ''
    };

    // Username validation
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return !errors.username && !errors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ username: '', password: '' });

    // Validate fields before proceeding
    if (!validateFields()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(username, password);
      console.log('Login response:', response); // Debug log

      if (response.success) {
        router.push('/dashboard');
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10">
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
            🛡️
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold text-gray-800">Welcome Back</h2>
        <p className="text-center text-sm text-gray-500 mb-8">Login to your account</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FaUser />
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors(prev => ({ ...prev, username: '' }));
                }}
                required
                className={`mt-1 w-full pl-10 pr-3 py-2 border ${
                  fieldErrors.username ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900`}
                placeholder="Enter your username"
              />
            </div>
            {fieldErrors.username && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FaLock />
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors(prev => ({ ...prev, password: '' }));
                }}
                required
                className={`mt-1 w-full pl-10 pr-3 py-2 border ${
                  fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900`}
                placeholder="Enter your password"
              />
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <div className="flex justify-end text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer">
            Forgot password?
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition duration-200 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
