"use client";

import React, { ReactNode, useState, useEffect } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaTachometerAlt,
  FaUsers,
  FaCog,
  FaSun,
  FaMoon,
  FaBell,
  FaBars,
  FaSignOutAlt,
  FaCalendarAlt, // Added for Attendance
  FaPlaneDeparture, // Added for Leave
  FaClipboardList, // Added for Summary
  FaTimes, // Added for mobile close button
} from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { getEmployeeId, logout } from "@/services/auth";

interface AdminLayoutProps {
  children: ReactNode; // Ensure children is properly typed
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  href?: string; // Optional for items with subItems
  subItems?: MenuItem[]; // Optional for items with nested submenus
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
    { label: "Admin Dashboard", icon: <FaTachometerAlt />, href: "/v1/employee/Admin/dashboard" },
    { label: "Performance Overview", icon: <FaUsers />, href: "/v1/employee/Admin/team-overview" },
    { label: "Attendance Management", icon: <FaCalendarAlt />, href: "/v1/employee/Admin/attendance-management" },
    { label: "Leave Management", icon: <FaPlaneDeparture />, href: "/v1/employee/Admin/leave-management" },
  ];

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950" : "bg-gradient-to-br from-blue-50 via-white to-blue-100"} transition-colors duration-200`}>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" 
          onClick={closeMobileSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 flex flex-col z-50
          ${isSidebarExpanded ? "w-64" : "w-16"}
          ${theme === "dark" ? "bg-gradient-to-b from-gray-900 via-blue-950 to-gray-900 text-white" : "bg-gradient-to-b from-white via-blue-100 to-blue-200 text-gray-800"}
          transition-all duration-300 shadow-2xl rounded-tr-3xl rounded-br-3xl border-r-2 border-blue-100 dark:border-blue-900 backdrop-blur-xl
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0 lg:z-30
        `}
        style={{ backdropFilter: 'blur(16px)' }}
      >
        {/* Top: Logo and Toggle */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-2 lg:p-4 border-b border-blue-100 dark:border-blue-900">
            <div className={`flex items-center ${isSidebarExpanded ? "justify-start" : "justify-center"} w-full`}>
              <Image
                src="/v1/employee/logo-exo .png"
                alt="Exozen Logo"
                width={32}
                height={32}
                className="rounded-xl shadow-md lg:w-10 lg:h-10"
              />
              {isSidebarExpanded && (
                <span className={`ml-2 font-extrabold text-base lg:text-xl tracking-wide ${theme === "dark" ? "text-white" : "text-blue-900"}`}>
                  Exozen Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Mobile close button */}
              <button
                onClick={closeMobileSidebar}
                className={`p-1.5 rounded-lg lg:hidden ${theme === "dark" ? "text-gray-400 hover:bg-blue-900 hover:text-white" : "text-blue-600 hover:bg-blue-200 hover:text-blue-900"} transition-all duration-200`}
                title="Close sidebar"
              >
                <FaTimes className="w-3 h-3" />
              </button>
              {/* Desktop toggle button */}
              <button
                onClick={toggleSidebar}
                className={`p-1.5 rounded-lg hidden lg:block ${theme === "dark" ? "text-gray-400 hover:bg-blue-900 hover:text-white" : "text-blue-600 hover:bg-blue-200 hover:text-blue-900"} transition-all duration-200`}
                title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isSidebarExpanded ? <FaChevronLeft className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
              </button>
            </div>
          </div>
          
          {/* Section Title */}
          {isSidebarExpanded && (
            <div className="px-2 lg:px-4 pt-2 lg:pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-blue-400 dark:text-blue-300">
              Management
            </div>
          )}
          
          {/* Navigation - Fixed height, no scroll */}
          <nav className="flex-1 px-2 py-2">
            <ul className="space-y-0.5 lg:space-y-1">
              {menuItems.map((item) => {
                const isActive = typeof window !== 'undefined' && window.location.pathname.startsWith(item.href || '');
                return (
                  <li key={item.label}>
                    {item.subItems ? (
                      <div className="space-y-0.5">
                        <button
                          onClick={() => toggleSubmenu(item.label)}
                          className={`flex items-center w-full px-2 py-2 lg:py-2.5 rounded-lg lg:rounded-xl transition-all duration-200 group relative
                            ${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-100"}
                            ${isActive ? (theme === "dark" ? "bg-blue-900 border-l-4 border-blue-400" : "bg-blue-100 border-l-4 border-blue-600") : ""}
                            ${isSidebarExpanded ? "justify-start" : "justify-center"}`}
                          title={!isSidebarExpanded ? item.label : undefined}
                        >
                          <span className="text-base lg:text-lg">{item.icon}</span>
                          {isSidebarExpanded && <span className="ml-2 font-semibold text-xs lg:text-sm">{item.label}</span>}
                          {isSidebarExpanded && (
                            <span className={`ml-auto transition-transform ${expandedSubmenus[item.label] ? "rotate-90" : ""}`}>
                              <FaChevronRight className="w-3 h-3 lg:w-4 lg:h-4" />
                            </span>
                          )}
                          {!isSidebarExpanded && (
                            <span className="absolute left-full ml-2 bg-blue-700 text-white text-xs rounded px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                              {item.label}
                            </span>
                          )}
                        </button>
                        {expandedSubmenus[item.label] && isSidebarExpanded && (
                          <ul className="pl-4 lg:pl-6 space-y-0.5 border-l-2 border-blue-100 dark:border-blue-900">
                            {item.subItems.map((subItem) => (
                              <li key={subItem.label}>
                                {subItem.subItems ? (
                                  <details className="group">
                                    <summary className={`flex items-center px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-100"}`}>
                                      <span className="text-sm lg:text-base">{subItem.icon}</span>
                                      <span className="ml-2 font-medium text-xs lg:text-sm">{subItem.label}</span>
                                      <span className="ml-auto group-open:rotate-90 transition-transform">
                                        <FaChevronRight className="w-3 h-3 lg:w-4 lg:h-4" />
                                      </span>
                                    </summary>
                                    <ul className="pl-3 lg:pl-4 space-y-0.5 border-l-2 border-blue-100 dark:border-blue-900">
                                      {subItem.subItems.map((nestedSubItem) => (
                                        <li key={nestedSubItem.label} className="ml-1">
                                          <a
                                            href={nestedSubItem.href}
                                            onClick={closeMobileSidebar}
                                            className={`flex items-center px-2 py-1.5 rounded-lg transition-all duration-200 text-xs lg:text-sm ${theme === "dark" ? "text-blue-200 hover:bg-blue-900" : "text-blue-700 hover:bg-blue-100"}`}
                                          >
                                            <FaChevronRight className="mr-1.5 text-xs" />
                                            <span>{nestedSubItem.label}</span>
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                ) : (
                                  <a
                                    href={subItem.href}
                                    onClick={closeMobileSidebar}
                                    className={`flex items-center px-2 py-1.5 rounded-lg transition-all duration-200 text-xs lg:text-sm ${theme === "dark" ? "text-blue-200 hover:bg-blue-900" : "text-blue-700 hover:bg-blue-100"}`}
                                  >
                                    <FaChevronRight className="mr-1.5 text-xs" />
                                    <span>{subItem.label}</span>
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <a
                        href={item.href}
                        onClick={closeMobileSidebar}
                        className={`flex items-center px-2 py-2 lg:py-2.5 rounded-lg lg:rounded-xl transition-all duration-200 group relative
                          ${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-100"}
                          ${isActive ? (theme === "dark" ? "bg-blue-900 border-l-4 border-blue-400" : "bg-blue-100 border-l-4 border-blue-600") : ""}
                          ${isSidebarExpanded ? "justify-start" : "justify-center"}`}
                        title={!isSidebarExpanded ? item.label : undefined}
                      >
                        <span className="text-base lg:text-lg">{item.icon}</span>
                        {isSidebarExpanded && <span className="ml-2 font-semibold text-xs lg:text-sm">{item.label}</span>}
                        {!isSidebarExpanded && (
                          <span className="absolute left-full ml-2 bg-blue-700 text-white text-xs rounded px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {item.label}
                          </span>
                        )}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        
        {/* Sidebar Profile/Footer Section */}
        <div className="p-2 lg:p-3 border-t border-blue-100 dark:border-blue-900 flex flex-col gap-2 lg:gap-3 items-center bg-opacity-80 backdrop-blur-xl">
          {userDetails && (
            <div className="flex flex-col items-center gap-1 mb-1">
              <Image
                src={userDetails.employeeImage || "/placeholder-user.jpg"}
                alt={userDetails.fullName || "Admin User"}
                width={32}
                height={32}
                className="rounded-full border-2 border-blue-200 dark:border-blue-800 shadow lg:w-10 lg:h-10"
              />
              {isSidebarExpanded && (
                <>
                  <div className="font-bold text-xs lg:text-sm text-center truncate max-w-full px-1">
                    {userDetails.fullName || "Admin User"}
                  </div>
                  <div className="text-xs text-blue-400 dark:text-blue-200 text-center truncate max-w-full px-1">
                    {userDetails.designation || "Administrator"}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-2 py-1.5 rounded-lg transition-all duration-200 font-semibold text-xs lg:text-sm
              ${theme === "dark" ? "hover:bg-red-900 text-red-300" : "hover:bg-red-100 text-red-600"}`}
          >
            <FaSignOutAlt className="text-red-500 w-3 h-3 lg:w-4 lg:h-4" />
            {isSidebarExpanded && <span className="ml-2">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarExpanded ? "lg:ml-64" : "lg:ml-16"}`}>
        {/* Header */}
        <header className={`sticky top-0 z-20 h-16 lg:h-[70px] flex items-center px-3 lg:px-8 shadow-xl border-b-2 ${theme === "dark" ? "bg-white/10 backdrop-blur-xl border-blue-900" : "bg-white/60 backdrop-blur-xl border-blue-200"} transition-colors duration-200 rounded-b-2xl`} style={{backdropFilter: 'blur(16px)'}}>
          {/* Left: Hamburger for mobile */}
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen((open) => !open)}
              className={`p-2 rounded-full lg:hidden ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-blue-900" : "text-blue-600 hover:text-blue-900 hover:bg-blue-100"} transition-all duration-200`}
              title="Open sidebar"
            >
              <FaBars className="w-5 h-5" />
            </button>
            <span className={`text-base lg:text-xl font-bold tracking-tight ${theme === "dark" ? "text-white" : "text-blue-900"} truncate`}>
              Admin Dashboard
            </span>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-1 lg:gap-6 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${theme === "dark" ? "text-yellow-400 hover:bg-blue-900" : "text-blue-600 hover:bg-blue-200"} transition-all duration-200`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <FaSun className="w-4 h-4 lg:w-5 lg:h-5" /> : <FaMoon className="w-4 h-4 lg:w-5 lg:h-5" />}
            </button>
            
            {/* Date/Time - Hidden on small mobile */}
            <div className={`font-medium text-xs lg:text-sm px-2 lg:px-4 py-1.5 rounded-full border ${theme === "dark" ? "bg-blue-900 text-blue-200 border-blue-800" : "bg-blue-50 text-blue-700 border-blue-200"} hidden sm:block`}>
              {currentDateTime}
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-semibold text-sm lg:text-base transition-all duration-200 ${theme === "dark" ? "bg-red-900 hover:bg-red-800 text-red-300" : "bg-red-100 hover:bg-red-200 text-red-600"}`}
              title="Logout"
            >
              <FaSignOutAlt className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        
        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-6 ${theme === "dark" ? "bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950" : "bg-gradient-to-br from-blue-50 via-white to-blue-100"}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;