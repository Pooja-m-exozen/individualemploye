"use client";

import React, { useRef, useEffect, useState } from "react";
import { FaTimes, FaPrint, FaDownload, FaSpinner } from "react-icons/fa";
import Image from "next/image";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface IDCardData {
  fullName: string;
  employeeId: string;
  designation: string;
  projectName: string;
  bloodGroup?: string;
  employeeImage?: string;
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
  const [employeeImageBase64, setEmployeeImageBase64] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && cardData?.employeeImage) {
      setIsImageLoading(true);
      let isMounted = true;

      fetch(cardData.employeeImage)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted) {
              setEmployeeImageBase64(reader.result as string);
              setIsImageLoading(false);
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error("Image load failed:", err);
          setIsImageLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (!isOpen) {
      setEmployeeImageBase64(null);
    }
  }, [isOpen, cardData?.employeeImage]);

  // Fix for TS error: 'content' does not exist in type 'UseReactToPrintOptions'
  const handlePrint = useReactToPrint({
    content: () => cardRef.current,
  } as any);

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);

    try {
      const images = cardRef.current.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${cardData?.fullName || "IDCard"}-ID-Card.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !cardData) return null;

  const imageToRender = employeeImageBase64 || (cardData.employeeImage && !isImageLoading ? cardData.employeeImage : null);

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
  className="w-24 h-24 flex-shrink-0 rounded-full border-4 bg-gray-100 shadow-lg overflow-hidden"
  style={{ borderColor: "#d1d5db", background: "#f3f4f6" }}
>
                {isImageLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaSpinner className="animate-spin" style={{ color: "#6b7280" }} />
                  </div>
                ) : imageToRender ? (
                  <img src={imageToRender} alt="Employee" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
            disabled={isImageLoading || isDownloading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === "dark" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"} disabled:opacity-50`}
          >
            <FaPrint /> Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isImageLoading || isDownloading}
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
