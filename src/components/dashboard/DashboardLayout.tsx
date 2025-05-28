import React, { ReactNode, useState, useEffect } from 'react';
import type { JSX } from 'react';
import Image from 'next/image';
import { FaUserFriends, FaBuilding, FaFileAlt, FaTachometerAlt, FaSignOutAlt, FaChevronRight, FaPlus, FaChevronLeft, FaMinus, FaUser, FaCalendarAlt, FaMoneyBillWave, FaTasks, FaReceipt, FaHeadset, FaFileContract, FaDoorOpen, FaBell, FaSearch, FaIdCard, FaEnvelope, FaTimes, FaBars, FaCog } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { logout, isAuthenticated, getUserRole } from '@/services/auth';
import { UserContext } from '@/context/UserContext';

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

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
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
        const response = await fetch('https://cafm.zenapi.co.in/api/kyc/EFMS3295');
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
    logout();
    router.replace('/login');
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
    const role = getUserRole();
    
    // Return employee menu items for both Admin and Employee roles
    return [
      {
        icon: <FaTachometerAlt />,
        label: 'Dashboard',
        href: '/dashboard'
      },
      {
        icon: <FaUser />,
        label: 'Know Me',
        href: '/kyc'
      },
      {
        icon: <FaCalendarAlt />,
        label: 'Attendance',
        href: '/attendance'
      },
      {
        icon: <FaFileAlt />,
        label: 'Leave Management',
        href: '/leave-management'
      },
      {
        icon: <FaMoneyBillWave />,
        label: 'Payslip',
        href: '/payslip'
      },
      {
        icon: <FaTasks />,
        label: 'Reports',
        href: '/reports'
      },
      // {
      //   icon: <FaReceipt />,
      //   label: 'Expense Reimbursement',
      //   href: '/expense'
      // },
      // {
      //   icon: <FaHeadset />,
      //   label: 'Helpdesk',
      //   href: '/helpdesk'
      // },
      // {
      //   icon: <FaFileContract />,
      //   label: 'Policy and Document',
      //   href: '/policy'
      // },
      // {
      //   icon: <FaDoorOpen />,
      //   label: 'Resignation',
      //   href: '/resignation'
      // }
    ];
  };

  const menuItems: MenuItem[] = getMenuItemsByRole();

  const renderMenuItem = (item: MenuItem) => {
    const isExpanded = expandedMenus.includes(item.label);
    const isActive = pathname === item.href;
    
    return (
      <li key={item.label}>
        {item.subItems ? (
          <div className="space-y-1">
            <button
              onClick={() => toggleMenu(item.label)}
              className={`w-full flex items-center justify-between px-4 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all duration-200 ${
                isExpanded ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              <div className="flex items-center min-w-0">
                <span className={`text-xl w-8 transition-colors ${isExpanded ? 'text-blue-700' : 'text-gray-500'}`}>{item.icon}</span>
                {isSidebarExpanded && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </div>
              {isSidebarExpanded && (
                <span className="ml-2 flex-shrink-0">
                  {isExpanded ? (
                    <FaMinus className="w-4 h-4 text-blue-700" />
                  ) : (
                    <FaPlus className="w-4 h-4 text-gray-500" />
                  )}
                </span>
              )}
            </button>
            {expandedMenus.includes(item.label) && isSidebarExpanded && (
              <ul className="pl-6 space-y-1 animate-fadeIn">
                {item.subItems.map(subItem => (
                  <li key={subItem.label}>
                    <Link
                      href={subItem.href || '#'}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200"
                    >
                      <span className="text-sm w-8">{subItem.icon}</span>
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
            className={`w-full flex items-center px-4 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all duration-200 ${
              isActive ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span className={`text-xl w-8 transition-colors ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>{item.icon}</span>
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
      // 1. Upload image to your server or a public URL provider
      // For demo, let's assume you get a URL after uploading
      // Replace this with your actual upload logic
      const formData = new FormData();
      formData.append('image', selectedImage);
      // Example: const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      // const { imageUrl } = await uploadRes.json();
      // For now, let's use a placeholder:
      const imageUrl = URL.createObjectURL(selectedImage);

      // 2. Update profile image via API
      const res = await fetch('https://cafm.zenapi.co.in/api/kyc/EFMS3295', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeImage: imageUrl }),
      });
      if (!res.ok) throw new Error('Failed to update profile image');
      // 3. Update UI
      setUserDetails((prev) => prev ? { ...prev, employeeImage: imageUrl } : prev);
      setShowEditProfileModal(false);
      setSelectedImage(null);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <UserContext.Provider value={userDetails}>
      <div className="min-h-screen flex bg-white">
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
            bg-white border-r border-gray-200 shadow-xl
            transition-all duration-300 z-30`}
        >
          {/* Logo and Toggle */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 h-[65px]">
            <div className={`flex items-center ${isSidebarExpanded ? 'justify-start' : 'justify-center'} w-full`}>
              <Image
                src="/logo-exo .png"
                alt="Exozen Logo"
                width={40}
                height={40}
                className="rounded-xl shadow-sm"
              />
              {isSidebarExpanded && (
                <span className="ml-3 font-bold text-gray-800 text-2xl tracking-wide">Exozen</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 ml-auto flex-shrink-0"
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
        </aside>        {/* Main Content with Header */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'ml-72' : 'ml-20'
        }`}>
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200 z-20 sticky top-0 h-[64px] flex items-center">
            <div className="flex items-center justify-between px-4 w-full h-full">
              {/* Left: Menu Icon & Page Title */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={toggleSidebar}
                  className="p-2 text-gray-500 hover:text-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                  <FaBars className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                  {(() => {
                    const current = menuItems.find(item => item.href === pathname);
                    return current ? current.label : '';
                  })()}
                </h1>
              </div>

              {/* Right: Date/Time, Settings, Notifications, Profile */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Date and Time */}
                <div className="bg-blue-50 text-blue-700 font-medium text-sm px-4 py-1.5 rounded-full border border-blue-100 min-w-fit">
                  {currentDateTime}
                </div>
                {/* Settings Icon */}
                <button className="p-2 text-gray-500 hover:text-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <FaCog className="w-5 h-5" />
                </button>
                {/* Notifications */}
                <button className="relative p-2 text-blue-600 hover:text-blue-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <FaBell className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-[11px] font-bold text-white flex items-center justify-center ring-2 ring-white">3</span>
                </button>
                {/* User Profile */}
                <div className="flex items-center relative">
                  {loading ? (
                    <div className="animate-pulse flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                    </div>
                  ) : (
                    <div className="relative group flex-shrink-0">
                      <div className="relative cursor-pointer" onClick={handleProfileImageClick}>
                        <img
                          src={userDetails?.employeeImage || '/placeholder-user.jpg'}
                          alt={userDetails?.fullName || 'User'}
                          className="relative w-10 h-10 rounded-full object-cover border-2 border-white shadow transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      {/* Profile Dropdown */}
                      {showProfileDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 transform transition-all duration-200 origin-top-right">
                          <button
                            onClick={handleEditProfile}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 flex items-center gap-2 rounded-lg text-base"
                          >
                            <FaUser className="text-blue-500 w-5 h-5" /> Edit Profile
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-gray-700 flex items-center gap-2 rounded-lg text-base"
                          >
                            <FaSignOutAlt className="text-red-500 w-5 h-5" /> Logout
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {isSidebarExpanded && !loading && userDetails && (
                    <div className="hidden md:block min-w-0 ml-2">
                      <p className="text-base font-bold text-gray-800 truncate">{userDetails.fullName}</p>
                      <p className="text-sm font-medium text-gray-500 truncate">{userDetails.designation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>          {/* Main Content */}
          <main className="p-4 md:p-8 bg-white min-h-screen overflow-y-auto overflow-x-hidden h-[calc(100vh-64px)]">
            {children}
          </main>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed bottom-6 right-6 lg:hidden bg-white text-blue-600 p-4 rounded-full 
            shadow-lg border border-gray-200 hover:bg-blue-50 transition-all duration-200 z-50"
          title="Toggle menu"
        >
          {isMobileMenuOpen ? <FaTimes className="w-6 h-6"/> : <FaBars className="w-6 h-6"/>}
        </button>

        {/* Edit Profile Modal */}
        {showEditProfileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full mx-auto shadow-2xl p-8 relative">
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-full p-2 hover:bg-gray-100"
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile Image</h2>
              <div className="flex flex-col items-center gap-4">
                <img
                  src={selectedImage ? URL.createObjectURL(selectedImage) : userDetails?.employeeImage || '/placeholder-user.jpg'}
                  alt="Profile Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-md"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="block w-full text-sm text-gray-900 border border-gray-200 rounded-xl cursor-pointer bg-gray-50 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-300"
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
      </div>
    </UserContext.Provider>
  );
};

export default DashboardLayout;