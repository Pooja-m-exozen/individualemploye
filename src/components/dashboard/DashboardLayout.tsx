"use client";

import React, { ReactNode, useState, useEffect } from 'react';
import type { JSX } from 'react';
import Image from 'next/image';
import {  FaFileAlt, FaTachometerAlt, FaSignOutAlt, FaChevronRight, FaPlus, FaChevronLeft,  FaUser, FaCalendarAlt, FaMoneyBillWave, FaTasks,  FaHeadset,  FaBell,  FaIdCard,  FaTimes, FaBars, FaCog, FaEdit, FaUserCheck, FaCalendarCheck, FaClipboardCheck, FaHistory, FaSun, FaMoon } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { logout, isAuthenticated, getUserRole, getEmployeeId } from '@/services/auth';
import { UserContext } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
// import getConfig from 'next/config';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Add new interfaces
interface RolePrompt {
  show: boolean;
  message: string[];
  type: 'info' | 'success' | 'warning';
}

interface MenuItem {
  icon: JSX.Element;
  label: string;
  href?: string;
  subItems?: MenuItem[];
}

interface UserDetails {
  fullName: string;
  employeeId: string;
  email: string;
  employeeImage: string;
  designation: string;
}

interface RoleOption {
  value: string;
  label: string;
  menuAccess: string[];
}

const DashboardLayout = ({ children }: DashboardLayoutProps): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rolePrompt, setRolePrompt] = useState<RolePrompt>({
    show: false,
    message: [],
    type: 'info'
  });
  const { theme, toggleTheme } = useTheme();
  const [selectedRole, setSelectedRole] = useState<string>('employee');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const roleOptions: RoleOption[] = [
    {
      value: 'employee',
      label: 'Employee',
      menuAccess: ['Dashboard', 'KYC', 'Attendance', 'Leave Management', 'Payslip', 'Reports', 'Helpdesk']
    },
    {
      value: 'manager',
      label: 'Manager',
      menuAccess: ['Dashboard', 'KYC', 'Attendance']
    },
    {
      value: 'admin',
      label: 'Admin',
      menuAccess: ['Dashboard', 'KYC', 'Attendance', 'Leave Management', 'Payslip', 'Reports', 'Helpdesk']
    }
  ];

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.replace('/login');
        return;
      }

      const userRole = getUserRole();
      if (!userRole) {
        logout();
        router.replace('/login');
        return;
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const employeeId = getEmployeeId();
        if (!employeeId) {
          console.error('No employee ID found');
          setLoading(false);
          return;
        }

        const response = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
        const data = await response.json();
        if (data.kycData) {
          setUserDetails({
            fullName: data.kycData.personalDetails.fullName,
            employeeId: data.kycData.personalDetails.employeeId,
            email: data.kycData.personalDetails.email,
            employeeImage: data.kycData.personalDetails.employeeImage,
            designation: data.kycData.personalDetails.designation
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      };
      setCurrentDateTime(now.toLocaleString(undefined, options));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

const handleLogout = () => {
  logout(); // your logout function (e.g., clearing tokens or session)
  router.replace('/login'); // navigate to login screen
};


  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };

  const getMenuItemsByRole = (): MenuItem[] => {
    const currentRole = roleOptions.find(role => role.value === selectedRole);
    const allMenuItems = [
      {
        icon: <FaTachometerAlt />,
        label: 'Dashboard',
        href: '/dashboard'
      },
      {
        icon: <FaUser />,
        label: 'KYC',
        subItems: [
          {
            icon: <FaIdCard />,
            label: 'View KYC',
            href: '/kyc'
          },
          {
            icon: <FaFileAlt />,
            label: 'Upload Documents',
            href: '/kyc/upload'
          },
          {
            icon: <FaEdit />,
            label: 'Edit KYC',
            href: '/kyc/edit'
          }
        ]
      },
      {
        icon: <FaCalendarAlt />,
        label: 'Attendance',
        subItems: [
          {
            icon: <FaUserCheck />,
            label: 'Mark Attendance',
            href: '/attendance/mark'
          },
          {
            icon: <FaCalendarCheck />,
            label: 'View Attendance',
            href: '/attendance/view'
          },
          {
            icon: <FaClipboardCheck />,
            label: 'Regularization',
            href: '/attendance/regularization'
          }
        ]
      },
      {
        icon: <FaFileAlt />,
        label: 'Leave Management',
        subItems: [
          {
            icon: <FaPlus />,
            label: 'Request Leave',
            href: '/leave-management/request'
          },
          {
            icon: <FaHistory />,
            label: 'Leave History',
            href: '/leave-management/history'
          },
          {
            icon: <FaCalendarCheck />,
            label: 'View Leave',
            href: '/leave-management/view'
          }
        ]
      },
      {
        icon: <FaMoneyBillWave />,
        label: 'Payslip',
        href: '/payslip'
      },
      {
        icon: <FaTasks />,
        label: 'Reports',
        subItems: [
          {
            icon: <FaCalendarAlt />,
            label: 'Attendance Report',
            href: '/reports/Attendance'
          },
          {
            icon: <FaFileAlt />,
            label: 'Leave Report',
            href: '/reports/leave'
          }
        ]
      },
      {
        icon: <FaHeadset />,
        label: 'Helpdesk',
        href: '/helpdesk'
      }
    ];
    
    if (!currentRole) return allMenuItems;
    
    return allMenuItems.filter(item => 
      currentRole.menuAccess.includes(item.label)
    );
  };

  const menuItems: MenuItem[] = getMenuItemsByRole();

  const renderMenuItem = (item: MenuItem): JSX.Element => {
    const isExpanded = expandedMenus.includes(item.label);
    const isActive = pathname === item.href;
    
    return (
      <li key={item.label}>
        {item.subItems ? (
          <div className="space-y-1">
            <button
              onClick={() => toggleMenu(item.label)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                theme === 'dark'
                  ? `${isExpanded 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`
                  : `${isExpanded
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`
              }`}
            >
              <div className="flex items-center min-w-0">
                <span className={`text-xl w-8 transition-colors ${
                  theme === 'dark'
                    ? `${isExpanded ? 'text-blue-400' : 'text-gray-400'}`
                    : `${isExpanded ? 'text-blue-700' : 'text-gray-500'}`
                }`}>{item.icon}</span>
                {isSidebarExpanded && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </div>
              {isSidebarExpanded && (
                <span className="ml-2 flex-shrink-0">
                  <FaChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                    isExpanded 
                      ? `transform rotate-90 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}` 
                      : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                </span>
              )}
            </button>
            {expandedMenus.includes(item.label) && isSidebarExpanded && item.subItems && (
              <ul className="pl-6 space-y-1 animate-fadeIn">
                {item.subItems.map(subItem => (
                  <li key={subItem.label}>
                    <Link
                      href={subItem.href || '#'}
                      className={`w-full flex items-center px-4 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                        theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span className={`text-sm w-8 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>{subItem.icon}</span>
                      <span className="font-medium truncate">{subItem.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Link
            href={item.href || '#'}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
              theme === 'dark'
                ? `${isActive 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`
                : `${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`
            }`}
          >
            <span className={`text-xl w-8 transition-colors ${
              theme === 'dark'
                ? `${isActive ? 'text-blue-400' : 'text-gray-400'}`
                : `${isActive ? 'text-blue-700' : 'text-gray-500'}`
            }`}>{item.icon}</span>
            {isSidebarExpanded && (
              <span className="font-medium truncate">{item.label}</span>
            )}
          </Link>
        )}
      </li>
    );
  };

  const handleProfileImageClick = () => {
    setShowProfileDropdown((prev) => !prev);
  };

  const handleEditProfile = () => {
    setShowProfileDropdown(false);
    setShowEditProfileModal(true);
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleProfileImageUpload = async () => {
    if (!selectedImage) return;
    setUploading(true);
    setUploadError(null);
    try {
      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('No employee ID found');
      }

      const formData = new FormData();
      formData.append('image', selectedImage);
      const imageUrl = URL.createObjectURL(selectedImage);

      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeImage: imageUrl }),
      });
      if (!res.ok) throw new Error('Failed to update profile image');
      
      setUserDetails((prev) => prev ? { ...prev, employeeImage: imageUrl } : prev);
      setShowEditProfileModal(false);
      setSelectedImage(null);
    } catch (err: Error | unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRoleChange = (newRole: string) => {
    setPendingRole(newRole);
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordModal(true);
    setShowProfileDropdown(false);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === 'Qwerty123' && pendingRole) {
      setSelectedRole(pendingRole);
      const roleDetails = roleOptions.find(role => role.value === pendingRole);
      if (roleDetails) {
        showRolePrompt(roleDetails.label);
      }
      setShowPasswordModal(false);
      setPendingRole(null);
      setPasswordInput('');
    } else {
      setPasswordError('Invalid password. Please try again.');
    }
  };

  const showRolePrompt = (role: string) => {
    const messages = [
      `Switching to ${role} role`,
      'Enter password to confirm access'
    ];
    
    setRolePrompt({
      show: true,
      message: messages,
      type: 'info'
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setRolePrompt(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const renderRolePrompt = () => {
    if (!rolePrompt.show) return null;

    const bgColor = theme === 'dark' 
      ? 'bg-gray-800 border-gray-700' 
      : 'bg-blue-50 border-blue-100';
    
    const textColor = theme === 'dark'
      ? 'text-white'
      : 'text-blue-700';

    return (
      <div className={`fixed top-20 right-4 z-50 p-4 rounded-xl border ${bgColor} shadow-lg max-w-md animate-fade-in`}>
        <div className="flex flex-col space-y-1">
          {rolePrompt.message.map((msg, idx) => (
            <p key={idx} className={`text-sm ${textColor}`}>{msg}</p>
          ))}
        </div>
        <button 
          onClick={() => setRolePrompt(prev => ({ ...prev, show: false }))}
          className={`absolute top-2 right-2 ${textColor} hover:opacity-75`}
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <UserContext.Provider value={userDetails}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Add the role prompt render */}
        {renderRolePrompt()}
        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm lg:hidden z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar with integrated header */}
        <aside
          className={`fixed inset-y-0 left-0 flex flex-col
            ${isSidebarExpanded ? 'w-72' : 'w-20'}
            ${theme === 'dark' ? 'bg-gray-800/95 backdrop-blur-sm border-gray-700' : 'bg-white/95 backdrop-blur-sm border-gray-200'}
            border-r shadow-lg
            transition-all duration-300 ease-in-out z-30
            hover:shadow-xl`}
          aria-label="Sidebar navigation"
        >
          {/* Logo and Toggle */}
          <div className={`flex items-center justify-between p-5 border-b 
            ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-100'} 
            h-[65px] backdrop-blur-sm`}>
            <div className={`flex items-center ${isSidebarExpanded ? 'justify-start' : 'justify-center'} w-full`}>
              <div className="relative group">
                <Image
                  src="/v1/employee/logo-exo .png"
                  alt="Exozen Logo"
                  width={40}
                  height={40}
                  className="rounded-xl shadow-sm transform transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 rounded-xl bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              {isSidebarExpanded && (
                <span className={`ml-3 font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} text-2xl tracking-wide
                  transition-all duration-300 ease-in-out transform`}>
                  Exozen
                </span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-xl 
                ${theme === 'dark' 
                  ? 'text-gray-400 hover:bg-gray-700/70 hover:text-white' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'} 
                transition-all duration-200 ml-auto flex-shrink-0
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                active:scale-95`}
              title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarExpanded 
                ? <FaChevronLeft className="w-5 h-5 transform transition-transform duration-200 hover:scale-110"/> 
                : <FaChevronRight className="w-5 h-5 transform transition-transform duration-200 hover:scale-110"/>}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <ul className="p-4 space-y-1.5">
              {menuItems.map(renderMenuItem)}
            </ul>
          </nav>
        </aside>

        {/* Main Content with Header */}
        <div className={`flex-1 flex flex-col min-w-0 
          transition-all duration-300 ease-in-out 
          ${isSidebarExpanded ? 'ml-72' : 'ml-20'}`}>
          {/* Header */}
          <header className={`${theme === 'dark' 
            ? 'bg-gray-800/95 border-gray-700' 
            : 'bg-white/95 border-gray-200'} 
            border-b shadow-md z-20 sticky top-0 h-[64px] flex items-center
            transition-colors duration-200 backdrop-blur-sm`}>
            <div className="flex items-center justify-between px-4 w-full h-full">
              {/* Left: Menu Icon & Page Title */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={toggleSidebar}
                  className={`p-2 rounded-lg
                    ${theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/70' 
                      : 'text-gray-500 hover:text-blue-700 hover:bg-gray-100'} 
                    transition-all duration-200 
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    active:scale-95`}
                  title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                  <FaBars className="w-5 h-5" />
                </button>
                <h1 className={`text-xl font-bold 
                  ${theme === 'dark' ? 'text-white' : 'text-gray-900'} 
                  tracking-tight truncate transition-colors duration-200`}>
                  {(() => {
                    const current = menuItems.find(item => item.href === pathname);
                    return current ? current.label : '';
                  })()}
                </h1>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full 
                    ${theme === 'dark' 
                      ? 'text-yellow-400 hover:bg-gray-700/70' 
                      : 'text-gray-500 hover:bg-gray-100'} 
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    active:scale-95`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                >
                  {theme === 'dark' 
                    ? <FaSun className="w-5 h-5 transform hover:rotate-12 transition-transform duration-200" /> 
                    : <FaMoon className="w-5 h-5 transform hover:-rotate-12 transition-transform duration-200" />}
                </button>

                {/* Date and Time */}
                <div className={`${theme === 'dark' 
                  ? 'bg-gray-700/70 text-gray-200 border-gray-600' 
                  : 'bg-blue-50 text-blue-700 border-blue-100'} 
                  font-medium text-sm px-4 py-1.5 rounded-full border 
                  min-w-fit shadow-sm transition-all duration-200`}>
                  {currentDateTime}
                </div>

                {/* Settings Icon */}
                <button className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-blue-700'} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200`}>
                  <FaCog className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <button className={`relative p-2 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200`}>
                  <FaBell className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-[11px] font-bold text-white flex items-center justify-center ring-2 ring-white">3</span>
                </button>

                {/* User Profile */}
                <div className="flex items-center relative">
                  {loading ? (
                    <div className="animate-pulse flex items-center">
                      <div className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </div>
                  ) : (
                    <div className="relative group flex-shrink-0">
                      <div className="relative cursor-pointer" onClick={handleProfileImageClick}>
                        <Image
                          src={userDetails?.employeeImage || '/placeholder-user.jpg'}
                          alt={userDetails?.fullName || 'User'}
                          width={40}
                          height={40}
                          className="relative w-10 h-10 rounded-full object-cover border-2 border-white shadow transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      {/* Profile Dropdown */}
                      {showProfileDropdown && (
                        <div className={`absolute right-0 top-full mt-2 w-72 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl shadow-xl border py-2 z-50 transform transition-all duration-200 origin-top-right`}>
                          {/* User Info Section */}
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <Image
                                src={userDetails?.employeeImage || '/placeholder-user.jpg'}
                                alt={userDetails?.fullName || 'User'}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
                                  {userDetails?.fullName}
                                </p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                  {userDetails?.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Role Selection Section */}
                          <div className="px-4 py-3">
                            <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              Switch Role
                            </label>
                            <div className="relative">
                              <select
                                value={selectedRole}
                                onChange={(e) => handleRoleChange(e.target.value)}
                                className={`w-full px-3 py-2 appearance-none rounded-lg border ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-200 text-gray-900'
                                } pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              >
                                {roleOptions.map(role => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <FaChevronRight className={`w-4 h-4 transform rotate-90 ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`} />
                              </div>
                            </div>
                          </div>

                          <div className={`h-px mx-4 my-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />

                          {/* Actions Section */}
                          <div className="px-2 py-2">
                            <button
                              onClick={handleEditProfile}
                              className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'} flex items-center gap-2 rounded-lg text-sm`}
                            >
                              <FaEdit className="text-blue-500 w-4 h-4" /> Edit Profile
                            </button>
                            <button
                              onClick={handleLogout}
                              className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-red-50 text-gray-700'} flex items-center gap-2 rounded-lg text-sm`}
                            >
                              <FaSignOutAlt className="text-red-500 w-4 h-4" /> Logout
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {isSidebarExpanded && !loading && userDetails && (
                    <div className="hidden md:block min-w-0 ml-2">
                      <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} truncate`}>{userDetails.fullName}</p>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>{userDetails.designation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className={`p-4 md:p-8 min-h-screen overflow-y-auto overflow-x-hidden h-[calc(100vh-64px)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {children}
          </main>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className={`fixed bottom-6 right-6 lg:hidden ${theme === 'dark' ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-white text-blue-600 border-gray-200'} p-4 rounded-full 
            shadow-lg border hover:bg-blue-50 transition-all duration-200 z-50`}
          title="Toggle menu"
        >
          {isMobileMenuOpen ? <FaTimes className="w-6 h-6"/> : <FaBars className="w-6 h-6"/>}
        </button>

        {/* Edit Profile Modal */}
        {showEditProfileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative`}>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Edit Profile Image</h2>
              <div className="flex flex-col items-center gap-4">
                <Image
                  src={selectedImage ? URL.createObjectURL(selectedImage) : userDetails?.employeeImage || '/placeholder-user.jpg'}
                  alt="Profile Preview"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-md"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className={`block w-full text-sm ${theme === 'dark' ? 'text-gray-200 bg-gray-700 border-gray-600' : 'text-gray-900 bg-gray-50 border-gray-200'} border rounded-xl cursor-pointer file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-300`}
                />
                {uploadError && <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{uploadError}</div>}
                <button
                  onClick={handleProfileImageUpload}
                  disabled={!selectedImage || uploading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {uploading ? 'Uploading...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Confirmation Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl max-w-sm w-full mx-auto shadow-xl p-6`}>
              <div className="text-center mb-4">
                <div className={`w-12 h-12 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'} mx-auto flex items-center justify-center mb-3`}>
                  <FaUser className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Confirm Role Change
                </h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Enter password to switch to {pendingRole} role
                </p>
              </div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2`}
                placeholder="Enter your password"
              />
              {passwordError && (
                <p className="text-red-500 text-xs mb-2">{passwordError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserContext.Provider>
  );
};

export default DashboardLayout;