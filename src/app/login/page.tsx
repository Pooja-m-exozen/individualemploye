'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated, } from '@/services/auth';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaArrowRight, FaSun, FaMoon } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

// Pre-generate fixed positions for the animated shapes
const shapeProps = [
  { width: 143, height: 78, top: 63, left: 43 },
  { width: 79, height: 131, top: 94, left: 36 },
  { width: 61, height: 83, top: 80, left: 46 },
  { width: 110, height: 53, top: 38, left: 15 },
  { width: 105, height: 73, top: 20, left: 60 },
];

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
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
      email: '',
      password: ''
    };

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({ email: '', password: '' });

    // Validate fields before proceeding
    if (!validateFields()) {
      toast.error('Please check the form for errors', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: theme === 'dark' ? '#4B5563' : '#FEE2E2',
          color: theme === 'dark' ? '#F3F4F6' : '#DC2626',
          fontWeight: 500,
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(email, password);

      if (response.success) {
        toast.success('Login successful! Redirecting...', {
          duration: 2000,
          position: 'top-center',
          icon: '👋',
          style: {
            background: theme === 'dark' ? '#065F46' : '#DCFCE7',
            color: theme === 'dark' ? '#D1FAE5' : '#166534',
            fontWeight: 500,
          },
        });
        
        // Navigate to dashboard immediately
        router.push('/dashboard');
      } else {
        toast.error(response.message || 'Login failed. Please check your credentials.', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: theme === 'dark' ? '#4B5563' : '#FEE2E2',
            color: theme === 'dark' ? '#F3F4F6' : '#DC2626',
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
          background: theme === 'dark' ? '#4B5563' : '#FEE2E2',
          color: theme === 'dark' ? '#F3F4F6' : '#DC2626',
          fontWeight: 500,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {/* Theme toggle button - visible on all screens */}
      <motion.button
        type="button"
        onClick={toggleTheme}
        className={`absolute top-4 right-4 z-20 p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-yellow-300' : 'bg-white text-gray-700'} shadow-md`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <FaMoon className="w-5 h-5" /> : <FaSun className="w-5 h-5" />}
      </motion.button>

      {/* Left side - Branding */}
      <div className={`hidden md:flex md:w-1/2 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-600 to-blue-800'} text-white p-8 flex-col justify-between relative overflow-hidden`}>
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <Image 
              src="/exozen_logo.png" 
              alt="Exozen Logo" 
              width={180} 
              height={60} 
              className="mb-8"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-md"
          >
            <h1 className={`text-4xl font-bold mb-6 bg-clip-text text-transparent ${theme === 'dark' ? 'bg-gradient-to-r from-blue-300 to-blue-100' : 'bg-gradient-to-r from-white to-blue-100'}`}>
              Welcome to Zenployee
            </h1>
            <p className="text-xl opacity-90 mb-8">Your complete employee management solution</p>
            
            <div className="space-y-6">
              {[
                { icon: "/file.svg", text: "Streamlined employee onboarding" },
                { icon: "/window.svg", text: "Comprehensive HR management" },
                { icon: "/globe.svg", text: "Secure access from anywhere" }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + (index * 0.2) }}
                  className="flex items-center space-x-3"
                >
                  <div className={`${theme === 'dark' ? 'bg-white/10' : 'bg-white/20'} p-2 rounded-full`}>
                    <Image src={feature.icon} alt="Feature" width={24} height={24} />
                  </div>
                  <p>{feature.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Background decoration */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 1.5 }}
          className="absolute bottom-0 right-0"
        >
          <Image src="/bg.png" alt="Background" width={600} height={600} />
        </motion.div>
        
        {/* Animated shapes - Fixed values to prevent hydration errors */}
        <div className="absolute inset-0 overflow-hidden">
          {shapeProps.map((shape, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-white/10'}`}
              style={{
                width: `${shape.width}px`,
                height: `${shape.height}px`,
                top: `${shape.top}%`,
                left: `${shape.left}%`,
              }}
              initial={{ scale: 0 }}
              animate={{ 
                scale: [0, 1, 1.1, 1],
                opacity: [0, 0.3, 0.2, 0]
              }}
              transition={{
                duration: 10 + (i * 2),
                repeat: Infinity,
                delay: i * 2,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className={`w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 ${theme === 'dark' ? 'bg-gray-800 shadow-lg shadow-black/30' : 'bg-white shadow-lg shadow-gray-200/50'}`}>
        <Toaster 
          toastOptions={{
            className: '',
            style: {
              padding: '16px',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
          }}
        />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-8">
            <Image 
              src="/exozen_logo.png" 
              alt="Exozen Logo" 
              width={150} 
              height={50} 
            />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Sign in to your account</h2>
            <p className={`mt-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Enter your credentials to access the dashboard</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <label htmlFor="email" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-1`}>
                  Email
                </label>
                <div className="relative group">
                  <span className={`absolute inset-y-0 left-0 pl-3 flex items-center transition-colors ${activeField === 'email' ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
                    <FaUser className="w-4 h-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors(prev => ({ ...prev, email: '' }));
                    }}
                    onFocus={() => setActiveField('email')}
                    onBlur={() => setActiveField(null)}
                    required
                    className={`block w-full pl-10 pr-3 py-3.5 border ${fieldErrors.email ? 'border-red-500' : activeField === 'email' ? 'border-blue-500' : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} 
                    rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-400'} 
                    focus:ring-2 ${theme === 'dark' ? 'focus:ring-blue-900 focus:border-blue-500' : 'focus:ring-blue-100 focus:border-blue-600'} 
                    ${theme === 'dark' ? 'hover:border-blue-500' : 'hover:border-blue-400'} transition-all duration-200 shadow-sm`}
                    placeholder="Enter your email"
                  />
                  <AnimatePresence>
                    {fieldErrors.email && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-1.5 text-sm text-red-600 flex items-center"
                      >
                        {fieldErrors.email}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <label htmlFor="password" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-1`}>
                  Password
                </label>
                <div className="relative group">
                  <span className={`absolute inset-y-0 left-0 pl-3 flex items-center transition-colors ${activeField === 'password' ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
                    <FaLock className="w-4 h-4" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors(prev => ({ ...prev, password: '' }));
                    }}
                    onFocus={() => setActiveField('password')}
                    onBlur={() => setActiveField(null)}
                    required
                    className={`block w-full pl-10 pr-10 py-3.5 border ${fieldErrors.password ? 'border-red-500' : activeField === 'password' ? 'border-blue-500' : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} 
                    rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-400'} 
                    focus:ring-2 ${theme === 'dark' ? 'focus:ring-blue-900 focus:border-blue-500' : 'focus:ring-blue-100 focus:border-blue-600'} 
                    ${theme === 'dark' ? 'hover:border-blue-500' : 'hover:border-blue-400'} transition-all duration-200 shadow-sm`}
                    placeholder="Enter your password"
                  />
                  <button 
                    type="button"
                    onClick={togglePasswordVisibility}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-400 hover:text-blue-600'} transition-colors`}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                  <AnimatePresence>
                    {fieldErrors.password && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-1.5 text-sm text-red-600 flex items-center"
                      >
                        {fieldErrors.password}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center group cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : theme === 'dark' ? 'border-gray-500 group-hover:border-blue-400' : 'border-gray-300 group-hover:border-blue-400'}`}>
                    {rememberMe && (
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
                <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300 group-hover:text-gray-100' : 'text-gray-600 group-hover:text-gray-900'} transition-colors`}>Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
              >
                Forgot password?
              </button>
            </motion.div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01, boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)" }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent 
              rounded-lg text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'} 
              focus:outline-none focus:ring-2 
              ${theme === 'dark' ? 'focus:ring-blue-900' : 'focus:ring-blue-100'} disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 shadow-md`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center">
                  Sign in
                  <FaArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </motion.button>
          </form>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className={`mt-8 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
          >
            <p>© {new Date().getFullYear()} Exozen. All rights reserved.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
