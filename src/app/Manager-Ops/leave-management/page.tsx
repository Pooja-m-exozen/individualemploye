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

  useEffect(() => {
    const fetchEmployees = async () => {
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
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
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
                    ? 'bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white'
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
                  ? 'bg-white border border-gray-200 text-gray-900 placeholder-gray-500'
                  : 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={`absolute right-2 top-2 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
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

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <FaSpinner className={`animate-spin ${
              theme === 'light' ? 'text-blue-600' : 'text-blue-400'
            } w-12 h-12`} />
          </div>
        ) : kycDetails.length === 0 ? (
          <p className={`text-lg ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>No KYC details found for the project "Exozen - Ops".</p>
        ) : (
          <div className={`rounded-xl shadow-lg p-6 overflow-x-auto ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <div className="min-w-[1200px]">
              <table className="w-full">
                <thead>
                  <tr className={`border-b-2 ${
                    theme === 'light' ? 'border-gray-200' : 'border-gray-700'
                  }`}>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>Employee</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>Leave Details</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>Duration</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>Reason</th>
                    <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>Status</th>
                    {activeTab === "Pending" && (
                      <th className={`p-4 text-sm font-semibold uppercase tracking-wider ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                      }`}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'light' ? 'divide-gray-200' : 'divide-gray-700'
                }`}>
                  {filteredSearchData.map((leave, index) => (
                    <tr key={index} className={`${
                      theme === 'light'
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-gray-750'
                    } transition-colors duration-200`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-4">
                          <img
                            src={kycDetails[0]?.employeeImage || ""}
                            alt={kycDetails[0]?.fullName || "Employee"}
                            className={`w-12 h-12 rounded-full object-cover border-2 ${
                              theme === 'light' ? 'border-gray-200' : 'border-gray-600'
                            }`}
                          />
                          <div>
                            <div className={`font-medium ${
                              theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                            }`}>{kycDetails[0]?.fullName || "N/A"}</div>
                            <div className={`text-sm ${
                              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>{kycDetails[0]?.employeeId || "N/A"}</div>
                            <div className={`text-sm ${
                              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>{kycDetails[0]?.designation || "N/A"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          theme === 'light' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-blue-900 text-blue-100'
                        }`}>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className={`text-sm ${
                            theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                          }`}>
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </div>
                          <div className={`text-sm ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {leave.numberOfDays} {leave.numberOfDays === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`text-sm max-w-xs truncate ${
                          theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                        }`} title={leave.reason}>
                          {leave.reason}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
                          }`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      {activeTab === "Pending" && (
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => console.log("Approve")}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors duration-200"
                              title="Approve"
                            >
                              <FaCheck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => console.log("Reject")}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Reject"
                            >
                              <FaTimes className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => console.log("Cancel")}
                              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                              title="Cancel"
                            >
                              <FaBan className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      )}
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