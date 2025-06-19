"use client";

import React, { JSX, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaCheck, FaTimes, FaBan, FaUserAlt, FaTimesCircle } from "react-icons/fa";

interface KYCDetails {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
}

interface DummyLeaveData {
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: string;
}

const LeaveManagementPage = (): JSX.Element => {
  const { theme } = useTheme();
  const [kycDetails, setKycDetails] = useState<KYCDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterLeaveType, setFilterLeaveType] = useState<string>("All");
  const [allLeaveRecords, setAllLeaveRecords] = useState<any[]>([]);
  const [leaveLoading, setLeaveLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchEmployeesAndLeaves = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter(
              (form: any) => form.personalDetails.projectName === "Exozen - Ops"
            )
            .map((form: any) => ({
              employeeId: form.personalDetails.employeeId,
              employeeImage: form.personalDetails.employeeImage,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation || "N/A",
            }));

          setKycDetails(filteredEmployees);

          // Fetch leave history for all employees in parallel
          setLeaveLoading(true);
          const allLeaves = await Promise.all(
            filteredEmployees.map(async (emp: { employeeId: any; fullName: any; employeeImage: any; designation: any; }) => {
              try {
                const res = await fetch(`https://cafm.zenapi.co.in/api/leave/history/${emp.employeeId}`);
                const historyData = await res.json();
                if (Array.isArray(historyData.leaveHistory)) {
                  return historyData.leaveHistory.map((leave: any) => ({
                    ...leave,
                    employeeId: emp.employeeId,
                    fullName: emp.fullName,
                    employeeImage: emp.employeeImage,
                    designation: emp.designation,
                  }));
                }
                return [];
              } catch {
                return [];
              }
            })
          );
          // Flatten the array of arrays
          setAllLeaveRecords(allLeaves.flat());
        }
      } catch (error) {
        console.error("Error fetching employees or leave histories:", error);
      } finally {
        setLoading(false);
        setLeaveLoading(false);
      }
    };

    fetchEmployeesAndLeaves();
  }, []);

  const dummyLeaveData: DummyLeaveData[] = [
    {
      leaveType: "EL",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 5))
        .toISOString()
        .split("T")[0],
      numberOfDays: 5,
      reason: "Vacation",
      status: "Pending",
    },
    {
      leaveType: "CL",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 3))
        .toISOString()
        .split("T")[0],
      numberOfDays: 3,
      reason: "Personal Work",
      status: "Approved",
    },
    {
      leaveType: "SL",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 2))
        .toISOString()
        .split("T")[0],
      numberOfDays: 2,
      reason: "Sick Leave",
      status: "Rejected",
    },
  ];

  const filteredLeaveData =
    activeTab === "All"
      ? dummyLeaveData
      : dummyLeaveData.filter((leave) => leave.status === activeTab);

  const filteredSearchData = filteredLeaveData.filter(
    (leave) =>
      (filterLeaveType === "All" || leave.leaveType === filterLeaveType) &&
      (leave.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.startDate.includes(searchQuery) ||
        leave.endDate.includes(searchQuery) ||
        kycDetails[0]?.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const clearSearch = () => {
    setSearchQuery("");
    setFilterLeaveType("All");
  };

  // Get unique, sorted leave types from allLeaveRecords
  const leaveTypes = React.useMemo(() => {
    const types = new Set<string>();
    allLeaveRecords.forEach((leave) => {
      if (leave.leaveType) types.add(leave.leaveType);
    });
    return ["All", ...Array.from(types).sort()];
  }, [allLeaveRecords]);

  // Filtering and searching logic for allLeaveRecords
  const filteredLeaveRecords = allLeaveRecords.filter((leave) => {
    // Filter by leave type
    const matchesLeaveType = filterLeaveType === "All" || leave.leaveType === filterLeaveType;
    // Search by name, leave type, start date, end date, employeeId, designation, reason
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      leave.fullName?.toLowerCase().includes(query) ||
      leave.leaveType?.toLowerCase().includes(query) ||
      leave.startDate?.toString().includes(query) ||
      leave.endDate?.toString().includes(query) ||
      leave.employeeId?.toLowerCase().includes(query) ||
      leave.designation?.toLowerCase().includes(query) ||
      leave.reason?.toLowerCase().includes(query);
    // Filter by tab (status)
    const matchesTab = activeTab === "All" || leave.status === activeTab;
    return matchesLeaveType && matchesSearch && matchesTab;
  });

  return (
    <ManagerOpsLayout>
      <div className={`p-4 md:p-8 min-h-screen ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50' 
          : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      }`}>
        {/* Header */}
        <div className={`rounded-2xl p-6 mb-6 flex items-center gap-6 shadow-lg ${
          theme === 'light' 
            ? 'bg-gradient-to-r from-blue-500 to-blue-800' 
            : 'bg-gradient-to-r from-gray-700 to-gray-800'
        }`}>
          <div className={`${
            theme === 'light' 
              ? 'bg-white text-blue-600' 
              : 'bg-gray-800 text-blue-400'
          } p-6 rounded-full flex items-center justify-center shadow-md`}>
            <FaUserAlt className="text-3xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Employee Leave Report</h1>
            <p className="text-white text-lg opacity-90">
              Easily manage leave details for employees in the "Exozen - Ops" project.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {["All", "Approved", "Rejected", "Canceled", "Pending"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? theme === 'light'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-blue-700 text-white shadow-lg'
                  : theme === 'light'
                    ? 'bg-white text-gray-900 hover:bg-blue-500 hover:text-white border border-gray-200'
                    : 'bg-gray-700 text-gray-300 hover:bg-blue-600 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Search by name, date, or leave type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm ${
                theme === 'light'
                  ? 'bg-white border border-gray-200 text-gray-900 placeholder-gray-600'
                  : 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={`absolute right-2 top-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                } hover:text-red-500`}
              >
                <FaTimesCircle className="text-xl" />
              </button>
            )}
          </div>
          <div>
            <select
              value={filterLeaveType}
              onChange={(e) => setFilterLeaveType(e.target.value)}
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm ${
                theme === 'light'
                  ? 'bg-white border border-gray-200 text-gray-900'
                  : 'bg-gray-800 border-gray-700 text-white'
              }`}
            >
              <option value="All">All Leave Types</option>
              <option value="EL">EL</option>
              <option value="CL">CL</option>
              <option value="SL">SL</option>
            </select>
          </div>
        </div>

        {leaveLoading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <FaSpinner className={`animate-spin ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'} w-12 h-12`} />
          </div>
        ) : (
          <div className={`rounded-xl shadow-lg p-6 overflow-x-auto ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <div className="min-w-[1200px]">
              <table className="w-full">
                <thead>
                  <tr className={`border-b-2 ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Employee</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Employee ID</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Designation</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Leave Type</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Start Date</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>End Date</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Days</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Status</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>Reason</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-gray-700'}`}>
                  {filteredLeaveRecords.map((leave, idx) => (
                    <tr key={leave.leaveId || idx} className={`${theme === 'light' ? 'hover:bg-gray-50 text-gray-900' : 'hover:bg-gray-750 text-gray-300'} transition-colors duration-200`}>
                      <td className="p-4 flex items-center space-x-2">
                        <img src={leave.employeeImage || ""} alt={leave.fullName || "Employee"} className="w-8 h-8 rounded-full object-cover border-2" />
                        <span className={theme === 'light' ? 'text-gray-900' : 'text-gray-300'}>{leave.fullName || "N/A"}</span>
                      </td>
                      <td className="p-4">{leave.employeeId}</td>
                      <td className="p-4">{leave.designation}</td>
                      <td className="p-4">{leave.leaveType}</td>
                      <td className="p-4">{new Date(leave.startDate).toLocaleDateString()}</td>
                      <td className="p-4">{new Date(leave.endDate).toLocaleDateString()}</td>
                      <td className="p-4">{leave.numberOfDays}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          theme === 'light'
                            ? leave.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : leave.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : leave.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                            : leave.status === "Approved"
                              ? "bg-green-900 text-green-100"
                              : leave.status === "Rejected"
                              ? "bg-red-900 text-red-100"
                              : leave.status === "Pending"
                              ? "bg-yellow-900 text-yellow-100"
                              : "bg-gray-700 text-gray-100"
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="p-4">{leave.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ManagerOpsLayout>
  );
};

export default LeaveManagementPage;