"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { FaSignOutAlt } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { getEmployeeId, logout } from "@/services/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ManagerDashboardLayoutProps {
  children: React.ReactNode;
}

const ManagerDashboardLayout = ({ children }: ManagerDashboardLayoutProps) => {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userDetails, setUserDetails] = useState<{ fullName: string; employeeImage: string; designation: string } | null>(null);
  const { theme } = useTheme();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const pathname = usePathname();

  const topNav: Array<{ label: string; href?: string; subItems?: Array<{ label: string; href: string }>; }> = useMemo(() => [
    { label: "Dashboard", href: "/Manager/dashboard" },
    { label: "Project", href: "/Manager/project-management" },
    { label: "Employees", href: "/Manager/employee-management" },
    { label: "KYC", href: "/Manager/kyc-management/requests" }, // No subItems, direct link
    { label: "ID Card", href: "/Manager/id-card-management/generate" },
    { label: "Uniform", href: "/Manager/uniform-management/requests" },
    { label: "Attendance", href: "/Manager/attendance-management/view" },
    { label: "Leave", href: "/Manager/leave-management/view" },
    { label: "Stores", href: "/Manager/stores-management/in-stock" },
    { label: "Payroll", href: "/Manager/payroll-management/view" },
    // Reports removed
  ], []);

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
  }, [topNav]);

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

  // Update active tab based on current pathname
  useEffect(() => {
    const currentPath = pathname;
    
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
  }, [pathname, topNav]);

  const handleLogout = () => { logout(); window.location.href = "/v1/employee/login"; };

  return (
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
            <h1 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Manager</h1>
          </div>
          {/* Right: Top navigation like Excel tabs */}
          <nav className="hidden md:flex items-end mr-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-end border-b-2 border-transparent">
              {topNav.map((item) => (
                <div
                  key={item.label}
                  className="relative group"
                  onMouseEnter={() => item.subItems ? setOpenMenu(item.label) : setOpenMenu(null)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => setActiveTab(item.label)}
                      className={`
                        relative block px-4 py-2 text-sm font-medium whitespace-nowrap
                        transition-all duration-200 ease-in-out
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
                        before:duration-200 hover:before:scale-x-100
                        after:absolute after:inset-x-0 after:bottom-0 after:h-0.5
                        after:bg-gradient-to-r after:from-transparent after:via-blue-400 after:to-transparent
                        after:opacity-0 after:transition-opacity after:duration-200 hover:after:opacity-100
                        ${activeTab === item.label ? "before:scale-x-100 after:opacity-100" : ""}
                      `}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={`
                        relative block px-4 py-2 text-sm font-medium whitespace-nowrap cursor-default select-none
                        transition-all duration-200 ease-in-out
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
                        before:duration-200 hover:before:scale-x-100
                        after:absolute after:inset-x-0 after:bottom-0 after:h-0.5
                        after:bg-gradient-to-r after:from-transparent after:via-blue-400 after:to-transparent
                        after:opacity-0 after:transition-opacity after:duration-200 hover:after:opacity-100
                        ${activeTab === item.label ? "before:scale-x-100 after:opacity-100" : ""}
                      `}
                    >
                      {item.label}
                    </span>
                  )}
                  
                  {/* Excel-style dropdown arrow */}
                  {item.subItems && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-400 group-hover:border-t-blue-500 transition-colors duration-200"></span>
                  )}
                  
                  {item.subItems && openMenu === item.label && (
                    <div className={`
                      absolute top-full left-0 mt-1 min-w-[240px] rounded-lg shadow-xl border z-50
                      ${theme === "dark" 
                        ? "bg-gray-800 border-gray-600 shadow-2xl" 
                        : "bg-white border-gray-200 shadow-lg"
                      }
                      before:absolute before:-top-1 before:left-4 before:w-2 before:h-2 
                      before:bg-inherit before:border-l before:border-t before:border-gray-300 
                      before:transform before:rotate-45 before:z-10
                    `}>
                      <ul className="py-2">
                        {item.subItems.map((sub) => (
                          <li key={sub.label}>
                            <Link
                              href={sub.href}
                              className={`
                                block px-4 py-2.5 text-sm transition-all duration-150 ease-in-out
                                ${theme === "dark" 
                                  ? "text-gray-200 hover:bg-gray-700 hover:text-white" 
                                  : "text-gray-700 hover:bg-blue-50 hover:text-blue-900"
                                }
                                hover:pl-6 hover:shadow-sm
                              `}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                                {sub.label}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </nav>
          {/* Right: Date/Time, Profile */}
          <div className="flex items-center gap-4">
            {/* Date and Time */}
            <div className={`font-medium text-sm px-4 py-1.5 rounded-full border ${theme === "dark" ? "bg-gray-700 text-gray-200 border-gray-600" : "bg-blue-50 text-blue-700 border-blue-100"}`}>{currentDateTime}</div>
            {/* User Profile */}
            <div className="flex items-center relative">
              <div className="relative cursor-pointer" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                <Image src={userDetails?.employeeImage || "/placeholder-user.jpg"} alt={userDetails?.fullName || "User"} width={40} height={40} className="relative w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              {showProfileDropdown && (
                <div className={`${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border py-2 z-50`}>
                  <button onClick={handleLogout} className={`w-full text-left px-4 py-2 ${theme === "dark" ? "hover:bg-gray-700 text-gray-200" : "hover:bg-red-50 text-gray-700"} flex items-center gap-2 rounded-lg text-base`}>
                    <FaSignOutAlt className="text-red-500 w-5 h-5" /> Logout
                  </button>
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
    </div>
  );
};

export default ManagerDashboardLayout;