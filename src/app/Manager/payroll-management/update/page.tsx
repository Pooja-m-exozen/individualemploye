"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaMoneyBillWave, FaUser, FaCheckCircle, FaSpinner, FaInfoCircle } from "react-icons/fa";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
}

const steps = [
  { id: 0, title: "Select Employee", icon: FaUser },
  { id: 1, title: "Update Payroll", icon: FaMoneyBillWave },
];

export default function PayrollUpdatePage() {
  const { theme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrollAmount, setPayrollAmount] = useState("");
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Fetch employee details when selectedEmployee changes
  useEffect(() => {
    if (!selectedEmployee) {
      setEmployeeDetails(null);
      return;
    }
    fetch(`https://cafm.zenapi.co.in/api/kyc?employeeId=${selectedEmployee}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.kycForms && data.kycForms.length > 0) {
          const emp = data.kycForms[0].personalDetails;
          setEmployeeDetails({
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            designation: emp.designation,
          });
        } else {
          setEmployeeDetails(null);
        }
      });
  }, [selectedEmployee]);

  useEffect(() => {
    if (!selectedEmployee || activeStep !== 1) return;
    setLoadingAttendance(true);
    fetch(
      `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${selectedEmployee}&month=${month}&year=${year}`
    )
      .then((res) => res.json())
      .then((data) => setAttendanceData(data.attendance || []))
      .finally(() => setLoadingAttendance(false));
  }, [selectedEmployee, month, year, activeStep]);

  const calculateStatus = (punchInTime: string | null, punchOutTime: string | null): string => {
    if (!punchInTime || !punchOutTime) return "A";
    const hoursWorked = (new Date(punchOutTime).getTime() - new Date(punchInTime).getTime()) / (1000 * 60 * 60);
    if (hoursWorked >= 8) return "P";
    return "A";
  };
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "P": return "bg-green-100 text-green-700";
      case "A": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Step 1: Select Employee (with instructions/notes)
  const renderSelectEmployee = () => (
    <div className="space-y-8">
      <div className={`rounded-xl p-6 border shadow flex flex-col gap-4 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}>
        <h2 className={`text-xl font-bold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
          <FaUser className={theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} /> Select Employee
        </h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Employee</label>
            <input
              type="text"
              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-200 text-black placeholder-gray-400'}`}
              placeholder="Employee name or ID"
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Month</label>
            <select
              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Year</label>
            <select
              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {[2025, 2024, 2023].map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Instructions/Notes Card */}
      <div className={`rounded-xl p-5 flex items-start gap-4 border ${theme === 'dark' ? 'bg-blue-950 border-blue-900' : 'bg-blue-50 border-blue-100'}`}>
        <div className={`p-3 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
          <FaInfoCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
        </div>
        <div>
          <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Instructions</h3>
          <ul className={`list-disc ml-5 text-sm space-y-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
            <li>Select the employee, month, and year to update payroll and view attendance.</li>
            <li>Ensure the employee details are correct before proceeding.</li>
            <li>Attendance for the selected month will be shown in the next step.</li>
            <li>Contact HR if you do not find the employee in the list.</li>
          </ul>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          className={`px-8 py-3 rounded-xl text-white font-medium transition-all ${selectedEmployee ? (theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700') : (theme === 'dark' ? 'bg-blue-900 cursor-not-allowed' : 'bg-blue-300 cursor-not-allowed')}`}
          disabled={!selectedEmployee}
          onClick={() => setActiveStep(1)}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Step 2: Update Payroll (with employee details and total payable days)
  const renderUpdatePayroll = () => {
    // Prepare attendance for each day of the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendanceByDate: Record<string, any> = {};
    attendanceData.forEach((att) => {
      attendanceByDate[att.date] = att;
    });
    let totalPayable = 0;
    const attendanceRow = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month - 1, i + 1).toISOString().split("T")[0];
      const att = attendanceByDate[date];
      const status = att ? calculateStatus(att.punchInTime, att.punchOutTime) : "A";
      if (status === "P") totalPayable++;
      return { status, date };
    });
    return (
      <div className="space-y-8">
        <div className={`rounded-xl p-6 border shadow flex flex-col gap-4 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-blue-100'}`}>
          <h2 className={`text-xl font-bold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
            <FaMoneyBillWave className={theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} /> Update Payroll
          </h2>
          {/* Employee Details */}
          {employeeDetails && (
            <div className={`mb-4 p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-2 ${theme === 'dark' ? 'bg-blue-950 border border-blue-900' : 'bg-blue-50 border border-blue-100'}`}>
              <div className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-900'}`}>{employeeDetails.fullName}</div>
              <div className={`text-sm md:ml-4 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>ID: {employeeDetails.employeeId}</div>
              <div className={`text-sm md:ml-4 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Designation: {employeeDetails.designation}</div>
            </div>
          )}
          <form
            className="space-y-6"
            onSubmit={e => {
              e.preventDefault();
              // handle submit
            }}
          >
            <div className="flex gap-4">
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Month</label>
                <input type="text" className={`w-full px-4 py-2 rounded-lg border bg-gray-100 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`} value={new Date(0, month - 1).toLocaleString("default", { month: "long" })} disabled />
              </div>
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Year</label>
                <input type="text" className={`w-full px-4 py-2 rounded-lg border bg-gray-100 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`} value={year} disabled />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Amount</label>
              <input
                type="number"
                className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-200 text-black placeholder-gray-400'}`}
                placeholder="Amount"
                value={payrollAmount}
                onChange={e => setPayrollAmount(e.target.value)}
                required
              />
            </div>
            {/* Attendance Row */}
            <div className="mt-6">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Attendance for {new Date(0, month - 1).toLocaleString("default", { month: "long" })} {year}</label>
              <div className="overflow-x-auto">
                {loadingAttendance ? (
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}><FaSpinner className="animate-spin" /> Loading attendance...</div>
                ) : (
                  <table className={`w-full rounded-lg shadow-md overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                    <thead>
                      <tr>
                        {attendanceRow.map((_, i) => (
                          <th key={i} className={`p-2 text-xs font-semibold text-center border-b ${theme === 'dark' ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-b'}`}>{i + 1}</th>
                        ))}
                        <th className={`p-2 text-xs font-semibold text-center border-b ${theme === 'dark' ? 'text-blue-300 border-gray-700' : 'text-blue-700 border-b'}`}>Total Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {attendanceRow.map((cell, i) => (
                          <td key={i} className={`p-2 text-center font-bold ${getStatusColor(cell.status)} ${theme === 'dark' ? 'bg-gray-800' : ''}`}>{cell.status}</td>
                        ))}
                        <td className={`p-2 text-center font-bold ${theme === 'dark' ? 'text-blue-200 bg-blue-950' : 'text-blue-700 bg-blue-50'}`}>{totalPayable}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <button type="button" className={`px-8 py-3 rounded-xl font-medium border ${theme === 'dark' ? 'text-blue-300 border-blue-900 bg-blue-950 hover:bg-blue-900' : 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'}`} onClick={() => setActiveStep(0)}>
                Previous
              </button>
              <button type="submit" className={`px-8 py-3 rounded-xl text-white font-medium ${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'}`}>
                Update Payroll
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
        {/* Modern Blue Gradient Header (like KYC Edit) */}
        <div className="mb-8">
          <div className={`flex items-center gap-6 rounded-2xl px-8 py-8 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-800' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}>
            <div className={`flex items-center justify-center w-16 h-16 rounded-xl ${theme === 'dark' ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-500 bg-opacity-30'}`}>
              <FaMoneyBillWave className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Update Payroll</h1>
              <p className={`text-lg ${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>Update payroll details and view attendance for employees</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Sidebar Stepper with Instructions/Notes */}
          <div className={`lg:w-96 w-full lg:h-auto h-28 flex flex-col gap-4 p-4 border-r shadow-lg sticky top-0 z-10 ${theme === 'dark' ? 'bg-gray-900 border-blue-900' : 'bg-white border-blue-100'}`}>
            {/* Instructions/Notes Card */}
            <div className={`rounded-xl p-5 flex items-start gap-4 border ${theme === 'dark' ? 'bg-blue-950 border-blue-900' : 'bg-blue-50 border-blue-100'}`}>
              <div className={`p-3 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
                <FaInfoCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Instructions</h3>
                <ul className={`list-disc ml-5 text-sm space-y-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <li>Select the employee, month, and year to update payroll and view attendance.</li>
                  <li>Ensure the employee details are correct before proceeding.</li>
                  <li>Attendance for the selected month will be shown in the next step.</li>
                  <li>Contact HR if you do not find the employee in the list.</li>
                </ul>
              </div>
            </div>
            {/* Stepper Buttons */}
            <div className="flex lg:flex-col flex-row gap-2">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                const isCompleted = activeStep > idx;
                return (
                  <button
                    key={step.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-colors font-medium text-left ${
                      isActive
                        ? theme === 'dark' ? 'bg-blue-950 text-blue-300' : 'bg-blue-50 text-blue-700'
                        : isCompleted
                        ? theme === 'dark' ? 'bg-green-950 text-green-300' : 'bg-green-50 text-green-700'
                        : theme === 'dark' ? 'text-gray-400 hover:bg-blue-950' : 'text-gray-500 hover:bg-blue-50'
                    }`}
                    onClick={() => {
                      if (isCompleted || isActive) setActiveStep(idx);
                    }}
                    disabled={!isCompleted && !isActive}
                  >
                    <step.icon className="w-5 h-5" />
                    <span>{step.title}</span>
                    {isCompleted && <FaCheckCircle className={`w-4 h-4 ml-auto ${theme === 'dark' ? 'text-green-300' : 'text-green-500'}`} />}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Main Content */}
          <div className="flex-1 p-6 flex flex-col gap-8 max-w-3xl mx-auto">
            {/* Step Content */}
            <div className="flex-1">
              {activeStep === 0 && renderSelectEmployee()}
              {activeStep === 1 && renderUpdatePayroll()}
            </div>
          </div>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}