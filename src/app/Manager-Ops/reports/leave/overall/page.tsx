"use client";

import React, { JSX, useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
  imageUrl: string;
}

interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
  pending: number;
}

interface LeaveHistory {
  leaveId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: string;
  reason: string;
}

// Define a type for the KYC form (only the used fields)
type KycForm = {
  personalDetails: {
    employeeId: string;
    fullName: string;
    designation: string;
    projectName: string;
    employeeImage?: string;
  };
};

const OverallLeavePage = (): JSX.Element => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<Record<string, Record<string, LeaveBalance>>>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter((form: KycForm) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: KycForm) => ({
              employeeId: form.personalDetails.employeeId,
              fullName: form.personalDetails.fullName,
              designation: form.personalDetails.designation,
              imageUrl: form.personalDetails.employeeImage || "/default-avatar.png",
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
    const fetchLeaveBalances = async () => {
      const balancePromises = employees.map(async (employee) => {
        const response = await fetch(
          `https://cafm.zenapi.co.in/api/leave/balance/${employee.employeeId}`
        );
        const data = await response.json();
        return { employeeId: employee.employeeId, balances: data.balances || {} };
      });

      const results = await Promise.all(balancePromises);
      const balancesMap: Record<string, Record<string, LeaveBalance>> = {};
      results.forEach((result) => {
        balancesMap[result.employeeId] = result.balances;
      });
      setLeaveBalances(balancesMap);
    };

    if (employees.length > 0) {
      fetchLeaveBalances();
    }
  }, [employees]);

  const fetchLeaveHistory = async (employee: Employee) => {
    try {
      const response = await fetch(
        `https://cafm.zenapi.co.in/api/leave/history/${employee.employeeId}`
      );
      const data = await response.json();
      setLeaveHistory(data.leaveHistory || []);
      setSelectedEmployee(employee);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching leave history:", error);
    }
  };

  return (
    <ManagerOpsLayout>
      <div className={`min-h-screen font-sans ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'
          : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      }`}>
        <div className="p-2 sm:p-4 md:p-6">
          {/* Header */}
          <div className={`rounded-2xl mb-8 p-3 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 shadow-lg ${
            theme === 'light'
              ? 'bg-gradient-to-r from-blue-500 to-blue-800'
              : 'bg-gradient-to-r from-gray-800 to-gray-700'
          }`}>
            <h1 className="text-lg sm:text-3xl font-bold text-white">Overall Leave Report</h1>
          </div>

          {/* Leave Table */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[200px] sm:min-h-[300px]">
              <FaSpinner className={`animate-spin ${
                theme === 'light' ? 'text-blue-600' : 'text-blue-400'
              } w-10 h-10 sm:w-12 sm:h-12`} />
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className={`min-w-[600px] w-full rounded-lg shadow-md overflow-hidden ${
                theme === 'light' ? 'bg-white' : 'bg-gray-800'
              }`}>
                <thead className={`${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800'
                    : 'bg-gradient-to-r from-gray-700 to-gray-800'
                } text-white`}>
                  <tr>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Employee Image</th>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Employee ID</th>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Employee Name</th>
                    <th className="p-2 sm:p-4 text-center font-semibold text-xs sm:text-base">EL</th>
                    <th className="p-2 sm:p-4 text-center font-semibold text-xs sm:text-base">SL</th>
                    <th className="p-2 sm:p-4 text-center font-semibold text-xs sm:text-base">CL</th>
                    <th className="p-2 sm:p-4 text-center font-semibold text-xs sm:text-base">CompOff</th>
                    <th className="p-2 sm:p-4 text-center font-semibold text-xs sm:text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.employeeId} className={`border-b ${
                      theme === 'light' 
                        ? 'hover:bg-gray-100 border-gray-200' 
                        : 'hover:bg-gray-700 border-gray-700'
                    }`}>
                      <td className="p-2 sm:p-4">
                        <Image
                          src={employee.imageUrl}
                          alt={employee.fullName}
                          width={40}
                          height={40}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-gray-300 object-cover"
                        />
                      </td>
                      <td className={`p-2 sm:p-4 font-medium ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                      } text-xs sm:text-base`}>{employee.employeeId}</td>
                      <td className={`p-2 sm:p-4 font-medium ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                      } text-xs sm:text-base`}>{employee.fullName}</td>
                      {["EL", "SL", "CL", "CompOff"].map((type) => (
                        <td key={type} className="p-2 sm:p-4 text-center">
                          <div className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>
                            <span className="block font-semibold text-xs sm:text-sm">
                              Allocated: {leaveBalances[employee.employeeId]?.[type]?.allocated || 0}
                            </span>
                            <span className="block font-semibold text-xs sm:text-sm">
                              Used: {leaveBalances[employee.employeeId]?.[type]?.used || 0}
                            </span>
                            <span className="block font-semibold text-xs sm:text-sm">
                              Remaining: {leaveBalances[employee.employeeId]?.[type]?.remaining || 0}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td className="p-2 sm:p-4 text-center">
                        <button
                          onClick={() => fetchLeaveHistory(employee)}
                          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-base ${
                            theme === 'light'
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-10 px-2 sm:px-0">
          <div className={`rounded-lg shadow-lg p-3 sm:p-6 w-full max-w-xs sm:max-w-2xl relative ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <button
              onClick={() => setShowModal(false)}
              className={`absolute top-2 right-2 sm:top-4 sm:right-4 ${
                theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'
              } text-lg sm:text-xl`}
            >
              ✖
            </button>

            <div className="mb-4 sm:mb-6">
              <h2 className={`text-lg sm:text-2xl font-bold ${
                theme === 'light' ? 'text-gray-800' : 'text-gray-100'
              }`}>
                Leave History for {selectedEmployee.fullName}
              </h2>
              <p className={`text-xs sm:text-sm ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                Employee ID: {selectedEmployee.employeeId}
              </p>
            </div>

            <div className="overflow-x-auto w-full">
              <table className={`min-w-[500px] w-full rounded-lg shadow-md ${
                theme === 'light' ? 'bg-white' : 'bg-gray-800'
              }`}>
                <thead className={`${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800'
                    : 'bg-gradient-to-r from-gray-700 to-gray-800'
                } text-white`}>
                  <tr>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Leave Type</th>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Start Date</th>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">End Date</th>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Days</th>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Status</th>
                    <th className="p-2 sm:p-4 text-left font-semibold text-xs sm:text-base">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveHistory.length > 0 ? (
                    leaveHistory.map((leave) => (
                      <tr key={leave.leaveId} className={`border-b ${
                        theme === 'light'
                          ? 'hover:bg-gray-100 border-gray-200'
                          : 'hover:bg-gray-700 border-gray-700'
                      }`}>
                        <td className={`p-2 sm:p-4 ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        } text-xs sm:text-base`}>{leave.leaveType}</td>
                        <td className={`p-2 sm:p-4 ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        } text-xs sm:text-base`}>{new Date(leave.startDate).toLocaleDateString()}</td>
                        <td className={`p-2 sm:p-4 ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        } text-xs sm:text-base`}>{new Date(leave.endDate).toLocaleDateString()}</td>
                        <td className={`p-2 sm:p-4 ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        } text-xs sm:text-base`}>{leave.numberOfDays}</td>
                        <td className={`p-2 sm:p-4 font-semibold text-xs sm:text-base ${
                          leave.status === "Approved"
                            ? theme === 'light' ? 'text-green-600' : 'text-green-400'
                            : leave.status === "Pending"
                            ? theme === 'light' ? 'text-yellow-600' : 'text-yellow-400'
                            : theme === 'light' ? 'text-red-600' : 'text-red-400'
                        }`}>
                          {leave.status}
                        </td>
                        <td className={`p-2 sm:p-4 ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        } text-xs sm:text-base`}>{leave.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={`p-2 sm:p-4 text-center text-xs sm:text-base ${
                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        No leave history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 sm:mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className={`px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg transition-colors text-xs sm:text-base ${
                  theme === 'light'
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerOpsLayout>
  );
};

export default OverallLeavePage;