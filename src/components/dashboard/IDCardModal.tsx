"use client";

import React, { useRef, useEffect, useState } from "react";
import { FaTimes, FaPrint, FaDownload, FaSpinner } from "react-icons/fa";
import Image from "next/image";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";

interface IDCardData {
  fullName: string;
  employeeId: string;
  designation: string;
  projectName: string;
  bloodGroup?: string;
  employeeImage: string;
  qrCodeImage: string;
  validUntil: string;
}

interface IDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: IDCardData | null;
  theme: "dark" | "light";
}

const IDCardModal: React.FC<IDCardModalProps> = ({ isOpen, onClose, cardData, theme }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: cardRef,
  });

  const handleDownloadPdf = async () => {
    if (!cardData) return;
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ unit: 'px', format: [150, 250] });
      // Helper to fetch image as data URI
      const getImageDataUri = async (url: string): Promise<string | null> => {
        try {
          const fetchUrl = url.startsWith('http')
            ? `/v1/employee/api/proxy-image?url=${encodeURIComponent(url)}`
            : url;
          const response = await fetch(fetchUrl);
          if (!response.ok) return null;
          const blob = await response.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      // --- Card Border ---
      doc.setDrawColor(44, 44, 44);
      doc.setLineWidth(1);
      doc.roundedRect(3, 3, 144, 244, 10, 10, 'S');

      // --- Logo ---
      const logoDataUri = await getImageDataUri('/v1/employee/exozen_logo1.png');
      if (logoDataUri) {
        doc.addImage(logoDataUri, 'PNG', 55, 8, 40, 10);
      }

      // --- Header Text ---
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Smart Society Solutions', 75, 22, { align: 'center' });
      doc.setFontSize(4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('www.exozenifm.com | www.exozen.in', 75, 27, { align: 'center' });

      // --- Essential Services Badge ---
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(35, 30, 80, 9, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Essential Services', 75, 37, { align: 'center' });

      // --- Divider ---
      doc.setDrawColor(44, 44, 44);
      doc.setLineWidth(0.5);
      doc.line(10, 43, 140, 43);

      // --- Main Section: Single Column Layout ---
      // Centered Employee Image at the top (circular, no border)
      const employeeImageDataUri = cardData.employeeImage ? await getImageDataUri(cardData.employeeImage) : null;
      // Center coordinates and radius
      const centerX = 75;
      const centerY = 70;
      const radius = 20;
      const imgSize = 38; // slightly smaller than the circle

      // Draw the image, slightly smaller and perfectly centered
      if (employeeImageDataUri) {
        doc.addImage(employeeImageDataUri, 'JPEG', centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize, undefined, 'FAST');
      } else {
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text('Photo', centerX, centerY, { align: 'center', baseline: 'middle' });
      }

      // Employee Details below the image (larger font sizes)
      let detailsTop = 97;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(cardData.fullName, 75, detailsTop + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(cardData.designation, 75, detailsTop + 18, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(44, 44, 44);
      doc.text(`Project: ${cardData.projectName}`, 75, detailsTop + 28, { align: 'center' });
      doc.text(`ID: ${cardData.employeeId}`, 75, detailsTop + 39, { align: 'center' });
      let infoY = detailsTop + 49;
      if (cardData.bloodGroup) {
        doc.text(`Blood Group: ${cardData.bloodGroup}`, 75, infoY, { align: 'center' });
        infoY += 9;
      }
      doc.text(`Valid Until: ${new Date(cardData.validUntil).toLocaleDateString()}`, 75, infoY, { align: 'center' });

      // QR Code centered below details
      if (cardData.qrCodeImage) {
        const qrDataUri = await getImageDataUri(cardData.qrCodeImage);
        if (qrDataUri) {
          doc.addImage(qrDataUri, 'PNG', 45, infoY + 8, 60, 60);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4);
          doc.setTextColor(44, 44, 44);
          doc.text('Scan for Details', 75, infoY + 72, { align: 'center' });
        }
      }

      // Footer Address at the bottom
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(0, 0, 0);
      doc.text(
        '25/1, 4th Floor, SKIP House, Museum Rd, near Brigade Tower, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560025',
        75,
        240,
        { align: 'center', maxWidth: 130 }
      );

      doc.save(`${cardData.fullName || 'IDCard'}-ID-Card.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !cardData) return null;

  const imageToRender = cardData.employeeImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div
        className={`rounded-xl p-4 shadow-lg ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}
        style={{ background: theme === "dark" ? "#111827" : "#fff" }}
      >
        <div
          ref={cardRef}
          style={{
            width: 340,
            height: 600, // increased height for more bottom space
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
            position: "relative",
            fontFamily: "Arial, sans-serif",
            border: "2px solid #000",
            paddingBottom: 0 // removed extra bottom padding
          }}
          className="flex flex-col justify-between"
        >
          <div
            className="absolute"
            style={{ bottom: -60, left: -60, width: 192, height: 192, borderRadius: '50%', opacity: 0.9, backgroundColor: "#3b82f6", zIndex: 0 }}
          ></div>

          <div className="relative z-10 p-4 text-center">
            <div className="flex flex-col items-center gap-1 mb-2">
              <div className="w-24 h-8 relative">
                <Image src="/v1/employee/exozen_logo1.png" alt="Logo" layout="fill" objectFit="contain" unoptimized />
              </div>
              <p className="text-lg font-bold" style={{ color: "#1f2937" }}>Smart Society Solutions</p>
            </div>
            <p className="text-xs" style={{ color: "#6b7280" }}>www.exozenifm.com | www.exozen.in</p>
            <div
              className="mt-2 inline-block text-white text-sm font-bold px-4 py-1 rounded-lg shadow-md"
              style={{ background: "#dc2626" }}
            >
              Essential Services
            </div>
          </div>

          <hr style={{ borderColor: "#000" }} />

          <div className="relative z-10 my-4 px-4">
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 relative flex-shrink-0 rounded-full border-4 bg-gray-100 shadow-lg overflow-hidden"
                style={{ borderColor: "#d1d5db", background: "#f3f4f6" }}
              >
                {imageToRender ? (
                  <Image src={imageToRender} alt="Employee" layout="fill" objectFit="cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: "#9ca3af" }}>Photo</div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: "#111827" }}>{cardData.fullName}</h3>
                <p style={{ color: "#2563eb", fontWeight: 600 }}>{cardData.designation}</p>
                <p className="text-sm" style={{ color: "#4b5563" }}>
                  <strong>Project:</strong> {cardData.projectName}
                </p>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  <strong>ID:</strong> {cardData.employeeId}
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-center">
            <div className="flex justify-center mb-2">
              <div className="relative w-24 h-24">
                <Image src={cardData.qrCodeImage} alt="QR Code" layout="fill" objectFit="contain" unoptimized />
              </div>
            </div>
            <div className="text-xs" style={{ color: "#374151" }}>
              {cardData.bloodGroup && (
                <p>
                  <strong>Blood Group:</strong> {cardData.bloodGroup}
                </p>
              )}
              <p>
                <strong>Valid Until:</strong> {new Date(cardData.validUntil).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="relative z-10 border-t-2 pt-2 text-xs text-center px-2 font-bold" style={{ borderColor: "#60a5fa", color: "#1f2937", background: "#fff", zIndex: 10, minHeight: 40 }}>
            25/1, 4th Floor, SKIP House, Museum Rd, near Brigade Tower, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560025
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handlePrint}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === "dark" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"} disabled:opacity-50`}
          >
            <FaPrint /> Print
          </button>
          <button
            onClick={handleDownloadPdf}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === "dark" ? "bg-green-600 text-white hover:bg-green-700" : "bg-green-500 text-white hover:bg-green-600"} disabled:opacity-50`}
          >
            {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
            {isDownloading ? "Downloading..." : "Download PDF"}
          </button>
          <button
            onClick={onClose}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === "dark" ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"}`}
          >
            <FaTimes /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IDCardModal;
