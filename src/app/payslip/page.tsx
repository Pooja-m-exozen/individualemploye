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
        </div>        {/* Main Content */}        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print-payslip-area p-6">
          {/* Company Header */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <img src="/exozen_logo.png" alt="Company Logo" className="h-12" />
                <div>                  <h2 className="text-xl font-bold text-black">Exozen Pvt Ltd</h2>
                  <p className="text-black text-sm">25/1, 4th Floor, SKIP House, Museum Rd, near Brigade Tower</p>
                  <p className="text-black text-sm">Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560025</p>
                </div>
              </div>              <div className="text-right">
                <h3 className="text-lg font-semibold text-black">Salary Slip</h3>
                <p className="text-black text-sm">For {new Date(payslip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Employee Information */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div>
              <p className="text-black">Employee ID</p>
              <p className="font-semibold text-black">{payslip.employeeId}</p>
            </div>            <div>
              <p className="text-black">Pay Period</p>
              <p className="font-semibold text-black">{payslip.month}</p>
            </div>
            <div>
              <p className="text-black">Payment Date</p>
              <p className="font-semibold text-black">{new Date(payslip.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
            <div className="border rounded p-2">
              <p className="text-black">Working Days</p>
              <p className="font-semibold text-black">{payslip.totalWorkingDays}</p>
            </div>            <div className="border rounded p-2">
              <p className="text-black">Present Days</p>
              <p className="font-semibold text-black">{payslip.presentDays}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-black">Absent Days</p>
              <p className="font-semibold text-black">{payslip.absentDays}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-black">Half Days</p>
              <p className="font-semibold text-black">{payslip.halfDays}</p>
            </div>
          </div>

          {/* Salary Details */}
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="border rounded-lg p-4">
              <h3 className="text-black font-semibold mb-3">Earnings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black">Basic Salary</span>
                  <span className="font-semibold text-black">₹{payslip.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">HRA</span>
                  <span className="font-semibold text-black">₹{payslip.hra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">VDA</span>
                  <span className="font-semibold text-black">₹{payslip.vda.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-black">Total Earnings</span>
                    <span className="text-black">₹{payslip.totalEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border rounded-lg p-4">
              <h3 className="text-black font-semibold mb-3">Deductions</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black">PF</span>
                  <span className="font-semibold text-black">₹{payslip.deductions.pf.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">ESI</span>
                  <span className="font-semibold text-black">₹{payslip.deductions.esi.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">PT</span>
                  <span className="font-semibold text-black">₹{payslip.deductions.pt.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-black">Total Deductions</span>
                    <span className="text-black">₹{payslip.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-black">Net Salary</h2>
                <p className="text-black text-sm">Total amount for {new Date(payslip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-black">₹{payslip.netPay.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-xs text-black mt-6 pt-4 border-t">
            <p>This is a computer-generated document. No signature required.</p>
            <p>For any queries, please contact HR department</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PayslipPage;