'use client';

import { useEffect, useState } from 'react';
import { 
  FaExclamationCircle, 
  FaClock,
  FaSearch, 
  FaCalendarCheck,
  FaEdit,
} from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { useTheme } from "@/context/ThemeContext";
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { format } from 'date-fns';

// Add TypeScript interfaces
interface Location {
  latitude: number;
  longitude: number;
}

interface AttendanceRecord {
  date: string;
  displayDate: string;
  status: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  punchInUtc: string | null;
  punchOutUtc: string | null;
  punchInLocation?: Location;
  punchOutLocation?: Location;
  punchInPhoto?: string;
  punchOutPhoto?: string;
  isLate: boolean;
  remarks?: string;
  totalHoursWorked: string;
  projectName?: string;
}



function ViewAttendanceContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate] = useState<Date>(new Date());
  const [activities, setActivities] = useState<AttendanceRecord[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<AttendanceRecord | null>(null);
  const [inLocationAddress, setInLocationAddress] = useState<string | null>(null);
  const [outLocationAddress, setOutLocationAddress] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to format time to HH:mm:ss format - same as AttendanceReport.tsx
  const formatTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    // If it's already in HH:mm:ss or HH:mm format
    const timeMatch = dateString.match(/(\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
        return timeMatch[1];
    }
    const timeMatchShort = dateString.match(/(\d{2}:\d{2})/);
    if (timeMatchShort) {
        return timeMatchShort[1];
    }
    // Try parsing as a full date string
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        // If the time is 00:00:00, treat as missing
        const h = date.getHours();
        const m = date.getMinutes();
        const s = date.getSeconds();
        if (h === 0 && m === 0 && s === 0) return '-';
        // Convert to Indian Standard Time (IST = UTC+5:30)
        const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        return istTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          timeZone: 'Asia/Kolkata'
        });
    }
    return '-';
  };

  // Helper function to calculate hours worked
  const calculateHoursWorked = (punchInTime: string | null, punchOutTime: string | null): number => {
    if (!punchInTime || !punchOutTime) return 0;
    
    try {
      const punchIn = new Date(punchInTime);
      const punchOut = new Date(punchOutTime);
      const diffMs = punchOut.getTime() - punchIn.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours;
    } catch {
      return 0;
    }
  };

  // Helper function to format shortage hours
  const formatShortage = (workedHours: number): string => {
    const deficit = Math.max(0, 9 - workedHours);
    const hours = Math.floor(deficit);
    const minutes = Math.round((deficit - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  // Helper function to reverse geocode location
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return 'Invalid coordinates';
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&zoom=18`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EmployeeManagementApp/1.0'
        }
      });

      if (!response.ok) {
        return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        const address = data.address || {};
        const addressParts = [
          address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
          address.suburb || address.neighbourhood,
          address.city || address.town || address.village,
          address.state,
          address.country
        ].filter(Boolean);

        return addressParts.join(', ') || data.display_name;
      }
      
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const employeeId = getEmployeeId();
        const month = selectedDate.getMonth() + 1;
        const year = selectedDate.getFullYear();
        
        const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${month}&year=${year}`);
        const data = await response.json();
        
        if (response.ok && data.attendance) {
  const transformedActivities = data.attendance.map((record: Record<string, unknown>) => {
    const dateValue = record.date as string;
    const dateObj = new Date(dateValue);
    
    return {
      date: format(dateObj, 'yyyy-MM-dd'),
      displayDate: format(dateObj, 'EEE, MMM d, yyyy'),
      status: record.status as string,
      punchInTime: record.punchInTime as string | null,
      punchOutTime: record.punchOutTime as string | null,
      punchInUtc: record.punchInUtc as string | null,
      punchOutUtc: record.punchOutUtc as string | null,
      isLate: (record.isLate as boolean) || false,
      remarks: record.remarks as string | undefined,
      totalHoursWorked: (record.totalHoursWorked as string) || '0',
      punchInLocation: record.punchInLocation as Location | undefined,
      punchOutLocation: record.punchOutLocation as Location | undefined,
      projectName: record.projectName as string | undefined,
    };
  });
  setActivities(transformedActivities);
} else {
  setError('No attendance data found');
  setActivities([]);
}

      } catch (error) {
        console.error('Error fetching attendance:', error);
        setError('Failed to fetch attendance data');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [router, selectedDate]);

  // Fetch location addresses when a record is selected
  useEffect(() => {
    const fetchLocations = async () => {
      if (selectedActivity) {
        try {
          if (selectedActivity.punchInLocation?.latitude && selectedActivity.punchInLocation?.longitude) {
            const inAddress = await reverseGeocode(
              selectedActivity.punchInLocation.latitude,
              selectedActivity.punchInLocation.longitude
            );
            setInLocationAddress(inAddress);
          }

          if (selectedActivity.punchOutLocation?.latitude && selectedActivity.punchOutLocation?.longitude) {
            const outAddress = await reverseGeocode(
              selectedActivity.punchOutLocation.latitude,
              selectedActivity.punchOutLocation.longitude
            );
            setOutLocationAddress(outAddress);
          }
        } catch (error) {
          console.error('Error fetching locations:', error);
          setInLocationAddress('Error fetching location');
          setOutLocationAddress('Error fetching location');
        }
      } else {
        setInLocationAddress(null);
        setOutLocationAddress(null);
      }
    };
    fetchLocations();
  }, [selectedActivity]);

  // Filter activities based on search term
  const filteredActivities = activities.filter(activity => {
    const searchLower = searchTerm.toLowerCase();
    return (
      activity.displayDate.toLowerCase().includes(searchLower) ||
      activity.projectName?.toLowerCase().includes(searchLower) ||
      activity.status.toLowerCase().includes(searchLower) ||
      formatTime(activity.punchInTime).toLowerCase().includes(searchLower) ||
      formatTime(activity.punchOutTime).toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className={`max-w-7xl mx-auto space-y-8 py-8 ${
      theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
    }`}>
      {/* Toolbar Section */}
      <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
            <input
              type="text"
              placeholder="Search attendance records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-gray-200 text-black"
              }`}
              />
            </div>
          <div className="flex gap-2">
                  <button
              onClick={() => router.push('/attendance/mark')}
              className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-blue-700"} flex items-center gap-2`}
              >
              <FaCalendarCheck className="w-4 h-4" />
              Mark Attendance
                  </button>
                  <button
              onClick={() => router.push('/attendance/regularization')}
              className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "bg-white border-blue-200 text-blue-700"} flex items-center gap-2`}
            >
              <FaEdit className="w-4 h-4" />
              Regularization
                  </button>
                </div>
              </div>
                </div>

      {/* Attendance Data Table - Professional Blue Border Style */}
      <div className="overflow-x-auto w-full">
        <table className="min-w-[1400px] text-sm table-auto border-collapse border border-blue-400">
          <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
            <tr>
              <th className={`px-4 py-3 text-left font-bold sticky left-0 z-20 whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`} style={{ width: 60 }}>#</th>
              <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Date</th>
              <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Project</th>
              <th className={`px-4 py-3 text-left font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Status</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Punch In</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Punch Out</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Hours Worked</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Shortage</th>
              <th className={`px-4 py-3 text-center font-bold whitespace-nowrap border border-blue-400 ${theme === "dark" ? "text-white bg-blue-900" : "text-blue-800 bg-blue-50"}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={9} className={`px-4 py-12 text-center border border-blue-400 ${theme === "dark" ? "text-gray-300 bg-gray-800" : "text-gray-600 bg-white"}`}>
                  {activities.length === 0 ? 'No attendance records found' : 'No records match your search'}
                </td>
              </tr>
            ) : filteredActivities.map((activity, idx) => {
              const hoursWorked = calculateHoursWorked(activity.punchInTime, activity.punchOutTime);
              const shortage = hoursWorked > 0 && hoursWorked < 9 ? formatShortage(hoursWorked) : '-';
                
                return (
                <tr key={idx} className={`${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-gray-50"} transition-colors duration-200`}>
                  <td className={`px-4 py-3 text-left font-mono text-sm border border-blue-400 ${theme === "dark" ? "bg-slate-800 text-gray-300" : "bg-white text-gray-600"}`} style={{ width: 60 }}>
                    {idx + 1}
                  </td>
                  <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={activity.displayDate}>
                      {activity.displayDate}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-left border border-blue-400 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5 hover:underline cursor-pointer" title={activity.projectName || 'N/A'}>
                      {activity.projectName || 'N/A'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-left border border-blue-400`}>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      activity.status.toLowerCase() === 'present' ? (theme === "dark" ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800') :
                      activity.status.toLowerCase() === 'absent' ? (theme === "dark" ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800') :
                      activity.status.toLowerCase().includes('holiday') ? (theme === "dark" ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800') :
                      activity.status.toLowerCase().includes('late') ? (theme === "dark" ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800') :
                      (theme === "dark" ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800')
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={formatTime(activity.punchInTime)}>
                      {formatTime(activity.punchInTime)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center border border-blue-400 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={formatTime(activity.punchOutTime)}>
                      {formatTime(activity.punchOutTime)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center border border-blue-400 font-mono ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={hoursWorked > 0 ? `${Math.floor(hoursWorked)}h ${Math.round((hoursWorked % 1) * 60)}m` : '-'}>
                      {hoursWorked > 0 ? `${Math.floor(hoursWorked)}h ${Math.round((hoursWorked % 1) * 60)}m` : '-'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center border border-blue-400 font-mono ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    <span className="block whitespace-pre-wrap break-words leading-5" title={shortage}>
                      {shortage}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center border border-blue-400`}>
                    <button
                      onClick={() => setSelectedActivity(activity)}
                      className={`px-3 py-1 text-xs font-semibold border rounded transition-colors ${
                        theme === "dark" 
                          ? "bg-blue-800 text-white border-blue-400 hover:bg-blue-700" 
                          : "bg-blue-50 text-blue-700 border-blue-400 hover:bg-blue-100"
                      }`}
                    >
                      View
                    </button>
                  </td>
                </tr>
                );
              })}
          </tbody>
        </table>
            </div>
      {/* Error or Loading */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <FaClock className="animate-spin text-blue-500 w-8 h-8 mr-2" />
          <span className="text-gray-600">Loading attendance...</span>
          </div>
      )}
      {error && (
        <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
          <FaExclamationCircle className="text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
            {/* Details Modal */}
            {selectedActivity && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-8 max-w-2xl w-full mx-4 relative animate-fade-in overflow-y-auto max-h-[90vh]`}>
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className={`absolute top-2 right-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-2xl font-bold`}
                    aria-label="Close"
          >
                    &times;
          </button>
                  <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-center`}>
                    Attendance Record Details
                  </h2>
              <div className="space-y-4">
                    <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Date:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {selectedActivity.displayDate}
                      </span>
                    </div>
                    <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Project Name:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {selectedActivity.projectName || 'N/A'}
                      </span>
                </div>
                    <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedActivity.status.toLowerCase() === 'present' ? 'bg-green-100 text-green-800' :
                        selectedActivity.status.toLowerCase() === 'absent' ? 'bg-red-100 text-red-800' :
                        selectedActivity.status.toLowerCase().includes('holiday') ? 'bg-blue-100 text-blue-800' :
                        selectedActivity.status.toLowerCase().includes('late') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedActivity.status}
                      </span>
                    </div>
                    <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch In Time:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {formatTime(selectedActivity.punchInTime)}
                      </span>
                    </div>
                    <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Punch Out Time:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {formatTime(selectedActivity.punchOutTime)}
                      </span>
                    </div>
                    <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Hours Worked:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {(() => {
                          const hoursWorked = calculateHoursWorked(selectedActivity.punchInTime, selectedActivity.punchOutTime);
                          return hoursWorked > 0 ? `${Math.floor(hoursWorked)}h ${Math.round((hoursWorked % 1) * 60)}m` : '-';
                        })()}
                      </span>
                    </div>
                    <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Shortage Hours:</span>
                      <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {(() => {
                          const hoursWorked = calculateHoursWorked(selectedActivity.punchInTime, selectedActivity.punchOutTime);
                          return hoursWorked > 0 && hoursWorked < 9 ? formatShortage(hoursWorked) : '-';
                        })()}
                      </span>
                    </div>

                    {/* Punch In Location Details */}
                    <div className={`flex flex-col border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                        Punch In Details:
                      </span>
                      <div className="ml-4 space-y-2">
                        <div className="flex justify-between">
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Time:</span>
                          <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                            {formatTime(selectedActivity.punchInTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                          <span className={`text-right max-w-[70%] ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                            {selectedActivity.punchInLocation
                              ? (inLocationAddress || 'Fetching location...')
                              : 'Location not available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Punch Out Location Details */}
                    <div className={`flex flex-col border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                        Punch Out Details:
                      </span>
                      <div className="ml-4 space-y-2">
                        <div className="flex justify-between">
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Time:</span>
                          <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                            {formatTime(selectedActivity.punchOutTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                          <span className={`text-right max-w-[70%] ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                            {selectedActivity.punchOutLocation
                              ? (outLocationAddress || 'Fetching location...')
                              : 'Location not available'}
                          </span>
                  </div>
                  </div>
                </div>

                    {selectedActivity.remarks && (
                      <div className={`flex justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Remarks:</span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                          {selectedActivity.remarks}
                        </span>
                  </div>
                )}
                  </div>
                  <div className="mt-6 flex justify-end">
            <button
                      onClick={() => setSelectedActivity(null)}
                      className="px-6 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition font-medium shadow-sm"
            >
              Close
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ViewAttendancePage() {
  return (
    <DashboardLayout>
      <ViewAttendanceContent />
    </DashboardLayout>
  );
}