import React from 'react';
import { FaTimes, FaPrint, FaDownload, FaSpinner } from 'react-icons/fa';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  theme: 'dark' | 'light';
}

const IDCardModal: React.FC<IDCardModalProps> = ({ isOpen, onClose, cardData, theme }) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [employeeImageBase64, setEmployeeImageBase64] = React.useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && cardData?.employeeImage) {
      setIsImageLoading(true);
      let isMounted = true;
      
      fetch(cardData.employeeImage)
        .then(res => {
          if (!res.ok) {
            throw new Error('Network response was not ok');
          }
          return res.blob();
        })
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
        .catch(error => {
          console.error("Error converting employee image to Base64:", error);
          if (isMounted) {
            setIsImageLoading(false);
          }
        });

      return () => { isMounted = false; };
    } else if (!isOpen) {
      setEmployeeImageBase64(null);
    }
  }, [isOpen, cardData?.employeeImage]);

  const handlePrint = useReactToPrint({
    contentRef: cardRef,
  });

  const handleDownloadPdf = () => {
    const input = cardRef.current;
    if (input) {
      setIsDownloading(true);
      html2canvas(input, { 
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff'
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const cardWidth = 53.98;
          const cardHeight = 85.6;
          
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [cardWidth, cardHeight]
          });
          
          pdf.addImage(imgData, 'PNG', 0, 0, cardWidth, cardHeight);
          pdf.save(`${cardData?.fullName}-ID-Card.pdf`);
        })
        .finally(() => {
          setIsDownloading(false);
        });
    }
  };

  if (!isOpen || !cardData) return null;

  const imageToRender = employeeImageBase64 || (cardData.employeeImage && !isImageLoading ? cardData.employeeImage : null);

  return (
    <div className="id-card-print-area fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className={`relative rounded-2xl p-4 shadow-2xl ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white/50'}`}>
        <div ref={cardRef} className="id-card bg-white text-black w-[350px] h-[550px] rounded-2xl shadow-2xl pb-6 flex flex-col justify-between font-sans relative overflow-hidden border-2 border-black">
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full opacity-90" style={{ backgroundColor: '#3b82f6' }}></div>
          
          <div className="relative z-10 p-4 text-center">
            <div className="flex flex-col items-center justify-center gap-1 mb-2">
                <div className="w-24 h-8 relative">
                     <Image src="/v1/employee/exozen_logo1.png" alt="Exozen Logo" layout="fill" objectFit="contain" unoptimized />
                </div>
                <p className="text-lg font-bold" style={{ color: '#1f2937' }}>Smart Society Solutions</p>
            </div>
            <p className="text-xs" style={{ color: '#6b7280' }}>www.exozenifm.com | www.exozen.in</p>
            <div className="mt-2 inline-block text-white text-sm font-bold px-4 py-1 rounded-lg shadow-md" style={{ backgroundColor: '#dc2626' }}>
                Essential Services
            </div>
          </div>

          <hr style={{ borderColor: 'black' }} />

          <div className="relative z-10 my-4 px-4">
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 flex-shrink-0">
                    <div className="w-full h-full rounded-full border-4 border-gray-300 overflow-hidden bg-gray-100 shadow-lg" style={{ borderColor: '#d1d5db', backgroundColor: '#f3f4f6' }}>
                        {isImageLoading ? (
                           <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <FaSpinner className="animate-spin text-gray-500" />
                           </div>
                        ) : imageToRender ? (
                            <img src={imageToRender} alt={cardData.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">Photo</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-left">
                    <h3 className="text-xl font-bold" style={{ color: '#111827' }}>{cardData.fullName}</h3>
                    <p className="font-semibold" style={{ color: '#2563eb' }}>{cardData.designation}</p>
                    <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
                        <span className="font-bold">Project:</span> {cardData.projectName}
                    </p>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                        <span className="font-bold">ID:</span> {cardData.employeeId}
                    </p>
                </div>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <div className="relative w-28 h-28">
                <Image src={cardData.qrCodeImage} alt="QR Code" layout="fill" objectFit="contain" />
              </div>
            </div>
            <div className="text-xs text-center space-y-1" style={{ color: '#374151' }}>
              {cardData.bloodGroup && <p><span className="font-bold">Blood Group:</span> {cardData.bloodGroup}</p>}
              <p><span className="font-bold">Valid Until:</span> {new Date(cardData.validUntil).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="relative z-10 border-t-2 pt-2" style={{ borderColor: '#60a5fa' }}>
             <p className="text-xs text-center px-2" style={{ color: '#6b7280' }}>
                25/1, 4th Floor, SKIP House, Museum Rd, near Brigade Tower, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560025
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={handlePrint} disabled={isImageLoading || isDownloading} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            <FaPrint /> Print
          </button>
          <button onClick={handleDownloadPdf} disabled={isImageLoading || isDownloading} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-white hover:bg-green-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button onClick={onClose} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-300'}`}>
            <FaTimes /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IDCardModal; 