"use client";

import React, { useState, useEffect, useRef } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaIdCard, FaSpinner, FaDownload, FaSearch, FaEye, FaCheckCircle, FaTimes } from "react-icons/fa";
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '@/context/ThemeContext';
import jsPDF from "jspdf";
import QRCode from 'qrcode';
import Image from 'next/image';

interface IDCard {
  _id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  gender: string;
  projectName: string;
  bloodGroup: string;
  employeeImage: string;
  status: string;
  validUntil: string;
  issuedDate?: string;
}

interface QRCodeData {
  employeeId: string;
  fullName: string;
  projectName: string;
  designation: string;
  employeeImage: string;
  workType: string;
}

export default function ViewIDCardsPage() {
  const { theme } = useTheme();
  const [idCards, setIdCards] = useState<IDCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCard, setSelectedCard] = useState<IDCard | null>(null);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('All Projects');
  const [designationFilter, setDesignationFilter] = useState<string>('All Designations');
  const projectFetchRef = useRef(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(idCards.length / rowsPerPage);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [projectFilter, designationFilter, searchTerm]);

  // Get unique designations for dropdown
  const designationOptions = Array.from(new Set(idCards.map(card => card.designation))).filter(Boolean);

  const filteredCards = idCards.filter(
    (card) =>
      (projectFilter === 'All Projects' || card.projectName === projectFilter) &&
      (designationFilter === 'All Designations' || card.designation === designationFilter) &&
      (card.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedCards = filteredCards.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    const fetchIdCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/id-cards/all");
        if (!res.ok) {
          throw new Error('Failed to fetch ID cards');
        }
        const data = await res.json();
        setIdCards(data.allIdCards || []);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An error occurred while fetching ID cards.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchIdCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      const fetchQRCodeData = async () => {
        setQrLoading(true);
        setQrCodeData(null);
        setQrError(null);
        try {
          const res = await fetch(`https://cafm.zenapi.co.in/api/qr-code/${selectedCard.employeeId}`);
          if (!res.ok) {
            throw new Error('Failed to fetch QR code data');
          }
          const data = await res.json();
          setQrCodeData(data);
        } catch (err) {
          setQrError('Failed to fetch QR code data. QR code may not be available for this employee.');
          console.error("Failed to fetch QR code data", err);
        } finally {
          setQrLoading(false);
        }
      };
      fetchQRCodeData();
    }
  }, [selectedCard]);

  useEffect(() => {
    if (projectFetchRef.current) return;
    projectFetchRef.current = true;
    fetch('https://cafm.zenapi.co.in/api/project/projects')
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'issued':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const [downloading, setDownloading] = useState(false);
  const qrDownloadRef = useRef<HTMLDivElement>(null);

  const getImageDataUri = async (url: string): Promise<string | null> => {
    try {
      const fetchUrl = url && url.startsWith('http')
        ? `/v1/employee/api/proxy-image?url=${encodeURIComponent(url)}`
        : url;
      const response = await fetch(fetchUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleDownload = async (card: IDCard) => {
    if (!card) return;
    setDownloading(true);
    try {
      // Fetch QR code data for this card
      let qrData: QRCodeData | null = null;
      try {
        const res = await fetch(`https://cafm.zenapi.co.in/api/qr-code/${card.employeeId}`);
        if (res.ok) {
          qrData = await res.json();
        }
      } catch {}

      // Generate QR code PNG using qrcode package
      let qrPngDataUrl = '';
      if (qrData) {
        try {
          qrPngDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), { width: 80, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        } catch (err) {
          console.error('Failed to generate QR PNG', err);
          qrPngDataUrl = '';
        }
      }

      // Use ID card size: 400pt x 250pt (standard ID card ratio)
      const cardWidth = 400;
      const cardHeight = 250;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [cardWidth, cardHeight] });

      // White background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, cardWidth, cardHeight, 'F');

      // Top section with company branding
      doc.setFillColor(30, 60, 120); // Blue background for header
      doc.rect(0, 0, cardWidth, 50, 'F');

      // Company logo (top center)
      try {
        const logoUrl = '/v1/employee/exozen_logo1.png';
        const logoImg = await fetch(logoUrl);
        const logoBlob = await logoImg.blob();
        const logoReader = new FileReader();
        const logoPromise = new Promise<string>((resolve, reject) => {
          logoReader.onloadend = () => {
            if (typeof logoReader.result === 'string') resolve(logoReader.result);
            else reject();
          };
          logoReader.onerror = reject;
        });
        logoReader.readAsDataURL(logoBlob);
        const logoData = await logoPromise;
        doc.addImage(logoData, 'PNG', cardWidth/2 - 40, 8, 80, 35);
      } catch {}

      // Company name below logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EXOZEN', cardWidth/2, 45, { align: 'center' });

      // Horizontal line separator
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.line(20, 55, cardWidth - 20, 55);

      // Employee photo (left side)
      const photoX = 30;
      const photoY = 80;
      const photoW = 80;
      const photoH = 100;
      
      let imageDataUrl = await getImageDataUri(card.employeeImage || '/placeholder-user.jpg');
      if (!imageDataUrl) {
        imageDataUrl = await getImageDataUri('/placeholder-user.jpg');
      }
      if (imageDataUrl) {
        // Photo border
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(2);
        doc.roundedRect(photoX - 2, photoY - 2, photoW + 4, photoH + 4, 8, 8, 'S');
        
        const format = imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imageDataUrl, format, photoX, photoY, photoW, photoH);
      }

      // Employee details (center)
      const detailsX = photoX + photoW + 20;
      const detailsY = 90;
      
      // Employee name (large, bold)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(card.fullName, detailsX, detailsY);

      // Designation (medium, blue)
      doc.setTextColor(30, 60, 120);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(card.designation, detailsX, detailsY + 20);

      // Project info
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Project: ${card.projectName}`, detailsX, detailsY + 40);

      // Employee ID
      doc.text(`ID: ${card.employeeId}`, detailsX, detailsY + 55);

      // QR Code (right side)
      const qrX = cardWidth - 100;
      const qrY = 80;
      const qrSize = 80;
      
      if (qrPngDataUrl) {
        // QR code border
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(1);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 4, 4, 'S');
        doc.addImage(qrPngDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Bottom section with additional details
      const bottomY = 200;
      
      // Blood Group
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Blood Group: ${card.bloodGroup}`, detailsX, bottomY);

      // Valid Until
      doc.text(`Valid Until: ${new Date(card.validUntil).toLocaleDateString()}`, detailsX, bottomY + 15);

      // Company address (bottom)
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text('25/1, 4th Floor, SKIP House, Museum Rd, near Brigade Tower,', cardWidth/2, cardHeight - 20, { align: 'center' });
      doc.text('Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560025', cardWidth/2, cardHeight - 10, { align: 'center' });

      // Outer border
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(2);
      doc.rect(5, 5, cardWidth - 10, cardHeight - 10, 'S');

      doc.save(`employee-id-card-${card.employeeId || 'download'}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to download PDF.');
      setDownloading(false);
    }
    setDownloading(false);
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="All Projects">All Projects</option>
                {projectList.map((p) => (
                  <option key={p._id} value={p.projectName}>{p.projectName}</option>
                ))}
              </select>
            </div>
            {/* Designation Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                <option value="All Designations">All Designations</option>
                {designationOptions.map((designation) => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
          </div>
        </div>
        {/* Table - Excel-like compact grid full screen */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading ID cards...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 font-semibold">{error}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap ${theme === "dark" ? "text-blue-200 bg-blue-900" : "text-blue-700 bg-blue-50"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-16 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Photo</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Employee ID</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Name</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Designation</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Project</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Status</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Issued Date</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-20 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {paginatedCards.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No ID cards found</td>
                    </tr>
                  ) : paginatedCards.map((card, idx) => (
                    <tr key={card._id} className={theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"}>
                      <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}`}>{idx + 1}</td>
                      <td className="px-2 py-1">
                        <Image
                          src={card.employeeImage || '/placeholder-user.jpg'}
                          alt={card.fullName}
                          width={32}
                          height={32}
                          className={`rounded object-cover border ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}
                          loader={({ src }) => src.startsWith('http') ? src : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${src}`}
                          unoptimized={card.employeeImage?.startsWith('http')}
                        />
                      </td>
                      <td className={`px-2 py-1 font-semibold whitespace-nowrap ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{card.employeeId}</td>
                      <td className="px-2 py-1"><div className="truncate" title={card.fullName}>{card.fullName}</div></td>
                      <td className="px-2 py-1"><div className="truncate" title={card.designation}>{card.designation}</div></td>
                      <td className={`px-2 py-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}><div className="truncate" title={card.projectName}>{card.projectName}</div></td>
                      <td className="px-2 py-1 text-center">
                        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(card.status)}`}>
                          {card.status === 'Issued' && <FaCheckCircle className="w-3 h-3 mr-1" />}
                          {card.status}
                        </span>
                      </td>
                      <td className={`px-2 py-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {card.issuedDate ? new Date(card.issuedDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => setSelectedCard(card)}
                            title="View ID Card"
                            className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                              theme === 'dark' 
                                ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700 focus:ring-blue-400' 
                                : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-400'
                            }`}
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleDownload(card)}
                            disabled={downloading}
                            title="Download ID Card"
                            className={`px-2 py-1 rounded font-semibold text-xs border transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                              theme === 'dark' 
                                ? 'border-green-500 text-green-400 bg-gray-800 hover:bg-gray-700 focus:ring-green-400' 
                                : 'border-green-500 text-green-600 bg-white hover:bg-green-50 focus:ring-green-400'
                            }`}
                          >
                            <FaDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 px-3">
              <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredCards.length)} of {filteredCards.length} ID cards
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 rounded transition ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'bg-gray-800 text-blue-200 hover:bg-gray-700' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-1 rounded transition ${currentPage === pageNum ? (theme === 'dark' ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white') : theme === 'dark' ? 'bg-gray-800 text-blue-200 hover:bg-gray-700' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 rounded transition ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'bg-gray-800 text-blue-200 hover:bg-gray-700' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedCard && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-colors duration-200 animate-fade-in ${theme === 'dark' ? 'bg-gray-900 bg-opacity-90' : 'bg-blue-50 bg-opacity-80'}`}>
          <div className={`relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-y-auto border-2 ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'} flex flex-col items-center px-0 sm:px-0`}
            style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
          >
            <div className="text-gray-900 dark:text-white w-full flex flex-col items-center">
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow hover:bg-red-100 dark:hover:bg-red-900 transition-all duration-200 z-10"
                aria-label="Close"
              >
                <FaTimes className="w-5 h-5 text-red-500" />
              </button>
              <div className="w-full flex flex-col items-center pt-8 pb-2">
                <Image src="/v1/employee/exozen_logo1.png" alt="Exozen Logo" width={90} height={36} className="object-contain mb-2" />
                <div className={`text-xs font-semibold px-3 py-1 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-blue-200' : 'bg-blue-50 text-blue-700'} shadow`}>{new Date().toLocaleString()}</div>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full px-6 py-4">
                <div className="flex flex-col items-center gap-4">
                  <Image
                    src={selectedCard.employeeImage || '/placeholder-user.jpg'}
                    alt={selectedCard.fullName}
                    width={100}
                    height={100}
                    className="rounded-xl object-cover border-4 border-blue-200 dark:border-blue-700 shadow-lg"
                    loader={({ src }) => src.startsWith('http') ? src : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${src}`}
                    unoptimized={selectedCard.employeeImage?.startsWith('http')}
                  />
                  <div className="w-[90px] h-[90px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl shadow-inner">
                    {qrLoading ? (
                      <FaSpinner className="animate-spin text-blue-600 w-8 h-8" />
                    ) : qrCodeData ? (
                      <QRCodeSVG
                        value={JSON.stringify(qrCodeData)}
                        size={80}
                        className="rounded-xl"
                        bgColor={theme === 'dark' ? '#1f2937' : '#ffffff'}
                        fgColor={theme === 'dark' ? '#ffffff' : '#000000'}
                      />
                    ) : qrError ? (
                      <p className="text-red-500 text-xs text-center">{qrError}</p>
                    ) : (
                      <p className="text-gray-400 text-xs text-center">No QR</p>
                    )}
                  </div>
                  <div className={`text-xs font-mono ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'} flex items-center justify-center gap-1`}>
                    <FaIdCard className="inline-block mr-1" />{selectedCard.employeeId}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2 min-w-[180px]">
                  <div className={`text-xl font-extrabold tracking-tight mb-1 ${theme === 'dark' ? 'text-black-800' : 'text-blue-900'}`}>{selectedCard.fullName}</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 shadow transition-all duration-200 ${selectedCard.status === 'Issued' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                      {selectedCard.status === 'Issued' && <FaCheckCircle className="w-3 h-3 mr-1" />}{selectedCard.status}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${theme === 'dark' ? 'bg-blue-700 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {selectedCard.designation}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-sm">
                    <div><span className="font-semibold">Project:</span> {selectedCard.projectName}</div>
                    <div><span className="font-semibold">Gender:</span> {selectedCard.gender}</div>
                    <div><span className="font-semibold">Blood Group:</span> {selectedCard.bloodGroup}</div>
                    <div><span className="font-semibold">Issued:</span> {selectedCard.issuedDate ? new Date(selectedCard.issuedDate).toLocaleDateString() : 'N/A'}</div>
                    <div><span className="font-semibold">Valid Until:</span> {new Date(selectedCard.validUntil).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
              <button
                className={`mt-4 mb-8 w-11/12 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                onClick={() => handleDownload(selectedCard)}
                disabled={downloading}
              >
                <FaDownload /> Download ID Card
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'none' }} ref={qrDownloadRef} />
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </ManagerDashboardLayout>
  );
}