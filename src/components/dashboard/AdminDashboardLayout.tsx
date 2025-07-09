"use client";

import React, { ReactNode, useState, useEffect } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaTachometerAlt,
  FaUsers,
  FaSun,
  FaMoon,
  FaBars,
  FaSignOutAlt,
  FaCalendarAlt,
  FaPlaneDeparture,
  FaTimes,
  FaCog,
  FaChartBar,
} from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { getEmployeeId, logout } from "@/services/auth";
import { getAllEmployeesLeaveHistory } from "@/services/leave";

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  href?: string;
  subItems?: MenuItem[];
  badge?: string | number;
}

const AdminLayout = ({ children }: AdminLayoutProps): ReactNode => {
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [userDetails, setUserDetails] = useState<{
    fullName: string;
    employeeImage: string;
    designation: string;
  } | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [expandedSubmenus, setExpandedSubmenus] = useState<{ [key: string]: boolean }>({});
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number>(0);

  // Auto-close mobile sidebar when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setCurrentDateTime(now.toLocaleString(undefined, options));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const employeeId = getEmployeeId();
        if (!employeeId) return;

        const response = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
        const data = await response.json();
        if (data.kycData) {
          setUserDetails({
            fullName: data.kycData.personalDetails.fullName,
            employeeImage: data.kycData.personalDetails.employeeImage,
            designation: data.kycData.personalDetails.designation,
          });
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    fetchUserDetails();
  }, []);

  useEffect(() => {
    setIsClient(true);
    setCurrentPath(window.location.pathname);
  }, []);

  // Fetch pending leave count
  useEffect(() => {
    const fetchPendingLeaveCount = async () => {
      try {
        const allLeaveData = await getAllEmployeesLeaveHistory();
        const allLeaves = allLeaveData.flatMap((emp) =>
          (emp.leaveHistory?.leaveHistory || []).map((leave) => ({
            ...leave,
            employeeName: emp.kyc.personalDetails.fullName,
            employeeId: emp.kyc.personalDetails.employeeId,
            designation: emp.kyc.personalDetails.designation,
            employeeImage: emp.kyc.personalDetails.employeeImage,
          }))
        );
        
        const pendingCount = allLeaves.filter(leave => leave.status === "Pending").length;
        setPendingLeaveCount(pendingCount);
      } catch (error) {
        console.error("Error fetching pending leave count:", error);
        setPendingLeaveCount(0);
      }
    };

    if (isClient) {
      fetchPendingLeaveCount();
    }
  }, [isClient]);

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/v1/employee/login";
  };

  const toggleSubmenu = (label: string) => {
    setExpandedSubmenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const menuItems: MenuItem[] = [
    { 
      label: "Dashboard", 
      icon: <FaTachometerAlt />, 
      href: "/v1/employee/admin/dashboard" 
    },
    { 
      label: "Team Overview", 
      icon: <FaUsers />, 
      href: "/v1/employee/admin/team-overview",
      badge: "New"
    },
    {
      label: "Attendance",
      icon: <FaCalendarAlt />,
      subItems: [
        { label: "View Attendance", icon: <FaCalendarAlt />, href: "/v1/employee/admin/attendance-management" },
        { label: "Regularization", icon: <FaCog />, href: "/v1/employee/admin/attendance-management/regularization" },
        { label: "Hourly Based", icon: <FaCog />, href: "/v1/employee/admin/attendance-management/hourly-based" },
      ],
    },
    { 
      label: "Leave Management", 
      icon: <FaPlaneDeparture />, 
      href: "/v1/employee/admin/leave-management",
      badge: pendingLeaveCount > 0 ? pendingLeaveCount : undefined
    },
    {
      label: "Reports",
      icon: <FaChartBar />,
      subItems: [
        { label: "Project Report", icon: <FaChartBar />, href: "/v1/employee/admin/reports/project" },
        { label: "Employee Report", icon: <FaUsers />, href: "/v1/employee/admin/reports/employee" },
        { label: "Attendance Report", icon: <FaCalendarAlt />, href: "/v1/employee/admin/reports/attendance" },
        { label: "Stock Report", icon: <FaChartBar />, href: "/v1/employee/admin/reports/stock" },
      ],
    },
  ];

  const isActive = (href?: string) => {
    if (!href || !isClient) return false;
    return currentPath.startsWith(href);
  };

  const isSubmenuActive = (subItems?: MenuItem[]) => {
    if (!subItems) return false;
    return subItems.some(item => isActive(item.href));
  };

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#0f172a]" : "bg-gradient-to-br from-slate-50 via-white to-blue-50"} transition-colors duration-300`}>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={closeMobileSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 flex flex-col z-50
          ${isSidebarExpanded ? "w-72" : "w-20"}
          ${theme === "dark" ? "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" : "bg-white text-slate-700"}
          transition-all duration-300 ease-in-out shadow-2xl border-r
          ${theme === "dark" ? "border-slate-700" : "border-slate-200"}
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0 lg:z-30
        `}
      >
        {/* Top: Logo and Toggle */}
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between p-4 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
            <div className={`flex items-center ${isSidebarExpanded ? "justify-start" : "justify-center"} w-full`}>
              <div className="relative">
                <Image
                  src="/v1/employee/logo-exo .png"
                  alt="Exozen Logo"
                  width={40}
                  height={40}
                  className="rounded-xl shadow-lg"
                />
                {!isSidebarExpanded && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              {isSidebarExpanded && (
                <div className="ml-3">
                  <span className={`font-bold text-lg tracking-wide ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                    Exozen
                  </span>
                  <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Admin Panel
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile close button */}
              <button
                onClick={closeMobileSidebar}
                className={`p-2 rounded-lg lg:hidden transition-all duration-200 ${
                  theme === "dark" 
                    ? "text-slate-400 hover:bg-slate-700 hover:text-white" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Close sidebar"
              >
                <FaTimes className="w-4 h-4" />
              </button>
              {/* Desktop toggle button */}
              <button
                onClick={toggleSidebar}
                className={`p-2 rounded-lg hidden lg:block transition-all duration-200 ${
                  theme === "dark" 
                    ? "text-slate-400 hover:bg-slate-700 hover:text-white" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isSidebarExpanded ? <FaChevronLeft className="w-4 h-4" /> : <FaChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-6">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const active = isActive(item.href) || isSubmenuActive(item.subItems);
                const submenuExpanded = expandedSubmenus[item.label];
                
                return (
                  <div key={item.label} className="space-y-1">
                    {item.subItems ? (
                      <button
                        onClick={() => toggleSubmenu(item.label)}
                        className={`group flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium gap-3 relative overflow-hidden ${
                          active 
                            ? theme === "dark"
                              ? "bg-blue-600 text-white shadow-lg"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                            : theme === "dark"
                              ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        } ${isSidebarExpanded ? "justify-start" : "justify-center"}`}
                        title={!isSidebarExpanded ? item.label : undefined}
                      >
                        {/* Active indicator */}
                        {active && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            theme === "dark" ? "bg-white" : "bg-blue-600"
                          }`}></div>
                        )}
                        
                        <span className={`text-lg transition-transform duration-200 ${
                          submenuExpanded ? "rotate-90" : ""
                        }`}>
                          {item.icon}
                        </span>
                        
                        {isSidebarExpanded && (
                          <div className="flex items-center justify-between w-full">
                            <span>{item.label}</span>
                            <div className="flex items-center gap-2">
                              {item.badge && (
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                  typeof item.badge === 'number' && item.badge > 0
                                    ? theme === "dark"
                                      ? "bg-red-500 text-white"
                                      : "bg-red-100 text-red-700"
                                    : theme === "dark"
                                      ? "bg-blue-500 text-white"
                                      : "bg-blue-100 text-blue-700"
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              <FaChevronRight className={`w-3 h-3 transition-transform duration-200 ${
                                submenuExpanded ? "rotate-90" : ""
                              }`} />
                            </div>
                          </div>
                        )}
                      </button>
                    ) : (
                      <a
                        href={item.href}
                        onClick={closeMobileSidebar}
                        className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium gap-3 relative overflow-hidden ${
                          active 
                            ? theme === "dark"
                              ? "bg-blue-600 text-white shadow-lg"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                            : theme === "dark"
                              ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        } ${isSidebarExpanded ? "justify-start" : "justify-center"}`}
                        title={!isSidebarExpanded ? item.label : undefined}
                      >
                        {/* Active indicator */}
                        {active && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            theme === "dark" ? "bg-white" : "bg-blue-600"
                          }`}></div>
                        )}
                        
                        <span className="text-lg">{item.icon}</span>
                        
                        {isSidebarExpanded && (
                          <div className="flex items-center justify-between w-full">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                typeof item.badge === 'number' && item.badge > 0
                                  ? theme === "dark"
                                    ? "bg-red-500 text-white"
                                    : "bg-red-100 text-red-700"
                                  : theme === "dark"
                                    ? "bg-blue-500 text-white"
                                    : "bg-blue-100 text-blue-700"
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </a>
                    )}
                    
                    {/* Submenu */}
                    {item.subItems && submenuExpanded && isSidebarExpanded && (
                      <div className="ml-6 space-y-1 mt-2">
                        {item.subItems.map((subItem) => {
                          const subActive = isActive(subItem.href);
                          return (
                            <a
                              key={subItem.label}
                              href={subItem.href}
                              onClick={closeMobileSidebar}
                              className={`flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium gap-3 relative ${
                                subActive
                                  ? theme === "dark"
                                    ? "bg-slate-700 text-white"
                                    : "bg-slate-100 text-slate-800"
                                  : theme === "dark"
                                    ? "text-slate-400 hover:bg-slate-700 hover:text-white"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                              }`}
                            >
                              {subActive && (
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                  theme === "dark" ? "bg-blue-400" : "bg-blue-500"
                                }`}></div>
                              )}
                              <span className="text-sm">{subItem.icon}</span>
                              <span>{subItem.label}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
        
        {/* Sidebar Profile/Footer Section */}
        <div className={`p-4 border-t ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
          {userDetails && (
            <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${
              theme === "dark" ? "bg-slate-800" : "bg-slate-50"
            }`}>
              <div className="relative">
                <Image
                  src={userDetails.employeeImage || "/placeholder-user.jpg"}
                  alt={userDetails.fullName || "Admin User"}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-blue-200 dark:border-blue-600 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              {isSidebarExpanded && (
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {userDetails.fullName || "Admin User"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {userDetails.designation || "Administrator"}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm gap-3 ${
              theme === "dark"
                ? "text-red-400 hover:bg-red-900/20 hover:text-red-300"
                : "text-red-600 hover:bg-red-50 hover:text-red-700"
            }`}
          >
            <FaSignOutAlt className="w-4 h-4" />
            {isSidebarExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarExpanded ? "lg:ml-72" : "lg:ml-20"}`}>
        {/* Header */}
        <header className={`sticky top-0 z-20 h-16 lg:h-20 flex items-center px-4 lg:px-8 shadow-lg border-b ${
          theme === "dark" 
            ? "bg-slate-900/80 backdrop-blur-xl border-slate-700" 
            : "bg-white/80 backdrop-blur-xl border-slate-200"
        } transition-colors duration-200`}>
          {/* Left: Hamburger for mobile */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen((open) => !open)}
              className={`p-2 rounded-lg lg:hidden transition-all duration-200 ${
                theme === "dark" 
                  ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title="Open sidebar"
            >
              <FaBars className="w-5 h-5" />
            </button>
            <span className={`text-lg lg:text-xl font-bold tracking-tight ${
              theme === "dark" ? "text-white" : "text-slate-800"
            } truncate`}>
              Admin Dashboard
            </span>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2 lg:gap-4 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-200 ${
                theme === "dark" 
                  ? "text-yellow-400 hover:bg-slate-700" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
            </button>
            
            {/* Date/Time */}
            <div className={`font-medium text-sm px-4 py-2 rounded-lg border ${
              theme === "dark" 
                ? "bg-slate-800 text-slate-300 border-slate-600" 
                : "bg-slate-50 text-slate-700 border-slate-200"
            } hidden sm:block`}>
              {currentDateTime}
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                theme === "dark" 
                  ? "bg-red-900/20 hover:bg-red-900/30 text-red-400" 
                  : "bg-red-50 hover:bg-red-100 text-red-600"
              }`}
              title="Logout"
            >
              <FaSignOutAlt className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        
        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" 
            : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;