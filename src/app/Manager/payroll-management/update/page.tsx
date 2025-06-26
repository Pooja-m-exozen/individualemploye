"use client";
import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaMoneyBillWave, FaUser, FaCheckCircle, FaSpinner, FaInfoCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

interface Employee {
  employeeId: string;
  fullName: string;
  designation: string;
}

interface Attendance {
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
}

interface PayrollDetails {
  basicSalary: number;
  hrAllowance: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  otherAllowance: number;
  pf: number;
  esi: number;
  pt: number;
  medicalInsurance: number;
  uniformDeduction: number;
  roomRent: number;
  washingAllowance?: number;
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
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetails | null>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [payrollSuccess, setPayrollSuccess] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>("");

  // Fetch employee details when searchInput changes
  useEffect(() => {
    if (!searchInput) {
      setEmployeeDetails(null);
      setPayrollDetails(null);
      setSelectedEmployee("");
      return;
    }
    fetch(`https://cafm.zenapi.co.in/api/kyc`)
      .then((res) => res.json())
      .then((data) => {
        if (data.kycForms && data.kycForms.length > 0) {
          // Find by employeeId or fullName (case-insensitive, partial match)
          const input = searchInput.trim().toLowerCase();
          const match = data.kycForms.find((k: any) => {
            const pd = k.personalDetails;
            return (
              pd.employeeId?.toLowerCase().includes(input) ||
              pd.fullName?.toLowerCase().includes(input)
            );
          });
          if (match) {
            const pd = match.personalDetails;
            setEmployeeDetails({
              employeeId: pd.employeeId,
              fullName: pd.fullName,
              designation: pd.designation,
            });
            setSelectedEmployee(pd.employeeId);
          } else {
            setEmployeeDetails(null);
            setSelectedEmployee("");
          }
        } else {
          setEmployeeDetails(null);
          setSelectedEmployee("");
        }
      });
  }, [searchInput]);

  // Fetch employee details and payroll when selectedEmployee changes
  useEffect(() => {
    if (!selectedEmployee) {
      setEmployeeDetails(null);
      setPayrollDetails(null);
      return;
    }
    // Always fetch latest employee details for selectedEmployee
    fetch(`https://cafm.zenapi.co.in/api/kyc?employeeId=${selectedEmployee}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.kycForms && data.kycForms.length > 0) {
          const pd = data.kycForms[0].personalDetails;
          setEmployeeDetails({
            employeeId: pd.employeeId,
            fullName: pd.fullName,
            designation: pd.designation,
          });
        } else {
          setEmployeeDetails(null);
        }
      });
    // Fetch payroll details for the selected employee (POST)
    setPayrollLoading(true);
    setPayrollError(null);
    fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/employees/${selectedEmployee}/payroll-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: selectedEmployee }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch payroll details of the selected employee");
        return res.json();
      })
      .then((data) => {
        if (data.data) {
          setPayrollDetails({
            basicSalary: data.data.basicSalary || 0,
            hrAllowance: data.data.hrAllowance || 0,
            conveyanceAllowance: data.data.conveyanceAllowance || 0,
            specialAllowance: data.data.specialAllowance || 0,
            otherAllowance: data.data.otherAllowance || 0,
            pf: data.data.pf || 0,
            esi: data.data.esi || 0,
            pt: data.data.pt || 0,
            medicalInsurance: data.data.medicalInsurance || 0,
            uniformDeduction: data.data.uniformDeduction || 0,
            roomRent: data.data.roomRent || 0,
            washingAllowance: data.data.washingAllowance || 0,
          });
        } else {
          setPayrollDetails(null);
          setPayrollError("No payroll details found for the selected employee");
        }
      })
      .catch(() => setPayrollError("Failed to fetch payroll details of the selected employee"))
      .finally(() => setPayrollLoading(false));
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
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
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
          className={`px-8 py-3 rounded-xl text-white font-medium transition-all ${employeeDetails ? (theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700') : (theme === 'dark' ? 'bg-blue-900 cursor-not-allowed' : 'bg-blue-300 cursor-not-allowed')}`}
          disabled={!employeeDetails}
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
    const attendanceByDate: Record<string, Attendance> = {};
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
          {payrollLoading && (
            <div className="text-blue-500 flex items-center gap-2"><FaSpinner className="animate-spin" /> Loading payroll details...</div>
          )}
          {payrollError && (
            <div className="text-red-500">{payrollError}</div>
          )}
          {payrollSuccess && (
            <div className="text-green-600">{payrollSuccess}</div>
          )}
          <form
            className="space-y-6"
            onSubmit={async e => {
              e.preventDefault();
              setPayrollError(null);
              setPayrollSuccess(null);
              setPayrollLoading(true);
              try {
                const res = await fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/employees/${selectedEmployee}/payroll-details`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    employeeId: selectedEmployee,
                    ...payrollDetails,
                  }),
                });
                const data = await res.json();
                if (res.ok && data.message) {
                  setPayrollSuccess(data.message);
                } else {
                  setPayrollError(data.message || "Failed to update payroll");
                }
              } catch {
                setPayrollError("Failed to update payroll");
              } finally {
                setPayrollLoading(false);
              }
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
            {/* Payroll Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Basic Salary</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.basicSalary ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, basicSalary: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>HR Allowance</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.hrAllowance ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, hrAllowance: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Conveyance Allowance</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.conveyanceAllowance ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, conveyanceAllowance: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Special Allowance</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.specialAllowance ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, specialAllowance: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Other Allowance</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.otherAllowance ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, otherAllowance: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>PF</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.pf ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, pf: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>ESI</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.esi ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, esi: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>PT</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.pt ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, pt: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Medical Insurance</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.medicalInsurance ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, medicalInsurance: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Uniform Deduction</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.uniformDeduction ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, uniformDeduction: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Room Rent</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.roomRent ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, roomRent: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>Washing Allowance</label>
                <input
                  type="number"
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200 text-black'}`}
                  value={payrollDetails?.washingAllowance ?? ""}
                  onChange={e => setPayrollDetails(d => ({ ...d!, washingAllowance: Number(e.target.value) }))}
                />
              </div>
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
              <button
                type="submit"
                className={`px-8 py-3 rounded-xl text-white font-medium ${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={payrollLoading}
              >
                {payrollLoading ? <span className="flex items-center gap-2"><FaSpinner className="animate-spin" /> Updating...</span> : "Update Payroll"}
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