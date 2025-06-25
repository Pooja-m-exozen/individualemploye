'use client'

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {  FaExclamationCircle, FaSync, FaDownload, FaPrint, FaCalendarAlt, FaFileInvoiceDollar } from 'react-icons/fa';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from "@/context/ThemeContext";

interface Deductions {
  pf: number;
  esi: number;
  pt: number;
  medicalInsurance: number;
  uniformDeduction: number;
  roomRent: number;
}

interface Payslip {
  deductions: Deductions;
  _id: string;
  employeeId: string;
  month: string;
  totalWorkingDays: number;
  basicSalary: number;
  basicPlusVDA: number;
  vda: number;
  hra: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  otherAllowance: number;
  otAmount: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  otDays: number;
  createdAt: string;
  updatedAt: string;
}

interface PayslipResponse {
  message: string;
  payslip: Payslip;
}

const PayslipPage = () => {
  const router = useRouter();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('2023-05');
  const { theme } = useTheme();

  const fetchPayslip = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }
      const response = await fetch(`https://cafm.zenapi.co.in/api/payslip/${employeeId}/${selectedMonth}`);
      const data: PayslipResponse = await response.json();

      if (data.message === "Payslip retrieved successfully." && data.payslip) {
        setPayslip(data.payslip);
      } else if (data.message === "Payslip not found for the selected month and employee ID." || !data.payslip) {
         setPayslip(null);
         setError(null); // Clear any previous error
      } else {
        throw new Error(data.message || 'Failed to fetch payslip');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch payslip');
      setPayslip(null); // Ensure payslip is null on error
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchPayslip();
  }, [router, fetchPayslip]);

  const handleDownload = async () => {
    if (typeof window !== 'undefined') {
      const input = document.querySelector('.print-payslip-area') as HTMLElement;
      if (input) {
        try {
          // Add PDF generation class before generating
          input.classList.add('generating-pdf');
          
          const imgData = await domtoimage.toPng(input, { 
            quality: 0.95,
            style: {
              'border-collapse': 'collapse',
              'table': {
                'border': '2px solid #1f2937'
              },
              'td, th': {
                'border': '2px solid #1f2937'
              }
            }
          });
          
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
          const imgHeight = (input.offsetHeight * imgWidth) / input.offsetWidth;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position + pageHeight, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
          
          pdf.save(`payslip-${payslip?.month}.pdf`);
          
          // Remove PDF generation class after generating
          input.classList.remove('generating-pdf');
        } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF. Please check the console for details.');
        }
      } else {
        alert('Could not find the payslip area to download. Make sure the class "print-payslip-area" is applied.');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className={`min-h-screen flex items-center justify-center p-6 ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto">
              <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-lg text-gray-600 font-medium">Loading your payslip...</p>
            <p className="text-sm text-gray-500">This may take a moment</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className={`min-h-screen flex items-center justify-center p-6 ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className={`${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          } rounded-2xl shadow-lg p-8 max-w-md w-full`}>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto text-red-500">
                <FaExclamationCircle className="w-full h-full" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Error Loading Payslip</h3>
              <p className="text-gray-600">{error}</p>
              <button 
                onClick={fetchPayslip}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 font-medium"
              >
                <FaSync className="w-5 h-5" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!payslip && !loading && !error) {
    return (
      <DashboardLayout>
        <div className={`min-h-screen flex items-center justify-center p-6 ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className={`${
            theme === 'dark' 
              ? 'bg-gray-800 text-gray-200' 
              : 'bg-white text-gray-900'
          } rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4`}>
            <FaFileInvoiceDollar className={`w-16 h-16 mx-auto ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>No Payslip Found</h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              There is no payslip available for the selected month.
            </p>
            <div className="relative max-w-xs mx-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl outline-none ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'bg-white border-gray-200 text-gray-900'
                } border focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              <FaCalendarAlt className={
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              } />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!payslip) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className={`rounded-xl shadow-lg mb-8 p-8 ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-gray-800 to-gray-700'
            : 'bg-gradient-to-r from-blue-600 to-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FaFileInvoiceDollar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-white'}`}>Payslip Dashboard</h1>
                <p className={`${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'} mt-1`}>View and download your monthly salary details</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all placeholder-white/70"
                />
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all duration-300 flex items-center gap-2"
                >
                  <FaDownload className="w-5 h-5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all duration-300 flex items-center gap-2"
                >
                  <FaPrint className="w-5 h-5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payslip Content */}
        <div className={`print-payslip-area rounded-lg p-8 border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`p-6 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-start gap-6">
              <div className="relative h-16 w-auto">
                <Image 
                  src="/v1/employee/exozen_logo.png" 
                  alt="Company Logo" 
                  width={64}
                  height={64}
                  className="h-16 w-auto"
                  priority
                />
              </div>
              <div className="flex-1">
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}>M/s Exozen Private Limited.,</h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                  No.25/1, 4th Floor, Shantala Nagar, Brigade Road, Museum Road,<br />
                  Ashok Nagar, Bengaluru, Karnataka - 560025
                </p>
              </div>
            </div>
            <div className="text-center mt-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}>Pay Slip for the month of {new Date(payslip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            </div>
          </div>

          {/* Employee Details */}
          <div className="p-6">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className={`border p-2 w-1/4 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Employee ID:
                  </td>
                  <td className={`border p-2 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.employeeId}
                  </td>
                  <td className={`border p-2 w-1/4 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Paid Days:
                  </td>
                  <td className={`border p-2 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.presentDays}
                  </td>
                </tr>
                <tr>
                  <td className={`border p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Employee Name:
                  </td>
                  <td className={`border p-2 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    SHIVANYA D N
                  </td>
                  <td className={`border p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    LOP Days:
                  </td>
                  <td className={`border p-2 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.absentDays}
                  </td>
                </tr>
                <tr>
                  <td className={`border p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Designation:
                  </td>
                  <td className={`border p-2 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    IOT Developer
                  </td>
                  <td className={`border p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    ESIC No:
                  </td>
                  <td className={`border p-2 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    EXEMTED
                  </td>
                </tr>
                <tr>
                  <td className={`border p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    UAN No:
                  </td>
                  <td className={`border p-2 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    EXEMTED
                  </td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>

            {/* Earnings and Deductions */}
            <table className={`w-full border-collapse mt-6 ${
              theme === 'dark' ? 'text-gray-200' : 'text-black'
            }`}>
              <thead>
                <tr>
                  <th className={`border border-gray-300 p-2 text-left w-1/4 ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-black'
                  }`}>
                    Earnings
                  </th>
                  <th className={`border border-gray-300 p-2 text-left w-1/4 ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-black'
                  }`}>
                    Amount
                  </th>
                  <th className={`border border-gray-300 p-2 text-left w-1/4 ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-black'
                  }`}>
                    Deductions
                  </th>
                  <th className={`border border-gray-300 p-2 text-left w-1/4 ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-black'
                  }`}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Basic+VDA
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.basicPlusVDA.toFixed(2)}
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    PF
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.deductions.pf.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    HRA
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.hra.toFixed(2)}
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    ESI
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.deductions.esi.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Conveyance Allowance
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.conveyanceAllowance.toFixed(2)}
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    PT
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.deductions.pt.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Other Allowances
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.otherAllowance.toFixed(2)}
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Salary Adv.
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    0.00
                  </td>
                </tr>
                <tr>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Spl. Allowance
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.specialAllowance.toFixed(2)}
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Uniform Ded.
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.deductions.uniformDeduction.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Wash. Allowances
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    0.00
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Room rent
                  </td>
                  <td className={`border border-gray-300 p-2 font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.deductions.roomRent.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className={`border border-gray-300 p-2 font-semibold ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Total Amount
                  </td>
                  <td className={`border border-gray-300 p-2 font-semibold ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.totalEarnings.toFixed(2)}
                  </td>
                  <td className={`border border-gray-300 p-2 font-semibold ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    Total Deductions
                  </td>
                  <td className={`border border-gray-300 p-2 font-semibold ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-200'
                      : 'border-gray-300 text-black'
                  }`}>
                    {payslip.totalDeductions.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Net Pay */}
            <div className={`mt-6 border p-4 ${
              theme === 'dark'
                ? 'border-gray-700 text-gray-200'
                : 'border-gray-300 text-black'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black">Net Pay:</span>
                <span className="font-semibold text-black">{payslip.netPay.toFixed(2)} (Twenty Three Thousand Five Hundred only)</span>
              </div>
            </div>

            {/* Footer Note */}
            <div className={`mt-6 text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <p>Please Note: This is system generated Pay Slip, this does not require any signature for authentication.</p>
            </div>
          </div>
        </div>

        {/* Print and PDF styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-payslip-area, .print-payslip-area * {
              visibility: visible;
              color: black !important;
              background: white !important;
            }
            .print-payslip-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print-payslip-area table {
              border-collapse: collapse;
              width: 100%;
            }
            .print-payslip-area td,
            .print-payslip-area th {
              border: 2px solid #1f2937 !important;
              padding: 8px !important;
            }
            .print-payslip-area tr {
              border: 2px solid #1f2937 !important;
            }
            @page {
              margin: 20mm;
              size: auto;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default PayslipPage;