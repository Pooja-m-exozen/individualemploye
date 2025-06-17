"use client";

import React, { useEffect, useState } from "react";
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
      <div className="p-4 md:p-8 min-h-screen bg-gray-50">
        {/* Updated Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6 flex items-center gap-6 shadow-lg">
          <div className="bg-white text-blue-600 p-6 rounded-full flex items-center justify-center shadow-md">
            <FaUserAlt className="text-3xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Employee Leave Report</h1>
            <p className="text-lg">
              Easily manage leave details for employees in the "Exozen - Ops" project.
            </p>
          </div>
        </div>

        {/* Tabs for Filtering */}
        <div className="flex gap-4 mb-6">
          {["All", "Approved", "Rejected", "Canceled", "Pending"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Updated Search Bar with Filters */}
        <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Search by name, date, or leave type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-2 text-gray-500 hover:text-red-500"
              >
                <FaTimesCircle className="text-xl" />
              </button>
            )}
          </div>
          <div>
            <select
              value={filterLeaveType}
              onChange={(e) => setFilterLeaveType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
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
            <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
          </div>
        ) : kycDetails.length === 0 ? (
          <p className="text-lg text-gray-600">No KYC details found for the project "Exozen - Ops".</p>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
            <div className="min-w-[1200px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Leave Details</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    {activeTab === "Pending" && (
                      <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSearchData.map((leave, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="p-4">
                        <div className="flex items-center space-x-4">
                          <img
                            src={kycDetails[0]?.employeeImage || ""}
                            alt={kycDetails[0]?.fullName || "Employee"}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{kycDetails[0]?.fullName || "N/A"}</div>
                            <div className="text-sm text-gray-500">{kycDetails[0]?.employeeId || "N/A"}</div>
                            <div className="text-sm text-gray-500">{kycDetails[0]?.designation || "N/A"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {leave.numberOfDays} {leave.numberOfDays === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>
                          {leave.reason}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            leave.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : leave.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : leave.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
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