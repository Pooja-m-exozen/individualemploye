"use client";

import React, { useState, useEffect, JSX, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import dynamic from "next/dynamic";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaUsers, FaSpinner } from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import AttendanceScreen from '@/components/dashboard/AttendanceScreen';
import LeaveRequestsScreen from '@/components/dashboard/LeaveRequestsScreen';
import PerformanceScreen from '@/components/dashboard/PerformanceScreen';
import Image from "next/image";
import { Marker } from 'react-leaflet';
import type { DivIcon } from 'leaflet';

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

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

const GOOGLE_MAPS_API_KEY = 'AIzaSyCqvcEKoqwRG5PBDIVp-MjHyjXKT3s4KY4';

const AsyncMarker = ({ position, imageUrl, children }: { position: [number, number], imageUrl: string, children: React.ReactNode }) => {
  const [icon, setIcon] = useState<DivIcon | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const L = (await import('leaflet')).default;
      const divIcon = L.divIcon({
        html: `<div style='position: relative; text-align: center;'>
                 <img src="${imageUrl}" alt='Employee' style='width: 50px; height: 50px; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.5);' />
               </div>`,
        className: "custom-icon",
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });
      if (mounted) setIcon(divIcon);
    })();
    return () => { mounted = false; };
  }, [imageUrl]);
  if (!icon) return null;
  return <Marker position={position} icon={icon}>{children}</Marker>;
};

const OperationsManagerDashboard = (): JSX.Element => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});

  // Helper function to remove .000Z from time string
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return 'N/A';
    return timeString.replace('.000Z', '');
  };

  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number): Promise<string> => {
    const cacheKey = `${lat},${lng}`;
    
    // Check if address is in cache
    if (addressCache[cacheKey]) {
      return addressCache[cacheKey];
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        const address = data.results[0].formatted_address;
        // Cache the address
        setAddressCache(prev => ({ ...prev, [cacheKey]: address }));
        return address;
      }
      return "Address not found";
    } catch (error) {
      console.error("Error fetching address:", error);
      return "Address not found";
    }
  }, [addressCache]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter((form: { personalDetails: { projectName: string } }) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: { personalDetails: { employeeId: string; employeeImage: string; fullName: string; designation: string; projectName: string } }) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              projectName: form.personalDetails.projectName,
            }));

          setEmployees(filteredEmployees);
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
            console.error(`Failed to fetch attendance for ${employee.employeeId}`);
            return { employeeId: employee.employeeId, attendance: [] };
          }
          const data = await response.json();

          const currentDayAttendance = data.attendance?.filter(
            (record: Record<string, unknown>) => new Date(record.date as string).getDate() === day
          );

          const attendanceWithAddresses = await Promise.all(
            (currentDayAttendance || []).map(async (record: Record<string, unknown>) => {
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

  return (
    <ManagerOpsLayout>
      <div className={`p-4 md:p-8 min-h-screen ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50' 
          : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      }`}>
        {/* Header */}
        <div className={`rounded-2xl p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shadow-lg ${
          theme === 'light' 
            ? 'bg-gradient-to-r from-blue-500 to-blue-800' 
            : 'bg-gradient-to-r from-gray-700 to-gray-800'
        }`}>
          <div className={`${
            theme === 'light' 
              ? 'bg-white text-blue-600' 
              : 'bg-gray-800 text-blue-400'
          } p-4 sm:p-6 rounded-full flex items-center justify-center shadow-md`}>
            <FaUsers className="text-2xl sm:text-3xl" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Operations Manager Dashboard</h1>
            <p className="text-white text-base sm:text-lg opacity-90">
              Manage your team&apos;s attendance, leave, and performance metrics.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 justify-center sm:justify-start">
          {['Overview', 'Attendance', 'Leave Requests', 'Performance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition text-sm sm:text-base
                ${activeTab === tab
                  ? `${theme === 'dark' ? 'bg-blue-700' : 'bg-blue-600'} text-white shadow-lg`
                  : `${theme === 'dark' 
                      ? 'bg-gray-800 text-gray-300 hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-600 hover:bg-blue-500'
                    } hover:text-white`
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-2 sm:p-6`}>
            <>
              <h2 className={`text-lg sm:text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Today&apos;s Attendance</h2>
              {loading ? (
                <div className="flex justify-center items-center min-h-[200px] sm:min-h-[300px]">
                  <FaSpinner className={`animate-spin ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  } w-8 h-8 sm:w-12 sm:h-12`} />
                </div>
              ) : employees.length === 0 ? (
                <div className={`${
                  theme === 'dark' 
                    ? 'bg-yellow-900/50 text-yellow-300' 
                    : 'bg-yellow-50 text-yellow-600'
                  } p-4 sm:p-6 rounded-2xl flex items-center gap-3 max-w-full sm:max-w-lg mx-auto shadow-lg`}>
                  <FaUsers className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <p className="text-base sm:text-lg font-medium">
                    No employees found in the &apos;Exozen-Ops&apos; project.
                  </p>
                </div>
              ) : (
                typeof window !== 'undefined' ? (
                  <div className="w-full overflow-x-auto">
                    <MapContainer
                      key={JSON.stringify(boundaryCoordinates())}
                      bounds={boundaryCoordinates().length > 0 ? boundaryCoordinates() : undefined}
                      style={{ height: "400px", minHeight: "300px", width: "100%", maxWidth: "100vw" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      {employees.map((employee) => {
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
                                <AsyncMarker
                                  position={punchInPosition as [number, number]}
                                  imageUrl={entry.punchInPhoto || employee.employeeImage}
                                >
                                  <Popup>
                                    <div style={{ width: "100%", maxWidth: "260px", padding: "12px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", backgroundColor: "white" }}>
                                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                        <div style={{ position: "relative" }}>
                                          <Image 
                                            src={employee.employeeImage} 
                                            alt={employee.fullName}
                                            width={48}
                                            height={48}
                                            style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #3b82f6" }}
                                          />
                                          <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "12px", height: "12px", backgroundColor: "#22c55e", borderRadius: "50%", border: "2px solid white" }}></div>
                                        </div>
                                        <div>
                                          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#1f2937" }}>{employee.fullName}</h3>
                                          <p style={{ fontSize: "12px", color: "#4b5563" }}>{employee.designation}</p>
                                          <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>ID: {employee.employeeId}</p>
                                        </div>
                                      </div>
                                      <div style={{ marginBottom: "10px" }}>
                                          <span style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: "3px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>Punched In</span>
                                      </div>
                                      <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "8px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
                                          <div style={{ width: "6px", height: "6px", backgroundColor: "#3b82f6", borderRadius: "50%" }}></div>
                                          <h4 style={{ fontSize: "12px", fontWeight: 500, color: "#1e40af" }}>Punch-In Location</h4>
                                        </div>
                                        <p style={{ fontSize: "12px", color: "#4b5563", lineHeight: 1.4 }}>
                                          {entry.punchInAddress === "Address not found" && entry.punchInLatitude && entry.punchInLongitude
                                            ? "Fetching address..."
                                            : entry.punchInAddress}
                                        </p>
                                        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Time: {formatTime(entry.punchInTime)}</p>
                                        {entry.punchInPhoto && (
                                          <div style={{ marginTop: "5px" }}>
                                            <Image 
                                              src={entry.punchInPhoto} 
                                              alt="Punch-in verification" 
                                              width={300}
                                              height={80}
                                              style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px" }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Popup>
                                </AsyncMarker>
                              )}
                              {punchOutPosition && (
                                <AsyncMarker
                                  position={punchOutPosition as [number, number]}
                                  imageUrl={entry.punchOutPhoto || employee.employeeImage}
                                >
                                  <Popup>
                                    <div style={{ width: "100%", maxWidth: "260px", padding: "12px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", backgroundColor: "white" }}>
                                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                        <div style={{ position: "relative" }}>
                                          <Image 
                                            src={employee.employeeImage} 
                                            alt={employee.fullName}
                                            width={48}
                                            height={48}
                                            style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #22c55e" }}
                                          />
                                          <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "12px", height: "12px", backgroundColor: "#ef4444", borderRadius: "50%", border: "2px solid white" }}></div>
                                        </div>
                                        <div>
                                          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#1f2937" }}>Welcome {employee.fullName}</h3>
                                          <p style={{ fontSize: "12px", color: "#4b5563" }}>{employee.designation.replace("'", "&apos;")}</p>
                                          <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>ID: {employee.employeeId}</p>
                                        </div>
                                      </div>
                                      <div style={{ marginBottom: "10px" }}>
                                          <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "3px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>Punched Out</span>
                                      </div>
                                      <div style={{ backgroundColor: "#f0fdf4", padding: "8px", borderRadius: "8px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
                                          <div style={{ width: "6px", height: "6px", backgroundColor: "#22c55e", borderRadius: "50%" }}></div>
                                          <h4 style={{ fontSize: "12px", fontWeight: 500, color: "#166534" }}>Punch-Out Location</h4>
                                        </div>
                                        <p style={{ fontSize: "12px", color: "#4b5563", lineHeight: 1.4 }}>
                                          {entry.punchOutAddress}
                                        </p>
                                        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Time: {formatTime(entry.punchOutTime)}</p>
                                        {entry.punchOutPhoto && (
                                          <div style={{ marginTop: "5px" }}>
                                            <Image 
                                              src={entry.punchOutPhoto} 
                                              alt="Punch-out verification" 
                                              width={300}
                                              height={80}
                                              style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px" }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Popup>
                                </AsyncMarker>
                              )}
                            </React.Fragment>
                          );
                        });
                      })}
                    </MapContainer>
                  </div>
                ) : null
              )}
            </>
          </div>
        )}

        {activeTab === "Attendance" && (
          <div>
            <div className={`${
              theme === 'dark' 
                ? 'bg-gray-800' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700'
            } rounded-t-lg shadow p-4 mb-0`}>
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                Attendance Records
              </h2>
            </div>
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-b-lg shadow p-2 sm:p-6`}>
              <AttendanceScreen />
            </div>
          </div>
        )}

        {activeTab === "Leave Requests" && (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-2 sm:p-6`}>
            <div className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              <LeaveRequestsScreen />
            </div>
          </div>
        )}

        {activeTab === "Performance" && (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-2 sm:p-6`}>
            <div className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              <PerformanceScreen />
            </div>
          </div>
        )}
      </div>
    </ManagerOpsLayout>
  );
};

export default OperationsManagerDashboard;