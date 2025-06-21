"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaIdCard, FaSpinner, FaDownload, FaSearch, FaEye, FaTimesCircle, FaCheckCircle, FaTimes } from "react-icons/fa";
import { QRCodeSVG } from 'qrcode.react';

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
  const [idCards, setIdCards] = useState<IDCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCard, setSelectedCard] = useState<IDCard | null>(null);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

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
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching ID cards.");
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

  const filteredCards = idCards.filter(
    (card) =>
      card.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'issued':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <ManagerDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-8">
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
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <div className="mb-6">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                />
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Designation</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Issued Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCards.map((card) => (
                      <tr key={card._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <img src={card.employeeImage || '/placeholder-user.jpg'} alt={card.fullName} className="w-10 h-10 rounded-full object-cover"/>
                            <div>
                                <div className="font-semibold text-gray-900">{card.fullName}</div>
                                <div className="text-sm text-gray-500">{card.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{card.designation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{card.projectName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${getStatusColor(card.status)}`}>
                                {card.status === 'Issued' && <FaCheckCircle className="w-3 h-3 mr-1" />}
                                {card.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{card.issuedDate ? new Date(card.issuedDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedCard(card)} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition">
                              <FaEye /> View
                            </button>
                            <button className="flex items-center gap-2 text-green-600 hover:text-green-800 transition">
                              <FaDownload /> Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-gray-900">ID Card Details</h2>
                        <button onClick={() => setSelectedCard(null)} className="p-1 rounded-full hover:bg-gray-200">
                            <FaTimes className="w-5 h-5 text-gray-600"/>
                        </button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left side: QR Code and basic info */}
                        <div className="flex flex-col items-center text-center">
                             <img src={selectedCard.employeeImage || '/placeholder-user.jpg'} alt={selectedCard.fullName} className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white"/>
                            <h3 className="mt-4 text-xl font-bold text-gray-900">{selectedCard.fullName}</h3>
                            <p className="text-gray-600">{selectedCard.designation}</p>
                            <p className="mt-1 text-sm text-gray-500 font-mono">{selectedCard.employeeId}</p>

                            <div className="mt-6">
                                {qrLoading ? <FaSpinner className="animate-spin text-blue-600 w-8 h-8"/> :
                                 qrCodeData ? (
                                     <div className="p-2 border rounded-lg">
                                        <QRCodeSVG value={JSON.stringify(qrCodeData)} size={150}/>
                                     </div>
                                 ) : <p className="text-red-500 text-sm">Could not load QR code.</p>
                                }
                            </div>
                        </div>

                        {/* Right side: Details */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Project</h4>
                                <p className="font-semibold text-gray-800">{selectedCard.projectName}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                                <p className="font-semibold text-gray-800">{selectedCard.status}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Gender</h4>
                                <p className="font-semibold text-gray-800">{selectedCard.gender}</p>
                            </div>
                             <div>
                                <h4 className="text-sm font-medium text-gray-500">Blood Group</h4>
                                <p className="font-semibold text-gray-800">{selectedCard.bloodGroup}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Issued Date</h4>
                                <p className="font-semibold text-gray-800">{selectedCard.issuedDate ? new Date(selectedCard.issuedDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Valid Until</h4>
                                <p className="font-semibold text-gray-800">{new Date(selectedCard.validUntil).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                     <div className="mt-8 pt-6 border-t flex justify-end">
                        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <FaDownload /> Download ID Card
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </ManagerDashboardLayout>
  );
} 