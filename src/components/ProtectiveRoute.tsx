"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';

interface ProtectiveRouteProps {
  children: React.ReactNode;
  requiredRole: 'Manager' | 'Coordinator' | 'HR' | 'Ops' | 'Task';
  password: string;
  redirectPath: string;
}

const ProtectiveRoute: React.FC<ProtectiveRouteProps> = ({
  children,
  requiredRole,
  password,
  redirectPath
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuthentication = () => {
      const authKey = `is${requiredRole}Authenticated`;
      const storedAuth = sessionStorage.getItem(authKey);
      
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
        setShowPasswordModal(true);
      }
    };

    checkAuthentication();
  }, [requiredRole]);

  const handlePasswordSubmit = () => {
    if (inputPassword === password) {
      setPasswordError(false);
      setIsAuthenticated(true);
      setShowPasswordModal(false);
      setInputPassword('');
      
      // Store authentication in sessionStorage
      const authKey = `is${requiredRole}Authenticated`;
      sessionStorage.setItem(authKey, 'true');
    } else {
      setPasswordError(true);
    }
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setInputPassword('');
    setPasswordError(false);
    router.push(redirectPath);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show password modal if not authenticated
  if (!isAuthenticated && showPasswordModal) {
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        {/* Password Modal */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative`}>
            <button
              onClick={handleCloseModal}
              className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
            >
              <FaTimes className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                Access Required
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Enter {requiredRole} password to access this area
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder={`Enter ${requiredRole} Password`}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                </button>
              </div>
              
              {passwordError && (
                <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                  Incorrect password. Please try again.
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-300 font-medium"
                >
                  Go Back
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 font-medium"
                >
                  Access
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render children if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Fallback - should not reach here
  return null;
};

export default ProtectiveRoute;
