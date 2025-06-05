'use client'

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {  FaExclamationCircle, FaSync, FaDownload, FaPrint, FaCalendarAlt, FaFileInvoiceDollar } from 'react-icons/fa';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
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
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
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
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
            <FaFileInvoiceDollar className="w-16 h-16 mx-auto text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900">No Payslip Found</h3>
            <p className="text-gray-600">There is no payslip available for the selected month.</p>
            <div className="relative max-w-xs mx-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FaFileInvoiceDollar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">Payslip Dashboard</h1>
                <p className="text-blue-100 mt-1">View and download your monthly salary details</p>
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
        <div className="print-payslip-area bg-white border border-gray-200 rounded-lg p-8">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start gap-6">
              <div className="relative h-16 w-auto">
                <Image 
                  src="/exozen_logo.png" 
                  alt="Company Logo" 
                  width={64}
                  height={64}
                  className="h-16 w-auto"
                  priority
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-black">M/s Exozen Private Limited.,</h2>
                <p className="text-sm text-gray-900 mt-1">
                  No.25/1, 4th Floor, Shantala Nagar, Brigade Road, Museum Road,<br />
                  Ashok Nagar, Bengaluru, Karnataka - 560025
                </p>
              </div>
            </div>
            <div className="text-center mt-4">
              <h3 className="text-lg font-semibold text-black">Pay Slip for the month of {new Date(payslip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            </div>
          </div>

          {/* Employee Details */}
          <div className="p-6">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 w-1/4 text-black font-medium">Employee ID:</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.employeeId}</td>
                  <td className="border border-gray-300 p-2 w-1/4 text-black font-medium">Paid Days:</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.presentDays}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">Employee Name:</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">SHIVANYA D N</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">LOP Days:</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.absentDays}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">Designation:</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">IOT Developer</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">ESIC No:</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">EXEMTED</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">UAN No:</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">EXEMTED</td>
                  <td className="border border-gray-300 p-2"></td>
                  <td className="border border-gray-300 p-2"></td>
                </tr>
              </tbody>
            </table>

            {/* Earnings and Deductions */}
            <table className="w-full border-collapse mt-6">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 text-left w-1/4 text-black">Earnings</th>
                  <th className="border border-gray-300 p-2 text-left w-1/4 text-black">Amount</th>
                  <th className="border border-gray-300 p-2 text-left w-1/4 text-black">Deductions</th>
                  <th className="border border-gray-300 p-2 text-left w-1/4 text-black">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">Basic+VDA</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.basicPlusVDA.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">PF</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.deductions.pf.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">HRA</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.hra.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">ESI</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.deductions.esi.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">Conveyance Allowance</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.conveyanceAllowance.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">PT</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.deductions.pt.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">Other Allowances</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.otherAllowance.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">Salary Adv.</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">0.00</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">Spl. Allowance</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.specialAllowance.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">Uniform Ded.</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.deductions.uniformDeduction.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-medium">Wash. Allowances</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">0.00</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">Room rent</td>
                  <td className="border border-gray-300 p-2 text-black font-medium">{payslip.deductions.roomRent.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 text-black font-semibold">Total Amount</td>
                  <td className="border border-gray-300 p-2 text-black font-semibold">{payslip.totalEarnings.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-black font-semibold">Total Deductions</td>
                  <td className="border border-gray-300 p-2 text-black font-semibold">{payslip.totalDeductions.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Net Pay */}
            <div className="mt-6 border border-gray-300 p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black">Net Pay:</span>
                <span className="font-semibold text-black">{payslip.netPay.toFixed(2)} (Twenty Three Thousand Five Hundred only)</span>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-6 text-sm text-gray-600">
              <p>Please Note: This is system generated Pay Slip, this does not require any signature for authentication.</p>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-payslip-area, .print-payslip-area * {
              visibility: visible;
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

        {/* Add specific styles for PDF download */}
        <style jsx global>{`
          .print-payslip-area table {
            border-collapse: collapse;
            width: 100%;
          }
          .print-payslip-area td,
          .print-payslip-area th {
            border: 1px solid #e5e7eb;
          }
          /* These styles will only apply during PDF generation */
          .print-payslip-area.generating-pdf table {
            border: 2px solid #1f2937;
          }
          .print-payslip-area.generating-pdf td,
          .print-payslip-area.generating-pdf th {
            border: 2px solid #1f2937;
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default PayslipPage;