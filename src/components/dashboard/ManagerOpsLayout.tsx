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
  FaIdBadge, // Added for KYC
  FaTshirt, // Added for Uniform Management
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

  const menuItems: MenuItem[] = [
    { label: "Ops Dashboard", icon: <FaTachometerAlt />, href: "/v1/employee/Manager-Ops/dashboard" },
    { label: "Performance Overview", icon: <FaUsers />, href: "/v1/employee/Manager-Ops/team-overview" },
    { label: "Attendance Management", icon: <FaCalendarAlt />, href: "/v1/employee/Manager-Ops/attendance-management" },
    { label: "Leave Management", icon: <FaPlaneDeparture />, href: "/v1/employee/Manager-Ops/leave-management" },
    { label: "Uniform Management", icon: <FaTshirt />, href: "/v1/employee/Manager-Ops/uniform-management/requests" },
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
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 flex flex-col ${
          isSidebarExpanded ? "w-72" : "w-20"
        } ${theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-800"} transition-all duration-300 shadow-lg`}
      >
        {/* Logo and Toggle */}
        <div className={`flex items-center justify-between p-5 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}>
          <div
            className={`flex items-center ${
              isSidebarExpanded ? "justify-start" : "justify-center"
            } w-full`}
          >
            <Image
              src="/v1/employee/logo-exo .png"
              alt="Exozen Logo"
              width={40}
              height={40}
              className="rounded-xl shadow-sm"
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
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className={`flex items-center px-4 py-3 w-full rounded-xl transition-all duration-200 ${
                        isSidebarExpanded ? "justify-start" : "justify-center"
                      } ${theme === "dark" ? "hover:bg-gray-700 hover:text-white" : "hover:bg-gray-200 hover:text-gray-800"}`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {isSidebarExpanded && <span className="ml-3 font-medium">{item.label}</span>}
                      <span
                        className={`ml-auto transition-transform ${
                          expandedSubmenus[item.label] ? "rotate-180" : ""
                        }`}
                      >
                        <FaChevronRight />
                      </span>
                    </button>
                    {expandedSubmenus[item.label] && isSidebarExpanded && (
                      <ul className="pl-6 space-y-2 border-l-2 border-gray-300 dark:border-gray-600">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.label}>
                            {subItem.subItems ? (
                              <details className="group">
                                <summary
                                  className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                    theme === "dark" ? "hover:bg-gray-700 hover:text-white" : "hover:bg-gray-200 hover:text-gray-800"
                                  }`}
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
                                        className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                                          theme === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                                        }`}
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
                                className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                                  theme === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                                }`}
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
                    className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                      isSidebarExpanded ? "justify-start" : "justify-center"
                    } ${theme === "dark" ? "hover:bg-gray-700 hover:text-white" : "hover:bg-gray-200 hover:text-gray-800"}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {isSidebarExpanded && <span className="ml-3 font-medium">{item.label}</span>}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? "ml-72" : "ml-20"
        }`}
      >
        {/* Header */}
        <header
          className={`${
            theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          } border-b shadow-lg sticky top-0 h-[64px] flex items-center px-4 transition-colors duration-200`}
        >
          <div className="flex items-center justify-between w-full">
            {/* Left: Menu Icon & Page Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className={`p-2 rounded-full ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-700"
                    : "text-gray-500 hover:text-blue-700 hover:bg-gray-100"
                } transition-all duration-200`}
                title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                <FaBars className="w-5 h-5" />
              </button>
              <h1
                className={`text-xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Ops Manager Dashboard
              </h1>
            </div>

            {/* Right: Date/Time, Theme Toggle, Notifications, Profile */}
            <div className="flex items-center gap-4">
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

              {/* Date and Time */}
              <div
                className={`font-medium text-sm px-4 py-1.5 rounded-full border ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-200 border-gray-600"
                    : "bg-blue-50 text-blue-700 border-blue-100"
                }`}
              >
                {currentDateTime}
              </div>

              {/* Notifications */}
              <button
                className={`relative p-2 rounded-full ${
                  theme === "dark"
                    ? "text-blue-400 hover:text-blue-300"
                    : "text-blue-600 hover:text-blue-800"
                } transition-all duration-200`}
                title="Notifications"
              >
                <FaBell className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-[11px] font-bold text-white flex items-center justify-center">
                  3
                </span>
              </button>

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
        <main className={`p-4 md:p-8 min-h-screen overflow-y-auto overflow-x-hidden ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ManagerOpsLayout;