import React, { ReactNode, useState, useEffect } from 'react';
import type { JSX } from 'react';
import Image from 'next/image';
import { FaUserFriends, FaBuilding, FaBriefcase, FaFileAlt, FaTachometerAlt, FaSignOutAlt, FaChevronDown, FaChevronRight, FaPlus, FaEye, FaEdit, FaChevronLeft, FaMinus } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout, isAuthenticated, isEmployee, getUserRole } from '@/services/auth';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  icon: JSX.Element;
  label: string;
  href?: string;
  subItems?: MenuItem[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      // Redirect employees away from dashboard
      if (userRole === 'Employee') {
        router.replace('/kyc');
        return;
      }
    };

    checkAuth();
  }, [router]);

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
    
    if (role === 'Employee') {
      return [
        {
          icon: <FaFileAlt />,
          label: 'KYC Verification',
          href: '/kyc'
        },
        // {
        //   icon: <FaUserFriends />,
        //   label: 'Employee Directory',
        //   href: '/employees'
        // }
      ];
    }

    // Admin menu items
    return [
      {
        icon: <FaTachometerAlt />,
        label: 'Dashboard',
        href: '/dashboard'
      },
      {
        icon: <FaFileAlt />,
        label: 'KYC Verification',
        href: '/kyc'
      },
      {
        icon: <FaUserFriends />,
        label: 'Employee Directory',
        href: '/employees'
      },
      {
        icon: <FaBuilding />,
        label: 'Position Management',
        href: '/positionmanagement'
      },
    ];
  };

  const menuItems: MenuItem[] = getMenuItemsByRole();

  const renderMenuItem = (item: MenuItem) => {
    const isExpanded = expandedMenus.includes(item.label);
    
    return (
      <li key={item.label}>
        {item.subItems ? (
          <div className="space-y-1">
            <button
              onClick={() => toggleMenu(item.label)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-gray-100 hover:bg-blue-800 rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center min-w-0">
                <span className="text-xl w-8">{item.icon}</span>
                {isSidebarExpanded && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </div>
              {isSidebarExpanded && (
                <span className="ml-2 flex-shrink-0">
                  {isExpanded ? (
                    <FaMinus className="w-4 h-4" />
                  ) : (
                    <FaPlus className="w-4 h-4" />
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
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
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
            className="w-full flex items-center px-4 py-2.5 text-gray-100 hover:bg-blue-800 rounded-lg transition-colors duration-200"
          >
            <span className="text-xl w-8">{item.icon}</span>
            {isSidebarExpanded && (
              <span className="font-medium truncate">{item.label}</span>
            )}
          </Link>
        )}
      </li>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-20"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 ${
        isSidebarExpanded ? 'w-64' : 'w-16'
      } bg-[#001429] text-white shadow-lg transform transition-all duration-300 ease-in-out
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} z-30`}>
        <div className="flex flex-col h-full">
          {/* Logo and Toggle Button */}
          <div className="flex items-center justify-center p-2 border-b border-blue-900/20">
            {isSidebarExpanded && (
              <div className="flex items-center justify-center w-full">
                <Image 
                  src="/logo-exo .png" 
                  alt="Material Flow" 
                  width={60} 
                  height={40} 
                  className="rounded-full" 
                />
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-blue-800 lg:block hidden"
            >
              {isSidebarExpanded ? (
                <FaChevronLeft className="w-5 h-5" />
              ) : (
                <FaChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-transparent">
            <ul className="space-y-1 p-3">
              {menuItems.map(renderMenuItem)}
            </ul>
          </nav>

        {/* Logout Button */}
<div className="p-3 border-t border-blue-900">
  <button
    onClick={handleLogout}
    className="w-full flex items-center px-4 py-2.5 bg-red-600 text-gray-100 hover:bg-red-700 rounded-lg transition-colors duration-200"
  >
    <span className="text-xl w-8">{<FaSignOutAlt />}</span>
    {isSidebarExpanded && (
      <span className="font-medium truncate">Logout</span>
    )}
  </button>
</div>
  
          </div>

      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? 'ml-64' : 'ml-16'
      } lg:ml-${isSidebarExpanded ? '64' : '16'} p-8`}>
        <div className="bg-white rounded-xl shadow-lg p-6">
          {children}
        </div>
      </main>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed bottom-4 right-4 lg:hidden bg-blue-900 text-white p-3 rounded-full shadow-lg"
      >
        {isMobileMenuOpen ? <FaChevronLeft /> : <FaChevronRight />}
      </button>
    </div>
  );
};

export default DashboardLayout;