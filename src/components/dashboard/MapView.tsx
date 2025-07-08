"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import dynamic from "next/dynamic";
import Image from "next/image";
import { FaUsers, FaSpinner, FaEye, FaMapMarkerAlt } from "react-icons/fa";
import { useMap } from "react-leaflet";

// Dynamically import Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
  projectName: string;
}

interface Attendance {
  punchInLatitude: number | null;
  punchInLongitude: number | null;
  punchOutLatitude: number | null;
  punchOutLongitude: number | null;
  punchInPhoto: string | null;
  punchOutPhoto: string | null;
  punchInAddress: string;
  punchOutAddress: string;
  punchInTime: string | null;
  punchOutTime: string | null;
}

interface Cluster {
  center: { lat: number; lon: number };
  count: number;
  employees: ClusterEmployee[];
}

interface ClusterEmployee {
  employeeId: string;
  punchInPhoto?: string;
  designation?: string;
  projectName?: string;
  punchInTime?: string;
}

// Utility: Throttle queue for geocoding
const geocodeQueue: Array<() => void> = [];
let geocodeActive = false;
function processGeocodeQueue() {
  if (geocodeActive || geocodeQueue.length === 0) return;
  geocodeActive = true;
  const fn = geocodeQueue.shift();
  if (fn) fn();
  setTimeout(() => {
    geocodeActive = false;
    processGeocodeQueue();
  }, 1000); // 1 request per second
}

// Utility: Get/set address from localStorage
function getCachedAddress(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const cache = localStorage.getItem('geoAddressCache');
    if (!cache) return null;
    const obj = JSON.parse(cache);
    return obj[key] || null;
  } catch { return null; }
}
function setCachedAddress(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    const cache = localStorage.getItem('geoAddressCache');
    const obj = cache ? JSON.parse(cache) : {};
    obj[key] = value;
    localStorage.setItem('geoAddressCache', JSON.stringify(obj));
  } catch {}
}

// In-memory cache
const memoryGeoCache: Record<string, string> = {};

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat},${lon}`;
  if (memoryGeoCache[key]) return memoryGeoCache[key];
  const local = getCachedAddress(key);
  if (local) {
    memoryGeoCache[key] = local;
    return local;
  }
  // Throttle requests using queue
  return new Promise((resolve) => {
    geocodeQueue.push(async () => {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=AIzaSyCqvcEKoqwRG5PBDIVp-MjHyjXKT3s4KY4`);
        const data = await res.json();
        const address = (data.results && data.results[0]) ? data.results[0].formatted_address : 'No address found';
        memoryGeoCache[key] = address;
        setCachedAddress(key, address);
        resolve(address);
      } catch {
        resolve('No address found');
      }
    });
    processGeocodeQueue();
  });
}

export default function MapView() {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [activeCount, setActiveCount] = useState<number>(0);
  const [totalLocations, setTotalLocations] = useState<number>(0);
  const [locationClusters, setLocationClusters] = useState<Cluster[]>([]);
  const [addressMap, setAddressMap] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCluster, setModalCluster] = useState<Cluster | null>(null);

  // Helper function to remove .000Z from time string
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return 'N/A';
    return timeString.replace('.000Z', '');
  };

  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number): Promise<string> => {
    const cacheKey = `${lat},${lng}`;
    if (addressCache[cacheKey]) {
      return addressCache[cacheKey];
    }
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      console.log('Geocode API response:', data); // Debugging line
      if (data.results && data.results[0]) {
        const address = data.results[0].formatted_address;
        setAddressCache(prev => ({ ...prev, [cacheKey]: address }));
        return address;
      }
      return "No location data available";
    } catch (error) {
      console.error("Error fetching address:", error);
      return "No location data available";
    }
  }, [addressCache]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();
        if (data.kycForms) {
          const allEmployees = data.kycForms
            .map((form: { personalDetails: { employeeId: string; employeeImage: string; fullName: string; designation: string; projectName: string } }) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              projectName: form.personalDetails.projectName,
            }));
          setEmployees(allEmployees);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length === 0) return;
    const fetchAttendanceData = async () => {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const attendancePromises = employees.map(async (employee) => {
        try {
          const response = await fetch(
            `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employee.employeeId}&month=${month}&year=${year}`
          );
          if (!response.ok) {
            if (response.status !== 404) {
              console.error(`Failed to fetch attendance for ${employee.employeeId}: ${response.statusText}`);
            }
            return { employeeId: employee.employeeId, attendance: [] };
          }
          const data = await response.json();
          const currentDayAttendance = data.attendance?.filter(
            (record: Record<string, unknown>) => new Date(record.date as string).getDate() === day
          );
          const attendanceWithAddresses = await Promise.all(
            (currentDayAttendance || []).map(async (record: Attendance) => {
              let punchInAddress = "Address not found";
              let punchOutAddress = "Address not found";
              if (record.punchInLatitude && record.punchInLongitude) {
                punchInAddress = await getAddressFromCoordinates(
                  Number(record.punchInLatitude),
                  Number(record.punchInLongitude)
                );
              }
              if (record.punchOutLatitude && record.punchOutLongitude) {
                punchOutAddress = await getAddressFromCoordinates(
                  Number(record.punchOutLatitude),
                  Number(record.punchOutLongitude)
                );
              }
              return {
                ...record,
                punchInAddress,
                punchOutAddress,
                punchInTime: record.punchInTime || null,
                punchOutTime: record.punchOutTime || null,
              };
            })
          );
          return { employeeId: employee.employeeId, attendance: attendanceWithAddresses };
        } catch (error) {
          console.error(`Error fetching attendance for ${employee.employeeId}:`, error);
          return { employeeId: employee.employeeId, attendance: [] };
        }
      });
      const results = await Promise.all(attendancePromises);
      const attendanceMap: Record<string, Attendance[]> = {};
      results.forEach((result) => {
        if (result) {
          attendanceMap[result.employeeId] = result.attendance;
        }
      });
      setAttendanceData(attendanceMap);
    };
    fetchAttendanceData();
  }, [employees, getAddressFromCoordinates]);

  useEffect(() => {
    // Fetch active employee count
    const fetchActiveCount = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/attendance/active-today/count");
        const data = await response.json();
        if (data && data.success && typeof data.activeCount === 'number') {
          setActiveCount(data.activeCount);
        } else {
          setActiveCount(0);
        }
      } catch {
        setActiveCount(0);
      }
    };
    fetchActiveCount();
  }, []);

  useEffect(() => {
    const fetchTotalLocations = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/attendance/locations/today");
        const data = await response.json();
        if (data && data.summary && typeof data.summary.totalLocations === 'number') {
          setTotalLocations(data.summary.totalLocations);
        } else {
          setTotalLocations(0);
        }
      } catch {
        setTotalLocations(0);
      }
    };
    fetchTotalLocations();
  }, []);

  // Fetch clusters and addresses
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/attendance/locations/today");
        const data = await response.json();
        if (data && Array.isArray(data.clusters)) {
          setLocationClusters(data.clusters);
          // For each cluster, set address as 'Loading...' first
          const loadingMap: Record<string, string> = {};
          data.clusters.forEach((cluster: Cluster) => {
            const key = `${cluster.center.lat},${cluster.center.lon}`;
            loadingMap[key] = 'Loading...';
          });
          setAddressMap(prev => ({ ...prev, ...loadingMap }));
          // Fetch all addresses in parallel
          const addressPromises = data.clusters.map(async (cluster: Cluster) => {
            const key = `${cluster.center.lat},${cluster.center.lon}`;
            const address = await reverseGeocode(cluster.center.lat, cluster.center.lon);
            return { key, address };
          });
          const addresses = await Promise.all(addressPromises);
          const addressObj: Record<string, string> = {};
          addresses.forEach(({ key, address }) => {
            addressObj[key] = address;
          });
          setAddressMap(prev => ({ ...prev, ...addressObj }));
        }
      } catch {}
    };
    fetchClusters();
  }, []);

  const boundaryCoordinates = (): [number, number][] => {
    const allPositions: [number, number][] = [];
    Object.values(attendanceData).forEach((attendanceList) => {
      attendanceList.forEach((entry) => {
        if (entry.punchInLatitude && entry.punchInLongitude) {
          allPositions.push([entry.punchInLatitude, entry.punchInLongitude]);
        }
        if (entry.punchOutLatitude && entry.punchOutLongitude) {
          allPositions.push([entry.punchOutLatitude, entry.punchOutLongitude]);
        }
      });
    });
    return allPositions;
  };

  // Pagination logic
  const totalPages = Math.ceil(locationClusters.length / recordsPerPage);
  const paginatedClusters = locationClusters.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Employee Card */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border flex items-center justify-between min-h-[110px]`}>
          <div>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Active Employee</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{activeCount}</p>
          </div>
          <FaUsers className="w-8 h-8 text-blue-500" />
        </div>
        {/* Total Locations Card */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border flex items-center justify-between min-h-[110px]`}>
          <div>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Locations</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{totalLocations}</p>
          </div>
          <FaUsers className="w-8 h-8 text-blue-500" />
        </div>
        {/* Max Employee Location Card */}
        {locationClusters.length > 0 && (() => {
          const maxCluster = locationClusters.reduce((max, cluster) => cluster.count > max.count ? cluster : max, locationClusters[0]);
          const key = `${maxCluster.center.lat},${maxCluster.center.lon}`;
          const address = addressMap[key] || 'Loading...';
          return (
            <div className={`lg:col-span-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 border flex items-center justify-between min-h-[110px]`}>
              <div>
                <p className={`text-sm font-medium flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <FaMapMarkerAlt className="text-red-500 w-5 h-5" />
                  Max Employee Location
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{maxCluster.count}</p>
              </div>
              <FaUsers className="w-8 h-8 text-blue-500" />
            </div>
          );
        })()}
        {/* Add more summary cards as needed */}
      </div>

      {/* Map and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className={`lg:col-span-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Employee Distribution Map (Today&apos;s Attendance)</h3>
            </div>
            <div className={`h-[500px] w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg flex items-center justify-center relative overflow-hidden`} style={{ maxWidth: '100%' }}>
              {typeof window !== 'undefined' && (
                <MapContainer
                  id="employee-attendance-map"
                  center={[12.9716, 77.5946]}
                  zoom={10}
                  maxZoom={22}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={true}
                >
                  <FitBounds bounds={boundaryCoordinates()} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={22}
                  />
                  {loading ? (
                    <div className="flex justify-center items-center h-full w-full">
                      <FaSpinner className="animate-spin text-blue-500 w-12 h-12" />
                    </div>
                  ) : (
                    employees.map((employee) => {
                      const attendance = attendanceData[employee.employeeId] || [];
                      return attendance.map((entry, idx) => {
                        const punchInPosition =
                          entry.punchInLatitude && entry.punchInLongitude
                            ? [entry.punchInLatitude, entry.punchInLongitude]
                            : null;
                        const punchOutPosition =
                          entry.punchOutLatitude && entry.punchOutLongitude
                            ? [entry.punchOutLatitude, entry.punchOutLongitude]
                            : null;
                        return (
                          <React.Fragment key={`${employee.employeeId}-${idx}`}>
                            {punchInPosition && (
                              <EmployeeImageMarker position={punchInPosition as [number, number]} imageUrl={entry.punchInPhoto || employee.employeeImage}>
                                <Popup>
                                  <div style={{ width: "260px", padding: "12px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", backgroundColor: "white" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                                      <div style={{ position: "relative" }}>
                                        <Image 
                                          src={employee.employeeImage} 
                                          alt={employee.fullName}
                                          width={64}
                                          height={64}
                                          style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #3b82f6" }}
                                        />
                                        <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "16px", height: "16px", backgroundColor: "#22c55e", borderRadius: "50%", border: "2px solid white" }}></div>
                                      </div>
                                      <div>
                                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>{employee.fullName}</h3>
                                        <p style={{ fontSize: "13px", color: "#4b5563" }}>{employee.designation}</p>
                                        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>ID: {employee.employeeId}</p>
                                      </div>
                                    </div>
                                    <div style={{ marginBottom: "12px" }}>
                                      <span style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "500", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>Punched In</span>
                                    </div>
                                    <div style={{ backgroundColor: "#eff6ff", padding: "10px", borderRadius: "8px" }}>
                                      <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Time: {formatTime(entry.punchInTime)}</p>
                                      {entry.punchInPhoto && (
                                        <div style={{ marginTop: "6px" }}>
                                          <Image 
                                            src={entry.punchInPhoto} 
                                            alt="Punch-in verification" 
                                            width={300}
                                            height={100}
                                            style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px" }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Popup>
                              </EmployeeImageMarker>
                            )}
                            {punchOutPosition && (
                              <EmployeeImageMarker position={punchOutPosition as [number, number]} imageUrl={entry.punchOutPhoto || employee.employeeImage}>
                                <Popup>
                                  <div style={{ width: "260px", padding: "12px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", backgroundColor: "white" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                                      <div style={{ position: "relative" }}>
                                        <Image 
                                          src={employee.employeeImage} 
                                          alt={employee.fullName}
                                          width={64}
                                          height={64}
                                          style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #22c55e" }}
                                        />
                                        <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "16px", height: "16px", backgroundColor: "#ef4444", borderRadius: "50%", border: "2px solid white" }}></div>
                                      </div>
                                      <div>
                                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>{employee.fullName}</h3>
                                        <p style={{ fontSize: "13px", color: "#4b5563" }}>{employee.designation}</p>
                                        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>ID: {employee.employeeId}</p>
                                      </div>
                                    </div>
                                    <div style={{ marginBottom: "12px" }}>
                                      <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "500", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>Punched Out</span>
                                    </div>
                                    <div style={{ backgroundColor: "#f0fdf4", padding: "10px", borderRadius: "8px" }}>
                                      <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Time: {formatTime(entry.punchOutTime)}</p>
                                      {entry.punchOutPhoto && (
                                        <div style={{ marginTop: "6px" }}>
                                          <Image 
                                            src={entry.punchOutPhoto} 
                                            alt="Punch-out verification" 
                                            width={300}
                                            height={100}
                                            style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px" }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Popup>
                              </EmployeeImageMarker>
                            )}
                          </React.Fragment>
                        );
                      });
                    })
                  )}
                </MapContainer>
              )}
            </div>
          </div>
        </div>
        {/* Location Clusters Table Card */}
        <div className={`${theme === 'dark' ? 'bg-[#232e3c] border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-6 shadow-md overflow-x-auto mt-4`}> 
          <h4 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-800'}`}>Today&apos;s Location Clusters</h4>
          <table className="min-w-full text-sm rounded-lg overflow-hidden">
            <thead>
              <tr className={theme === 'dark' ? 'bg-[#1b2430]' : 'bg-blue-50'}>
                <th className="px-4 py-2 text-left font-semibold tracking-wide ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700'}">Sl. No</th>
                <th className="px-4 py-2 text-left font-semibold tracking-wide ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700'}">Location (Address)</th>
                <th className="px-4 py-2 text-left font-semibold tracking-wide ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700'}">Total Employees</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClusters.map((cluster, idx) => {
                const key = `${cluster.center.lat},${cluster.center.lon}`;
                const address = addressMap[key] || 'Loading...';
                const isLong = address.length > 60 || address.split(',').length > 2;
                return (
                  <tr key={key} className={`transition-colors ${idx % 2 === 0 ? (theme === 'dark' ? 'bg-[#232e3c]' : 'bg-white') : (theme === 'dark' ? 'bg-[#1b2430]' : 'bg-gray-50')} hover:bg-blue-100 dark:hover:bg-blue-900`}>
                    <td className="px-4 py-2 font-medium">{(currentPage - 1) * recordsPerPage + idx + 1}</td>
                    <td className="px-4 py-2">
                      {isLong ? (
                        <>
                          <span style={{
                            display: 'inline-block',
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            whiteSpace: 'pre-line',
                            verticalAlign: 'top',
                            lineHeight: '1.2em',
                            height: '2.4em', // 2 lines
                          }}>
                            {address.split(',').slice(0,2).join(',') + (address.split(',').length > 2 ? '...' : '')}
                          </span>
                          <button
                            className={`ml-1 transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-[#60a5fa]' : 'text-blue-500 hover:text-blue-700'}`}
                            onClick={() => { setModalOpen(true); setModalCluster(cluster); }}
                            title="View full address and details"
                          >
                            <FaEye className="inline w-4 h-4 align-text-bottom" />
                          </button>
                        </>
                      ) : (
                        <span>{address}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{cluster.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Pagination controls */}
          <div className="flex justify-end items-center gap-2 mt-2">
            <button className="px-3 py-1 text-sm transition-colors rounded disabled:opacity-50 bg-gray-200 dark:bg-gray-700" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</button>
            <span className="px-3 py-1 text-sm bg-blue-500 text-white rounded">{currentPage}</span>
            <button className="px-3 py-1 text-sm transition-colors rounded disabled:opacity-50 bg-gray-200 dark:bg-gray-700" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
          </div>
        </div>
      </div>
      {/* Modal for full address and cluster details */}
      {modalOpen && modalCluster && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50" style={{ zIndex: 9999 }}>
          <div className={`relative w-full max-w-2xl mx-auto border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-0 overflow-hidden ${theme === 'dark' ? 'bg-[#232e3c]' : 'bg-white dark:bg-gray-900'}`} style={{ zIndex: 9999, backgroundColor: theme === 'dark' ? '#232e3c' : undefined }}>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-[#e5e7eb] text-2xl font-bold" onClick={() => setModalOpen(false)} aria-label="Close">&times;</button>
            <div className="px-8 pt-8 pb-4">
              <div className={`text-2xl font-extrabold text-center mb-2 ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-900'}`}>Location Details</div>
              <div className="mb-4 text-center">
                <span className={`block text-sm font-semibold uppercase mb-1 ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-500 dark:text-gray-400'}`}>Address</span>
                <span className={`block text-lg font-medium break-words ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-900 dark:text-white'}`}>{addressMap[`${modalCluster.center.lat},${modalCluster.center.lon}`]}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between items-center mb-4 gap-2">
                <div className={`text-base font-semibold ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>Total Employees: <span className={`font-bold ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-blue-600 dark:text-blue-400'}`}>{modalCluster.count}</span></div>
              </div>
              <div className={`mb-2 font-bold text-lg border-b pb-2 ${theme === 'dark' ? 'text-[#e5e7eb] border-gray-700' : 'text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700'}`}>Employees</div>
              <div className="overflow-x-auto rounded-lg">
                <table className={`min-w-full text-sm rounded-lg ${theme === 'dark' ? 'bg-[#232e3c]' : 'bg-white dark:bg-gray-900'}`}>
                  <thead>
                    <tr className={`${theme === 'dark' ? 'bg-[#232e3c]' : 'bg-blue-50 dark:bg-gray-800'}`}>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>Photo</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>Employee ID</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>Designation</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>Project</th>
                      <th className={`px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>Punch In Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalCluster.employees.map((emp: ClusterEmployee, idx: number) => (
                      <tr key={emp.employeeId} className={`transition-colors ${idx % 2 === 0 ? (theme === 'dark' ? 'bg-[#232e3c]' : 'bg-gray-50 dark:bg-gray-800') : (theme === 'dark' ? 'bg-[#232e3c]' : 'bg-white dark:bg-gray-900')} hover:bg-blue-100 dark:hover:bg-blue-900`}>
                        <td className="px-3 py-2">
                          <EmployeePhotoCell employeeId={emp.employeeId} punchInPhoto={emp.punchInPhoto} />
                        </td>
                        <td className={`px-3 py-2 font-medium ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-900 dark:text-white'}`}>{emp.employeeId}</td>
                        <td className={`px-3 py-2 ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>{emp.designation}</td>
                        <td className={`px-3 py-2 ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>{emp.projectName}</td>
                        <td className={`px-3 py-2 ${theme === 'dark' ? 'text-[#e5e7eb]' : 'text-gray-700 dark:text-gray-200'}`}>{emp.punchInTime ? formatTime(emp.punchInTime) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for employee photo in modal
function EmployeePhotoCell({ employeeId, punchInPhoto }: { employeeId: string, punchInPhoto?: string }) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(punchInPhoto || null);
  React.useEffect(() => {
    if (photoUrl || !employeeId) return;
    async function fetchKycPhoto() {
      try {
        const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`);
        const data = await res.json();
        if (data.kycData && data.kycData.personalDetails && data.kycData.personalDetails.employeeImage) {
          setPhotoUrl(data.kycData.personalDetails.employeeImage);
        }
      } catch {
        setPhotoUrl(null);
      }
    }
    fetchKycPhoto();
  }, [employeeId, photoUrl]);
  return photoUrl ? (
    <Image src={photoUrl} alt="Employee" width={32} height={32} className="w-8 h-8 rounded-full object-cover border" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-500">N/A</div>
  );
}

function EmployeeImageMarker({ position, imageUrl, children }: { position: [number, number], imageUrl: string, children: React.ReactNode }) {
  const [icon, setIcon] = useState<import('leaflet').DivIcon | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then(L => {
      // NOTE: <img> is used here because Leaflet's divIcon requires raw HTML. Next.js <Image /> cannot be used inside raw HTML strings.
      const divIcon = L.divIcon({
        html: `<div style='position: relative; text-align: center;'>
                  <img src="${imageUrl}" alt='Employee' style='width: 36px; height: 36px; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.5); border: 2px solid #3b82f6;' />
                </div>`,
        className: "custom-employee-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      setIcon(divIcon);
    });
  }, [imageUrl]);
  if (!icon) return null;
  return <Marker position={position} icon={icon}>{children}</Marker>;
}

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (
      map &&
      Array.isArray(bounds) &&
      bounds.length > 0 &&
      map.getContainer() // Defensive: only if the map container exists
    ) {
      try {
        map.fitBounds(bounds);
      } catch {
        // Optionally log or ignore
        // console.warn('fitBounds error');
      }
    }
  }, [bounds, map]);
  return null;
}