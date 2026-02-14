"use client";

import React, { ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import type { JSX } from 'react';
import Image from 'next/image';
import { FaSignOutAlt, FaPlus, FaUser, FaTasks, FaTimes, FaSun, FaMoon, FaEye, FaEyeSlash, FaUserPlus } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { logout, isAuthenticated, getUserRole, getEmployeeId } from '@/services/auth';
import { UserContext } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
// import getConfig from 'next/config';

interface DashboardLayoutProps {
  children: ReactNode;
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
  const [showProjectSelectionModal, setShowProjectSelectionModal] = useState(false);
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  
  // Authentication states for protective routes
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);
  const [isCoordinatorAuthenticated, setIsCoordinatorAuthenticated] = useState(false);
  const [isHRAuthenticated, setIsHRAuthenticated] = useState(false);
  const [isOpsAuthenticated, setIsOpsAuthenticated] = useState(false);
  const [isTaskAuthenticated, setIsTaskAuthenticated] = useState(false);
  
  const { theme, toggleTheme } = useTheme();

  // Top navigation configuration
  const topNav: Array<{ label: string; href?: string; subItems?: Array<{ label: string; href: string }>; }> = useMemo(() => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "KYC", href: "/kyc" },
    { 
      label: "Attendance", 
      href: "/attendance/view",
      subItems: [
        { label: "View Attendance", href: "/attendance/view" },
        { label: "Mark Attendance", href: "/attendance/mark" },
        { label: "Face Enrollment", href: "/attendance/face-enrollment" },
      ]
    },
    //{ label: "Door Attendance", href: "/attendance/door" },
    { label: "Leave Management", href: "/leave-management/history" },
    { label: "Payslip", href: "/payslip" },
    { label: "Reports", href: "/reports/Attendance" },
    { label: "Helpdesk", href: "/helpdesk" },
  ], []);

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

  // Protective route function
  const checkRouteAccess = useCallback((targetPath: string | null): boolean => {
    if (!targetPath) return true;
    
    // Check if trying to access protected routes
    if (targetPath.startsWith('/Manager/') && !isManagerAuthenticated) {
      return false;
    }
    if (targetPath.startsWith('/coordinator/') && !isCoordinatorAuthenticated) {
      return false;
    }
    if (targetPath.startsWith('/hrd/') && !isHRAuthenticated) {
      return false;
    }
    if (targetPath.startsWith('/Manager-Ops/') && !isOpsAuthenticated) {
      return false;
    }
    if (targetPath.startsWith('/task/') && !isTaskAuthenticated) {
      return false;
    }
    
    return true;
  }, [isManagerAuthenticated, isCoordinatorAuthenticated, isHRAuthenticated, isOpsAuthenticated, isTaskAuthenticated]);

  // Intercept navigation attempts
  const handleNavigation = (href: string) => {
    if (!checkRouteAccess(href)) {
      // Show appropriate password modal based on the route
      if (href.startsWith('/Manager/')) {
        setShowManagerPasswordModal(true);
      } else if (href.startsWith('/coordinator/')) {
        setShowCoordinatorPasswordModal(true);
      } else if (href.startsWith('/hrd/')) {
        setShowHRPasswordModal(true);
      } else if (href.startsWith('/Manager-Ops/')) {
        setShowPasswordModal(true);
      } else if (href.startsWith('/task/')) {
        setShowUserTaskPasswordModal(true);
      }
      return;
    }
    
    // If access is granted, navigate
    router.push(href);
  };

  // Update active tab based on current pathname and check route access
  useEffect(() => {
    const currentPath = pathname;
    
    // Check if current path requires authentication
    if (currentPath && !checkRouteAccess(currentPath)) {
      // Redirect to dashboard if trying to access protected route without authentication
      router.replace('/dashboard');
      return;
    }
    
    // Find the matching navigation item
    const findActiveTab = (items: typeof topNav): string => {
      for (const item of items) {
        if (item.href && currentPath === item.href) {
          return item.label;
        }
        if (item.subItems) {
          for (const subItem of item.subItems) {
            if (currentPath === subItem.href) {
              return item.label;
            }
          }
        }
      }
      return "Dashboard"; // Default fallback
    };
    
    const newActiveTab = findActiveTab(topNav);
    setActiveTab(newActiveTab);
  }, [pathname, topNav, router, checkRouteAccess]);

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
  // Clear all authentication states
  setIsManagerAuthenticated(false);
  setIsCoordinatorAuthenticated(false);
  setIsHRAuthenticated(false);
  setIsOpsAuthenticated(false);
  setIsTaskAuthenticated(false);
  
  // Clear sessionStorage authentication flags
  sessionStorage.removeItem('isManagerAuthenticated');
  sessionStorage.removeItem('isCoordinatorAuthenticated');
  sessionStorage.removeItem('isHRAuthenticated');
  sessionStorage.removeItem('isOpsAuthenticated');
  sessionStorage.removeItem('isTaskAuthenticated');
  
  logout(); // your logout function (e.g., clearing tokens or session)
  router.replace('/login'); // navigate to login screen
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
      setIsOpsAuthenticated(true);
      sessionStorage.setItem('isOpsAuthenticated', 'true');
      setShowPasswordModal(false);
      setPassword('');
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
      setIsManagerAuthenticated(true);
      sessionStorage.setItem('isManagerAuthenticated', 'true');
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
      setIsHRAuthenticated(true);
      sessionStorage.setItem('isHRAuthenticated', 'true');
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
      setIsCoordinatorAuthenticated(true);
      sessionStorage.setItem('isCoordinatorAuthenticated', 'true');
      setShowCoordinatorPasswordModal(false);
      setCoordinatorPassword("");
      router.push('/coordinator/dashboard');
    } else {
      setCoordinatorPasswordError(true);
    }
  };

  const handleCreateLink = () => {
    setShowProfileDropdown(false);
    setShowProjectSelectionModal(true);
    setGeneratedLink("");
    setLinkCopied(false);
    // Always fetch projects when opening the modal
    fetchProjects();
  };

  const fetchProjects = async () => {
    setProjectLoading(true);
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/project/projects");
      const data = await response.json();
      const allProjects = Array.isArray(data) ? data : [];
      
      // Show all projects in the dropdown
      setProjectList(allProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjectList([]);
    } finally {
      setProjectLoading(false);
    }
  };

  const handleProjectSelection = () => {
    if (selectedProject) {
      // Generate shareable link with project parameter
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/v1/employee/kyc-standalone?project=${encodeURIComponent(selectedProject)}&frozen=true`;
      setGeneratedLink(link);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const resetModal = () => {
    setShowProjectSelectionModal(false);
    setSelectedProject("");
    setGeneratedLink("");
    setLinkCopied(false);
  };

  return (
    <UserContext.Provider value={userDetails}>
      <div className={`min-h-screen flex flex-col ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"} transition-colors duration-200 overflow-x-hidden`}>
        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {/* Header (no sidebar) */}
        <header className={`${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shadow-lg sticky top-0 left-0 w-screen z-50 h-[64px] flex items-center px-4 transition-colors duration-200`}>
          <div className="flex items-center justify-between w-full">
            {/* Left: Brand & Title */}
            <div className="flex items-center gap-3">
              <Image src="/v1/employee/logo-exo .png" alt="Exozen Logo" width={32} height={32} className="rounded" />
              <h1 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Employee</h1>
            </div>
            {/* Right: Top navigation like Excel tabs */}
            <nav className="hidden md:flex items-end mr-4">
              <div className="flex items-end border-b-2 border-transparent">
                {topNav.map((item) => (
                  <div
                    key={item.label}
                    className="relative group"
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        prefetch={true}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(item.label);
                          handleNavigation(item.href!);
                        }}
                        className={`
                          relative block px-4 py-2 text-sm font-medium whitespace-nowrap
                          transition-all duration-100 ease-out cursor-pointer
                          ${activeTab === item.label 
                            ? theme === "dark"
                              ? "text-white bg-gray-700/30 border-b-2 border-blue-400"
                              : "text-blue-700 bg-blue-50 border-b-2 border-blue-500"
                            : theme === "dark" 
                              ? "text-gray-300 hover:text-white hover:bg-gray-700/50" 
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          }
                          before:absolute before:inset-x-0 before:bottom-0 before:h-0.5 
                          before:bg-blue-500 before:scale-x-0 before:transition-transform 
                          before:duration-100 hover:before:scale-x-100
                          after:absolute after:inset-x-0 after:bottom-0 after:h-0.5
                          after:bg-gradient-to-r after:from-transparent after:via-blue-400 after:to-transparent
                          after:opacity-0 after:transition-opacity after:duration-100 hover:after:opacity-100
                          ${activeTab === item.label ? "before:scale-x-100 after:opacity-100" : ""}
                        `}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={`
                          relative block px-4 py-2 text-sm font-medium whitespace-nowrap cursor-default select-none
                          transition-all duration-100 ease-out
                          ${activeTab === item.label 
                            ? theme === "dark"
                              ? "text-white bg-gray-700/30 border-b-2 border-blue-400"
                              : "text-blue-700 bg-blue-50 border-b-2 border-blue-500"
                            : theme === "dark" 
                              ? "text-gray-300 hover:text-white hover:bg-gray-700/50" 
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          }
                          before:absolute before:inset-x-0 before:bottom-0 before:h-0.5 
                          before:bg-blue-500 before:scale-x-0 before:transition-transform 
                          before:duration-100 hover:before:scale-x-100
                          after:absolute after:inset-x-0 after:bottom-0 after:h-0.5
                          after:bg-gradient-to-r after:from-transparent after:via-blue-400 after:to-transparent
                          after:opacity-0 after:transition-opacity after:duration-100 hover:after:opacity-100
                          ${activeTab === item.label ? "before:scale-x-100 after:opacity-100" : ""}
                        `}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </nav>
            {/* Right: Date/Time, Theme Toggle, Profile */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${theme === 'dark' ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'} transition-all duration-200`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
              </button>
              {/* Date and Time */}
              <div className={`font-medium text-sm px-4 py-1.5 rounded-full border ${theme === "dark" ? "bg-gray-700 text-gray-200 border-gray-600" : "bg-blue-50 text-blue-700 border-blue-100"}`}>{currentDateTime}</div>
              {/* User Profile */}
              <div className="flex items-center relative">
                {loading ? (
                  <div className="animate-pulse flex items-center">
                    <div className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  </div>
                ) : (
                  <div className="relative group flex-shrink-0">
                    <div className="relative cursor-pointer" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                      <Image src={userDetails?.employeeImage || "/placeholder-user.jpg"} alt={userDetails?.fullName || "User"} width={40} height={40} className="relative w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    {showProfileDropdown && (
                      <div className={`${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border py-2 z-50`}>
                        {/* Add Ops-Manager View option if the role is Manager-Ops */}
                        {getUserRole() === 'Manager-Ops' && (
                          <button
                            onClick={() => {
                              if (isOpsAuthenticated) {
                                router.push('/Manager-Ops/dashboard');
                              } else {
                                handleOpsManagerView();
                              }
                            }}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaTasks className="text-blue-500 w-5 h-5" /> Ops-Manager View
                          </button>
                        )}
                        {/* Add Manager option if the role is Manager */}
                        {getUserRole() === 'Manager' && (
                          <button
                            onClick={() => {
                              if (isManagerAuthenticated) {
                                router.push('/Manager/dashboard');
                              } else {
                                handleManagerView();
                              }
                            }}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-green-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaTasks className="text-green-500 w-5 h-5" /> Manager
                          </button>
                        )}
                        {/* Add HR View option if the role is HR */}
                        {getUserRole() === 'HR' && (
                          <button
                            onClick={() => {
                              if (isHRAuthenticated) {
                                router.push('/hrd/dashboard');
                              } else {
                                setShowProfileDropdown(false);
                                setShowHRPasswordModal(true);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-purple-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaTasks className="text-purple-500 w-5 h-5" /> HR View
                          </button>
                        )}
                        {/* Add Coordinator View option if the role is coordinator */}
                        {getUserRole() === 'Coordinator' && (
                          <button
                            onClick={() => {
                              if (isCoordinatorAuthenticated) {
                                router.push('/coordinator/dashboard');
                              } else {
                                handleCoordinatorView();
                              }
                            }}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-orange-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaUser className="text-orange-500 w-5 h-5" /> Coordinator View
                          </button>
                        )}
                        {/* Add + Task option if the role is user */}
                        {getUserRole() === 'User' && (
                          <button
                            onClick={() => {
                              if (isTaskAuthenticated) {
                                router.push('/task/dashboard');
                              } else {
                                setShowProfileDropdown(false);
                                setShowUserTaskPasswordModal(true);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaPlus className="text-blue-500 w-5 h-5" /> + Task
                          </button>
                        )}
                        <button
                          onClick={handleEditProfile}
                          className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                        >
                          <FaUser className="text-blue-500 w-5 h-5" /> Edit Profile
                        </button>
                        {/* Add Create Link option for Manager role */}
                        {getUserRole() === 'Manager' && (
                          <button
                            onClick={handleCreateLink}
                            className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-green-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}
                          >
                            <FaUserPlus className="text-green-500 w-5 h-5" /> Create Link
                          </button>
                        )}
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
              </div>
            </div>
          </div>
        </header>

        {/* Full-width Content Container (edge-to-edge) */}
        <main className={`flex-1 min-h-screen p-0 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
          {children}
        </main>

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
                    if (userTaskPassword === 'Taskexozen@2025!') {
                      setUserTaskPasswordError(false);
                      setIsTaskAuthenticated(true);
                      sessionStorage.setItem('isTaskAuthenticated', 'true');
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
        
        {/* Project Selection Modal for Create Link */}
        {showProjectSelectionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-lg w-full mx-auto shadow-2xl p-8 relative`}>
              <button
                onClick={resetModal}
                className={`absolute top-4 right-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200 rounded-full p-2 hover:bg-gray-100`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Create Shareable KYC Link</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                Select a project to generate a shareable link. The project will be frozen in the KYC form.
              </p>
              
              {!generatedLink ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                      Choose Project
                    </label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-green-500`}
                      disabled={projectLoading}
                    >
                      <option value="">
                        {projectLoading ? "Loading projects..." : projectList.length === 0 ? "No projects available" : "Select a project..."}
                      </option>
                      {projectList.map((project) => (
                        <option key={project._id} value={project.projectName}>
                          {project.projectName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={resetModal}
                      className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-300 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProjectSelection}
                      disabled={!selectedProject}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FaUserPlus className="w-4 h-4" />
                      Generate Link
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-green-200'}`}>
                    <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Generated Link for: {selectedProject}
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500' : 'bg-white text-gray-900 border-gray-300'} focus:outline-none`}
                      />
                      <button
                        onClick={copyToClipboard}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          linkCopied 
                            ? 'bg-green-600 text-white' 
                            : theme === 'dark' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {linkCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Share this link with others. When opened, the KYC form will have the project &quot;{selectedProject}&quot; pre-selected and frozen.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={resetModal}
                      className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-300 font-medium"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedLink("");
                        setSelectedProject("");
                      }}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 font-medium flex items-center justify-center gap-2"
                    >
                      <FaUserPlus className="w-4 h-4" />
                      Create Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </UserContext.Provider>
  );
};

export default DashboardLayout;