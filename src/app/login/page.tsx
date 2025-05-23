'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated, getInitialRoute } from '@/services/auth';
import { FaUser, FaLock } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    setFieldErrors({ username: '', password: '' });

    // Validate fields before proceeding
    if (!validateFields()) {
      toast.error('Please check the form for errors', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#FEE2E2',
          color: '#DC2626',
          fontWeight: 500,
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(username, password);

      if (response.success) {
        toast.success('Login successful! Redirecting...', {
          duration: 2000,
          position: 'top-center',
          icon: '👋',
          style: {
            background: '#DCFCE7',
            color: '#166534',
            fontWeight: 500,
          },
        });
        
        // Use role-based routing
        const initialRoute = getInitialRoute();
        setTimeout(() => {
          router.push(initialRoute);
        }, 1000);
      } else {
        toast.error(response.message || 'Login failed. Please check your credentials.', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#FEE2E2',
            color: '#DC2626',
            fontWeight: 500,
          },
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred. Please try again.', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#FEE2E2',
          color: '#DC2626',
          fontWeight: 500,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50">
      <Toaster 
        toastOptions={{
          className: '',
          style: {
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-white/80 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-3 text-gray-600">Please enter your details to sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 group-hover:text-blue-600 transition-colors">
                  <FaUser className="w-4 h-4" />
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
                  className={`block w-full pl-10 pr-3 py-3 border-2 ${
                    fieldErrors.username ? 'border-red-500' : 'border-gray-200'
                  } rounded-xl text-gray-900 placeholder:text-gray-400 
                  focus:ring-4 focus:ring-blue-100 focus:border-blue-600 
                  hover:border-blue-400 transition-all duration-200`}
                  placeholder="Enter your username"
                />
                {fieldErrors.username && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.username}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 group-hover:text-blue-600 transition-colors">
                  <FaLock className="w-4 h-4" />
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
                  className={`block w-full pl-10 pr-3 py-3 border-2 ${
                    fieldErrors.password ? 'border-red-500' : 'border-gray-200'
                  } rounded-xl text-gray-900 placeholder:text-gray-400 
                  focus:ring-4 focus:ring-blue-100 focus:border-blue-600 
                  hover:border-blue-400 transition-all duration-200`}
                  placeholder="Enter your password"
                />
                {fieldErrors.password && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex justify-center py-3 px-4 border border-transparent 
            rounded-xl text-sm font-semibold text-white bg-blue-600 
            hover:bg-blue-700 focus:outline-none focus:ring-4 
            focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200 shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign in'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
