"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { FaTachometerAlt, FaUsers, FaTasks,  FaSun, FaMoon, FaBars, FaSignOutAlt, FaChevronRight, FaIdCard, FaTshirt, FaCalendarAlt, FaPlaneDeparture, FaStore, FaMoneyBillWave, FaProjectDiagram, FaIdBadge } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { getEmployeeId, logout } from "@/services/auth";
import Link from "next/link";

interface ManagerDashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { label: "Dashboard", icon: <FaTachometerAlt />, href: "/Manager/dashboard" },
  { label: "Project Management", icon: <FaProjectDiagram />, href: "/Manager/project-management" },
  { label: "Employee Management", icon: <FaUsers />, href: "/Manager/employee-management" },
  {
    label: "KYC Management",
    icon: <FaIdBadge />,
    subItems: [
      { label: "Create KYC", href: "/Manager/kyc-management/create" },
      { label: "Requests", href: "/Manager/kyc-management/requests" },
      { label: "View KYC", href: "/Manager/kyc-management/view" },
    ]
  },
  {
    label: "ID Card Management",
    icon: <FaIdCard />,
    subItems: [
      { label: "Generate", href: "/Manager/id-card-management/generate" },
      { label: "View", href: "/Manager/id-card-management/view" },
    ]
  },
  {
    label: "Uniform Management",
    icon: <FaTshirt />,
    subItems: [
      { label: "Requests", href: "/Manager/uniform-management/requests" },
      { label: "View", href: "/Manager/uniform-management/view" },
      { label: "Project Wise Applicable", href: "/Manager/uniform-management/project-wise-applicable" },
    ]
  },
  {
    label: "Attendance Management",
    icon: <FaCalendarAlt />,
    subItems: [
      { label: "View", href: "/Manager/attendance-management/view" },
      { label: "Create Shifts", href: "/Manager/attendance-management/create-shifts" },
      { label: " Attendance Regularization ", href: "/Manager/attendance-management/regularization" },
    
    ]
  },
  {
    label: "Leave Management",
    icon: <FaPlaneDeparture />,
    subItems: [
      { label: "View", href: "/Manager/leave-management/view" },
    ]
  },
  {
    label: "Stores Management",
    icon: <FaStore />,
    subItems: [
      { label: "Requests", href: "/Manager/stores-management/requests" },
      { label: "In Stock", href: "/Manager/stores-management/in-stock" },
      { label: "DC", href: "/Manager/stores-management/dc" },
    ]
  },
  {
    label: "Payroll Management",
    icon: <FaMoneyBillWave />,
    subItems: [
      { label: "Create", href: "/Manager/payroll-management/create" },
      { label: "Update", href: "/Manager/payroll-management/update" },
      { label: "View", href: "/Manager/payroll-management/view" },
    ]
  },
  {
    label: "Reports",
    icon: <FaTasks />,
    subItems: [
      { label: "KYC", href: "/Manager/reports/kyc" },
      { label: "ID Card", href: "/Manager/reports/id-card" },
      { label: "Uniform", href: "/Manager/reports/uniform" },
      { label: "Attendance", href: "/Manager/reports/attendance" },
      { label: "Leave", href: "/Manager/reports/leave" },
      { label: "Stores", href: "/Manager/reports/stores" },
      { label: "Payroll", href: "/Manager/reports/payroll" },
      { label: "Project", href: "/Manager/reports/project" },
      { label: "Employee", href: "/Manager/reports/employee" },
    ]
  },
];

const ManagerDashboardLayout = ({ children }: ManagerDashboardLayoutProps) => {
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userDetails, setUserDetails] = useState<{ fullName: string; employeeImage: string; designation: string } | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short", year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
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

  const toggleSidebar = () => setSidebarExpanded(!isSidebarExpanded);
  const handleLogout = () => { logout(); window.location.href = "/login"; };

  return (
    <div className={`min-h-screen flex ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"} transition-colors duration-200`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 flex flex-col ${isSidebarExpanded ? "w-72" : "w-20"} ${theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-800"} transition-all duration-300 shadow-lg`}>
        {/* Logo and Toggle */}
        <div className={`flex items-center justify-between p-5 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}>
          <div className={`flex items-center ${isSidebarExpanded ? "justify-start" : "justify-center"} w-full`}>
            <Image src="/v1/employee/logo-exo .png" alt="Exozen Logo" width={40} height={40} className="rounded-xl shadow-sm" />
            {isSidebarExpanded && (
              <span className={`ml-3 font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} text-2xl tracking-wide`}>Exozen</span>
            )}
          </div>
          <button onClick={toggleSidebar} className={`p-2 rounded-xl ${theme === "dark" ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-500 hover:bg-gray-200 hover:text-gray-800"} transition-all duration-200 ml-auto flex-shrink-0`} title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}>
            {isSidebarExpanded ? <FaBars className="w-5 h-5" /> : <FaChevronRight className="w-5 h-5" />}
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
                      onClick={() => setOpenSubmenu(openSubmenu === item.label ? null : item.label)}
                      className={`flex items-center px-4 py-3 w-full rounded-xl transition-all duration-200 ${isSidebarExpanded ? "justify-start" : "justify-center"} whitespace-nowrap overflow-hidden text-ellipsis ${theme === "dark" ? (openSubmenu === item.label ? "bg-gray-700 text-white" : "hover:bg-gray-700 hover:text-white") : (openSubmenu === item.label ? "bg-blue-50 text-blue-700" : "hover:bg-gray-200 hover:text-gray-800")}`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {isSidebarExpanded && <span className="ml-3 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                      <span className="ml-auto">
                        <FaChevronRight className={`transition-transform ${openSubmenu === item.label ? "rotate-90" : ""}`} />
                      </span>
                    </button>
                    {isSidebarExpanded && openSubmenu === item.label && (
                      <ul className="pl-8 space-y-1">
                        {item.subItems.map((sub) => (
                          <li key={sub.label}>
                            <Link href={sub.href}>
                              <span className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 text-sm ${theme === "dark" ? "hover:bg-gray-700 hover:text-white" : "hover:bg-gray-200 hover:text-gray-800"}`}>
                                <FaChevronRight className="mr-2 text-xs" />
                                {sub.label}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link href={item.href || "#"}>
                    <span className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isSidebarExpanded ? "justify-start" : "justify-center"} ${theme === "dark" ? "hover:bg-gray-700 hover:text-white" : "hover:bg-gray-200 hover:text-gray-800"}`}>
                      <span className="text-xl">{item.icon}</span>
                      {isSidebarExpanded && <span className="ml-3 font-medium">{item.label}</span>}
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarExpanded ? "ml-72" : "ml-20"}`}>
        {/* Header */}
        <header className={`${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shadow-lg sticky top-0 h-[64px] flex items-center px-4 transition-colors duration-200`}>
          <div className="flex items-center justify-between w-full">
            {/* Left: Menu Icon & Page Title */}
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className={`p-2 rounded-full ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-blue-700 hover:bg-gray-100"} transition-all duration-200`} title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}>
                <FaBars className="w-5 h-5" />
              </button>
              <h1 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Manager Dashboard</h1>
            </div>
            {/* Right: Date/Time, Theme Toggle, Notifications, Profile */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button onClick={toggleTheme} className={`p-2 rounded-full ${theme === "dark" ? "text-yellow-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"} transition-all duration-200`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
                {theme === "dark" ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
              </button>
              {/* Date and Time */}
              <div className={`font-medium text-sm px-4 py-1.5 rounded-full border ${theme === "dark" ? "bg-gray-700 text-gray-200 border-gray-600" : "bg-blue-50 text-blue-700 border-blue-100"}`}>{currentDateTime}</div>
              {/* User Profile */}
              <div className="flex items-center relative">
                <div className="relative cursor-pointer" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                  <Image src={userDetails?.employeeImage || "/placeholder-user.jpg"} alt={userDetails?.fullName || "User"} width={40} height={40} className="relative w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                {showProfileDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-56 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} rounded-xl shadow-xl border py-2 z-50`}>
                    <button onClick={handleLogout} className={`w-full text-left px-4 py-2 ${theme === "dark" ? "hover:bg-gray-700 text-gray-200" : "hover:bg-red-50 text-gray-700"} flex items-center gap-2 rounded-lg text-base`}>
                      <FaSignOutAlt className="text-red-500 w-5 h-5" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className={`p-4 md:p-8 min-h-screen overflow-y-auto overflow-x-hidden ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>{children}</main>
      </div>
    </div>
  );
};

export default ManagerDashboardLayout;