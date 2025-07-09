"use client";

import React, { ReactNode, useState, useEffect } from 'react';
import type { JSX } from 'react';
import Image from 'next/image';
import {  FaFileAlt, FaTachometerAlt, FaSignOutAlt, FaChevronRight, FaPlus, FaChevronLeft,  FaUser, FaCalendarAlt, FaMoneyBillWave, FaTasks,  FaHeadset,   FaIdCard,  FaTimes, FaBars,  FaEdit, FaUserCheck, FaCalendarCheck, FaClipboardCheck, FaHistory, FaSun, FaMoon, FaChevronDown, FaEye, FaEyeSlash } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { logout, isAuthenticated, getUserRole, getEmployeeId } from '@/services/auth';
import { UserContext } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
// import getConfig from 'next/config';

interface DashboardLayoutProps {
  children: ReactNode;
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showManagerPasswordModal, setShowManagerPasswordModal] = useState(false);
  const [ManagerPassword, setManagerPassword] = useState('');
  const [ManagerPasswordError, setManagerPasswordError] = useState(false);
  const [showHRPasswordModal, setShowHRPasswordModal] = useState(false);
  const [HRPassword, setHRPassword] = useState('');
  const [HRPasswordError, setHRPasswordError] = useState(false);
  const [showCoordinatorPasswordModal, setShowCoordinatorPasswordModal] = useState(false);
  const [coordinatorPassword, setCoordinatorPassword] = useState("");
  const [coordinatorPasswordError, setCoordinatorPasswordError] = useState(false);
  const [showCoordinatorPassword, setShowCoordinatorPassword] = useState(false);
  const [showOpsPassword, setShowOpsPassword] = useState(false);
  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const [showHRPassword, setShowHRPassword] = useState(false);
  const [showUserTaskPasswordModal, setShowUserTaskPasswordModal] = useState(false);
  const [userTaskPassword, setUserTaskPassword] = useState("");
  const [userTaskPasswordError, setUserTaskPasswordError] = useState(false);
  const [showUserTaskPassword, setShowUserTaskPassword] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.replace('/v1/employee/login');
        return;
      }

      const userRole = getUserRole();
      if (!userRole) {
        logout();
        router.replace('/v1/employee/login');
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
  router.replace('/v1/employee/login'); // navigate to login screen
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
    // const role = getUserRole(); // Get the user's role

    const menuItems: MenuItem[] = [
      {
        icon: <FaTachometerAlt />,
        label: 'Dashboard',
        href: '/dashboard',
      },
      {
        icon: <FaUser />,
        label: 'KYC',
        subItems: [
          {
            icon: <FaIdCard />,
            label: 'View KYC',
            href: '/kyc',
          },
          {
            icon: <FaFileAlt />,
            label: 'Upload Documents',
            href: '/kyc/upload',
          },
          {
            icon: <FaEdit />,
            label: 'Edit KYC',
            href: '/kyc/edit',
          },
        ]
      },
      {
        icon: <FaCalendarAlt />,
        label: 'Attendance',
        subItems: [
          {
            icon: <FaUserCheck />,
            label: 'Mark Attendance',
            href: '/attendance/mark',
          },
          {
            icon: <FaCalendarCheck />,
            label: 'View Attendance',
            href: '/attendance/view',
          },
          {
            icon: <FaClipboardCheck />,
            label: 'Regularization',
            href: '/attendance/regularization',
          },
        ]
      },
      {
        icon: <FaFileAlt />,
        label: 'Leave Management',
        subItems: [
          {
            icon: <FaPlus />,
            label: 'Request Leave',
            href: '/leave-management/request',
          },
          {
            icon: <FaHistory />,
            label: 'Leave History',
            href: '/leave-management/history',
          },
          {
            icon: <FaCalendarCheck />,
            label: 'View Leave',
            href: '/leave-management/view',
          },
        ]
      },
      {
        icon: <FaMoneyBillWave />,
        label: 'Payslip',
        href: '/payslip',
      },
      {
        icon: <FaTasks />,
        label: 'Reports',
        subItems: [
          {
            icon: <FaCalendarAlt />,
            label: 'Attendance Report',
            href: '/reports/Attendance',
          },
          {
            icon: <FaFileAlt />,
            label: 'Leave Report',
            href: '/reports/leave',
          },
        ]
      },
      {
        icon: <FaHeadset />,
        label: 'Helpdesk',
        href: '/helpdesk',
      },
    ];


    return menuItems;
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
                  <span className="ml-3 font-medium truncate">{item.label}</span>
                )}
              </div>
              {isSidebarExpanded && (
                <FaChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              )}
            </button>
            {isExpanded && isSidebarExpanded && item.subItems && (
              <ul className="pl-6 space-y-1 animate-fadeIn">
                {item.subItems.map(subItem => (
                  <li key={subItem.label}>
                    <Link
                      href={subItem.href || '#'}
                      className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                        theme === 'dark'
                          ? `${pathname === subItem.href 
                              ? 'bg-gray-700 text-white' 
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`
                          : `${pathname === subItem.href
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`
                      }`}
                    >
                      <span className={`text-xl w-8 transition-colors ${
                        theme === 'dark'
                          ? `${pathname === subItem.href ? 'text-blue-400' : 'text-gray-400'}`
                          : `${pathname === subItem.href ? 'text-blue-700' : 'text-gray-500'}`
                      }`}>{subItem.icon}</span>
                      {isSidebarExpanded && (
                        <span className="ml-3 font-medium truncate">{subItem.label}</span>
                      )}
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
              <span className="ml-3 font-medium truncate">{item.label}</span>
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

  const handleOpsManagerView = () => {
    setShowProfileDropdown(false);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (password === 'Opsexo2025!') {
      setPasswordError(false);
      setShowPasswordModal(false);
      router.push('/Manager-Ops/dashboard');
    } else {
      setPasswordError(true);
    }
  };

  const handleManagerView = () => {
    setShowProfileDropdown(false);
    setShowManagerPasswordModal(true);
  };

  const handleManagerPasswordSubmit = () => {
    if (ManagerPassword === 'Manager@2025exo!') {
      setManagerPasswordError(false);
      setShowManagerPasswordModal(false);
      setManagerPassword('');
      router.push('/Manager/dashboard');
    } else {
      setManagerPasswordError(true);
    }
  };

  const handleHRPasswordSubmit = () => {
    if (HRPassword === 'Hrd@exozen2025!') {
      setHRPasswordError(false);
      setShowHRPasswordModal(false);
      setHRPassword('');
      router.push('/hrd/dashboard');
    } else {
      setHRPasswordError(true);
    }
  };

  const handleCoordinatorView = () => {
    setShowProfileDropdown(false);
    setShowCoordinatorPasswordModal(true);
  };

  const handleCoordinatorPasswordSubmit = () => {
    if (coordinatorPassword === 'coordinator@exozen2025!') {
      setCoordinatorPasswordError(false);
      setShowCoordinatorPasswordModal(false);
      setCoordinatorPassword("");
      router.push('/coordinator/dashboard');
    } else {
      setCoordinatorPasswordError(true);
    }
  };

  return (
    <UserContext.Provider value={userDetails}>
      <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Sidebar (desktop) */}
        <aside className={`hidden lg:flex flex-col fixed inset-y-0 left-0 transition-all duration-300 ${isSidebarExpanded ? 'w-72' : 'w-20'} ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r shadow-xl z-30`}>
          {/* Logo and Toggle */}
          <div className={`flex items-center justify-between p-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} h-[65px]`}>
            <div className={`flex items-center ${isSidebarExpanded ? 'justify-start' : 'justify-center'} w-full`}>
              <Image
                src="/v1/employee/logo-exo .png"
                alt="Exozen Logo"
                width={40}
                height={40}
                className="rounded-xl shadow-sm"
              />
              {isSidebarExpanded && (
                <span className={`ml-3 font-bold text-2xl tracking-wide ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Exozen</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-xl ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'} transition-all duration-200 ml-auto flex-shrink-0`}
              title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarExpanded ? <FaChevronLeft className="w-5 h-5"/> : <FaChevronRight className="w-5 h-5"/>}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <ul className="p-4 space-y-2">
              {menuItems.map(renderMenuItem)}
            </ul>
          </nav>
        </aside>

        {/* Mobile Sidebar and Overlay */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside
              className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r shadow-xl lg:hidden`}
            >
              {/* Logo */}
              <div className={`flex items-center justify-center p-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} h-[65px]`}>
                <Image
                  src="/v1/employee/logo-exo .png"
                  alt="Exozen Logo"
                  width={40}
                  height={40}
                  className="rounded-xl shadow-sm"
                />
              </div>
              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <ul className="p-4 space-y-2">
                  {menuItems.map(renderMenuItem)}
                </ul>
              </nav>
              {/* Profile Dropdown (mobile) */}
              <div className="p-4 border-t mt-auto">
                <div className="flex items-center gap-3">
                  <div className="relative cursor-pointer" onClick={handleProfileImageClick}>
                    <Image
                      src={userDetails?.employeeImage || '/placeholder-user.jpg'}
                      alt={userDetails?.fullName || 'User'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} truncate`}>{userDetails?.fullName}</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>{userDetails?.designation}</p>
                  </div>
                </div>
                {/* Profile Dropdown Menu (show below image on click) */}
                {showProfileDropdown && (
                  <div className={`mt-3 w-full ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl shadow-xl border py-2 z-50`}> 
                    {getUserRole() === 'Manager-Ops' && (
                      <button
                        onClick={handleOpsManagerView}
                        className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                      >
                        <FaTasks className="text-blue-500 w-5 h-5" /> Ops-Manager View
                      </button>
                    )}
                    {getUserRole() === 'Manager' && (
                      <button
                        onClick={handleManagerView}
                        className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-green-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                      >
                        <FaTasks className="text-green-500 w-5 h-5" /> Manager
                      </button>
                    )}
                    <button
                      onClick={handleEditProfile}
                      className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                    >
                      <FaUser className="text-blue-500 w-5 h-5" /> Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-red-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                    >
                      <FaSignOutAlt className="text-red-500 w-5 h-5" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <div className={`flex-1 flex flex-col min-w-0 ${isSidebarExpanded ? 'lg:ml-72' : 'lg:ml-20'} ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {/* Header */}
          <header className={`sticky top-0 z-20 h-16 flex items-center px-4 md:px-8 border-b w-full
            ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`lg:hidden p-2 rounded-md ${
                theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <FaBars className="w-6 h-6" />
            </button>
            {/* Left: Menu Icon & Page Title */}
            <div className="flex items-center gap-3 min-w-0">
              <h1 className={`text-xl font-bold tracking-tight truncate ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>
                {
                  // Find the active menu or submenu label based on pathname
                  (() => {
                    let foundLabel = '';
                    for (const item of menuItems) {
                      if (item.href && item.href === pathname) {
                        foundLabel = item.label;
                        break;
                      }
                      if (item.subItems) {
                        const sub = item.subItems.find(subItem => subItem.href === pathname);
                        if (sub) {
                          foundLabel = sub.label;
                          break;
                        }
                      }
                    }
                    return foundLabel;
                  })()
                }
              </h1>
            </div>
            {/* Right: Date/Time, Settings, Notifications, Profile */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${theme === 'dark' ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'} transition-all duration-200`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
              </button>
              {/* Date and Time */}
              <div className={`${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-blue-50 text-blue-700 border-blue-100'} font-medium text-xs px-2 py-1 rounded-full border min-w-fit max-w-[160px] truncate`}>
                {currentDateTime}
              </div>
              {/* Settings and Notifications icons removed as requested */}
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
                      <div className={`absolute right-0 top-full mt-2 w-56 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl shadow-xl border py-2 z-50 transform transition-all duration-200 origin-top-right`}>
                        {/* Add Ops-Manager View option if the role is Manager-Ops */}
                        {getUserRole() === 'Manager-Ops' && (
                          <button
                            onClick={handleOpsManagerView}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaTasks className="text-blue-500 w-5 h-5" /> Ops-Manager View
                          </button>
                        )}
                        {/* Add Manager option if the role is Manager */}
                        {getUserRole() === 'Manager' && (
                          <button
                            onClick={handleManagerView}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-green-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaTasks className="text-green-500 w-5 h-5" /> Manager
                          </button>
                        )}
                        <button
                          onClick={handleEditProfile}
                          className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                        >
                          <FaUser className="text-blue-500 w-5 h-5" /> Edit Profile
                        </button>
                        <button
                          onClick={handleLogout}
                          className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-red-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                        >
                          <FaSignOutAlt className="text-red-500 w-5 h-5" /> Logout
                        </button>
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
          </header>

          {/* Main Content */}
          <main className={`flex-1 p-0 md:p-0 overflow-y-auto w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {children}
          </main>
        </div>

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

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative`}>
              <button
                onClick={() => setShowPasswordModal(false)}
                className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Enter Password</h2>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type={showOpsPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Ops Manager Password"
                    className={`w-full px-4 py-3 pr-12 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpsPassword(!showOpsPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showOpsPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                    Incorrect password. Please try again.
                  </div>
                )}
                <button
                  onClick={handlePasswordSubmit}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Manager Ops-Manager Password Modal */}
        {showManagerPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative`}>
              <button
                onClick={() => setShowManagerPasswordModal(false)}
                className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Enter Password</h2>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type={showManagerPassword ? 'text' : 'password'}
                    value={ManagerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="Enter Ops-Manager Manager Password"
                    className={`w-full px-4 py-3 pr-12 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowManagerPassword(!showManagerPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showManagerPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                  </button>
                </div>
                {ManagerPasswordError && (
                  <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                    Incorrect password. Please try again.
                  </div>
                )}
                <button
                  onClick={handleManagerPasswordSubmit}
                  className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        {/* HR Password Modal */}
        {showHRPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative`}>
              <button
                onClick={() => setShowHRPasswordModal(false)}
                className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Enter Password</h2>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type={showHRPassword ? 'text' : 'password'}
                    value={HRPassword}
                    onChange={(e) => setHRPassword(e.target.value)}
                    placeholder="Enter HR Password"
                    className={`w-full px-4 py-3 pr-12 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowHRPassword(!showHRPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showHRPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                  </button>
                </div>
                {HRPasswordError && (
                  <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                    Incorrect password. Please try again.
                  </div>
                )}
                <button
                  onClick={handleHRPasswordSubmit}
                  className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Coordinator Password Modal */}
        {showCoordinatorPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative`}>
              <button
                onClick={() => setShowCoordinatorPasswordModal(false)}
                className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Enter Password</h2>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type={showCoordinatorPassword ? 'text' : 'password'}
                    value={coordinatorPassword}
                    onChange={(e) => setCoordinatorPassword(e.target.value)}
                    placeholder="Enter Coordinator Password"
                    className={`w-full px-4 py-3 pr-12 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCoordinatorPassword(!showCoordinatorPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showCoordinatorPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                  </button>
                </div>
                {coordinatorPasswordError && (
                  <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                    Incorrect password. Please try again.
                  </div>
                )}
                <button
                  onClick={handleCoordinatorPasswordSubmit}
                  className="px-8 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        {/* User Task Password Modal */}
        {showUserTaskPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative`}>
              <button
                onClick={() => setShowUserTaskPasswordModal(false)}
                className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Enter Password</h2>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type={showUserTaskPassword ? 'text' : 'password'}
                    value={userTaskPassword}
                    onChange={(e) => setUserTaskPassword(e.target.value)}
                    placeholder="Enter Task Password"
                    className={`w-full px-4 py-3 pr-12 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserTaskPassword(!showUserTaskPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showUserTaskPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                  </button>
                </div>
                {userTaskPasswordError && (
                  <div className="text-red-500 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                    Incorrect password. Please try again.
                  </div>
                )}
                <button
                  onClick={() => {
                    if (userTaskPassword === 'Kycexozen@2025!') {
                      setUserTaskPasswordError(false);
                      setShowUserTaskPasswordModal(false);
                      setUserTaskPassword("");
                      router.push('/task/dashboard');
                    } else {
                      setUserTaskPasswordError(true);
                    }
                  }}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  Submit
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