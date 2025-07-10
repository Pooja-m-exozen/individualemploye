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
  
  FaBars,
  FaSignOutAlt,
  FaCalendarAlt, // Added for Attendance
  FaPlaneDeparture, // Added for Leave
  FaClipboardList, // Added for Summary
  FaIdBadge, // Added for KYC
} from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { getEmployeeId, logout } from "@/services/auth";

interface ManagerOpsLayoutProps {
  children: ReactNode; // Ensure children is properly typed
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  href?: string; // Optional for items with subItems
  subItems?: MenuItem[]; // Optional for items with nested submenus
}

const ManagerOpsLayout = ({ children }: ManagerOpsLayoutProps): ReactNode => {
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isSidebarOpenMobile, setSidebarOpenMobile] = useState(false); // NEW: for mobile sidebar
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userDetails, setUserDetails] = useState<{
    fullName: string;
    employeeImage: string;
    designation: string;
  } | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [expandedSubmenus, setExpandedSubmenus] = useState<{ [key: string]: boolean }>({});

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
    if (window.innerWidth < 768) {
      setSidebarOpenMobile((prev) => !prev);
    } else {
      setSidebarExpanded(!isSidebarExpanded);
    }
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

  const menuItems: MenuItem[] = [
    { label: "Ops Dashboard", icon: <FaTachometerAlt />, href: "/v1/employee/Manager-Ops/dashboard" },
    { label: "Performance Overview", icon: <FaUsers />, href: "/v1/employee/Manager-Ops/team-overview" },
    { label: "Attendance Management", icon: <FaCalendarAlt />, href: "/v1/employee/Manager-Ops/attendance-management" },
    { label: "Leave Management", icon: <FaPlaneDeparture />, href: "/v1/employee/Manager-Ops/leave-management" },
    {
      label: "KYC Management",
      icon: <FaIdBadge />,
      subItems: [
        {
          label: "Create KYC",
          href: "/v1/employee/Manager-Ops/kyc-management/create",
          icon: undefined,
        },
        {
          label: "View KYC",
          href: "/v1/employee/Manager-Ops/kyc-management/view",
          icon: undefined,
        },
      ],
    },
    {
      label: "Reports",
      icon: <FaCog />,
      subItems: [
        {
          label: "Attendance",
          icon: <FaCalendarAlt />,
          subItems: [
            {
              label: "Employee-wise",
              href: "/v1/employee/Manager-Ops/reports/attendance/employee-wise",
              icon: undefined,
            },
            {
              label: "Overall",
              href: "/v1/employee/Manager-Ops/reports/attendance/overall",
              icon: undefined,
            },
          ],
        },
        {
          label: "Leave",
          icon: <FaPlaneDeparture />,
          subItems: [
            {
              label: "Employee-wise",
              href: "/v1/employee/Manager-Ops/reports/leave/employee-wise",
              icon: undefined,
            },
            {
              label: "Overall",
              href: "/v1/employee/Manager-Ops/reports/leave/overall",
              icon: undefined,
            },
          ],
        },
        {
          label: "Summary",
          icon: <FaClipboardList />,
          subItems: [
            {
              label: "Employee-wise Summary",
              href: "/v1/employee/Manager-Ops/reports/summary/employee-wise",
              icon: undefined,
            },
            {
              label: "Overall Summary",
              href: "/v1/employee/Manager-Ops/reports/summary/overall",
              icon: undefined,
            },
          ],
        },
      ],
    },
  ];

  return (
    <div className={`min-h-screen flex ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"} transition-colors duration-200`}>
      {/* Sidebar (desktop) */}
      <aside className={`hidden md:flex flex-col fixed left-0 top-0 h-full transition-all duration-300 ${isSidebarExpanded ? 'w-72' : 'w-20'} ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'} border-r shadow-xl z-30`}>
        {/* Logo and Toggle */}
        <div className={`flex items-center justify-between h-14 px-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}>
          <div className={`flex items-center ${isSidebarExpanded ? "justify-start" : "justify-center"} w-full`}>
            <Image
              src="/v1/employee/logo-exo .png"
              alt="Exozen Logo"
              width={isSidebarExpanded ? 40 : 32}
              height={isSidebarExpanded ? 40 : 32}
              className="rounded-xl shadow-sm"
              style={{ minWidth: isSidebarExpanded ? 40 : 32 }}
            />
            {isSidebarExpanded && (
              <span className={`ml-3 font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} text-2xl tracking-wide`}>
                Exozen
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-xl ${theme === "dark" ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-500 hover:bg-gray-200 hover:text-gray-800"} transition-all duration-200 ml-auto flex-shrink-0`}
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarExpanded ? (
              <FaChevronLeft className="w-5 h-5" />
            ) : (
              <FaChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <ul className="p-4 space-y-2">
            {menuItems.map((item) => (
              <li key={item.label}>
                {item.subItems ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className={`flex items-center px-4 py-3 w-full rounded-xl transition-all duration-200 ${isSidebarExpanded ? "justify-start" : "justify-center"} whitespace-nowrap overflow-hidden text-ellipsis ${theme === "dark" ? (expandedSubmenus[item.label] ? "bg-gray-700 text-white" : "hover:bg-gray-700 hover:text-white") : (expandedSubmenus[item.label] ? "bg-blue-50 text-blue-700" : "hover:bg-gray-200 hover:text-gray-800")}`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {isSidebarExpanded && <span className="ml-3 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                      <span className="ml-auto">
                        <FaChevronRight className={`transition-transform ${expandedSubmenus[item.label] ? "rotate-90" : ""}`} />
                      </span>
                    </button>
                    {isSidebarExpanded && expandedSubmenus[item.label] && (
                      <ul className="pl-8 space-y-1">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.label}>
                            {subItem.subItems ? (
                              <details className="group">
                                <summary
                                  className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 ${theme === "dark" ? "hover:bg-gray-700 hover:text-white" : "hover:bg-gray-200 hover:text-gray-800"}`}
                                >
                                  <span className="text-xl">{subItem.icon}</span>
                                  <span className="ml-3 font-medium">{subItem.label}</span>
                                  <span className="ml-auto group-open:rotate-180 transition-transform">
                                    <FaChevronRight />
                                  </span>
                                </summary>
                                <ul className="pl-6 space-y-1 border-l-2 border-gray-300 dark:border-gray-600">
                                  {subItem.subItems.map((nestedSubItem) => (
                                    <li key={nestedSubItem.label} className="ml-4">
                                      <a
                                        href={nestedSubItem.href}
                                        className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${theme === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
                                      >
                                        <FaChevronRight className="mr-2 text-sm" />
                                        {nestedSubItem.label}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : (
                              <a
                                href={subItem.href}
                                className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${theme === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
                              >
                                <FaChevronRight className="mr-2 text-sm" />
                                {subItem.label}
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
                    className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isSidebarExpanded ? "justify-start" : "justify-center"} ${theme === "dark" ? "hover:bg-gray-700 hover:text-white" : "hover:bg-gray-200 hover:text-gray-800"}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {isSidebarExpanded && <span className="ml-3 font-medium">{item.label}</span>}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* Sidebar Profile Section */}
        <div className={`p-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"} flex flex-col items-center gap-2`}>
          <Image
            src={userDetails?.employeeImage || "/placeholder-user.jpg"}
            alt={userDetails?.fullName || "User"}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
          />
          <div className="text-center">
            <div className={`font-semibold text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{userDetails?.fullName || "User"}</div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{userDetails?.designation || ""}</div>
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 w-full justify-center ${theme === "dark" ? "bg-red-700 text-white hover:bg-red-800" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
          >
            <FaSignOutAlt className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar and Overlay */}
      {isSidebarOpenMobile && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpenMobile(false)} />
          <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-56 transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-r shadow-xl md:hidden`}>
            {/* Logo and Close Button */}
            <div className="flex items-center justify-between p-4 border-b h-14">
              <Image src="/v1/employee/logo-exo .png" alt="Exozen Logo" width={32} height={32} className="rounded-xl shadow-sm" />
              <button onClick={() => setSidebarOpenMobile(false)} className="p-2 ml-2 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <FaBars className="w-5 h-5" />
              </button>
            </div>
            {/* Mobile menu: expandable submenus */}
            <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <ul className="p-2 space-y-1">
                {menuItems.map((item) => (
                  <li key={item.label}>
                    {item.subItems ? (
                      <>
                        <button
                          onClick={() => toggleSubmenu(item.label)}
                          className={`flex items-center w-full px-3 py-2 rounded-lg transition-all duration-200 text-base font-medium gap-2 ${theme === 'dark' ? 'text-white hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-200'}`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          {item.label}
                          <FaChevronRight className={`ml-auto transition-transform ${expandedSubmenus[item.label] ? 'rotate-90' : ''}`} />
                        </button>
                        {expandedSubmenus[item.label] && (
                          <ul className="pl-7 py-1 space-y-1">
                            {item.subItems.map((subItem) => (
                              <li key={subItem.label}>
                                <a href={subItem.href} onClick={() => setSidebarOpenMobile(false)} className={`flex items-center px-2 py-2 rounded-lg transition-all duration-200 text-sm gap-2 ${theme === 'dark' ? 'text-white hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-200'}`}>
                                  <FaChevronRight className="text-xs" />
                                  {subItem.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <a href={item.href} onClick={() => setSidebarOpenMobile(false)} className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-base font-medium gap-2 ${theme === 'dark' ? 'text-white hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-200'}`}>
                        <span className="text-lg">{item.icon}</span>
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            {/* Profile (mobile) */}
            <div className="p-3 border-t mt-auto">
              <div className="flex items-center gap-2">
                <div className="relative cursor-pointer" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                  <Image src={userDetails?.employeeImage || '/placeholder-user.jpg'} alt={userDetails?.fullName || 'User'} width={36} height={36} className="w-9 h-9 rounded-full object-cover border-2 border-blue-500 shadow" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} truncate`}>{userDetails?.fullName}</p>
                  <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>{userDetails?.designation}</p>
                </div>
              </div>
              {showProfileDropdown && (
                <div className={`mt-2 w-full ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl shadow-xl border py-2 z-50`}>
                  <button onClick={handleLogout} className={`w-full text-left px-4 py-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-red-50 text-gray-700'} flex items-center gap-2 rounded-lg text-base`}>
                    <FaSignOutAlt className="text-red-500 w-5 h-5" /> Logout
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'md:ml-72' : 'md:ml-20'} ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <header
          className={`h-14 flex items-center px-2 md:px-4 sticky top-0 z-30 border-b shadow-lg transition-colors duration-200 ${
            theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            {/* Left: Menu Icon & Page Title */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={toggleSidebar}
                className={`p-2 rounded-full md:hidden ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-700"
                    : "text-gray-500 hover:text-blue-700 hover:bg-gray-100"
                } transition-all duration-200`}
                title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                <FaBars className="w-5 h-5" />
              </button>
              <h1
                className={`text-lg md:text-xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Ops Manager Dashboard
              </h1>
            </div>

            {/* Right: Date/Time, Theme Toggle, Profile */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${
                  theme === "dark"
                    ? "text-yellow-400 hover:bg-gray-700"
                    : "text-gray-500 hover:bg-gray-100"
                } transition-all duration-200`}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                {theme === "dark" ? (
                  <FaSun className="w-5 h-5" />
                ) : (
                  <FaMoon className="w-5 h-5" />
                )}
              </button>

              {/* Date and Time - reduced width and font size */}
              <div
                className={`font-medium text-xs md:text-sm px-2 md:px-4 py-1.5 rounded-full border max-w-[110px] md:max-w-[180px] truncate text-center ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-200 border-gray-600"
                    : "bg-blue-50 text-blue-700 border-blue-100"
                }`}
                style={{ minWidth: 0 }}
              >
                {currentDateTime}
              </div>

              {/* User Profile */}
              <div className="flex items-center relative">
                <div className="relative cursor-pointer" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                  <Image
                    src={userDetails?.employeeImage || "/placeholder-user.jpg"}
                    alt={userDetails?.fullName || "User"}
                    width={40}
                    height={40}
                    className="relative w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                {showProfileDropdown && (
                  <div
                    className={`absolute right-0 top-full mt-2 w-56 ${
                      theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                    } rounded-xl shadow-xl border py-2 z-50`}
                  >
                    <button
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2 ${
                        theme === "dark" ? "hover:bg-gray-700 text-gray-200" : "hover:bg-red-50 text-gray-700"
                      } flex items-center gap-2 rounded-lg text-base`}
                    >
                      <FaSignOutAlt className="text-red-500 w-5 h-5" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`p-2 md:p-4 min-h-screen overflow-y-auto overflow-x-hidden ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ManagerOpsLayout;