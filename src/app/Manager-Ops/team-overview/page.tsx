"use client";

import React, { useEffect, useState } from "react";
import ManagerOpsLayout from "@/components/dashboard/ManagerOpsLayout";
import { FaSpinner, FaUser } from "react-icons/fa";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement, // Register BarElement for Bar charts
  ArcElement, // Register ArcElement for Doughnut charts
  Title,
  Tooltip,
  Legend
);

interface Employee {
  employeeId: string;
  employeeImage: string;
  fullName: string;
  designation: string;
  projectName: string;
}

const TeamOverviewPage = (): JSX.Element => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("5"); // Default month

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("https://cafm.zenapi.co.in/api/kyc");
        const data = await response.json();

        if (data.kycForms) {
          const filteredEmployees = data.kycForms
            .filter(
              (form: any) =>
                form.personalDetails.projectName === "Exozen - Ops" // Filter by project name
            )
            .map((form: any) => ({
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

  const fetchGraphData = async (employeeId: string | undefined, month: string) => {
    if (!employeeId) return;

    try {
      const attendanceSummaryResponse = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-summary?month=${month}&year=2025`
      );
      const attendanceSummaryData = await attendanceSummaryResponse.json();

      const punctualityStatsResponse = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/${employeeId}/monthly-stats?month=${month}&year=2025`
      );
      const punctualityStatsData = await punctualityStatsResponse.json();

      if (attendanceSummaryData.success && punctualityStatsData.success) {
        const attendanceStats = attendanceSummaryData.data.summary || {};
        const punctualityStats = punctualityStatsData.data || {};

        setGraphData({
          totalDays: attendanceStats.totalDays || 0,
          presentDays: attendanceStats.presentDays || 0,
          halfDays: attendanceStats.halfDays || 0,
          partiallyAbsentDays: attendanceStats.partiallyAbsentDays || 0,
          weekOffs: attendanceStats.weekOffs || 0,
          holidays: attendanceStats.holidays || 0,
          el: attendanceStats.el || 0,
          sl: attendanceStats.sl || 0,
          cl: attendanceStats.cl || 0,
          compOff: attendanceStats.compOff || 0,
          lop: attendanceStats.lop || 0,
          attendanceRate: punctualityStats.attendanceRate || "0%",
          punctualityIssues: {
            lateArrivals: punctualityStats.punctualityIssues?.lateArrivals || 0,
            earlyArrivals: punctualityStats.punctualityIssues?.earlyArrivals || 0,
            earlyLeaves: punctualityStats.punctualityIssues?.earlyLeaves || 0,
          },
        });
      } else {
        console.error(
          "Failed to fetch data:",
          attendanceSummaryData.message || punctualityStatsData.message
        );
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      fetchGraphData(selectedEmployee.employeeId, selectedMonth);
    }
  }, [selectedMonth, selectedEmployee]);

  return (
    <ManagerOpsLayout>
      <div className="min-h-screen font-sans bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="p-6">
          {/* Header */}
          <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
            <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
              <FaUser className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Team Overview
              </h1>
              <p className="text-white text-base opacity-90">
                View details of employees in the "Exozen-Ops" project.
              </p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
            </div>
          ) : employees.length === 0 ? (
            <div className="bg-yellow-50 text-yellow-600 p-6 rounded-2xl flex items-center gap-3 max-w-lg mx-auto shadow-lg">
              <FaUser className="w-6 h-6 flex-shrink-0" />
              <p className="text-lg font-medium">
                No employees found in the "Exozen-Ops" project.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Employee Details Cards */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Employee Details</h2>
                <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2">
                  {employees.map((employee) => (
                    <div
                      key={employee.employeeId}
                      className={`bg-white rounded-xl border border-gray-200 p-4 transition-all duration-200 hover:shadow-md ${
                        selectedEmployee?.employeeId === employee.employeeId
                          ? 'ring-2 ring-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                          {employee.employeeImage ? (
                            <img
                              src={employee.employeeImage}
                              alt={employee.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-100">
                              <FaUser className="w-8 h-8 text-blue-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-lg font-semibold text-gray-800">{employee.fullName}</h3>
                          <p className="text-sm text-gray-600">{employee.designation}</p>
                          <p className="text-xs text-gray-500 mt-1">ID: {employee.employeeId}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            fetchGraphData(employee.employeeId, selectedMonth);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedEmployee?.employeeId === employee.employeeId
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          {selectedEmployee?.employeeId === employee.employeeId ? 'Selected' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graph Section */}
              <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  {selectedEmployee
                    ? `Attendance Summary for ${selectedEmployee.fullName}`
                    : "Select an Employee"}
                </h2>
                {selectedEmployee && graphData ? (
                  <div className="flex flex-col gap-8 w-full">
                    {/* Employee Image */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
                        {selectedEmployee.employeeImage ? (
                          <img
                            src={selectedEmployee.employeeImage}
                            alt={selectedEmployee.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FaUser className="w-20 h-20 text-blue-500" />
                        )}
                      </div>
                    </div>
                    {/* Summary Section */}
                    {/* Graphs Section */}
                   
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="mb-4">
                  <label
                    htmlFor="month-select"
                    className="block text-lg font-medium text-gray-700 mb-2"
                  >
                    Select Month:
                  </label>
                  <select
                    id="month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                   {/* Punctuality Issues */}
                      <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                          Punctuality Issues
                        </h3>
                        <div className="flex justify-center items-center">
                          <div className="relative w-32 h-32">
                            <svg
                              className="absolute top-0 left-0 w-full h-full"
                              viewBox="0 0 36 36"
                            >
                              <path
                                className="circle-bg"
                                d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#e6e6e6"
                                strokeWidth="3.8"
                              />
                              <path
                                className="circle"
                                d="M18 2.0845
    a 15.9155 15.9155 0 0 1 0 31.831
    a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#FFC107"
                                strokeWidth="3.8"
                                strokeDasharray={`${graphData?.attendanceRate?.replace('%', '') || 0}, 100`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-gray-800">
                                {graphData.attendanceRate || "0%"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                </div>
                      {/* Attendance Summary */}
                      <div className="bg-gray-50 rounded-lg p-6 shadow-md w-full">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                          Attendance Summary
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {graphData.totalDays > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Total Days:</strong> {graphData.totalDays}
                            </p>
                          )}
                          {graphData.presentDays > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Present Days:</strong> {graphData.presentDays}
                            </p>
                          )}
                          {graphData.halfDays > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Half Days:</strong> {graphData.halfDays}
                            </p>
                          )}
                          {graphData.partiallyAbsentDays > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Partially Absent Days:</strong> {graphData.partiallyAbsentDays}
                            </p>
                          )}
                          {graphData.weekOffs > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Week Offs:</strong> {graphData.weekOffs}
                            </p>
                          )}
                          {graphData.holidays > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Holidays:</strong> {graphData.holidays}
                            </p>
                          )}
                          {graphData.el > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Earned Leave (EL):</strong> {graphData.el}
                            </p>
                          )}
                          {graphData.sl > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Sick Leave (SL):</strong> {graphData.sl}
                            </p>
                          )}
                          {graphData.cl > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Casual Leave (CL):</strong> {graphData.cl}
                            </p>
                          )}
                          {graphData.compOff > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Comp Off:</strong> {graphData.compOff}
                            </p>
                          )}
                          {graphData.lop > 0 && (
                            <p className="text-lg font-medium text-gray-700">
                              <strong>Loss of Pay (LOP):</strong> {graphData.lop}
                            </p>
                          )}
                        </div>
                      </div>

                     
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">No employee selected.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ManagerOpsLayout>
  );
};

export default TeamOverviewPage;
