"use client";

import React, { useState, useEffect, useRef } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaIdCard, FaSpinner, FaDownload, FaSearch, FaEye, FaTimesCircle, FaCheckCircle, FaTimes } from "react-icons/fa";
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
  const projectFetchRef = useRef(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(idCards.length / rowsPerPage);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [projectFilter, searchTerm]);

  const filteredCards = idCards.filter(
    (card) =>
      (projectFilter === 'All Projects' || card.projectName === projectFilter) &&
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
        try {
          const res = await fetch(`https://cafm.zenapi.co.in/api/qr-code/${selectedCard.employeeId}`);
          if (!res.ok) {
            throw new Error('Failed to fetch QR code data');
          }
          const data = await res.json();
          setQrCodeData(data);
        } catch (err) {
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
          qrPngDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), { width: 128, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        } catch (err) {
          console.error('Failed to generate QR PNG', err);
          qrPngDataUrl = '';
        }
      }

      // Use ID card size: 350pt x 220pt
      const cardWidth = 350;
      const cardHeight = 220;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [cardWidth, cardHeight] });

      // Background
      doc.setFillColor(240, 248, 255); // light blue/white
      doc.roundedRect(0, 0, cardWidth, cardHeight, 16, 16, 'F');

      // Exozen Logo (top center)
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
        doc.addImage(logoData, 'PNG', cardWidth/2 - 30, 12, 60, 30);
      } catch {}

      // Employee Photo (left)
      const idPhotoX = 24, idPhotoY = 60, idPhotoW = 70, idPhotoH = 90;
      let imageDataUrl = '';
      const imageUrl = card.employeeImage || '/placeholder-user.jpg';
      try {
        const img = await fetch(imageUrl, { mode: 'cors' });
        if (!img.ok) throw new Error(`Image fetch failed: ${img.status}`);
        const blob = await img.blob();
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(new Error("Image data is not a string"));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        // Check format
        if (!imageDataUrl.startsWith('data:image/jpeg') && !imageDataUrl.startsWith('data:image/png')) {
          throw new Error('Image is not JPEG or PNG');
        }
      } catch (err) {
        console.error('Failed to fetch/convert employee image:', err);
        // fallback to placeholder
        try {
          const placeholderImg = await fetch('/placeholder-user.jpg');
          const placeholderBlob = await placeholderImg.blob();
          imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Image data is not a string"));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(placeholderBlob);
          });
        } catch (fallbackErr) {
          console.error('Failed to load placeholder image:', fallbackErr);
          imageDataUrl = '';
        }
      }
      if (imageDataUrl) {
        doc.roundedRect(idPhotoX-4, idPhotoY-4, idPhotoW+8, idPhotoH+8, 10, 10, 'S');
        // Use correct format for addImage
        const format = imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imageDataUrl, format, idPhotoX, idPhotoY, idPhotoW, idPhotoH);
      }

      // QR code (right)
      const idQrW = 60, idQrH = 60;
      const idQrX = cardWidth - 24 - idQrW, idQrY = 60;
      if (qrPngDataUrl) {
        doc.roundedRect(idQrX-4, idQrY-4, idQrW+8, idQrH+8, 10, 10, 'S');
        doc.addImage(qrPngDataUrl, 'PNG', idQrX, idQrY, idQrW, idQrH);
      }

      // Details (centered vertically between photo and QR)
      const detailsX = idPhotoX + idPhotoW + 12; // slightly closer to photo
      const detailsY = 70;
      const labelColor = [60, 90, 160];
      const valueColor = [20, 40, 80];
      doc.setFontSize(10);
      const details = [
        [`Name`, card.fullName],
        [`Employee ID`, card.employeeId],
        [`Designation`, card.designation],
        [`Project`, card.projectName],
        [`Gender`, card.gender],
        [`Blood Group`, card.bloodGroup],
        [`Issued`, card.issuedDate ? new Date(card.issuedDate).toLocaleDateString() : 'N/A'],
        [`Valid Until`, new Date(card.validUntil).toLocaleDateString()],
        [`Status`, card.status],
      ];
      let y = detailsY;
      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
        doc.text(`${label}:`, detailsX, y, { baseline: 'top' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        doc.text(String(value), detailsX + 68, y, { baseline: 'top' });
        y += 14;
      });

      // Border for card
      doc.setDrawColor(30, 60, 120);
      doc.roundedRect(4, 4, cardWidth-8, cardHeight-8, 16, 16, 'S');

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
      <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800">
            <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
              <FaIdCard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">View ID Cards</h1>
              <p className="text-white text-base opacity-90">
                Browse and manage generated employee ID cards.
              </p>
            </div>
          </div>

          {/* Search and Table */}
          <div className={`rounded-2xl p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Project Filter Dropdown */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className={`rounded-xl px-4 py-2 border text-sm font-semibold transition
                  ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-200' : 'bg-white border-blue-100 text-blue-700'}`}
              >
                <option value="All Projects">All Projects</option>
                {projectList.map(p => (
                  <option key={p._id} value={p.projectName}>{p.projectName}</option>
                ))}
              </select>
              <div className="flex-1 w-full">
                <div className="relative">
                  <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder="Search by name or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-lg transition border focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <FaSpinner className="animate-spin text-blue-600 w-12 h-12" />
              </div>
            ) : error ? (
                <div className="text-center py-10 px-4">
                  <FaTimesCircle className="mx-auto text-red-500 w-12 h-12" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Failed to load data</h3>
                  <p className="mt-1 text-sm text-gray-500">{error}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full rounded-xl overflow-hidden border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={`${theme === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-blue-50 text-blue-900'}`}>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Designation</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Issued Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`text-sm ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                    {paginatedCards.map((card, idx) => (
                      <tr
                        key={card._id}
                        className={`transition-all duration-150 ${
                          theme === 'dark'
                            ? idx % 2 === 0
                              ? 'bg-gray-900 hover:bg-gray-800'
                              : 'bg-gray-800 hover:bg-gray-700'
                            : idx % 2 === 0
                              ? 'bg-white hover:bg-blue-50'
                              : 'bg-gray-50 hover:bg-blue-100'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <Image
                              src={card.employeeImage || '/placeholder-user.jpg'}
                              alt={card.fullName}
                              width={48}
                              height={48}
                              className="rounded-full object-cover border border-gray-300 dark:border-gray-700"
                              style={{ aspectRatio: '1 / 1' }}
                              loader={({ src }) => src.startsWith('http') ? src : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${src}`}
                              unoptimized={card.employeeImage?.startsWith('http')}
                            />
                            <div>
                              <div className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{card.fullName}</div>
                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{card.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{card.designation}</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{card.projectName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${getStatusColor(card.status)}`}>{card.status === 'Issued' && <FaCheckCircle className="w-3 h-3 mr-1" />}{card.status}</span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{card.issuedDate ? new Date(card.issuedDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedCard(card)} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'} transition`}>
                              <FaEye /> View
                            </button>
                            <button
                              className={`flex items-center ${theme === 'dark' ? 'text-green-400 hover:text-green-200' : 'text-green-600 hover:text-green-800'} transition`}
                              title="Download ID Card"
                              aria-label="Download ID Card"
                              onClick={() => handleDownload(card)}
                              disabled={downloading}
                            >
                              <FaDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Page {currentPage} of {totalPages}</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                          ${currentPage === 1
                            ? 'opacity-50 cursor-not-allowed'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-blue-200 hover:bg-gray-700'
                              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}
                        `}
                      >Previous</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${currentPage === pageNum
                              ? theme === 'dark'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-blue-600 text-white shadow-md'
                              : theme === 'dark'
                                ? 'text-blue-200 bg-gray-800 hover:bg-gray-700'
                                : 'text-blue-700 bg-white border border-blue-200 hover:bg-blue-50'}
                          `}
                        >{pageNum}</button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                          ${currentPage === totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-blue-200 hover:bg-gray-700'
                              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}
                        `}
                      >Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {selectedCard && (
        <div className={
          `fixed inset-0 flex items-center justify-center z-50 p-4 transition-colors duration-200 ` +
          (theme === 'dark' ? 'bg-gray-900 bg-opacity-80' : 'bg-white bg-opacity-70')
        }>
          <div className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto border ${theme === 'dark' ? 'border-blue-900 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200' : 'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900'}`}>
            {/* Modal Content */}
            <div className="p-8">
              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedCard(null)}
                  className={`p-2 rounded-full transition-all duration-200 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                  aria-label="Close"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              {/* QR Code and Details */}
              <div className="flex flex-col sm:flex-row gap-8">
                {/* Employee Image */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <Image
                    src={selectedCard.employeeImage || '/placeholder-user.jpg'}
                    alt={selectedCard.fullName}
                    width={128}
                    height={128}
                    className="rounded-lg object-cover border-4 border-blue-200 dark:border-blue-700 shadow-xl mb-4"
                    loader={({ src }) => src.startsWith('http') ? src : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${src}`}
                    unoptimized={selectedCard.employeeImage?.startsWith('http')}
                  />
                  {/* QR Code */}
                  {qrLoading ? (
                    <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg animate-pulse">
                      <FaSpinner className="text-blue-600 w-8 h-8" />
                    </div>
                  ) : qrCodeData ? (
                    <div className="w-32 h-32">
                      <QRCodeSVG
                        value={JSON.stringify(qrCodeData)}
                        size={128}
                        className="rounded-lg"
                        bgColor={theme === 'dark' ? '#1f2937' : '#ffffff'}
                        fgColor={theme === 'dark' ? '#ffffff' : '#000000'}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg">
                      <p className="text-gray-500 text-sm text-center">No QR code data available</p>
                    </div>
                  )}
                </div>
                {/* Details */}
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Employee ID Card Details</h2>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="font-semibold">Name:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.fullName}</div>
                    <div className="font-semibold">Employee ID:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.employeeId}</div>
                    <div className="font-semibold">Designation:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.designation}</div>
                    <div className="font-semibold">Project:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.projectName}</div>
                    <div className="font-semibold">Gender:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.gender}</div>
                    <div className="font-semibold">Blood Group:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.bloodGroup}</div>
                    <div className="font-semibold">Issued Date:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.issuedDate ? new Date(selectedCard.issuedDate).toLocaleDateString() : 'N/A'}</div>
                    <div className="font-semibold">Valid Until:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(selectedCard.validUntil).toLocaleDateString()}</div>
                    <div className="font-semibold">Status:</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCard.status}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add hidden QR code SVG container for download */}
      <div style={{ display: 'none' }} ref={qrDownloadRef} />
    </ManagerDashboardLayout>
  );
}