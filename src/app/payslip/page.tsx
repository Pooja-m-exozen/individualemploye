'use client'

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { FaSpinner, FaExclamationCircle, FaSync, FaDownload, FaPrint, FaCalendarAlt, FaUser, FaMoneyBillWave, FaFileInvoiceDollar } from 'react-icons/fa';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';

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
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('2023-05');

  useEffect(() => {
    fetchPayslip();
  }, [selectedMonth]);

  const fetchPayslip = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`https://cafm.zenapi.co.in/api/payslip/EFMS3295/${selectedMonth}`);
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
  };

  const handleDownload = async () => {
    if (typeof window !== 'undefined') {
      const input = document.querySelector('.print-payslip-area') as HTMLElement;
      if (input) {
        try {
          const imgData = await (domtoimage as any).toPng(input, { quality: 0.95 });
          
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
        } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF. Please check the console for details.');
        }
      } else {
        alert('Could not find the payslip area to download. Make sure the class "print-payslip-area" is applied.');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading payslip data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <FaExclamationCircle className="w-full h-full" />
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchPayslip}
              className="px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors inline-flex items-center gap-2"
            >
              <FaSync className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!payslip && !loading && !error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <p className="text-gray-600 text-lg">No payslip found for the selected month.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!payslip) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payslip Management</h1>
            <p className="text-gray-600 mt-1">View and manage your monthly salary details</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
              />
              <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FaDownload className="text-gray-600" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print-payslip-area">
          {/* Payslip Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <FaUser className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Monthly Payslip</h2>
                <p className="text-blue-100">Employee ID: {payslip.employeeId}</p>
              </div>
            </div>
          </div>

          {/* Payslip Details */}
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <FaUser className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Month</p>
                    <p className="font-medium text-gray-900">{payslip.month}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Working Days</p>
                    <p className="font-medium text-gray-900">{payslip.totalWorkingDays}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Present Days</p>
                    <p className="font-medium text-gray-900">{payslip.presentDays}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Absent Days</p>
                    <p className="font-medium text-gray-900">{payslip.absentDays}</p>
                  </div>
                </div>
              </div>

              {/* Earnings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <FaMoneyBillWave className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Earnings</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Basic Salary</p>
                    <p className="font-medium text-gray-900">₹{payslip.basicSalary.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">HRA</p>
                    <p className="font-medium text-gray-900">₹{payslip.hra.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">VDA</p>
                    <p className="font-medium text-gray-900">₹{payslip.vda.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="font-medium text-gray-900">₹{payslip.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <FaFileInvoiceDollar className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Deductions</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">PF</p>
                    <p className="font-medium text-gray-900">₹{payslip.deductions.pf.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">ESI</p>
                    <p className="font-medium text-gray-900">₹{payslip.deductions.esi.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">PT</p>
                    <p className="font-medium text-gray-900">₹{payslip.deductions.pt.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Deductions</p>
                    <p className="font-medium text-gray-900">₹{payslip.totalDeductions.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <FaFileInvoiceDollar className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Half Days</p>
                    <p className="font-medium text-gray-900">{payslip.halfDays}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">OT Days</p>
                    <p className="font-medium text-gray-900">{payslip.otDays}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">OT Amount</p>
                    <p className="font-medium text-gray-900">₹{payslip.otAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Generated On</p>
                    <p className="font-medium text-gray-900">{new Date(payslip.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="mt-8">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Net Pay</h2>
                <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
                  <p className="text-lg text-gray-700 font-medium">Total Net Salary</p>
                  <p className="text-2xl font-bold text-blue-700">₹{payslip.netPay.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PayslipPage; 