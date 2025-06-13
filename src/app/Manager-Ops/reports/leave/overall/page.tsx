"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout"; // Ensure this path is correct
import { FaSpinner } from "react-icons/fa";

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

const OverallLeavePage = (): JSX.Element => {
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
            .filter((form: any) => form.personalDetails.projectName === "Exozen - Ops")
            .map((form: any) => ({
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
      <div className="min-h-screen font-sans bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="p-6">
          {/* Header */}
          <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
            <h1 className="text-3xl font-bold text-white">Overall Leave Report</h1>
          </div>

          {/* Leave Table */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-md overflow-hidden">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                  <tr>
                    <th className="p-4 text-left font-semibold">Employee Image</th>
                    <th className="p-4 text-left font-semibold">Employee ID</th>
                    <th className="p-4 text-left font-semibold">Employee Name</th>
                    <th className="p-4 text-center font-semibold">EL</th>
                    <th className="p-4 text-center font-semibold">SL</th>
                    <th className="p-4 text-center font-semibold">CL</th>
                    <th className="p-4 text-center font-semibold">CompOff</th>
                    <th className="p-4 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.employeeId} className="border-b hover:bg-gray-100">
                      <td className="p-4 text-gray-700">
                        <img
                          src={employee.imageUrl}
                          alt={employee.fullName}
                          className="w-12 h-12 rounded-full border border-gray-300"
                        />
                      </td>
                      <td className="p-4 text-gray-700 font-medium">{employee.employeeId}</td>
                      <td className="p-4 text-gray-700 font-medium">{employee.fullName}</td>
                      {["EL", "SL", "CL", "CompOff"].map((type) => (
                        <td key={type} className="p-4 text-center">
                          <div>
                            <span className="block font-semibold">
                              Allocated:{" "}
                              {leaveBalances[employee.employeeId]?.[type]?.allocated || 0}
                            </span>
                            <span className="block font-semibold">
                              Used: {leaveBalances[employee.employeeId]?.[type]?.used || 0}
                            </span>
                            <span className="block font-semibold">
                              Remaining:{" "}
                              {leaveBalances[employee.employeeId]?.[type]?.remaining || 0}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => fetchLeaveHistory(employee)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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

      {/* Inline Modal */}
      {showModal && selectedEmployee && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-10">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
            >
              ✖
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Leave History for {selectedEmployee.fullName}
              </h2>
              <p className="text-sm text-gray-500">
                Employee ID: {selectedEmployee.employeeId}
              </p>
            </div>

            {/* Leave History Table */}
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-md">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                  <tr>
                    <th className="p-4 text-left font-semibold">Leave Type</th>
                    <th className="p-4 text-left font-semibold">Start Date</th>
                    <th className="p-4 text-left font-semibold">End Date</th>
                    <th className="p-4 text-left font-semibold">Days</th>
                    <th className="p-4 text-left font-semibold">Status</th>
                    <th className="p-4 text-left font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveHistory.length > 0 ? (
                    leaveHistory.map((leave) => (
                      <tr key={leave.leaveId} className="border-b hover:bg-gray-100">
                        <td className="p-4">{leave.leaveType}</td>
                        <td className="p-4">{new Date(leave.startDate).toLocaleDateString()}</td>
                        <td className="p-4">{new Date(leave.endDate).toLocaleDateString()}</td>
                        <td className="p-4">{leave.numberOfDays}</td>
                        <td
                          className={`p-4 font-semibold ${
                            leave.status === "Approved"
                              ? "text-green-600"
                              : leave.status === "Pending"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {leave.status}
                        </td>
                        <td className="p-4">{leave.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        No leave history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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