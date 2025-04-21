'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated } from '@/services/auth';
import { FaUser, FaLock } from 'react-icons/fa';
import Image from 'next/image';
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
        setTimeout(() => {
          router.push('/dashboard');
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
    } catch (err: any) {
      console.error('Login error:', err);
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
    <div className="fixed inset-0 flex items-center justify-center bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat">

      <Toaster 
        toastOptions={{
          className: '',
          style: {
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[420px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] p-8 mx-4"
      >
        {/* Logo section */}
        <div className="flex justify-center mb-6">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="h-16 w-16 relative"
          >
            <Image 
              src="/logo-exo .png" 
              alt="Material Flow" 
              width={80} 
              height={80} 
              className="rounded-full shadow-lg" 
              priority
            />
          </motion.div>
        </div>

        <h2 className="text-center text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
            Welcome Back
          </span>
        </h2>
        <p className="text-center text-sm text-gray-500 mb-8">
          Login to your account
        </p>

        <div className="bg-white/50 backdrop-blur-md rounded-xl p-6 shadow-inner">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1">
                  Username
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 transition-colors">
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
                    className={`mt-1 w-full pl-10 pr-3 py-2.5 border ${
                      fieldErrors.username ? 'border-red-500' : 'border-gray-300'
                    } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-gray-900 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:border-indigo-400`}
                    placeholder="Enter your username"
                  />
                </div>
                {fieldErrors.username && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 transition-colors">
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
                    className={`mt-1 w-full pl-10 pr-3 py-2.5 border ${
                      fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                    } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-gray-900 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:border-indigo-400`}
                    placeholder="Enter your password"
                  />
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-3 rounded-xl hover:opacity-90 transition duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : 'Login'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
